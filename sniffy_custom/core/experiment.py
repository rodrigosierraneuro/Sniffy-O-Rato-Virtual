from __future__ import annotations
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np

from .behavior import (
    BehaviorParams, RuntimeState,
    compute_all_probabilities, select_behavior, update_behavior_momentum,
)
from .schedules import BaseSchedule, make_schedule
from .state_machine import StateMachine


@dataclass
class SessionEvent:
    tick: int
    session_time_s: float
    behavior_name: str
    state_name: str
    position: tuple
    facing: str
    reinforcement_delivered: bool
    schedule_name: str
    cumulative_responses: int
    cumulative_reinforcements: int


@dataclass
class SessionResult:
    events: List[SessionEvent] = field(default_factory=list)
    config_name: str = ""
    schedule_name: str = ""
    total_ticks: int = 0
    ticks_per_second: int = 10

    @property
    def total_responses(self) -> int:
        return sum(1 for e in self.events if e.behavior_name != "No Reinforcement"
                   and e.behavior_name != "Idle")

    @property
    def total_reinforcements(self) -> int:
        return sum(1 for e in self.events if e.reinforcement_delivered)

    @property
    def mean_response_rate_per_min(self) -> float:
        duration_min = self.total_ticks / (self.ticks_per_second * 60.0)
        return self.total_responses / max(1.0, duration_min)

    def to_dataframe(self):
        import pandas as pd
        return pd.DataFrame([
            {
                "tick": e.tick,
                "time_s": e.session_time_s,
                "behavior": e.behavior_name,
                "state": e.state_name,
                "x": e.position[0],
                "y": e.position[1],
                "facing": e.facing,
                "reinforced": e.reinforcement_delivered,
                "cumulative_responses": e.cumulative_responses,
                "cumulative_reinforcements": e.cumulative_reinforcements,
            }
            for e in self.events
        ])

    def to_csv(self, path: str) -> None:
        self.to_dataframe().to_csv(path, index=False)


class Experiment:
    def __init__(
        self,
        behaviors: List[BehaviorParams],
        schedule: BaseSchedule,
        target_behavior: str,
        ticks_per_second: int = 10,
        seed: Optional[int] = None,
        name: str = "Experiment",
        deprivation_initial: float = 0.8,
    ):
        self.behaviors = behaviors
        self.schedule = schedule
        self.target_behavior = target_behavior
        self.ticks_per_second = ticks_per_second
        self.name = name
        self.rng = np.random.default_rng(seed)

        self._state_machine = StateMachine()
        self._runtime = RuntimeState(
            deprivation=deprivation_initial,
            reinf_history=0.0,
            schedule_strength=0.0,
            disc_weight=0.5,
            pain_level=0.0,
            contrast_factor=1.0,
        )
        self._behavior_beh: Dict[str, float] = {b.name: b.beh for b in behaviors}
        self._cumulative_responses = 0
        self._cumulative_reinforcements = 0
        self._tick = 0

    @classmethod
    def from_config(cls, config_path: str) -> "Experiment":
        from ..io.config_loader import load_config
        return load_config(config_path)

    @classmethod
    def from_sdf(cls, sdf_path: str, schedule_override: Optional[str] = None,
                 seed: Optional[int] = None) -> "Experiment":
        from ..io.sdf_parser import SDFParser
        from ..io.config_loader import DEFAULT_BEHAVIORS
        parser = SDFParser()
        sdf = parser.parse(Path(sdf_path))
        rng = np.random.default_rng(seed)
        sched = make_schedule(
            schedule_override or sdf.schedule_type,
            sdf.schedule_param,
            rng,
        )
        return cls(
            behaviors=DEFAULT_BEHAVIORS,
            schedule=sched,
            target_behavior=sdf.target_behavior or "Bar Press",
            seed=seed,
            name=Path(sdf_path).stem,
        )

    def step(self) -> SessionEvent:
        self._tick += 1
        probs = compute_all_probabilities(self.behaviors, self._runtime, self.rng)

        # Lock in target behavior's index for schedule check
        idx = select_behavior(probs, self.rng)
        chosen = self.behaviors[idx]

        reinforced = False
        target_names = {b.name for b in self.behaviors if b.name == self.target_behavior}

        if chosen.reinforceable and chosen.name == self.target_behavior:
            decision = self.schedule.record_response(self._tick)
            reinforced = decision.deliver
            self._cumulative_responses += 1
            if reinforced:
                self._cumulative_reinforcements += 1

        # Update behavioral momentum
        for b in self.behaviors:
            old_beh = self._behavior_beh[b.name]
            is_target = (b.name == self.target_behavior)
            new_beh = update_behavior_momentum(
                old_beh,
                reinforced=reinforced and is_target,
                learning_rate=0.15,
                extinction_rate=0.04,
            )
            self._behavior_beh[b.name] = new_beh
            b.beh = new_beh

        # Update runtime state
        self._runtime.reinf_history = (
            0.9 * self._runtime.reinf_history + (0.1 if reinforced else 0.0)
        )
        self._runtime.schedule_strength = self.schedule.get_strength()
        # Deprivation slowly increases, food resets it
        if reinforced:
            self._runtime.deprivation = max(0.0, self._runtime.deprivation - 0.3)
        else:
            self._runtime.deprivation = min(1.0,
                self._runtime.deprivation + 0.3 / (self.ticks_per_second * 60))

        # Move rat in cage
        state = self._state_machine.transition_to_behavior(chosen.name)
        if state.category == "walk":
            dx = self.rng.uniform(-0.04, 0.04)
            dy = self.rng.uniform(-0.04, 0.04)
            self._state_machine.move(dx, dy)

        pose = self._state_machine.get_pose()
        return SessionEvent(
            tick=self._tick,
            session_time_s=self._tick / self.ticks_per_second,
            behavior_name=chosen.name,
            state_name=state.name,
            position=pose.position,
            facing=pose.facing,
            reinforcement_delivered=reinforced,
            schedule_name=self.schedule.name,
            cumulative_responses=self._cumulative_responses,
            cumulative_reinforcements=self._cumulative_reinforcements,
        )

    def run(self, max_ticks: int = 36000,
            progress_interval: int = 0) -> SessionResult:
        result = SessionResult(
            config_name=self.name,
            schedule_name=self.schedule.name,
            ticks_per_second=self.ticks_per_second,
        )
        start = time.time()
        for t in range(max_ticks):
            event = self.step()
            result.events.append(event)
            if progress_interval and t % progress_interval == 0:
                elapsed = time.time() - start
                print(f"  tick {t}/{max_ticks} | responses={event.cumulative_responses}"
                      f" reinf={event.cumulative_reinforcements} [{elapsed:.1f}s]")
        result.total_ticks = self._tick
        return result

    def reset(self) -> None:
        self.schedule.reset()
        self._state_machine = StateMachine()
        self._runtime = RuntimeState()
        self._cumulative_responses = 0
        self._cumulative_reinforcements = 0
        self._tick = 0
