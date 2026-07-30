from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import numpy as np


@dataclass
class BehaviorParams:
    """
    Nine-parameter model extracted from SniffyPro.exe strings:
    "ID %d Base %6.4f Beh %6.4f Pain %6.4f Sctr %6.4f Dsc %6.4f Sch %6.4f Crt %6.4f Thrshdl %6.4f"
    """
    behavior_id: int
    name: str
    base: float       # baseline probability per tick
    beh: float        # behavioral momentum modifier (reinforcement history)
    pain: float       # fear/pain suppression factor
    sctr: float       # scatter / noise variance
    dsc: float        # discrimination factor (S+/S- sensitivity)
    sch: float        # schedule strength contribution
    crt: float        # critical threshold (deprivation/satiation gate)
    thrshdl: float    # hard activation threshold
    reinforceable: bool = True
    description: str = ""

    def to_array(self) -> np.ndarray:
        return np.array(
            [self.base, self.beh, self.pain, self.sctr,
             self.dsc, self.sch, self.crt, self.thrshdl],
            dtype=np.float64,
        )


@dataclass
class RuntimeState:
    deprivation: float = 0.8
    reinf_history: float = 0.0
    schedule_strength: float = 0.0
    disc_weight: float = 0.5        # 1.0 = S+, 0.0 = S-, 0.5 = neutral
    pain_level: float = 0.0
    contrast_factor: float = 1.0


def compute_probability(params: BehaviorParams, state: RuntimeState,
                        rng: np.random.Generator) -> float:
    p = params.base * (1.0 + state.deprivation * params.crt)
    p *= (1.0 + params.beh * state.reinf_history)
    p *= max(0.0, 1.0 - params.pain * state.pain_level)
    p *= (1.0 + params.sch * state.schedule_strength)
    p *= (params.dsc * state.disc_weight + (1.0 - params.dsc) * 0.5) * 2.0
    noise = rng.normal(0.0, params.sctr * abs(p) + 1e-9)
    p = max(0.0, p + noise) * state.contrast_factor
    return 0.0 if p < params.thrshdl else min(1.0, p)


def compute_all_probabilities(behaviors: List[BehaviorParams], state: RuntimeState,
                               rng: np.random.Generator) -> np.ndarray:
    arr = np.array([b.to_array() for b in behaviors], dtype=np.float64)
    base, beh, pain, sctr, dsc, sch, crt, thrshdl = arr.T

    p = base * (1.0 + state.deprivation * crt)
    p *= (1.0 + beh * state.reinf_history)
    p *= np.maximum(0.0, 1.0 - pain * state.pain_level)
    p *= (1.0 + sch * state.schedule_strength)
    p *= (dsc * state.disc_weight + (1.0 - dsc) * 0.5) * 2.0
    noise = rng.normal(0.0, sctr * np.abs(p) + 1e-9)
    p = np.maximum(0.0, p + noise) * state.contrast_factor
    p = np.where(p < thrshdl, 0.0, p)
    return np.minimum(1.0, p)


def select_behavior(probs: np.ndarray, rng: np.random.Generator) -> int:
    total = probs.sum()
    if total <= 0.0:
        return int(rng.integers(len(probs)))
    return int(rng.choice(len(probs), p=probs / total))


def update_behavior_momentum(beh: float, reinforced: bool,
                              learning_rate: float = 0.15,
                              extinction_rate: float = 0.05) -> float:
    if reinforced:
        return beh + learning_rate * (1.0 - beh)
    return beh - extinction_rate * beh
