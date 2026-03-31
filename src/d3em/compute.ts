import { D3emClientInput, D3emFallbackMode, D3emParams, D3emRequest, D3emResponse } from './types';

const DEFAULT_PARAMS: D3emParams = {
  beta: 1.2,
  t0: 3,
  gamma: 0.6,
  a: 1.0,
  d: 1.0,
  normalize: true,
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const sanitizeSeries = (series?: number[] | null): number[] => {
  if (!Array.isArray(series)) return [];
  return series.map(Number).filter((val) => Number.isFinite(val));
};

const average = (values: number[]): number => {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const pearson = (xs: number[], ys: number[]): number | null => {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = average(xs);
  const meanY = average(ys);
  let varX = 0;
  let varY = 0;
  let cov = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    varX += dx * dx;
    varY += dy * dy;
    cov += dx * dy;
  }
  if (varX <= 0 || varY <= 0) return null;
  const corr = cov / Math.sqrt(varX * varY);
  return Math.max(-1, Math.min(1, corr));
};

const buildAlpha = (params: D3emParams, T: number): number[] => {
  return Array.from({ length: T }, (_, t) => 1 / (1 + Math.exp(-params.beta * (t - params.t0))));
};

const synthesizeSeries = (base: number[], phase: number): { vind: number[]; scos: number[] } => {
  const T = base.length;
  const denom = Math.max(1, T - 1);
  const vind: number[] = [];
  const scos: number[] = [];
  for (let t = 0; t < T; t += 1) {
    const drift = 0.12 * Math.sin((2 * Math.PI * t) / denom + phase);
    vind.push(base[t] * (1 + drift));
    scos.push(base[t] * (1 - drift));
  }
  return { vind, scos };
};

const trimSeries = (series: number[], T: number): number[] => series.slice(0, T);

const resolveParams = (params?: Partial<D3emParams>): D3emParams => {
  return {
    beta: isFiniteNumber(params?.beta) ? params!.beta : DEFAULT_PARAMS.beta,
    t0: isFiniteNumber(params?.t0) ? params!.t0 : DEFAULT_PARAMS.t0,
    gamma: isFiniteNumber(params?.gamma) ? params!.gamma : DEFAULT_PARAMS.gamma,
    a: isFiniteNumber(params?.a) ? params!.a : DEFAULT_PARAMS.a,
    d: isFiniteNumber(params?.d) ? params!.d : DEFAULT_PARAMS.d,
    normalize: typeof params?.normalize === 'boolean' ? params!.normalize : DEFAULT_PARAMS.normalize,
  };
};

const deriveSeries = (client: D3emClientInput, alpha: number[], mode: D3emFallbackMode, index: number, warnings: string[]) => {
  const rawVind = sanitizeSeries(client.vind);
  const rawScos = sanitizeSeries(client.scos);
  const rawContrib = sanitizeSeries(client.contrib);

  const seriesLengths = [rawVind.length, rawScos.length, rawContrib.length].filter((len) => len > 0);
  if (!seriesLengths.length) {
    throw new Error(`${client.clientId} needs at least one series (vind/scos/contrib).`);
  }
  const T = Math.min(...seriesLengths, alpha.length);
  if (seriesLengths.some((len) => len !== T)) {
    warnings.push(`${client.clientId}: series length mismatch; trimmed to ${T}.`);
  }

  const base = rawContrib.length ? rawContrib : rawVind.length ? rawVind : rawScos;
  let vind = rawVind.length ? trimSeries(rawVind, T) : [];
  let scos = rawScos.length ? trimSeries(rawScos, T) : [];

  if (!vind.length && !scos.length) {
    if (!base.length) {
      throw new Error(`${client.clientId}: missing series to synthesize.`);
    }
    if (mode === 'synthetic_decompose') {
      const synthesized = synthesizeSeries(trimSeries(base, T), index * 0.5);
      vind = synthesized.vind;
      scos = synthesized.scos;
      warnings.push(`${client.clientId}: V_ind/S_cos missing; synthesized via synthetic_decompose.`);
    } else {
      const filled = trimSeries(base, T);
      vind = filled;
      scos = filled;
      warnings.push(`${client.clientId}: V_ind/S_cos missing; using contrib as proxy (${mode}).`);
    }
    return { vind, scos, T };
  }

  if (!vind.length) {
    if (mode === 'use_contrib_as_c_tilde' && rawContrib.length) {
      const contrib = trimSeries(rawContrib, T);
      vind = contrib.map((val, t) => {
        const denom = alpha[t] || 0;
        if (Math.abs(denom) < 1e-6) return scos[t] ?? val;
        return (val - (1 - alpha[t]) * (scos[t] ?? 0)) / denom;
      });
      warnings.push(`${client.clientId}: V_ind missing; derived from contrib + S_cos.`);
    } else if (mode === 'synthetic_decompose') {
      const baseSeries = trimSeries(base, T);
      vind = synthesizeSeries(baseSeries, index * 0.5).vind;
      warnings.push(`${client.clientId}: V_ind missing; synthesized via synthetic_decompose.`);
    } else {
      vind = trimSeries(rawContrib.length ? rawContrib : scos, T);
      warnings.push(`${client.clientId}: V_ind missing; using contrib/S_cos as proxy.`);
    }
  }

  if (!scos.length) {
    if (mode === 'use_contrib_as_c_tilde' && rawContrib.length) {
      const contrib = trimSeries(rawContrib, T);
      scos = contrib.map((val, t) => {
        const denom = 1 - alpha[t];
        if (Math.abs(denom) < 1e-6) return vind[t] ?? val;
        return (val - alpha[t] * (vind[t] ?? 0)) / denom;
      });
      warnings.push(`${client.clientId}: S_cos missing; derived from contrib + V_ind.`);
    } else if (mode === 'synthetic_decompose') {
      const baseSeries = trimSeries(base, T);
      scos = synthesizeSeries(baseSeries, index * 0.5).scos;
      warnings.push(`${client.clientId}: S_cos missing; synthesized via synthetic_decompose.`);
    } else {
      scos = trimSeries(rawContrib.length ? rawContrib : vind, T);
      warnings.push(`${client.clientId}: S_cos missing; using contrib/V_ind as proxy.`);
    }
  }

  return { vind: trimSeries(vind, T), scos: trimSeries(scos, T), T };
};

export const computeD3em = (payload: D3emRequest): D3emResponse => {
  if (!payload.clients.length) {
    throw new Error('Provide at least one client.');
  }
  const params = resolveParams(payload.params);
  const warnings: string[] = [];

  const clientSeriesLengths = payload.clients.map((client) => {
    const lengths = [
      sanitizeSeries(client.vind).length,
      sanitizeSeries(client.scos).length,
      sanitizeSeries(client.contrib).length,
    ].filter((len) => len > 0);
    if (!lengths.length) {
      throw new Error(`${client.clientId} needs at least one series (vind/scos/contrib).`);
    }
    return Math.min(...lengths);
  });

  const inferredT = Math.min(...clientSeriesLengths);
  let T = isFiniteNumber(payload.T) ? Math.floor(payload.T) : inferredT;
  if (T > inferredT) {
    warnings.push(`T=${T} exceeds available series length; trimmed to ${inferredT}.`);
    T = inferredT;
  }
  if (T < 2) {
    throw new Error('Each series must include at least 2 points.');
  }

  const alpha = buildAlpha(params, T);

  const perClient: D3emResponse['perClient'] = {};
  payload.clients.forEach((client, index) => {
    const { vind, scos } = deriveSeries(client, alpha, payload.fallbackMode, index, warnings);
    const c_tilde = vind.map((v, t) => alpha[t] * v + (1 - alpha[t]) * scos[t]);
    const c_ema: number[] = [];
    for (let t = 0; t < T; t += 1) {
      if (t === 0) {
        c_ema.push(c_tilde[t]);
      } else {
        c_ema.push(params.gamma * c_ema[t - 1] + (1 - params.gamma) * c_tilde[t]);
      }
    }
    perClient[client.clientId] = {
      vind,
      scos,
      c_tilde,
      c_ema,
      c_norm: [],
      rho: [],
      rho_avg: 0,
      c_avg: 0,
    };
  });

  const clientIds = Object.keys(perClient);
  for (let t = 0; t < T; t += 1) {
    const sum = clientIds.reduce((acc, id) => acc + perClient[id].c_ema[t], 0);
    const useNorm = params.normalize && Math.abs(sum) > 1e-12;
    if (params.normalize && !useNorm) {
      warnings.push(`Normalization skipped at t=${t} due to near-zero sum.`);
    }
    clientIds.forEach((id) => {
      const value = perClient[id].c_ema[t];
      perClient[id].c_norm.push(useNorm ? value / sum : value);
    });
  }

  clientIds.forEach((id) => {
    const client = perClient[id];
    client.rho = client.c_norm.map((value) => params.a * value * params.d);
    client.c_avg = average(client.c_norm);
    client.rho_avg = average(client.rho);
  });

  const points = payload.clients
    .map((client) => ({
      clientId: client.clientId,
      x: client.X,
      y: client.Y,
    }))
    .filter((point) => isFiniteNumber(point.x) && isFiniteNumber(point.y))
    .map((point) => ({ clientId: point.clientId, x: point.x as number, y: point.y as number }));

  const pearson_r = pearson(
    points.map((p) => p.x),
    points.map((p) => p.y)
  );
  if (points.length < 2) {
    warnings.push('Need at least two valid X/Y pairs to compute Pearson r.');
  }

  const rank = clientIds
    .map((id) => ({ clientId: id, c_avg: perClient[id].c_avg, rho_avg: perClient[id].rho_avg }))
    .sort((a, b) => b.c_avg - a.c_avg);

  return {
    alpha,
    perClient,
    rank,
    fairness: {
      pearson_r,
      points,
    },
    warnings,
  };
};
