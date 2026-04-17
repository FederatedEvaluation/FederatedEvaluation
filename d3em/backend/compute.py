import math
from typing import Dict, List, Optional, Tuple

D3EM_FALLBACK_MODES = {
    "use_contrib_as_c_tilde",
    "synthetic_decompose",
    "use_contrib_as_scos",
}

DEFAULT_PARAMS = {
    "beta": 1.2,
    "t0": 3.0,
    "gamma": 0.6,
    "a": 1.0,
    "d": 1.0,
    "normalize": True,
}


def _is_number(value) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def sanitize_series(raw) -> List[float]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("series must be a list")
    return [float(v) for v in raw if _is_number(v)]


def sanitize_scalar(raw) -> Optional[float]:
    if _is_number(raw):
        return float(raw)
    return None


def average(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def pearson_corr(xs: List[float], ys: List[float]) -> Optional[float]:
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    mean_x = average(xs)
    mean_y = average(ys)
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    if var_x <= 0 or var_y <= 0:
        return None
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    corr = cov / math.sqrt(var_x * var_y)
    return max(min(corr, 1.0), -1.0)


def build_alpha(beta: float, t0: float, T: int) -> List[float]:
    return [1 / (1 + math.exp(-beta * (t - t0))) for t in range(T)]


def synthesize_series(base: List[float], phase: float) -> Tuple[List[float], List[float]]:
    T = len(base)
    denom = max(1, T - 1)
    vind: List[float] = []
    scos: List[float] = []
    for t in range(T):
        drift = 0.12 * math.sin(2 * math.pi * t / denom + phase)
        vind.append(base[t] * (1 + drift))
        scos.append(base[t] * (1 - drift))
    return vind, scos


def trim(series: List[float], T: int) -> List[float]:
    return series[:T]


def derive_series(client: dict, alpha: List[float], mode: str, index: int, warnings: List[str]):
    raw_vind = sanitize_series(client.get("vind"))
    raw_scos = sanitize_series(client.get("scos"))
    raw_contrib = sanitize_series(client.get("contrib"))

    series_lengths = [len(raw_vind), len(raw_scos), len(raw_contrib)]
    series_lengths = [length for length in series_lengths if length > 0]
    if not series_lengths:
        raise ValueError(f"{client['clientId']} needs at least one series")

    T = min(min(series_lengths), len(alpha))
    if any(length != T for length in series_lengths):
        warnings.append(f"{client['clientId']}: series length mismatch; trimmed to {T}.")

    base = raw_contrib or raw_vind or raw_scos
    vind = trim(raw_vind, T) if raw_vind else []
    scos = trim(raw_scos, T) if raw_scos else []

    if not vind and not scos:
        if not base:
            raise ValueError(f"{client['clientId']} missing series to synthesize")
        if mode == "synthetic_decompose":
            vind, scos = synthesize_series(trim(base, T), index * 0.5)
            warnings.append(f"{client['clientId']}: V_ind/S_cos missing; synthesized via synthetic_decompose.")
        else:
            filled = trim(base, T)
            vind = filled
            scos = filled
            warnings.append(f"{client['clientId']}: V_ind/S_cos missing; using contrib as proxy ({mode}).")
        return vind, scos, T

    if not vind:
        if mode == "use_contrib_as_c_tilde" and raw_contrib:
            contrib = trim(raw_contrib, T)
            derived: List[float] = []
            for t in range(T):
                denom = alpha[t]
                if abs(denom) < 1e-6:
                    derived.append(scos[t] if t < len(scos) else contrib[t])
                else:
                    derived.append((contrib[t] - (1 - alpha[t]) * (scos[t] if t < len(scos) else 0.0)) / denom)
            vind = derived
            warnings.append(f"{client['clientId']}: V_ind missing; derived from contrib + S_cos.")
        elif mode == "synthetic_decompose":
            base_series = trim(base, T)
            vind, _ = synthesize_series(base_series, index * 0.5)
            warnings.append(f"{client['clientId']}: V_ind missing; synthesized via synthetic_decompose.")
        else:
            vind = trim(raw_contrib or scos, T)
            warnings.append(f"{client['clientId']}: V_ind missing; using contrib/S_cos as proxy.")

    if not scos:
        if mode == "use_contrib_as_c_tilde" and raw_contrib:
            contrib = trim(raw_contrib, T)
            derived = []
            for t in range(T):
                denom = 1 - alpha[t]
                if abs(denom) < 1e-6:
                    derived.append(vind[t] if t < len(vind) else contrib[t])
                else:
                    derived.append((contrib[t] - alpha[t] * (vind[t] if t < len(vind) else 0.0)) / denom)
            scos = derived
            warnings.append(f"{client['clientId']}: S_cos missing; derived from contrib + V_ind.")
        elif mode == "synthetic_decompose":
            base_series = trim(base, T)
            _, scos = synthesize_series(base_series, index * 0.5)
            warnings.append(f"{client['clientId']}: S_cos missing; synthesized via synthetic_decompose.")
        else:
            scos = trim(raw_contrib or vind, T)
            warnings.append(f"{client['clientId']}: S_cos missing; using contrib/V_ind as proxy.")

    return trim(vind, T), trim(scos, T), T


def resolve_params(params_raw: dict) -> Dict[str, float]:
    params = dict(DEFAULT_PARAMS)
    for key in ("beta", "t0", "gamma", "a", "d"):
        if _is_number(params_raw.get(key)):
            params[key] = float(params_raw.get(key))
    if isinstance(params_raw.get("normalize"), bool):
        params["normalize"] = bool(params_raw.get("normalize"))
    return params


def compute_d3em(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")

    warnings: List[str] = []
    params = resolve_params(payload.get("params") or {})
    fallback_mode = payload.get("fallbackMode") or "synthetic_decompose"
    if fallback_mode not in D3EM_FALLBACK_MODES:
        warnings.append(f"Unknown fallbackMode '{fallback_mode}', using synthetic_decompose.")
        fallback_mode = "synthetic_decompose"

    raw_clients = payload.get("clients")
    if not isinstance(raw_clients, list) or not raw_clients:
        raise ValueError("clients must be a non-empty list")

    clients: List[dict] = []
    series_lengths: List[int] = []
    for idx, raw in enumerate(raw_clients):
        client_id = str(raw.get("clientId") or raw.get("id") or f"Client {idx + 1}")
        vind = sanitize_series(raw.get("vind"))
        scos = sanitize_series(raw.get("scos"))
        contrib = sanitize_series(raw.get("contrib"))
        lengths = [len(vind), len(scos), len(contrib)]
        lengths = [length for length in lengths if length > 0]
        if not lengths:
            raise ValueError(f"{client_id} needs at least one series")
        min_len = min(lengths)
        if min_len < 2:
            raise ValueError(f"{client_id} series must include at least 2 points")
        if len(set(lengths)) > 1:
            warnings.append(f"{client_id}: series length mismatch; trimmed to {min_len}.")
        series_lengths.append(min_len)
        clients.append(
            {
                "clientId": client_id,
                "vind": vind,
                "scos": scos,
                "contrib": contrib,
                "X": sanitize_scalar(raw.get("X")),
                "Y": sanitize_scalar(raw.get("Y")),
            }
        )

    inferred_T = min(series_lengths)
    T_raw = payload.get("T")
    if _is_number(T_raw):
        T = int(float(T_raw))
    else:
        T = inferred_T
    if T > inferred_T:
        warnings.append(f"T={T} exceeds available series length; trimmed to {inferred_T}.")
        T = inferred_T
    if T < 2:
        raise ValueError("T must be at least 2")

    alpha = build_alpha(params["beta"], params["t0"], T)

    per_client: Dict[str, dict] = {}
    for idx, client in enumerate(clients):
        vind, scos, _ = derive_series(client, alpha, fallback_mode, idx, warnings)
        c_tilde = [alpha[t] * vind[t] + (1 - alpha[t]) * scos[t] for t in range(T)]
        c_ema: List[float] = []
        for t in range(T):
            if t == 0:
                c_ema.append(c_tilde[t])
            else:
                c_ema.append(params["gamma"] * c_ema[t - 1] + (1 - params["gamma"]) * c_tilde[t])
        per_client[client["clientId"]] = {
            "vind": vind,
            "scos": scos,
            "c_tilde": c_tilde,
            "c_ema": c_ema,
            "c_norm": [],
            "rho": [],
            "rho_avg": 0.0,
            "c_avg": 0.0,
        }

    client_ids = list(per_client.keys())
    for t in range(T):
        total = sum(per_client[cid]["c_ema"][t] for cid in client_ids)
        use_norm = params["normalize"] and abs(total) > 1e-12
        if params["normalize"] and not use_norm:
            warnings.append(f"Normalization skipped at t={t} due to near-zero sum.")
        for cid in client_ids:
            value = per_client[cid]["c_ema"][t]
            per_client[cid]["c_norm"].append(value / total if use_norm else value)

    for cid in client_ids:
        c_norm = per_client[cid]["c_norm"]
        rho = [params["a"] * v * params["d"] for v in c_norm]
        per_client[cid]["rho"] = rho
        per_client[cid]["c_avg"] = average(c_norm)
        per_client[cid]["rho_avg"] = average(rho)

    points = [
        {"clientId": client["clientId"], "x": client["X"], "y": client["Y"]}
        for client in clients
        if client["X"] is not None and client["Y"] is not None
    ]
    pearson_r = pearson_corr([p["x"] for p in points], [p["y"] for p in points]) if points else None
    if len(points) < 2:
        warnings.append("Need at least two valid X/Y pairs to compute Pearson r.")

    rank = sorted(
        (
            {"clientId": cid, "c_avg": per_client[cid]["c_avg"], "rho_avg": per_client[cid]["rho_avg"]}
            for cid in client_ids
        ),
        key=lambda item: item["c_avg"],
        reverse=True,
    )

    return {
        "alpha": alpha,
        "perClient": per_client,
        "rank": rank,
        "fairness": {
            "pearson_r": pearson_r,
            "points": points,
        },
        "warnings": warnings,
    }
