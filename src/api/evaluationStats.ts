export type ClientSummaryStats = {
  id: string;
  n: number;
  mean: number;
  std: number;
  ci: [number, number];
};

type SummaryLike = {
  id: string;
  n: number;
  mean: number;
  std: number;
  ci?: [number, number];
};

type UploadPayload<TClient extends SummaryLike> =
  | { clients: TClient[]; alpha?: number }
  | { datasets: number[][]; alpha?: number };

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const clamped = clamp(p, 0, 1);
  const rank = (sorted.length - 1) * clamped;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (upper >= sorted.length) return sorted[sorted.length - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const average = (values: number[]): number => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const sampleStd = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const normalizeCi = (
  mean: number,
  std: number,
  n: number,
  ci?: [number, number]
): [number, number] => {
  if (
    Array.isArray(ci) &&
    ci.length === 2 &&
    Number.isFinite(ci[0]) &&
    Number.isFinite(ci[1])
  ) {
    return ci[0] <= ci[1] ? [ci[0], ci[1]] : [ci[1], ci[0]];
  }
  const se = std / Math.sqrt(Math.max(n, 1));
  const margin = 1.96 * se;
  return [mean - margin, mean + margin];
};

export const buildSummaryFromValues = (
  id: string,
  rawValues: number[],
  alpha = 0.05
): ClientSummaryStats => {
  const values = rawValues.map(Number).filter((value) => Number.isFinite(value));
  if (!values.length) {
    throw new Error(`${id} does not contain valid numeric values.`);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = average(values);
  const std = sampleStd(values);
  const lower = percentile(sorted, alpha / 2);
  const upper = percentile(sorted, 1 - alpha / 2);
  return {
    id,
    n: values.length,
    mean,
    std,
    ci: [lower, upper],
  };
};

export const summariesFromPayload = <TClient extends SummaryLike>(
  payload: UploadPayload<TClient>,
  fallbackPrefix = 'Client'
): ClientSummaryStats[] => {
  const alpha = clamp(payload.alpha ?? 0.05, 0.001, 0.5);
  if ('clients' in payload) {
    return payload.clients.map((client, index) => {
      const id = client.id?.trim() || `${fallbackPrefix} ${index + 1}`;
      const n = Math.max(1, Number(client.n) || 0);
      const mean = Number(client.mean) || 0;
      const std = Math.max(0, Number(client.std) || 0);
      return {
        id,
        n,
        mean,
        std,
        ci: normalizeCi(mean, std, n, client.ci),
      };
    });
  }

  return payload.datasets.map((dataset, index) =>
    buildSummaryFromValues(`${fallbackPrefix} ${index + 1}`, dataset, alpha)
  );
};

export const weightedMean = (clients: ClientSummaryStats[]): number => {
  const totalWeight = clients.reduce((sum, client) => sum + Math.max(client.n, 1), 0);
  if (totalWeight <= 0) return average(clients.map((client) => client.mean));
  return (
    clients.reduce((sum, client) => sum + client.mean * Math.max(client.n, 1), 0) / totalWeight
  );
};

export const weightedSe = (clients: ClientSummaryStats[]): number => {
  const totalWeight = clients.reduce((sum, client) => sum + Math.max(client.n, 1), 0);
  if (totalWeight <= 0) return 0;
  const variance = clients.reduce((sum, client) => {
    const weight = Math.max(client.n, 1) / totalWeight;
    const clientSe = client.std / Math.sqrt(Math.max(client.n, 1));
    return sum + Math.pow(weight * clientSe, 2);
  }, 0);
  return Math.sqrt(variance);
};

export const meanSpread = (clients: ClientSummaryStats[]): number => {
  if (!clients.length) return 0;
  const means = clients.map((client) => client.mean);
  return Math.max(...means) - Math.min(...means);
};

export const averageCiHalfWidth = (clients: ClientSummaryStats[]): number => {
  if (!clients.length) return 0;
  return average(clients.map((client) => Math.abs(client.ci[1] - client.ci[0]) / 2));
};

const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return sign * y;
};

const normalCdf = (x: number): number => 0.5 * (1 + erf(x / Math.SQRT2));

export const twoSidedPFromZ = (z: number): number => {
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return clamp(p, 0.0001, 1);
};

export const bounded = clamp;

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
