from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


DIRECTIONS = ("N", "S", "E", "W")

# Canonical behavior states derived from .sdf animation state names
BEHAVIOR_STATES = [
    # (state_id, name, category, facing)
    (0x00, "Idle",              "idle",      None),
    (0x10, "Walk E",            "walk",      "E"),
    (0x11, "Walk W",            "walk",      "W"),
    (0x12, "Walk N",            "walk",      "N"),
    (0x13, "Walk S",            "walk",      "S"),
    (0x20, "Turn E",            "turn",      "E"),
    (0x21, "Turn W",            "turn",      "W"),
    (0x22, "Turn N",            "turn",      "N"),
    (0x23, "Turn S",            "turn",      "S"),
    (0x30, "Rear E",            "rear",      "E"),
    (0x31, "Rear W",            "rear",      "W"),
    (0x32, "Low Rear",          "rear",      None),
    (0x40, "Bar Press E",       "press",     "E"),
    (0x41, "Bar Press W",       "press",     "W"),
    (0x50, "Beg",               "beg",       None),
    (0x51, "Mount Beg",         "beg",       None),
    (0x60, "Roll",              "roll",      None),
    (0x61, "Rock N Roll",       "roll",      None),
    (0x70, "Face Wipe",         "groom",     None),
    (0x71, "Face Touch",        "groom",     None),
    (0x72, "Groom",             "groom",     None),
    (0x80, "Head Lower",        "posture",   None),
    (0x81, "Head Tuck",         "posture",   None),
    (0x90, "Sniff Hopper",      "sniff",     None),
    (0x91, "Sniff N",           "sniff",     "N"),
    (0x92, "Sniff E",           "sniff",     "E"),
    (0x93, "Sniff W",           "sniff",     "W"),
    (0xA0, "Eat",               "eat",       None),
    (0xA1, "Drink",             "drink",     None),
    (0xB0, "Fear E",            "fear",      "E"),
    (0xB1, "Fear W",            "fear",      "W"),
    (0xB2, "Fear N",            "fear",      "N"),
    (0xB3, "Fear S",            "fear",      "S"),
    (0xC0, "Pain Rear E",       "pain",      "E"),
    (0xC1, "Pain Rear W",       "pain",      "W"),
    (0xC2, "High Pain",         "pain",      None),
]

# Map behavior name -> animation state id
BEHAVIOR_TO_STATE: Dict[str, int] = {
    "Bar Press":            0x40,
    "Beg":                  0x50,
    "Roll":                 0x60,
    "Face Wipe":            0x70,
    "Face Touch":           0x71,
    "Head Lower":           0x80,
    "Head Tuck":            0x81,
    "Rear Up Facing Back":  0x30,
    "Rear Up Facing Front": 0x31,
    "No Reinforcement":     0x00,
}


@dataclass
class State:
    state_id: int
    name: str
    category: str
    facing: Optional[str]


@dataclass
class RatPose:
    """Current physical pose of the virtual rat."""
    state: State
    position: Tuple[float, float] = (0.5, 0.5)   # (x, y) in [0,1] cage space
    facing: str = "E"
    last_behavior: str = "Idle"

    @property
    def category(self) -> str:
        return self.state.category


class StateMachine:
    def __init__(self):
        self._states: Dict[int, State] = {
            sid: State(sid, name, cat, facing)
            for sid, name, cat, facing in BEHAVIOR_STATES
        }
        self._current = self._states[0x00]
        self.position: Tuple[float, float] = (0.5, 0.5)
        self.facing: str = "E"

    @property
    def current(self) -> State:
        return self._current

    def transition_to_behavior(self, behavior_name: str) -> State:
        sid = BEHAVIOR_TO_STATE.get(behavior_name, 0x00)
        self._current = self._states.get(sid, self._states[0x00])
        self._update_facing(behavior_name)
        return self._current

    def _update_facing(self, behavior_name: str) -> None:
        facing = self._current.facing
        if facing:
            self.facing = facing

    def move(self, dx: float, dy: float,
             cage_w: float = 1.0, cage_h: float = 1.0) -> None:
        x = max(0.05, min(cage_w - 0.05, self.position[0] + dx))
        y = max(0.05, min(cage_h - 0.05, self.position[1] + dy))
        self.position = (x, y)
        if abs(dx) > abs(dy):
            self.facing = "E" if dx > 0 else "W"
        elif abs(dy) > 0:
            self.facing = "N" if dy > 0 else "S"

    def get_pose(self) -> RatPose:
        return RatPose(
            state=self._current,
            position=self.position,
            facing=self.facing,
            last_behavior=self._current.name,
        )
