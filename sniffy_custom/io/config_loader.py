from __future__ import annotations
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
import yaml

from ..core.behavior import BehaviorParams
from ..core.schedules import make_schedule

if TYPE_CHECKING:
    from ..core.experiment import Experiment

# The 10 original Sniffy Pro behaviors with reverse-engineered parameters
DEFAULT_BEHAVIORS: list[BehaviorParams] = [
    BehaviorParams(0x00, "No Reinforcement", base=8.0,  beh=0.0,  pain=0.0,  sctr=0.5,  dsc=0.0, sch=0.0, crt=0.0,  thrshdl=0.0,  reinforceable=False),
    BehaviorParams(0x81, "Bar Press",        base=0.4,  beh=0.05, pain=0.2,  sctr=0.6,  dsc=0.1, sch=0.9, crt=0.1,  thrshdl=0.0,  reinforceable=True),
    BehaviorParams(0x82, "Beg",              base=0.01, beh=0.02, pain=0.15, sctr=0.5,  dsc=0.1, sch=0.8, crt=0.1,  thrshdl=0.0,  reinforceable=True),
    BehaviorParams(0x85, "Roll",             base=0.01, beh=0.02, pain=0.05, sctr=0.4,  dsc=0.1, sch=0.7, crt=0.05, thrshdl=0.0,  reinforceable=True),
    BehaviorParams(0x87, "Face Wipe",        base=0.02, beh=0.02, pain=0.05, sctr=0.4,  dsc=0.1, sch=0.7, crt=0.05, thrshdl=0.0,  reinforceable=True),
    BehaviorParams(0x88, "Face Touch",       base=0.03, beh=0.02, pain=0.05, sctr=0.35, dsc=0.1, sch=0.7, crt=0.05, thrshdl=0.0,  reinforceable=True),
    BehaviorParams(0x89, "Head Lower",       base=0.02, beh=0.02, pain=0.1,  sctr=0.4,  dsc=0.1, sch=0.75, crt=0.05, thrshdl=0.0, reinforceable=True),
    BehaviorParams(0x8A, "Head Tuck",        base=0.02, beh=0.02, pain=0.1,  sctr=0.4,  dsc=0.1, sch=0.75, crt=0.05, thrshdl=0.0, reinforceable=True),
    BehaviorParams(0x8B, "Rear Up Facing Back",  base=0.01, beh=0.02, pain=0.1, sctr=0.45, dsc=0.1, sch=0.8, crt=0.08, thrshdl=0.0, reinforceable=True),
    BehaviorParams(0x8C, "Rear Up Facing Front", base=0.01, beh=0.02, pain=0.1, sctr=0.45, dsc=0.1, sch=0.8, crt=0.08, thrshdl=0.0, reinforceable=True),
]


def _parse_behavior(d: dict) -> BehaviorParams:
    return BehaviorParams(
        behavior_id=d.get("id", 0x200),
        name=d["name"],
        base=float(d.get("base", 0.01)),
        beh=float(d.get("beh", 0.0)),
        pain=float(d.get("pain", 0.1)),
        sctr=float(d.get("sctr", 0.3)),
        dsc=float(d.get("dsc", 0.1)),
        sch=float(d.get("sch", 0.7)),
        crt=float(d.get("crt", 0.05)),
        thrshdl=float(d.get("thrshdl", 0.0)),
        reinforceable=bool(d.get("trainable", True)),
        description=d.get("description", ""),
    )


def load_config(config_path: str) -> "Experiment":
    from ..core.experiment import Experiment

    text = Path(config_path).read_text()
    cfg = yaml.safe_load(text)

    seed = cfg.get("experiment", {}).get("seed", None)
    rng = np.random.default_rng(seed)

    # Build behavior list
    behaviors = list(DEFAULT_BEHAVIORS)
    if not cfg.get("experiment", {}).get("include_builtin_behaviors", True):
        behaviors = []

    overrides = cfg.get("organism", {}).get("behavior_overrides", {})
    for b in behaviors:
        if b.name in overrides:
            for k, v in overrides[b.name].items():
                setattr(b, k, float(v))

    for custom in cfg.get("organism", {}).get("custom_behaviors", []):
        behaviors.append(_parse_behavior(custom))

    # Schedule
    sched_cfg = cfg.get("schedule", {})
    schedule = make_schedule(
        sched_cfg.get("type", "vr"),
        int(sched_cfg.get("parameter", 15)),
        rng,
    )
    target = sched_cfg.get("target_behavior", "Bar Press")

    exp_cfg = cfg.get("experiment", {})
    return Experiment(
        behaviors=behaviors,
        schedule=schedule,
        target_behavior=target,
        ticks_per_second=int(exp_cfg.get("ticks_per_second", 10)),
        seed=seed,
        name=exp_cfg.get("name", "Custom Experiment"),
        deprivation_initial=float(cfg.get("organism", {}).get("deprivation_initial", 0.8)),
    )
