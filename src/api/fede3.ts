export interface Fede3ClientResult {
  clientId: string;
  demographicParity: number;
  equalOpportunity: number;
  isConsistent: boolean;
  ciLower: number;
  ciUpper: number;
  std: number;
  n: number;
}

export interface Fede3Response {
  twoStageTest: {
    stage1_pValue: number;
    stage2_pValue: number;
    stage1_testStatistic: number;
    stage2_testStatistic: number;
    stage1_passed: boolean;
    stage2_passed: boolean;
  };
  biasClassification: {
    biasType: 'fair' | 'systemic' | 'heterogeneous';
    classificationReason: string;
    confidenceLevel: number;
  };
  overallFairness: boolean;
  riskLevel: 'Low' | 'Medium' | 'High';
  deploymentRecommendation: string;
  systemicCI: null | {
    metric: string;
    pointEstimate: number;
    lower: number;
    upper: number;
  };
  clients: Fede3ClientResult[];
}

export interface Fede3SummaryClientInput {
  id: string;
  n: number;
  mean: number;
  std: number;
  ci: [number, number];
}

export type Fede3RequestPayload =
  | { clients: Fede3SummaryClientInput[]; alpha?: number }
  | { datasets: number[][]; alpha?: number };

export const runFede3 = async (payload: Fede3RequestPayload): Promise<Fede3Response> => {
  const base = (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const res = await fetch(`${base}/fede3/evaluate`, {
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
