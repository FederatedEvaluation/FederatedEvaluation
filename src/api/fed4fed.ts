import {
  average,
  averageCiHalfWidth,
  bounded,
  meanSpread,
  sampleStd,
  summariesFromPayload,
  twoSidedPFromZ,
  wait,
  weightedMean,
  weightedSe,
} from './evaluationStats';
import { getPreferredLanguage } from '../i18n/language';

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
  const isZh = getPreferredLanguage() === 'zh';
  const clients = summariesFromPayload(payload, 'Client');
  if (clients.length < 2) {
    throw new Error(isZh ? 'Fed4Fed 至少需要 2 个客户端。' : 'Fed4Fed requires at least 2 clients.');
  }

  await wait(280);

  const fairnessThreshold = 0.05;
  const overallMean = weightedMean(clients);
  const spread = meanSpread(clients);
  const variability = sampleStd(clients.map((client) => client.mean));
  const averageStd = average(clients.map((client) => client.std));
  const uncertainty = Math.max(averageStd + weightedSe(clients), 1e-6);
  const pValue = twoSidedPFromZ(spread / uncertainty);
  const ciHalfWidth = averageCiHalfWidth(clients);
  const spreadLimit = Math.max(0.03, averageStd * 2.5, ciHalfWidth * 1.25);
  const globalModelFairness = pValue > fairnessThreshold && spread <= spreadLimit;
  const deploymentReadiness =
    globalModelFairness && variability <= Math.max(0.02, spreadLimit * 0.6);
  const effectSize = spread / Math.max(averageStd, weightedSe(clients), 1e-6);
  const margin = Math.max(1.96 * weightedSe(clients), ciHalfWidth * 0.5, 0.005);

  let fairnessAssessment = isZh
    ? '系统已完成客户端性能一致性分析。'
    : 'The system has completed the cross-client performance consistency analysis.';
  if (globalModelFairness) {
    fairnessAssessment = isZh
      ? '客户端性能分布较为接近，整体表现出较好的一致性。'
      : 'Client performance distributions are close to each other, indicating strong overall consistency.';
  } else if (spread > spreadLimit * 1.5) {
    fairnessAssessment = isZh
      ? '客户端均值差距较大，存在较明显的性能不一致。'
      : 'Client means differ substantially, indicating a clear performance inconsistency.';
  } else {
    fairnessAssessment = isZh
      ? '客户端性能存在一定波动，建议结合具体任务背景进一步分析。'
      : 'Client performance shows moderate variation; further analysis with task-specific context is recommended.';
  }

  return {
    pValue,
    fairnessThreshold,
    fed4fedAnalysis: {
      globalModelFairness,
      statisticalSignificance: bounded(1 - pValue, 0, 1),
      effectSize,
      performanceVariability: variability,
      fairnessThreshold,
    },
    deploymentReadiness,
    fairnessAssessment,
    confidenceInterval: {
      lower: overallMean - margin,
      upper: overallMean + margin,
      mean: overallMean,
      confidence: 0.95,
    },
    clients: clients.map((client) => ({
      id: client.id,
      mean: client.mean,
      std: client.std,
      ciLower: client.ci[0],
      ciUpper: client.ci[1],
      n: client.n,
    })),
  };
};
