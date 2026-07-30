from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
import numpy as np


@dataclass
class ReinforcementDecision:
    deliver: bool
    next_criterion: int


class BaseSchedule(ABC):
    @abstractmethod
    def record_response(self, tick: int) -> ReinforcementDecision: ...

    @abstractmethod
    def get_strength(self) -> float:
        """0-1 value fed into the probability model as schedule_strength."""
        ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    def reset(self) -> None:
        pass


class CRFSchedule(BaseSchedule):
    """Continuous Reinforcement — every response is reinforced."""
    def record_response(self, tick: int) -> ReinforcementDecision:
        return ReinforcementDecision(deliver=True, next_criterion=1)

    def get_strength(self) -> float:
        return 1.0

    @property
    def name(self) -> str:
        return "CRF"


class ExtinctionSchedule(BaseSchedule):
    """No reinforcement delivered."""
    def record_response(self, tick: int) -> ReinforcementDecision:
        return ReinforcementDecision(deliver=False, next_criterion=0)

    def get_strength(self) -> float:
        return 0.0

    @property
    def name(self) -> str:
        return "EXT"


class FixedRatioSchedule(BaseSchedule):
    def __init__(self, ratio: int):
        self.ratio = ratio
        self._counter = 0

    def record_response(self, tick: int) -> ReinforcementDecision:
        self._counter += 1
        if self._counter >= self.ratio:
            self._counter = 0
            return ReinforcementDecision(deliver=True, next_criterion=self.ratio)
        return ReinforcementDecision(deliver=False, next_criterion=self.ratio - self._counter)

    def get_strength(self) -> float:
        return self._counter / max(1, self.ratio)

    @property
    def name(self) -> str:
        return f"FR-{self.ratio}"

    def reset(self) -> None:
        self._counter = 0


class VariableRatioSchedule(BaseSchedule):
    def __init__(self, mean_ratio: int, rng: np.random.Generator):
        self.mean_ratio = mean_ratio
        self._rng = rng
        self._counter = 0
        self._criterion = self._draw()

    def _draw(self) -> int:
        raw = int(self._rng.geometric(p=1.0 / self.mean_ratio))
        return max(1, min(raw, 3 * self.mean_ratio))

    def record_response(self, tick: int) -> ReinforcementDecision:
        self._counter += 1
        if self._counter >= self._criterion:
            self._counter = 0
            self._criterion = self._draw()
            return ReinforcementDecision(deliver=True, next_criterion=self._criterion)
        return ReinforcementDecision(deliver=False, next_criterion=self._criterion - self._counter)

    def get_strength(self) -> float:
        return self._counter / max(1, self._criterion)

    @property
    def name(self) -> str:
        return f"VR-{self.mean_ratio}"

    def reset(self) -> None:
        self._counter = 0
        self._criterion = self._draw()


class FixedIntervalSchedule(BaseSchedule):
    def __init__(self, interval_ticks: int):
        self.interval_ticks = interval_ticks
        self._interval_start = 0

    def record_response(self, tick: int) -> ReinforcementDecision:
        elapsed = tick - self._interval_start
        if elapsed >= self.interval_ticks:
            self._interval_start = tick
            return ReinforcementDecision(deliver=True, next_criterion=self.interval_ticks)
        return ReinforcementDecision(deliver=False, next_criterion=self.interval_ticks - elapsed)

    def get_strength(self) -> float:
        return 0.5

    @property
    def name(self) -> str:
        return f"FI-{self.interval_ticks}"


class VariableIntervalSchedule(BaseSchedule):
    def __init__(self, mean_ticks: int, rng: np.random.Generator):
        self.mean_ticks = mean_ticks
        self._rng = rng
        self._available_at = self._draw(0)

    def _draw(self, current_tick: int) -> int:
        delta = int(self._rng.exponential(self.mean_ticks))
        return current_tick + max(1, delta)

    def record_response(self, tick: int) -> ReinforcementDecision:
        if tick >= self._available_at:
            self._available_at = self._draw(tick)
            return ReinforcementDecision(deliver=True, next_criterion=self.mean_ticks)
        return ReinforcementDecision(deliver=False, next_criterion=self._available_at - tick)

    def get_strength(self) -> float:
        return 0.5

    @property
    def name(self) -> str:
        return f"VI-{self.mean_ticks}"


def make_schedule(schedule_type: str, parameter: int,
                  rng: np.random.Generator) -> BaseSchedule:
    t = schedule_type.lower()
    if t in ("crf", "continuous"):
        return CRFSchedule()
    if t in ("ext", "extinction", "no_reinforcement"):
        return ExtinctionSchedule()
    if t == "fr":
        return FixedRatioSchedule(parameter)
    if t == "vr":
        return VariableRatioSchedule(parameter, rng)
    if t == "fi":
        return FixedIntervalSchedule(parameter)
    if t == "vi":
        return VariableIntervalSchedule(parameter, rng)
    raise ValueError(f"Unknown schedule type: {schedule_type!r}")
