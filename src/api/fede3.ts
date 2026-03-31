import {
  average,
  averageCiHalfWidth,
  bounded,
  sampleStd,
  summariesFromPayload,
  twoSidedPFromZ,
  wait,
  weightedMean,
  weightedSe,
} from './evaluationStats';
import { getPreferredLanguage } from '../i18n/language';

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
  const isZh = getPreferredLanguage() === 'zh';
  const clients = summariesFromPayload(payload, 'Client');
  if (clients.length < 2) {
    throw new Error(isZh ? 'Fed-e3 至少需要 2 个客户端。' : 'Fed-e3 requires at least 2 clients.');
  }

  await wait(320);

  const alpha = 0.05;
  const means = clients.map((client) => client.mean);
  const globalBias = weightedMean(clients);
  const heterogeneity = sampleStd(means);
  const averageStd = average(clients.map((client) => client.std));
  const ciHalfWidth = averageCiHalfWidth(clients);
  const stage1Scale = Math.max(averageStd / Math.sqrt(clients.length), weightedSe(clients), 1e-6);
  const stage1Statistic = heterogeneity;
  const stage1PValue = twoSidedPFromZ(stage1Statistic / stage1Scale);
  const heterogeneityLimit = Math.max(0.01, ciHalfWidth * 0.8);
  const stage1Passed = stage1PValue > alpha && heterogeneity <= heterogeneityLimit;

  const stage2Statistic = Math.abs(globalBias);
  const stage2Scale = Math.max(weightedSe(clients), 1e-6);
  const rawStage2PValue = twoSidedPFromZ(stage2Statistic / stage2Scale);
  const biasLimit = Math.max(0.008, ciHalfWidth * 0.55);
  const stage2Passed = stage1Passed && rawStage2PValue > alpha && stage2Statistic <= biasLimit;

  let biasType: 'fair' | 'systemic' | 'heterogeneous';
  if (stage1Passed && stage2Passed) {
    biasType = 'fair';
  } else if (stage1Passed) {
    biasType = 'systemic';
  } else {
    biasType = 'heterogeneous';
  }

  let classificationReason = isZh
    ? '系统已完成群体公平性判定。'
    : 'The system has completed the group fairness assessment.';
  let deploymentRecommendation = isZh
    ? '建议结合任务背景和业务阈值综合评估。'
    : 'It is recommended to evaluate the result together with task context and business thresholds.';
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';

  if (biasType === 'fair') {
    classificationReason = isZh
      ? '各客户端偏差幅度接近，且整体偏差靠近 0，可归为公平。'
      : 'Client deviations are close to each other and the global deviation is near zero, so the result is classified as fair.';
    deploymentRecommendation = isZh
      ? '整体偏差较小，当前结果表现稳定。'
      : 'The overall deviation is small and the current result appears stable.';
    riskLevel = 'Low';
  } else if (biasType === 'systemic') {
    classificationReason = isZh
      ? '各客户端偏差方向较一致，但整体仍偏离 0，可归为系统性偏置。'
      : 'Client deviations are directionally consistent while the overall deviation remains away from zero, indicating systemic bias.';
    deploymentRecommendation = isZh
      ? '建议在正式发布前补充统一去偏或校准说明。'
      : 'Consider adding a unified debiasing or calibration step before formal release.';
    riskLevel = stage2Statistic > biasLimit * 2 ? 'High' : 'Medium';
  } else {
    classificationReason = isZh
      ? '客户端间偏差方向或幅度不一致，可归为异质性偏置。'
      : 'Client deviations differ in direction or magnitude, indicating heterogeneous bias.';
    deploymentRecommendation = isZh
      ? '建议先排查客户端分布差异，再决定后续优化策略。'
      : 'Inspect cross-client distribution differences before deciding on the next optimization step.';
    riskLevel = heterogeneity > heterogeneityLimit * 2 ? 'High' : 'Medium';
  }

  const confidenceLevel =
    biasType === 'fair'
      ? bounded(0.55 + ((stage1PValue + rawStage2PValue) / 2) * 0.35, 0.55, 0.97)
      : biasType === 'systemic'
        ? bounded(0.6 + (1 - rawStage2PValue) * 0.35, 0.6, 0.98)
        : bounded(0.6 + (1 - stage1PValue) * 0.35, 0.6, 0.98);

  const consistencyLimit = Math.max(heterogeneityLimit * 1.1, ciHalfWidth);
  const systemicMargin = Math.max(1.96 * stage2Scale, ciHalfWidth * 0.4, 0.004);

  return {
    twoStageTest: {
      stage1_pValue: stage1PValue,
      stage2_pValue: stage1Passed ? rawStage2PValue : -1,
      stage1_testStatistic: stage1Statistic,
      stage2_testStatistic: stage1Passed ? stage2Statistic : -1,
      stage1_passed: stage1Passed,
      stage2_passed: stage2Passed,
    },
    biasClassification: {
      biasType,
      classificationReason,
      confidenceLevel,
    },
    overallFairness: biasType === 'fair',
    riskLevel,
    deploymentRecommendation,
    systemicCI:
      biasType === 'systemic'
        ? {
            metric: 'DP gap',
            pointEstimate: globalBias,
            lower: globalBias - systemicMargin,
            upper: globalBias + systemicMargin,
          }
        : null,
    clients: clients.map((client) => {
      const eoOffset = Math.min(Math.abs(client.mean) * 0.15, client.std * 0.35);
      return {
        clientId: client.id,
        demographicParity: client.mean,
        equalOpportunity: client.mean - Math.sign(client.mean || 1) * eoOffset,
        isConsistent: Math.abs(client.mean - globalBias) <= consistencyLimit,
        ciLower: client.ci[0],
        ciUpper: client.ci[1],
        std: client.std,
        n: client.n,
      };
    }),
  };
};
