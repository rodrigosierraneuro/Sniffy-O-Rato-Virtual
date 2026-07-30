from __future__ import annotations
from typing import Optional
import numpy as np
import pandas as pd


def response_rate(df: pd.DataFrame, behavior: str = "Bar Press",
                  bin_ticks: int = 100, ticks_per_second: int = 10) -> pd.DataFrame:
    resp = df[df["behavior"] == behavior].copy()
    resp["bin"] = resp["tick"] // bin_ticks
    counts = resp.groupby("bin").size().reset_index(name="responses")
    bin_s = bin_ticks / ticks_per_second
    counts["rate_per_min"] = counts["responses"] * (60.0 / bin_s)
    return counts


def cumulative_record(df: pd.DataFrame,
                      behavior: str = "Bar Press") -> pd.DataFrame:
    resp = df[df["behavior"] == behavior].sort_values("time_s").copy()
    resp["cumulative"] = np.arange(1, len(resp) + 1)
    return resp[["time_s", "cumulative", "reinforced"]].reset_index(drop=True)


def irt_distribution(df: pd.DataFrame,
                     behavior: str = "Bar Press") -> pd.Series:
    ticks = df[df["behavior"] == behavior]["tick"].sort_values().values
    if len(ticks) < 2:
        return pd.Series(dtype=float, name="irt_ticks")
    return pd.Series(np.diff(ticks), name="irt_ticks")


def learning_curve(df: pd.DataFrame, behavior: str = "Bar Press",
                   window_ticks: int = 3000,
                   ticks_per_second: int = 10) -> pd.DataFrame:
    resp = df[df["behavior"] == behavior].copy()
    resp["window"] = resp["tick"] // window_ticks
    counts = resp.groupby("window").size().reset_index(name="responses")
    window_min = window_ticks / ticks_per_second / 60.0
    counts["rate_per_min"] = counts["responses"] / window_min
    counts["time_min"] = counts["window"] * window_min
    return counts[["time_min", "rate_per_min"]]


def behavior_frequency(df: pd.DataFrame, top_n: int = 10) -> pd.Series:
    return df["behavior"].value_counts().head(top_n)


def session_summary(df: pd.DataFrame, behavior: str = "Bar Press",
                    ticks_per_second: int = 10) -> dict:
    responses = (df["behavior"] == behavior).sum()
    reinforcements = df["reinforced"].sum()
    duration_s = df["time_s"].max() if len(df) else 0.0
    duration_min = duration_s / 60.0
    return {
        "total_responses": int(responses),
        "total_reinforcements": int(reinforcements),
        "duration_s": float(duration_s),
        "response_rate_per_min": float(responses / max(1.0, duration_min)),
        "reinforcement_rate_per_min": float(reinforcements / max(1.0, duration_min)),
        "mean_irt_ticks": float(irt_distribution(df, behavior).mean()) if responses > 1 else None,
    }
