"""
2D animated Skinner box chamber using matplotlib FuncAnimation.
The rat is drawn programmatically with patches (sprites could not be
extracted from SniffyPro.exe — stored in proprietary PE resource format).
"""
from __future__ import annotations
import threading
from collections import deque
from typing import Optional, Callable, Deque

import matplotlib
matplotlib.use("TkAgg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.animation import FuncAnimation
from matplotlib.gridspec import GridSpec

from .rat_drawing import draw_rat, draw_chamber_elements, flash_hopper, flash_light
from ..core.experiment import Experiment, SessionEvent


CHAMBER_BG = "#F3F0E8"
WALL_COLOR = "#B5A99A"
FLOOR_COLOR = "#C8B89A"
GRID_COLOR = "#A09080"
PANEL_BG = "#1E1B18"


class ChamberWindow:
    """
    Live 2D animated view of the conditioning chamber.

    Usage:
        window = ChamberWindow(experiment)
        window.run(max_ticks=36000)
    """

    def __init__(self, experiment: Experiment, ticks_per_frame: int = 3,
                 on_manual_reinforce: Optional[Callable] = None):
        self.exp = experiment
        self.ticks_per_frame = ticks_per_frame
        self._on_manual_reinforce = on_manual_reinforce
        self._events: Deque[SessionEvent] = deque(maxlen=5000)
        self._cumulative: list[int] = [0]
        self._times: list[float] = [0.0]
        self._running = False
        self._hopper_flash_ticks = 0
        self._fig: Optional[plt.Figure] = None

    def run(self, max_ticks: int = 36000) -> None:
        self._max_ticks = max_ticks
        self._setup_figure()
        interval_ms = max(16, int(1000 / (self.exp.ticks_per_second / self.ticks_per_frame)))
        self._anim = FuncAnimation(
            self._fig, self._update_frame,
            interval=interval_ms, blit=False, cache_frame_data=False,
        )
        self._running = True
        plt.show()

    def _setup_figure(self) -> None:
        self._fig = plt.figure(figsize=(13, 7), facecolor=PANEL_BG)
        self._fig.canvas.manager.set_window_title(
            f"Sniffy Virtual — {self.exp.name} [{self.exp.schedule.name}]"
        )
        gs = GridSpec(3, 2, figure=self._fig,
                      width_ratios=[2.2, 1], height_ratios=[1, 2, 1],
                      hspace=0.35, wspace=0.2,
                      left=0.04, right=0.97, top=0.94, bottom=0.06)

        # --- Chamber panel ---
        self._ax_chamber = self._fig.add_subplot(gs[:2, 0])
        self._setup_chamber(self._ax_chamber)

        # --- Info panel (bottom left) ---
        self._ax_info = self._fig.add_subplot(gs[2, 0])
        self._ax_info.set_facecolor(PANEL_BG)
        self._ax_info.axis("off")
        self._info_text = self._ax_info.text(
            0.01, 0.85, "", transform=self._ax_info.transAxes,
            color="#E2E0DC", fontsize=9, fontfamily="monospace", va="top",
        )
        self._fig.text(0.03, 0.01, "Pressione 'r' para reforçar manualmente | 'q' para sair",
                       color="#6B7280", fontsize=7)

        # --- Cumulative record ---
        self._ax_cum = self._fig.add_subplot(gs[0, 1])
        self._ax_cum.set_facecolor("#111111")
        self._ax_cum.tick_params(colors="#9CA3AF", labelsize=7)
        self._ax_cum.set_title("Registro Cumulativo", color="#E2E0DC", fontsize=8)
        self._ax_cum.set_xlabel("Tempo (s)", color="#9CA3AF", fontsize=7)
        self._ax_cum.set_ylabel("Respostas", color="#9CA3AF", fontsize=7)
        for spine in self._ax_cum.spines.values():
            spine.set_color("#374151")
        self._cum_line, = self._ax_cum.plot([], [], color="#60A5FA", lw=1)
        self._reinf_scatter = self._ax_cum.scatter([], [], marker="|",
                                                    color="#F87171", s=50, zorder=5)

        # --- Behavior strength bars ---
        self._ax_bars = self._fig.add_subplot(gs[1:, 1])
        self._ax_bars.set_facecolor("#111111")
        self._ax_bars.tick_params(colors="#9CA3AF", labelsize=6.5)
        self._ax_bars.set_title("Força dos Comportamentos", color="#E2E0DC", fontsize=8)
        for spine in self._ax_bars.spines.values():
            spine.set_color("#374151")
        self._setup_behavior_bars(self._ax_bars)

        # Key bindings
        self._fig.canvas.mpl_connect("key_press_event", self._on_key)

    def _setup_chamber(self, ax: plt.Axes) -> None:
        ax.set_facecolor(CHAMBER_BG)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_aspect("equal")
        ax.axis("off")

        # Floor grid (metal grid pattern)
        for x in [i * 0.1 for i in range(1, 10)]:
            ax.axvline(x, color=GRID_COLOR, lw=0.3, alpha=0.4, zorder=1)
        for y in [i * 0.1 for i in range(1, 10)]:
            ax.axhline(y, color=GRID_COLOR, lw=0.3, alpha=0.4, zorder=1)

        # Walls
        for spine in ["bottom", "top", "left", "right"]:
            ax.spines[spine].set_visible(True)
            ax.spines[spine].set_color(WALL_COLOR)
            ax.spines[spine].set_linewidth(3)

        # Fixed elements
        self._elements = draw_chamber_elements(ax)
        ax.set_title(f"{self.exp.name}  |  {self.exp.schedule.name}",
                     color="#374151", fontsize=9, fontweight="bold")

        # Rat artist placeholder (redrawn each frame)
        self._rat_artists: list = []

    def _setup_behavior_bars(self, ax: plt.Axes) -> None:
        names = [b.name for b in self.exp.behaviors if b.name != "No Reinforcement"][:8]
        self._bar_names = names
        colors = plt.cm.tab10.colors[:len(names)]
        self._bar_rects = ax.barh(names, [0.0] * len(names), color=colors)
        ax.set_xlim(0, 1)
        ax.set_xlabel("Momentum (beh)", color="#9CA3AF", fontsize=7)

    def _update_frame(self, frame: int) -> None:
        if not self._running:
            return
        if self.exp._tick >= self._max_ticks:
            self._running = False
            return

        # Run simulation ticks
        latest: Optional[SessionEvent] = None
        for _ in range(self.ticks_per_frame):
            if self.exp._tick >= self._max_ticks:
                break
            event = self.exp.step()
            self._events.append(event)
            if event.behavior_name == self.exp.target_behavior:
                self._cumulative.append(event.cumulative_responses)
                self._times.append(event.session_time_s)
            if event.reinforcement_delivered:
                self._hopper_flash_ticks = 8
            latest = event

        if latest is None:
            return

        # Flash hopper
        if self._hopper_flash_ticks > 0:
            self._hopper_flash_ticks -= 1
            flash_hopper(self._ax_chamber, self._elements, on=True)
        else:
            flash_hopper(self._ax_chamber, self._elements, on=False)

        # Redraw rat
        for artist in self._rat_artists:
            try:
                artist.remove()
            except Exception:
                pass
        self._rat_artists.clear()

        x, y = latest.position
        # Clip to visible cage (avoid overlap with wall elements)
        x = min(x, 0.75)
        x = max(x, 0.05)
        y = min(y, 0.88)
        y = max(y, 0.08)

        _n = len(self._ax_chamber.patches)
        draw_rat(self._ax_chamber, x, y,
                 facing=latest.facing,
                 category=self._ax_chamber.patches[0].get_facecolor() and
                 self.exp._state_machine.current.category,
                 scale=0.055)
        new_artists = self._ax_chamber.patches[_n:]
        self._rat_artists.extend(new_artists)
        self._rat_artists.extend(
            [l for l in self._ax_chamber.lines if l not in getattr(self, "_static_lines", [])]
        )

        # Update cumulative record
        if len(self._cumulative) > 1:
            times = self._times[-500:]
            cum = self._cumulative[-500:]
            self._cum_line.set_data(times, cum)
            self._ax_cum.set_xlim(min(times), max(times) + 1)
            self._ax_cum.set_ylim(0, max(cum) * 1.15 + 1)

        # Update behavior strength bars
        for rect, b in zip(self._bar_rects, self._bar_names):
            beh_obj = next((bh for bh in self.exp.behaviors if bh.name == b), None)
            if beh_obj:
                rect.set_width(min(1.0, max(0.0, beh_obj.beh)))

        # Update info text
        rate = latest.cumulative_responses / max(1.0, latest.session_time_s / 60.0)
        text = (
            f"Tick:        {latest.tick:>6}/{self._max_ticks}\n"
            f"Tempo:       {latest.session_time_s:>6.1f}s\n"
            f"Comportamento: {latest.behavior_name}\n"
            f"Respostas:   {latest.cumulative_responses:>6}\n"
            f"Reforços:    {latest.cumulative_reinforcements:>6}\n"
            f"Taxa:        {rate:>5.1f} resp/min\n"
            f"Esquema:     {latest.schedule_name}"
        )
        self._info_text.set_text(text)
        self._fig.canvas.draw_idle()

    def _on_key(self, event) -> None:
        if event.key == "q":
            self._running = False
            plt.close(self._fig)
        elif event.key == "r" and self._on_manual_reinforce:
            self._on_manual_reinforce()
