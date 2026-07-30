"""
Draws the virtual rat using matplotlib patches.
Recreated programmatically since sprites could not be extracted
from SniffyPro.exe (images stored in proprietary PE resource format).
"""
from __future__ import annotations
from typing import Tuple
import numpy as np
import matplotlib.patches as mpatches
import matplotlib.transforms as mtransforms
from matplotlib.axes import Axes


RAT_COLOR = "#F5F0E8"       # off-white coat
NOSE_COLOR = "#F87171"      # pink nose
EAR_COLOR = "#FBBF24"       # light tan ears
EYE_COLOR = "#1E1B18"       # dark eyes
TAIL_COLOR = "#D1D5DB"      # light gray tail


def _rotation(facing: str) -> float:
    return {"E": 0, "W": 180, "N": 90, "S": 270}.get(facing, 0)


def draw_rat(ax: Axes, x: float, y: float, facing: str = "E",
             category: str = "walk", scale: float = 0.06) -> None:
    """Draw a rat at cage-space coordinates (x, y) in [0,1]."""
    angle = _rotation(facing)
    tr = mtransforms.Affine2D().rotate_deg(angle).translate(x, y) + ax.transData

    s = scale

    if category in ("rear", "beg"):
        _draw_rearing(ax, s, tr)
    elif category == "press":
        _draw_pressing(ax, s, tr, facing)
    elif category == "groom":
        _draw_grooming(ax, s, tr)
    else:
        _draw_walking(ax, s, tr)


def _draw_walking(ax: Axes, s: float, tr) -> None:
    # Body (elongated oval)
    body = mpatches.Ellipse((0, 0), 2.2 * s, 1.2 * s,
                             facecolor=RAT_COLOR, edgecolor="#9CA3AF", lw=0.8,
                             transform=tr, zorder=4)
    ax.add_patch(body)
    # Head
    head = mpatches.Ellipse((1.1 * s, 0), 0.9 * s, 0.75 * s,
                             facecolor=RAT_COLOR, edgecolor="#9CA3AF", lw=0.8,
                             transform=tr, zorder=5)
    ax.add_patch(head)
    # Nose
    nose = mpatches.Ellipse((1.55 * s, 0), 0.2 * s, 0.16 * s,
                             facecolor=NOSE_COLOR, transform=tr, zorder=6)
    ax.add_patch(nose)
    # Eye
    eye = mpatches.Circle((1.05 * s, 0.2 * s), 0.1 * s,
                           facecolor=EYE_COLOR, transform=tr, zorder=6)
    ax.add_patch(eye)
    # Ear
    ear = mpatches.Ellipse((0.8 * s, 0.42 * s), 0.3 * s, 0.22 * s,
                            facecolor=EAR_COLOR, edgecolor="#9CA3AF", lw=0.5,
                            transform=tr, zorder=5)
    ax.add_patch(ear)
    # Tail (curved line behind body)
    tail_x = np.linspace(-1.1 * s, -1.7 * s, 20)
    tail_y = 0.3 * s * np.sin(np.linspace(0, np.pi, 20))
    ax.plot(tail_x, tail_y, color=TAIL_COLOR, lw=1.5, transform=tr, zorder=3)


def _draw_rearing(ax: Axes, s: float, tr) -> None:
    # Body vertical
    body = mpatches.Ellipse((0, 0.4 * s), 1.0 * s, 2.0 * s,
                             facecolor=RAT_COLOR, edgecolor="#9CA3AF", lw=0.8,
                             transform=tr, zorder=4)
    ax.add_patch(body)
    head = mpatches.Ellipse((0, 1.5 * s), 0.75 * s, 0.85 * s,
                             facecolor=RAT_COLOR, edgecolor="#9CA3AF", lw=0.8,
                             transform=tr, zorder=5)
    ax.add_patch(head)
    nose = mpatches.Ellipse((0.35 * s, 1.55 * s), 0.18 * s, 0.15 * s,
                             facecolor=NOSE_COLOR, transform=tr, zorder=6)
    ax.add_patch(nose)
    eye = mpatches.Circle((0.18 * s, 1.6 * s), 0.09 * s,
                           facecolor=EYE_COLOR, transform=tr, zorder=6)
    ax.add_patch(eye)
    # Front paws raised
    ax.plot([0.4 * s, 0.7 * s], [0.6 * s, 1.0 * s],
            color="#9CA3AF", lw=2, transform=tr, zorder=3)
    ax.plot([-0.4 * s, -0.7 * s], [0.6 * s, 1.0 * s],
            color="#9CA3AF", lw=2, transform=tr, zorder=3)
    # Tail
    tail_x = np.linspace(0, 0.3 * s, 20)
    tail_y = -1.1 * s - 0.4 * s * np.sin(np.linspace(0, np.pi, 20))
    ax.plot(tail_x, tail_y, color=TAIL_COLOR, lw=1.5, transform=tr, zorder=3)


def _draw_pressing(ax: Axes, s: float, tr, facing: str) -> None:
    _draw_walking(ax, s, tr)
    # Extended paw toward bar
    ax.plot([1.4 * s, 2.0 * s], [0, 0],
            color="#9CA3AF", lw=3, transform=tr, zorder=7, solid_capstyle="round")


def _draw_grooming(ax: Axes, s: float, tr) -> None:
    _draw_walking(ax, s, tr)
    # Paw raised to face
    ax.plot([1.0 * s, 1.3 * s], [0, 0.35 * s],
            color="#9CA3AF", lw=2.5, transform=tr, zorder=7, solid_capstyle="round")


def draw_chamber_elements(ax: Axes) -> dict:
    """Draw fixed chamber elements. Returns dict with element positions."""
    # Bar / lever
    bar = mpatches.FancyBboxPatch((0.82, 0.38), 0.06, 0.24,
                                   boxstyle="round,pad=0.01",
                                   facecolor="#6B7280", edgecolor="#374151", lw=1.5,
                                   zorder=6)
    ax.add_patch(bar)
    ax.text(0.85, 0.64, "BARRA", ha="center", va="bottom",
            fontsize=6, color="#374151", fontweight="bold")

    # Hopper / food dispenser
    hopper = mpatches.FancyBboxPatch((0.82, 0.15), 0.10, 0.18,
                                      boxstyle="round,pad=0.01",
                                      facecolor="#D97706", edgecolor="#92400E", lw=1.5,
                                      zorder=6)
    ax.add_patch(hopper)
    ax.text(0.87, 0.11, "HOPPER", ha="center", va="top",
            fontsize=6, color="#92400E", fontweight="bold")

    # Stimulus lights on top wall
    light_positions = [(0.15, 0.92), (0.45, 0.92), (0.70, 0.92)]
    light_labels = ["S+", "S-", "LUZ"]
    light_patches = []
    for (lx, ly), label in zip(light_positions, light_labels):
        c = mpatches.Circle((lx, ly), 0.04,
                             facecolor="#FEF08A", edgecolor="#CA8A04",
                             lw=1.2, zorder=6)
        ax.add_patch(c)
        ax.text(lx, ly - 0.07, label, ha="center", va="top",
                fontsize=6, color="#713F12")
        light_patches.append(c)

    return {
        "bar_pos": (0.85, 0.5),
        "hopper_pos": (0.87, 0.24),
        "light_patches": light_patches,
    }


def flash_hopper(ax: Axes, elements: dict, on: bool = True) -> None:
    hopper_patches = [p for p in ax.patches
                      if isinstance(p, mpatches.FancyBboxPatch)
                      and p.get_facecolor()[:3] == (0.851, 0.467, 0.024)]
    color = "#FCD34D" if on else "#D97706"
    for p in hopper_patches:
        p.set_facecolor(color)


def flash_light(elements: dict, idx: int, on: bool = True) -> None:
    lights = elements.get("light_patches", [])
    if idx < len(lights):
        lights[idx].set_facecolor("#FDE047" if on else "#FEF08A")
        lights[idx].set_edgecolor("#EAB308" if on else "#CA8A04")
