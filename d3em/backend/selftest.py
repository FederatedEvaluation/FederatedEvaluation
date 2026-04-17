#!/usr/bin/env python3
import json
from pathlib import Path
from typing import List

from compute import compute_d3em


def read_series(path: Path) -> List[float]:
    values: List[float] = []
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            values.append(float(line.strip()))
        except ValueError:
            continue
    return values


def read_scalar(path: Path) -> float:
    values = read_series(path)
    return values[0] if values else 0.0


def load_clients(base: Path):
    clients = []
    for client_dir in sorted(base.iterdir()):
        if not client_dir.is_dir():
            continue
        client_id = client_dir.name.replace("_", " ")
        clients.append(
            {
                "clientId": client_id,
                "contrib": read_series(client_dir / "contribution_series.txt"),
                "vind": None,
                "scos": None,
                "X": read_scalar(client_dir / "independent_accuracy.txt"),
                "Y": read_scalar(client_dir / "rewarded_accuracy.txt"),
            }
        )
    return clients


def main():
    samples_dir = Path(__file__).resolve().parents[2] / "examples" / "d3em"
    payload = {
        "params": {
            "beta": 1.2,
            "t0": 3,
            "gamma": 0.6,
            "a": 1.0,
            "d": 1.0,
            "normalize": True,
        },
        "clients": load_clients(samples_dir),
        "fallbackMode": "synthetic_decompose",
    }
    result = compute_d3em(payload)
    summary = {
        "alpha_len": len(result["alpha"]),
        "client_ids": list(result["perClient"].keys()),
        "rank": result["rank"],
        "pearson_r": result["fairness"]["pearson_r"],
        "warnings": result["warnings"],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
