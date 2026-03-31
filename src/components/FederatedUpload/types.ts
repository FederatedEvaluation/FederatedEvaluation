export type SummaryStats = {
  n: number;
  mean: number;
  std: number;
  ci: [number, number];
};

export type ClientUploadState = {
  id: string;
  name: string;
  values: number[];
  summary?: SummaryStats;
  fileName?: string;
  error?: string | null;
};

export type SummaryPayloadClient = {
  id: string;
  n: number;
  mean: number;
  std: number;
  ci: [number, number];
};

export type SummaryPayload = {
  clients: SummaryPayloadClient[];
  alpha: number;
};
