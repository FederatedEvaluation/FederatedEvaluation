#!/usr/bin/env python3
"""
Lightweight backend server for Fed4Fed and Fed-e3.

Run:
    python3 fed4fed/server.py

Then POST JSON to:
    http://localhost:8000/fed4fed/evaluate
Payload example:
    {"datasets": [[0.91, 0.92, ...], [0.85, ...], ...]}
"""
import json
import math
from http.server import BaseHTTPRequestHandler, HTTPServer
from statistics import NormalDist, mean, variance
from typing import List, Tuple

# NOTE:
# External dependencies (numpy/scipy) are intentionally avoided because the
# environment running this repository may be offline. All statistical routines below
# use the Python standard library with lightweight approximations where needed.

# Reusable normal distribution instance
ND = NormalDist()


def _is_number(val) -> bool:
    try:
        return math.isfinite(float(val))
    except (TypeError, ValueError):
        return False


def safe_mean(values: List[float]) -> float:
    return mean(values) if values else 0.0


def safe_variance(values: List[float]) -> float:
    return variance(values) if len(values) > 1 else 0.0


def sanitize_dataset(dataset: List[float]) -> List[float]:
    """Keep only finite numeric values."""
    return [float(v) for v in dataset if _is_number(v)]


def sanitize_series(series_raw) -> List[float]:
    if not isinstance(series_raw, list):
        raise ValueError("contributionSeries must be a list")
    cleaned = sanitize_dataset(series_raw)
    return cleaned


def sanitize_datasets_payload(datasets_raw) -> List[List[float]]:
    if not isinstance(datasets_raw, list):
        raise ValueError("datasets must be a list of arrays")
    cleaned = []
    for idx, arr in enumerate(datasets_raw):
        if not isinstance(arr, list):
            raise ValueError(f"datasets[{idx}] must be a list")
        cleaned.append(sanitize_dataset(arr))
    return cleaned


def normal_ppf(prob: float) -> float:
    """Inverse CDF for the standard normal distribution."""
    prob = min(max(prob, 0.0), 1.0)
    return ND.inv_cdf(prob)


def normal_cdf(value: float) -> float:
    return ND.cdf(value)


def chi2_sf_wilson_hilferty(x: float, df: int) -> float:
    """
    Approximate Chi-square survival function using the Wilson-Hilferty
    transformation to avoid SciPy dependency. Suitable for the expected input ranges here.
    """
    if df <= 0:
        return 1.0
    if x <= 0:
        return 1.0
    z = ((x / df) ** (1.0 / 3.0) - (1 - 2 / (9 * df))) / math.sqrt(2 / (9 * df))
    # Survival = 1 - CDF
    return 1.0 - normal_cdf(z)


def chi2_test(datasets: List[List[float]]) -> float:
    """
    Algorithm 1 from your paper: homogeneity test across clients.
    Returns p-value; p > 0.05 indicates performance fairness.
    """
    index = len(datasets)
    if index == 0:
        return 1.0

    y_sample_bar = [0.0] * index
    s_sample = [0.0] * index
    var_y_bar = [0.0] * index
    wi = [0.0] * index
    sum_var_y_bar = 0.0
    y_bar = 0.0
    Ai = [0.0] * index
    t = 0.0

    for i in range(index):
        if len(datasets[i]) == 0:
            continue
        y_sample_bar[i] = float(safe_mean(datasets[i]))
        s_sample[i] = float(safe_variance(datasets[i]))
        # Skip degenerate all-equal datasets to avoid divide-by-zero
        if len(set(datasets[i])) == 1:
            continue

        var_y_bar[i] = s_sample[i] / len(datasets[i])
        if var_y_bar[i] != 0:
            sum_var_y_bar += 1 / var_y_bar[i]

    if sum_var_y_bar == 0:
        return 1.0

    for i in range(index):
        if var_y_bar[i] != 0:
            wi[i] = (1 / var_y_bar[i]) / sum_var_y_bar
            y_bar += wi[i] * y_sample_bar[i]

    for i in range(index):
        if var_y_bar[i] != 0 and (1 - wi[i]) != 0:
            Ai[i] = (1 / var_y_bar[i]) * math.pow((y_sample_bar[i] - y_bar), 2) / (1 - wi[i])
            t += Ai[i]

    p = chi2_sf_wilson_hilferty(t, max(index - 1, 1))
    return float(p)


def compute_global_ci(datasets: List[List[float]], alpha: float = 0.05) -> Tuple[float, float, float]:
    """
    Re-implementation of compute confidence interval.py:
    weighted mean (inverse variance) and normal-approx 1-alpha CI.
    """
    index = len(datasets)
    y_sample_bar = [0.0] * index
    s_sample = [0.0] * index
    var_y_bar = [0.0] * index
    wi = [0.0] * index
    sum_var_y_bar = 0.0
    y_bar = 0.0

    for i in range(index):
        if len(datasets[i]) == 0:
            continue
        y_sample_bar[i] = float(safe_mean(datasets[i]))
        s_sample[i] = float(safe_variance(datasets[i]))
        var_y_bar[i] = s_sample[i] / len(datasets[i]) if len(datasets[i]) > 0 else 0.0
        if var_y_bar[i] != 0:
            sum_var_y_bar += 1 / var_y_bar[i]

    if sum_var_y_bar == 0:
        return 0.0, 0.0, 0.0

    for i in range(index):
        if var_y_bar[i] != 0 and sum_var_y_bar != 0:
            wi[i] = (1 / var_y_bar[i]) / sum_var_y_bar
            y_bar += wi[i] * y_sample_bar[i]

    z = normal_ppf(1 - alpha / 2)
    margin = z / math.sqrt(sum_var_y_bar) if sum_var_y_bar > 0 else 0.0
    lower_ci = y_bar - margin
    upper_ci = y_bar + margin
    return float(lower_ci), float(upper_ci), float(y_bar)


def client_stats(dataset: List[float], alpha: float = 0.05) -> dict:
    mean_val = float(safe_mean(dataset))
    std = math.sqrt(safe_variance(dataset)) if len(dataset) > 1 else 0.0
    z = normal_ppf(1 - alpha / 2)
    margin = z * std / math.sqrt(len(dataset)) if len(dataset) > 0 else 0.0
    return {
        "mean": mean_val,
        "std": std,
        "ciLower": float(mean_val - margin),
        "ciUpper": float(mean_val + margin),
        "n": len(dataset),
    }


def build_response(datasets: List[List[float]], alpha: float = 0.05) -> dict:
    p_value = chi2_test(datasets)
    is_fair = p_value > alpha
    clients = [{"id": f"Client {i+1}", **client_stats(ds)} for i, ds in enumerate(datasets)]
    means = [c["mean"] for c in clients]
    stds = [c["std"] for c in clients]
    pooled_std = math.sqrt(sum(s ** 2 for s in stds) / len(stds)) if stds else 0.0
    pooled_std = pooled_std if pooled_std > 1e-12 else 1e-12
    effect_size = (max(means) - min(means)) / pooled_std if means else 0.0
    performance_variability = float(safe_variance(means) if len(means) > 1 else 0.0)

    response = {
        "pValue": p_value,
        "fairnessThreshold": alpha,
        "fed4fedAnalysis": {
            "globalModelFairness": is_fair,
            "statisticalSignificance": p_value,
            "effectSize": float(effect_size),
            "performanceVariability": performance_variability,
            "fairnessThreshold": alpha,
        },
        "deploymentReadiness": is_fair,
        "fairnessAssessment": "Performance Fair: Consistent performance across clients, meets deployment standards"
        if is_fair
        else "Performance Unfair: Statistically significant performance differences detected, optimization required",
        "clients": clients,
    }

    if is_fair:
        lower, upper, mean = compute_global_ci(datasets, alpha)
        response["confidenceInterval"] = {
            "lower": lower,
            "upper": upper,
            "mean": mean,
            "confidence": 1 - alpha,
        }
    else:
        response["confidenceInterval"] = None

    return response


# ===== Fed-e3 (Model Fairness) =====
def chi2_test_with_stat(datasets: List[List[float]]) -> Tuple[float, float]:
    """
    Same as chi2_test but also returns the test statistic t for display.
    """
    index = len(datasets)
    y_sample_bar = [0.0] * index
    s_sample = [0.0] * index
    var_y_bar = [0.0] * index
    wi = [0.0] * index
    sum_var_y_bar = 0.0
    y_bar = 0.0
    Ai = [0.0] * index
    t = 0.0

    for i in range(index):
        if len(datasets[i]) == 0:
            continue
        y_sample_bar[i] = float(safe_mean(datasets[i]))
        s_sample[i] = float(safe_variance(datasets[i]))
        if len(set(datasets[i])) == 1:
            continue
        var_y_bar[i] = s_sample[i] / len(datasets[i])
        if var_y_bar[i] != 0:
            sum_var_y_bar += 1 / var_y_bar[i]

    for i in range(index):
        if var_y_bar[i] != 0 and sum_var_y_bar != 0:
            wi[i] = (1 / var_y_bar[i]) / sum_var_y_bar
            y_bar += wi[i] * y_sample_bar[i]

    for i in range(index):
        if var_y_bar[i] != 0 and (1 - wi[i]) != 0:
            Ai[i] = (1 / var_y_bar[i]) * math.pow((y_sample_bar[i] - y_bar), 2) / (1 - wi[i])
            t += Ai[i]

    p = chi2_sf_wilson_hilferty(t, max(index - 1, 1))
    return float(t), float(p)


def fede3_stage1_homogeneity(datasets: List[List[float]]) -> float:
    """Same as module1: test equality of client fairness metrics."""
    _, p = chi2_test_with_stat(datasets)
    return p


def fede3_stage2_bias_zero(datasets: List[List[float]]) -> float:
    """
    Test whether the common fairness metric equals 0 (two-sided z-test on weighted mean).
    Only meaningful if stage1 passes.
    """
    index = len(datasets)
    var_y_bar = []
    y_sample_bar = []
    for i in range(index):
        if len(datasets[i]) == 0:
            continue
        mean = float(safe_mean(datasets[i]))
        var = float(safe_variance(datasets[i])) if len(datasets[i]) > 1 else 0.0
        y_sample_bar.append(mean)
        var_y_bar.append(var / len(datasets[i]) if len(datasets[i]) > 0 else 0.0)
    if not var_y_bar or not y_sample_bar:
        return 1.0
    weights = [1 / v if v != 0 else 0.0 for v in var_y_bar]
    sum_w = sum(weights)
    if sum_w == 0:
        return 1.0
    weighted_mean = sum(w * m for w, m in zip(weights, y_sample_bar)) / sum_w
    se = math.sqrt(1 / sum_w)
    z = weighted_mean / (se + 1e-8)
    p_two_sided = 2 * (1 - normal_cdf(abs(z)))
    return float(p_two_sided)


def fede3_systemic_ci(datasets: List[List[float]], alpha: float = 0.05) -> Tuple[float, float, float]:
    """CI for systemic bias (shared metric across clients), same as cireal_SB."""
    lower, upper, mean = compute_global_ci(datasets, alpha)
    return lower, upper, mean


def fede3_client_ci(dataset: List[float], alpha: float = 0.05) -> Tuple[float, float, float]:
    """CI for heterogeneous bias per client, similar to cireal_HB."""
    mean_val = float(safe_mean(dataset))
    var = float(safe_variance(dataset)) if len(dataset) > 1 else 0.0
    se = math.sqrt(var / (len(dataset) if len(dataset) > 0 else 1))
    z = normal_ppf(1 - alpha / 2)
    margin = z * se
    return float(mean_val - margin), float(mean_val + margin), mean_val


def summarize_datasets_for_fede3(datasets: List[List[float]], alpha: float = 0.05) -> List[dict]:
    if not isinstance(datasets, list) or len(datasets) == 0:
        raise ValueError("datasets must be a non-empty list")
    summaries = []
    for idx, ds in enumerate(datasets):
        cleaned = sanitize_dataset(ds)
        n_val = len(cleaned)
        if n_val < 2:
            raise ValueError(f"客户端数据不足: Client {idx+1} 至少需要 2 个样本")
        ci_l, ci_u, mean_val = fede3_client_ci(cleaned, alpha)
        std = math.sqrt(safe_variance(cleaned)) if n_val > 1 else 0.0
        summaries.append(
            {
                "clientId": f"Client {idx+1}",
                "mean": mean_val,
                "std": std,
                "n": n_val,
                "ciLower": ci_l,
                "ciUpper": ci_u,
            }
        )
    return summaries


def parse_client_summaries(clients_payload, alpha: float = 0.05) -> List[dict]:
    if not isinstance(clients_payload, list) or len(clients_payload) == 0:
        raise ValueError("clients must be a non-empty list")
    summaries = []
    for idx, raw in enumerate(clients_payload):
        if not isinstance(raw, dict):
            raise ValueError("clients entries must be objects with id/mean/std/n/ci")
        client_id = str(raw.get("id") or raw.get("clientId") or f"Client {idx+1}")
        n_val = int(raw.get("n", 0))
        if n_val < 2:
            raise ValueError(f"客户端数据不足: {client_id} 至少需要 2 个样本")
        mean_val = float(raw.get("mean", 0.0))
        std_val = abs(float(raw.get("std", 0.0)))
        ci_raw = raw.get("ci") or raw.get("CI") or raw.get("interval")
        if isinstance(ci_raw, (list, tuple)) and len(ci_raw) == 2 and _is_number(ci_raw[0]) and _is_number(ci_raw[1]):
            ci_lower, ci_upper = float(ci_raw[0]), float(ci_raw[1])
        else:
            z = normal_ppf(1 - alpha / 2)
            margin = z * std_val / math.sqrt(max(n_val, 1))
            ci_lower, ci_upper = mean_val - margin, mean_val + margin
        summaries.append(
            {
                "clientId": client_id,
                "mean": mean_val,
                "std": std_val,
                "n": n_val,
                "ciLower": ci_lower,
                "ciUpper": ci_upper,
            }
        )
    return summaries


def normalize_clients_for_stats(clients: List[dict], alpha: float = 0.05, min_std: float = 1e-8) -> List[dict]:
    normalized = []
    z = normal_ppf(1 - alpha / 2)
    for client in clients:
        n_val = int(client.get("n", 0))
        if n_val < 2:
            raise ValueError(f"客户端数据不足: {client.get('clientId', client.get('id', 'Client'))} 至少需要 2 个样本")
        mean_val = float(client.get("mean", 0.0))
        std_val = abs(float(client.get("std", 0.0)))
        std_val = std_val if std_val > min_std else min_std
        ci_lower = client.get("ciLower", client.get("ci_lower"))
        ci_upper = client.get("ciUpper", client.get("ci_upper"))
        if not (_is_number(ci_lower) and _is_number(ci_upper)):
            margin = z * std_val / math.sqrt(max(n_val, 1))
            ci_lower, ci_upper = mean_val - margin, mean_val + margin
        normalized.append(
            {
                "clientId": client.get("clientId", "Client"),
                "mean": mean_val,
                "std": std_val,
                "n": n_val,
                "ciLower": float(ci_lower),
                "ciUpper": float(ci_upper),
            }
        )
    return normalized


def chi2_test_from_client_stats(clients: List[dict]) -> Tuple[float, float]:
    index = len(clients)
    y_sample_bar = [float(c.get("mean", 0.0)) for c in clients]
    var_y_bar = [0.0] * index
    wi = [0.0] * index
    sum_var_y_bar = 0.0
    y_bar = 0.0
    Ai = [0.0] * index
    t = 0.0

    for i, client in enumerate(clients):
        var_client = math.pow(float(client.get("std", 0.0)), 2) if client.get("n", 0) > 1 else 0.0
        var_y_bar[i] = var_client / (client.get("n", 0) if client.get("n", 0) > 0 else 1)
        if var_y_bar[i] != 0:
            sum_var_y_bar += 1 / var_y_bar[i]

    if sum_var_y_bar == 0:
        return 0.0, 1.0

    for i in range(index):
        if var_y_bar[i] != 0 and sum_var_y_bar != 0:
            wi[i] = (1 / var_y_bar[i]) / sum_var_y_bar
            y_bar += wi[i] * y_sample_bar[i]

    for i in range(index):
        if var_y_bar[i] != 0 and (1 - wi[i]) != 0:
            Ai[i] = (1 / var_y_bar[i]) * math.pow((y_sample_bar[i] - y_bar), 2) / (1 - wi[i])
            t += Ai[i]

    p = chi2_sf_wilson_hilferty(t, max(index - 1, 1))
    return float(t), float(p)


def fede3_stage2_bias_zero_from_stats(clients: List[dict]) -> Tuple[float, float]:
    var_y_bar = []
    y_sample_bar = []
    for client in clients:
        if client.get("n", 0) == 0:
            continue
        mean_val = float(client.get("mean", 0.0))
        var = math.pow(float(client.get("std", 0.0)), 2) if client.get("n", 0) > 1 else 0.0
        y_sample_bar.append(mean_val)
        var_y_bar.append(var / client.get("n", 1))
    if not var_y_bar or not y_sample_bar:
        return 0.0, 1.0
    weights = [1 / v if v != 0 else 0.0 for v in var_y_bar]
    sum_w = sum(weights)
    if sum_w == 0:
        return 0.0, 1.0
    weighted_mean = sum(w * m for w, m in zip(weights, y_sample_bar)) / sum_w
    se = math.sqrt(1 / sum_w)
    z = weighted_mean / (se + 1e-8)
    p_two_sided = 2 * (1 - normal_cdf(abs(z)))
    return float(z), float(p_two_sided)


def compute_global_ci_from_stats(clients: List[dict], alpha: float = 0.05) -> Tuple[float, float, float]:
    sum_inv = 0.0
    weighted_mean = 0.0
    for client in clients:
        var = math.pow(float(client.get("std", 0.0)), 2) if client.get("n", 0) > 1 else 0.0
        var_mean = var / (client.get("n", 0) if client.get("n", 0) > 0 else 1)
        if var_mean > 0:
            weight = 1 / var_mean
            sum_inv += weight
            weighted_mean += weight * float(client.get("mean", 0.0))
    if sum_inv == 0:
        return 0.0, 0.0, 0.0
    weighted_mean /= sum_inv
    z = normal_ppf(1 - alpha / 2)
    margin = z / math.sqrt(sum_inv)
    lower_ci = weighted_mean - margin
    upper_ci = weighted_mean + margin
    return float(lower_ci), float(upper_ci), float(weighted_mean)


def build_response_from_clients(clients: List[dict], alpha: float = 0.05) -> dict:
    if not clients:
        raise ValueError("clients must be a non-empty list")
    normalized = normalize_clients_for_stats(clients, alpha)

    t_homogeneity, p_value = chi2_test_from_client_stats(normalized)
    is_fair = p_value > alpha
    means = [float(c.get("mean", 0.0)) for c in normalized]
    stds = [float(c.get("std", 0.0)) for c in normalized]
    pooled_std = math.sqrt(sum(s ** 2 for s in stds) / len(stds)) if stds else 0.0
    pooled_std = pooled_std if pooled_std > 1e-12 else 1e-12
    effect_size = (max(means) - min(means)) / pooled_std if means else 0.0
    performance_variability = float(safe_variance(means) if len(means) > 1 else 0.0)

    response = {
        "pValue": p_value,
        "fairnessThreshold": alpha,
        "fed4fedAnalysis": {
            "globalModelFairness": is_fair,
            "statisticalSignificance": p_value,
            "effectSize": float(effect_size),
            "performanceVariability": performance_variability,
            "fairnessThreshold": alpha,
        },
        "deploymentReadiness": is_fair,
        "fairnessAssessment": "Performance Fair: Consistent performance across clients, meets deployment standards"
        if is_fair
        else "Performance Unfair: Statistically significant performance differences detected, optimization required",
    }

    response_clients = []
    for client in normalized:
        response_clients.append(
            {
                "id": client.get("clientId", "Client"),
                "mean": float(client.get("mean", 0.0)),
                "std": float(client.get("std", 0.0)),
                "ciLower": float(client.get("ciLower", 0.0)),
                "ciUpper": float(client.get("ciUpper", 0.0)),
                "n": int(client.get("n", 0)),
            }
        )
    response["clients"] = response_clients

    if is_fair:
        lower, upper, mean_val = compute_global_ci_from_stats(normalized, alpha)
        response["confidenceInterval"] = {
            "lower": lower,
            "upper": upper,
            "mean": mean_val,
            "confidence": 1 - alpha,
        }
    else:
        response["confidenceInterval"] = None

    return response


def build_fede3_response_from_clients(clients: List[dict], alpha: float = 0.05) -> dict:
    if not clients:
        raise ValueError("clients must be a non-empty list")

    t_homogeneity, p_homogeneity = chi2_test_from_client_stats(clients)
    stage1_passed = p_homogeneity > alpha
    z_bias, p_bias = fede3_stage2_bias_zero_from_stats(clients) if stage1_passed else (0.0, -1.0)
    stage2_passed = stage1_passed and p_bias > alpha

    clients_stats = []
    for client in clients:
        ci_lower = float(client.get("ciLower", client.get("ci_lower", 0.0)))
        ci_upper = float(client.get("ciUpper", client.get("ci_upper", 0.0)))
        clients_stats.append(
            {
                "clientId": client.get("clientId", "Client"),
                "demographicParity": float(client.get("mean", 0.0)),
                "equalOpportunity": float(client.get("mean", 0.0)),
                "isConsistent": stage1_passed,
                "ciLower": ci_lower,
                "ciUpper": ci_upper,
                "std": float(client.get("std", 0.0)),
                "n": int(client.get("n", 0)),
            }
        )

    if stage1_passed and stage2_passed:
        bias_type = "fair"
        classification_reason = f"Stage1 homogeneity p={p_homogeneity:.3f} > {alpha} 且 Stage2 bias-zero p={p_bias:.3f} > {alpha}"
        overall_fairness = True
        systemic_ci = None
        risk_level = "Low"
        deployment_recommendation = "Safe to deploy - fairness metrics consistent and near zero across clients."
    elif stage1_passed and not stage2_passed:
        bias_type = "systemic"
        classification_reason = "Stage1 homogeneity passed but bias-zero test failed: systemic bias across clients"
        overall_fairness = False
        l, u, mean_val = compute_global_ci_from_stats(clients, alpha)
        systemic_ci = {"metric": "DP", "pointEstimate": mean_val, "lower": l, "upper": u}
        risk_level = "High"
        deployment_recommendation = "Systemic bias detected across all clients; mitigate before deployment."
    else:
        bias_type = "heterogeneous"
        classification_reason = "Homogeneity test failed: heterogeneous bias patterns across clients"
        overall_fairness = False
        systemic_ci = None
        risk_level = "Medium"
        deployment_recommendation = "Bias differs by client; run client-specific mitigation before deployment."

    response = {
        "twoStageTest": {
            "stage1_pValue": p_homogeneity,
            "stage1_testStatistic": t_homogeneity,
            "stage2_pValue": p_bias,
            "stage2_testStatistic": z_bias,
            "stage1_passed": stage1_passed,
            "stage2_passed": stage2_passed,
        },
        "biasClassification": {
            "biasType": bias_type,
            "classificationReason": classification_reason,
            "confidenceLevel": 1 - alpha,
        },
        "overallFairness": overall_fairness,
        "riskLevel": risk_level,
        "deploymentRecommendation": deployment_recommendation,
        "clients": clients_stats,
    }
    if systemic_ci:
        response["systemicCI"] = systemic_ci
    else:
        response["systemicCI"] = None

    return response


def build_fede3_response(datasets: List[List[float]], alpha: float = 0.05) -> dict:
    summaries = summarize_datasets_for_fede3(datasets, alpha)
    return build_fede3_response_from_clients(summaries, alpha)


def pearson_corr(xs: List[float], ys: List[float]) -> Tuple[float, bool, str]:
    if len(xs) != len(ys):
        return 0.0, False, "X/Y length mismatch"
    n = len(xs)
    if n < 2:
        return 0.0, False, "Need at least 2 clients to compute correlation"
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    if var_x <= 0 or var_y <= 0:
        return 0.0, False, "Zero variance in X or Y; correlation undefined"
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    corr = cov / math.sqrt(var_x * var_y)
    corr = max(min(corr, 1.0), -1.0)
    return corr, True, "OK"

# ===== D3EM (Collaborative Fairness / Contribution Assessment) =====
def build_d3em_response(datasets: List[List[float]]) -> dict:
    """
    Lightweight contribution evaluation:
    - Input: list of client contribution samples (e.g., bootstrap DP/EO or contribution scores)
    - Output: per-client stats + weights + fairness homogeneity test
    """
    if not datasets or not all(isinstance(c, list) for c in datasets):
        raise ValueError("datasets must be a list of lists")

    # basic stats
    client_stats = []
    raw_means = []
    for idx, ds in enumerate(datasets):
        mean_val = float(safe_mean(ds))
        std = math.sqrt(safe_variance(ds)) if len(ds) > 1 else 0.0
        z = normal_ppf(0.975)
        margin = z * std / math.sqrt(len(ds)) if len(ds) > 0 else 0.0
        ci_l, ci_u = mean_val - margin, mean_val + margin
        client_stats.append(
            {
                "clientId": f"Client {idx+1}",
                "mean": mean_val,
                "std": std,
                "ciLower": ci_l,
                "ciUpper": ci_u,
                "n": len(ds),
            }
        )
        raw_means.append(mean_val)

    # weights: shift to positive then normalize
    shift = -min(raw_means) + 1e-6 if raw_means and min(raw_means) <= 0 else 0.0
    shifted = [m + shift for m in raw_means]
    weights_sum = sum(shifted)
    weights = [m / weights_sum for m in shifted] if weights_sum > 0 else [0.0 for _ in shifted]
    for cs, w in zip(client_stats, weights):
        cs["weight"] = w

    # fairness test: homogeneity of contributions
    t_h, p_h = chi2_test_with_stat(datasets)
    fair = p_h > 0.05
    bias_type = "fair" if fair else "heterogeneous"
    recommendation = (
        "Collaborative contributions are balanced; proceed with incentive distribution."
        if fair
        else "Contribution disparity detected; consider reweighting or data quality checks."
    )

    return {
        "twoStageTest": {
            "stage1_pValue": p_h,
            "stage1_testStatistic": t_h,
            "stage1_passed": fair,
        },
        "biasClassification": {
            "biasType": bias_type,
            "classificationReason": "Homogeneity test across client contributions"
            + (" passed." if fair else " failed (p < 0.05)."),
        },
        "overallFairness": fair,
        "deploymentRecommendation": recommendation,
        "clients": client_stats,
    }


def build_d3em_response_from_clients(clients: List[dict], alpha: float = 0.05, k_recent: int = 5) -> dict:
    if not clients:
        raise ValueError("clients must be a non-empty list")

    normalized_clients = []
    for idx, raw in enumerate(clients):
        cid = str(raw.get("id") or raw.get("clientId") or f"Client {idx+1}")
        series = sanitize_series(raw.get("contributionSeries", []))
        if len(series) < 2:
            raise ValueError(f"{cid} 贡献序列至少需要 2 个样本")
        k_use = max(1, min(k_recent, len(series)))
        final_contribution = sum(series[-k_use:]) / k_use
        n_val = len(series)
        mean_val = safe_mean(series)
        std_val = math.sqrt(safe_variance(series)) if n_val > 1 else 0.0
        std_val = std_val if std_val > 1e-12 else 1e-12
        z = normal_ppf(1 - alpha / 2)
        margin = z * std_val / math.sqrt(max(n_val, 1))
        ci_lower, ci_upper = mean_val - margin, mean_val + margin
        normalized_clients.append(
            {
                "clientId": cid,
                "series": series,
                "finalContribution": final_contribution,
                "mean": mean_val,
                "std": std_val,
                "ciLower": ci_lower,
                "ciUpper": ci_upper,
                "n": n_val,
                "independentAccuracy": float(raw.get("independentAccuracy", 0.0)),
                "rewardedAccuracy": float(raw.get("rewardedAccuracy", 0.0)),
            }
        )

    finals = [c["finalContribution"] for c in normalized_clients]
    min_final = min(finals) if finals else 0.0
    shift = -min_final + 1e-6 if min_final <= 0 else 0.0
    shifted = [f + shift for f in finals]
    weight_sum = sum(shifted) or 1.0
    weights = [f / weight_sum for f in shifted]
    for c, w in zip(normalized_clients, weights):
        c["weight"] = w

    t_h, p_h = chi2_test_with_stat([c["series"] for c in normalized_clients])
    fair = p_h > alpha
    bias_type = "fair" if fair else "heterogeneous"
    recommendation = (
        "Collaborative contributions are balanced; proceed with incentive distribution."
        if fair
        else "Contribution disparity detected; consider reweighting or data quality checks."
    )

    xs = [c["independentAccuracy"] for c in normalized_clients]
    ys_reward = [c["rewardedAccuracy"] for c in normalized_clients]
    ys_contrib = [c["weight"] for c in normalized_clients]

    rho_xy_val, rho_xy_valid, rho_xy_msg = pearson_corr(xs, ys_reward)
    rho_cy_val, rho_cy_valid, rho_cy_msg = pearson_corr(ys_contrib, ys_reward)

    response_clients = [
        {
            "clientId": c["clientId"],
            "finalContribution": c["finalContribution"],
            "weight": c["weight"],
            "mean": c["mean"],
            "std": c["std"],
            "ciLower": c["ciLower"],
            "ciUpper": c["ciUpper"],
            "n": c["n"],
            "independentAccuracy": c["independentAccuracy"],
            "rewardedAccuracy": c["rewardedAccuracy"],
        }
        for c in normalized_clients
    ]

    resp = {
        "twoStageTest": {
            "stage1_pValue": p_h,
            "stage1_testStatistic": t_h,
            "stage1_passed": fair,
        },
        "biasClassification": {
            "biasType": bias_type,
            "classificationReason": "Homogeneity test across client contributions"
            + (" passed." if fair else " failed (p < alpha)."),
        },
        "overallFairness": fair,
        "deploymentRecommendation": recommendation,
        "clients": response_clients,
        "rhoXY": {
            "value": rho_xy_val if rho_xy_valid else None,
            "valid": rho_xy_valid,
            "message": rho_xy_msg if rho_xy_valid else rho_xy_msg,
            "scatter": [
                {"clientId": c["clientId"], "x": c["independentAccuracy"], "y": c["rewardedAccuracy"]}
                for c in normalized_clients
            ],
        },
        "rhoCY": {
            "value": rho_cy_val if rho_cy_valid else None,
            "valid": rho_cy_valid,
            "message": rho_cy_msg if rho_cy_valid else rho_cy_msg,
            "scatter": [
                {"clientId": c["clientId"], "x": c["weight"], "y": c["rewardedAccuracy"]}
                for c in normalized_clients
            ],
        },
    }
    return resp


class Fed4FedHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_POST(self):
        parsed = self.path
        if parsed not in ("/fed4fed/evaluate", "/fede3/evaluate", "/d3em/evaluate"):
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload must be a JSON object")
            datasets = payload.get("datasets", [])
            alpha = float(payload.get("alpha", 0.05) or 0.05)
            clients_payload = payload.get("clients", None)
            if parsed == "/fed4fed/evaluate":
                if payload.get("clients") is not None:
                    client_summaries = parse_client_summaries(payload.get("clients"), alpha)
                    response = build_response_from_clients(client_summaries, alpha)
                else:
                    response = build_response(sanitize_datasets_payload(datasets), alpha)
            elif parsed == "/fede3/evaluate":
                if payload.get("clients") is not None:
                    client_summaries = parse_client_summaries(payload.get("clients"), alpha)
                    response = build_fede3_response_from_clients(client_summaries, alpha)
                else:
                    cleaned = sanitize_datasets_payload(datasets)
                    response = build_fede3_response(cleaned, alpha)
            else:
                if clients_payload is not None:
                    if not isinstance(clients_payload, list) or len(clients_payload) == 0:
                        raise ValueError("clients payload is empty; provide at least one client with contributionSeries")
                    response = build_d3em_response_from_clients(
                        clients_payload, alpha=alpha, k_recent=int(payload.get("k_recent", 5) or 5)
                    )
                else:
                    response = build_d3em_response(sanitize_datasets_payload(datasets))
            self._set_headers(200)
            self.wfile.write(json.dumps(response).encode())
        except Exception as exc:  # pylint: disable=broad-except
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": str(exc)}).encode())


def run_server(host: str = "0.0.0.0", port: int = 8000):
    with HTTPServer((host, port), Fed4FedHandler) as httpd:
        print(f"Fed4Fed server listening on http://{host}:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    run_server()
