from __future__ import annotations
from typing import Dict, Optional
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.figure

from .metrics import cumulative_record, learning_curve, irt_distribution, behavior_frequency


def plot_cumulative_record(df: pd.DataFrame, behavior: str = "Bar Press",
                           title: Optional[str] = None) -> matplotlib.figure.Figure:
    rec = cumulative_record(df, behavior)
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.step(rec["time_s"], rec["cumulative"], where="post", color="#2563EB", lw=1.5)

    reinf_times = rec[rec["reinforced"]]["time_s"]
    reinf_cum = rec[rec["reinforced"]]["cumulative"]
    ax.scatter(reinf_times, reinf_cum, marker="|", color="#DC2626", s=60, zorder=5,
               label="Reinforcement")

    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Cumulative Responses")
    ax.set_title(title or f"Cumulative Record — {behavior}")
    ax.legend(fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return fig


def plot_learning_curve(df: pd.DataFrame, behavior: str = "Bar Press",
                        window_ticks: int = 3000, ticks_per_second: int = 10,
                        title: Optional[str] = None) -> matplotlib.figure.Figure:
    lc = learning_curve(df, behavior, window_ticks, ticks_per_second)
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(lc["time_min"], lc["rate_per_min"], color="#16A34A", lw=2, marker="o", ms=4)
    ax.set_xlabel("Time (min)")
    ax.set_ylabel("Responses / min")
    ax.set_title(title or f"Learning Curve — {behavior}")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return fig


def plot_irt_histogram(df: pd.DataFrame, behavior: str = "Bar Press",
                       bins: int = 30) -> matplotlib.figure.Figure:
    irt = irt_distribution(df, behavior)
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(irt, bins=bins, color="#7C3AED", edgecolor="white", lw=0.5)
    ax.set_xlabel("Inter-Response Time (ticks)")
    ax.set_ylabel("Frequency")
    ax.set_title(f"IRT Distribution — {behavior}")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return fig


def plot_behavior_frequency(df: pd.DataFrame, top_n: int = 10) -> matplotlib.figure.Figure:
    freq = behavior_frequency(df, top_n)
    fig, ax = plt.subplots(figsize=(9, 4))
    colors = plt.cm.tab10.colors[:len(freq)]
    ax.barh(freq.index[::-1], freq.values[::-1], color=colors[::-1])
    ax.set_xlabel("Count")
    ax.set_title("Behavior Frequency")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return fig


def plot_schedule_comparison(sessions: Dict[str, pd.DataFrame],
                              behavior: str = "Bar Press") -> matplotlib.figure.Figure:
    colors = ["#2563EB", "#DC2626", "#16A34A", "#D97706"]
    fig, ax = plt.subplots(figsize=(11, 5))
    for i, (label, df) in enumerate(sessions.items()):
        rec = cumulative_record(df, behavior)
        ax.step(rec["time_s"], rec["cumulative"], where="post",
                color=colors[i % len(colors)], lw=1.5, label=label)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Cumulative Responses")
    ax.set_title(f"Schedule Comparison — {behavior}")
    ax.legend()
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return fig


def save_all(df: pd.DataFrame, output_dir: str, behavior: str = "Bar Press",
             ticks_per_second: int = 10) -> None:
    from pathlib import Path
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    figs = {
        "cumulative_record": plot_cumulative_record(df, behavior),
        "learning_curve": plot_learning_curve(df, behavior,
                                               ticks_per_second=ticks_per_second),
        "irt_histogram": plot_irt_histogram(df, behavior),
        "behavior_frequency": plot_behavior_frequency(df),
    }
    for name, fig in figs.items():
        path = out / f"{name}.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)
        print(f"  Saved {path}")
