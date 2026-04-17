#!/usr/bin/env python3
from pathlib import Path
from typing import List


def write_list(path: Path, values: List[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for v in values:
            f.write(f"{v:.4f}\n")


def write_scalar(path: Path, value: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        f.write(f"{value:.4f}\n")


def make_client(base: Path, name: str, series: List[float], independent: float, rewarded: float):
    write_list(base / name / "contribution_series.txt", series)
    write_scalar(base / name / "independent_accuracy.txt", independent)
    write_scalar(base / name / "rewarded_accuracy.txt", rewarded)


def main():
    base = Path(__file__).resolve().parent.parent / "examples" / "d3em"
    # Client profiles:
    # 1) High contribution & matched reward (ρ提升)
    make_client(
        base,
        "Client1",
        [0.14, 0.15, 0.16, 0.15, 0.17, 0.16, 0.18],
        independent=0.92,
        rewarded=0.915,
    )
    # 2) Medium contribution, slightly lower reward
    make_client(
        base,
        "Client2",
        [0.11, 0.10, 0.12, 0.11, 0.12, 0.115],
        independent=0.88,
        rewarded=0.885,
    )
    # 3) Noisy / misaligned client to show fairness contrast
    make_client(
        base,
        "Client3",
        [0.06, 0.08, 0.07, 0.05, 0.065, 0.07],
        independent=0.80,
        rewarded=0.83,
    )
    print(f"Samples written under: {base}")


if __name__ == "__main__":
    main()
