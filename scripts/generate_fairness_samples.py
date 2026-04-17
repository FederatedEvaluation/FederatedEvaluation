#!/usr/bin/env python3
"""
Generate sample txt files for Fed-e³ (group fairness) and Fed4Fed (performance fairness).
Each client gets a bootstrap_metrics.txt (one number per line) that the frontend can parse.
"""
from pathlib import Path
from typing import List


def write_list(path: Path, values: List[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for v in values:
            f.write(f"{v:.4f}\n")


def make_clients(base: Path, name: str, datasets: List[List[float]]):
    for idx, values in enumerate(datasets, start=1):
        client_dir = base / f"Client{idx}"
        write_list(client_dir / "bootstrap_metrics.txt", values)
        # Optional: add a short readme per client if needed


def main():
    root = Path(__file__).resolve().parent.parent / "examples"

    # Fed-e³: fairness gap/bootstrap fairness metric (small -> large bias)
    fede3_values = [
        [0.005, -0.002, 0.003, 0.001, -0.001, 0.004],  # Client1: high quality, near zero bias
        [0.020, 0.018, 0.015, 0.022, 0.017],  # Client2: moderate bias
        [0.060, 0.055, 0.070, 0.065, 0.058, 0.062],  # Client3: noisy / higher bias
    ]
    make_clients(root / "fede3", "Fed-e3", fede3_values)

    # Fed4Fed: accuracy/bootstrap performance metrics (high -> low)
    fed4fed_values = [
        [0.920, 0.918, 0.921, 0.915, 0.923],  # Client1: high accuracy, stable
        [0.885, 0.882, 0.879, 0.887, 0.881],  # Client2: medium
        [0.820, 0.825, 0.818, 0.830, 0.815],  # Client3: lower / more variable
    ]
    make_clients(root / "fed4fed", "Fed4Fed", fed4fed_values)

    print(f"Generated samples under: {root/'fede3'} and {root/'fed4fed'}")


if __name__ == "__main__":
    main()
