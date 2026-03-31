export type D3emFallbackMode = 'use_contrib_as_c_tilde' | 'synthetic_decompose' | 'use_contrib_as_scos';

export type D3emParams = {
  beta: number;
  t0: number;
  gamma: number;
  a: number;
  d: number;
  normalize: boolean;
};

export type D3emClientInput = {
  clientId: string;
  vind?: number[] | null;
  scos?: number[] | null;
  contrib?: number[] | null;
  X?: number | null;
  Y?: number | null;
};

export type D3emRequest = {
  T?: number;
  params: D3emParams;
  clients: D3emClientInput[];
  fallbackMode: D3emFallbackMode;
};

export type D3emPerClient = {
  vind: number[];
  scos: number[];
  c_tilde: number[];
  c_ema: number[];
  c_norm: number[];
  rho: number[];
  rho_avg: number;
  c_avg: number;
};

export type D3emRankItem = { clientId: string; c_avg: number; rho_avg: number };

export type D3emResponse = {
  alpha: number[];
  perClient: Record<string, D3emPerClient>;
  rank: D3emRankItem[];
  fairness: {
    pearson_r: number | null;
    points: { x: number; y: number; clientId: string }[];
  };
  warnings: string[];
};
