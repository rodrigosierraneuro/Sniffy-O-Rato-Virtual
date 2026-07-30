"""
Parser for the .sdf binary format used by Sniffy Pro.

Magic header (offset 0x00): "PsychoMouse 6016fMac\x00"
Animation param table (offset 0x0f00): 999 entries × 8 float32 BE
Schedule config (offset 0x25ee): type uint16 LE, param uint16 LE
"""
from __future__ import annotations
import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

MAGIC = b"PsychoMouse 6016fMac\x00"

# Confirmed schedule type codes from VR-25.sdf (type=5) and ShapeBP.sdf (type=6)
SCHEDULE_TYPE_MAP = {
    0: "no_reinforcement",
    1: "fr",
    2: "fi",
    3: "vi",
    4: "ext",
    5: "vr",
    6: "crf",
}

ANIM_PARAM_OFFSET = 0x0F00
ANIM_STATE_COUNT = 999
SCHEDULE_TYPE_OFFSET = 0x25EE
SCHEDULE_PARAM_OFFSET = 0x25F0
FOOD_SOUND_OFFSET = 0x25C0


@dataclass
class AnimStateParams:
    state_id: int
    base: float
    beh: float
    pain: float
    sctr: float
    dsc: float
    sch: float
    crt: float
    thrshdl: float


@dataclass
class SDFData:
    schedule_type: str
    schedule_param: int
    food_sound_association: float
    target_behavior: Optional[str]
    animation_params: List[AnimStateParams] = field(default_factory=list)
    raw: bytes = field(default=b"", repr=False)


class SDFParser:
    def parse(self, path: Path) -> SDFData:
        data = path.read_bytes()

        if not data.startswith(MAGIC):
            raise ValueError(
                f"{path.name}: invalid magic (expected 'PsychoMouse 6016fMac\\x00')"
            )

        # Animation parameter table
        anim_params: List[AnimStateParams] = []
        offset = ANIM_PARAM_OFFSET
        for i in range(ANIM_STATE_COUNT):
            if offset + 32 > len(data):
                break
            floats = struct.unpack_from(">8f", data, offset)
            anim_params.append(AnimStateParams(i, *floats))
            offset += 32

        # Schedule configuration
        schedule_type = "vr"
        schedule_param = 1
        food_sound = 0.0

        if SCHEDULE_TYPE_OFFSET + 2 <= len(data):
            type_code = struct.unpack_from("<H", data, SCHEDULE_TYPE_OFFSET)[0]
            schedule_type = SCHEDULE_TYPE_MAP.get(type_code, "crf")

        if SCHEDULE_PARAM_OFFSET + 2 <= len(data):
            schedule_param = struct.unpack_from("<H", data, SCHEDULE_PARAM_OFFSET)[0]
            schedule_param = max(1, schedule_param)

        if FOOD_SOUND_OFFSET + 4 <= len(data):
            try:
                food_sound = struct.unpack_from("<f", data, FOOD_SOUND_OFFSET)[0]
                if not (0.0 <= food_sound <= 1.0):
                    food_sound = 0.0
            except Exception:
                food_sound = 0.0

        # Detect target behavior from embedded ASCII strings
        target = self._find_target_behavior(data)

        return SDFData(
            schedule_type=schedule_type,
            schedule_param=schedule_param,
            food_sound_association=food_sound,
            target_behavior=target,
            animation_params=anim_params,
            raw=data,
        )

    def _find_target_behavior(self, data: bytes) -> Optional[str]:
        known = [
            b"Bar Press", b"Beg", b"Roll", b"Face Wipe", b"Face Touch",
            b"Head Lower", b"Head Tuck", b"Rear Up Facing Back",
            b"Rear Up Facing Front", b"No Reinforcement",
        ]
        # Return the first non-"No Reinforcement" match
        found = []
        for name in known:
            if name in data:
                found.append(name.decode())
        for f in found:
            if f != "No Reinforcement":
                return f
        return found[0] if found else None

    def summarize(self, sdf: SDFData) -> str:
        lines = [
            f"Schedule: {sdf.schedule_type.upper()}-{sdf.schedule_param}",
            f"Target behavior: {sdf.target_behavior}",
            f"Food-sound association: {sdf.food_sound_association:.3f}",
            f"Animation states parsed: {len(sdf.animation_params)}",
        ]
        return "\n".join(lines)
