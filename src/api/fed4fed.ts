export interface Fed4FedClientResult {
  id: string;
  mean: number;
  std: number;
  ciLower: number;
  ciUpper: number;
  n: number;
}

export interface Fed4FedAnalysis {
  globalModelFairness: boolean;
  statisticalSignificance: number;
  effectSize: number;
  performanceVariability: number;
  fairnessThreshold: number;
}

export interface Fed4FedResponse {
  pValue: number;
  fairnessThreshold: number;
  fed4fedAnalysis: Fed4FedAnalysis;
  deploymentReadiness: boolean;
  fairnessAssessment: string;
  confidenceInterval: null | {
    lower: number;
    upper: number;
    mean: number;
    confidence: number;
  };
  clients: Fed4FedClientResult[];
}

export interface Fed4FedSummaryClientInput {
  id: string;
  n: number;
  mean: number;
  std: number;
  ci: [number, number];
}

export type Fed4FedRequestPayload =
  | { clients: Fed4FedSummaryClientInput[]; alpha?: number }
  | { datasets: number[][]; alpha?: number };

export const runFed4Fed = async (payload: Fed4FedRequestPayload): Promise<Fed4FedResponse> => {
  const base = (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const res = await fetch(`${base}/fed4fed/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { error?: string };
      throw new Error(parsed.error || text || `Request failed with status ${res.status}`);
    } catch {
      throw new Error(text || `Request failed with status ${res.status}`);
    }
  }

  return res.json();
};
