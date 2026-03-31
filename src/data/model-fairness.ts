// Fed-e³ Framework: Three-tier Federated Fairness Assessment
// Detection → Classification → Quantification

export interface ConfusionMatrix {
  tp: number; // True Positives
  fp: number; // False Positives
  tn: number; // True Negatives
  fn: number; // False Negatives
}

export interface TwoStageTest {
  stage1_pValue: number; // Stage 1: Test for consistency across clients
  stage2_pValue: number; // Stage 2: Test for fairness (if stage 1 passed)
  stage1_testStatistic: number;
  stage2_testStatistic: number;
  stage1_description: string;
  stage2_description: string;
  stage1_passed: boolean; // p > 0.05
  stage2_passed: boolean; // p > 0.05 (only relevant if stage1 passed)
}

export interface BiasClassificationResult {
  biasType: 'fair' | 'systemic' | 'heterogeneous';
  classificationReason: string;
  confidenceLevel: number;
}

export interface FairnessQuantification {
  metric: 'EO' | 'DP'; // Equalized Odds or Demographic Parity
  pointEstimate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number; // e.g., 0.95 for 95%
  };
  interpretation: string;
}

export interface ClientFairnessResult {
  clientId: string;
  demographicParity: number;
  equalOpportunity: number;
  isConsistent: boolean; // Whether this client's fairness is consistent with others
  groupAConfusionMatrix: ConfusionMatrix;
  groupBConfusionMatrix: ConfusionMatrix;
}

export interface FedE3Analysis {
  // Detection Phase: Two-stage hypothesis testing
  twoStageTest: TwoStageTest;
  
  // Classification Phase: Based on p-values
  biasClassification: BiasClassificationResult;
  
  // Quantification Phase: Confidence intervals for metrics (only if bias detected)
  dpQuantification?: FairnessQuantification;
  eoQuantification?: FairnessQuantification;
  
  // Client-level results
  clientResults: ClientFairnessResult[];
  
  // Overall assessment
  overallFairness: boolean;
  deploymentRecommendation: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface ModelFairnessScenario {
  name: string;
  description: string;
  // Aggregated results for visualization
  groupA: ConfusionMatrix;
  groupB: ConfusionMatrix;
  // Fed-e³ framework implementation
  fedE3Analysis: FedE3Analysis;
  overallAssessment: string;
}

const modelFairnessScenarios: { [key: string]: ModelFairnessScenario } = {
  fair: {
    name: 'Fair Model',
    description: 'A model that passes both stages of hypothesis testing, indicating consistent fairness across all clients.',
    groupA: { tp: 75, fp: 25, tn: 75, fn: 25 }, // Aggregated results
    groupB: { tp: 72, fp: 28, tn: 72, fn: 28 },
    fedE3Analysis: {
      twoStageTest: {
        stage1_pValue: 0.68, // > 0.05: Consistent across clients
        stage2_pValue: 0.43, // > 0.05: Fair
        stage1_testStatistic: 2.15,
        stage2_testStatistic: 1.82,
        stage1_description: 'Testing for consistency of fairness performance across clients',
        stage2_description: 'Testing for overall fairness (given consistency)',
        stage1_passed: true,
        stage2_passed: true
      },
      biasClassification: {
        biasType: 'fair',
        classificationReason: 'Both stage 1 (p=0.68) and stage 2 (p=0.43) p-values > 0.05',
        confidenceLevel: 0.95
      },
      // No quantification needed for fair models
      clientResults: [
        {
          clientId: 'Client 1',
          demographicParity: 0.02,
          equalOpportunity: 0.02,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 25, fp: 8, tn: 25, fn: 8 },
          groupBConfusionMatrix: { tp: 24, fp: 9, tn: 24, fn: 9 }
        },
        {
          clientId: 'Client 2',
          demographicParity: 0.01,
          equalOpportunity: 0.01,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 25, fp: 8, tn: 25, fn: 8 },
          groupBConfusionMatrix: { tp: 24, fp: 9, tn: 24, fn: 9 }
        },
        {
          clientId: 'Client 3',
          demographicParity: 0.03,
          equalOpportunity: 0.02,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 25, fp: 9, tn: 25, fn: 9 },
          groupBConfusionMatrix: { tp: 24, fp: 10, tn: 24, fn: 10 }
        }
      ],
      overallFairness: true,
      deploymentRecommendation: 'Safe for deployment - model demonstrates consistent fairness across all clients',
      riskLevel: 'Low'
    },
    overallAssessment: 'Model passes Fed-e³ evaluation: consistent and fair across all clients'
  },
  
  systemic: {
    name: 'Systematic Bias Model',
    description: 'A model that shows consistent behavior across clients (stage 1 passed) but is consistently unfair (stage 2 failed).',
    groupA: { tp: 85, fp: 15, tn: 85, fn: 15 },
    groupB: { tp: 45, fp: 5, tn: 135, fn: 15 },
    fedE3Analysis: {
      twoStageTest: {
        stage1_pValue: 0.72, // > 0.05: Consistent across clients
        stage2_pValue: 0.008, // < 0.05: Systematically unfair
        stage1_testStatistic: 1.95,
        stage2_testStatistic: 4.25,
        stage1_description: 'Testing for consistency of fairness performance across clients',
        stage2_description: 'Testing for overall fairness (given consistency)',
        stage1_passed: true,
        stage2_passed: false
      },
      biasClassification: {
        biasType: 'systemic',
        classificationReason: 'Stage 1 passed (p=0.72) but stage 2 failed (p=0.008): systematic bias across all clients',
        confidenceLevel: 0.95
      },
      dpQuantification: {
        metric: 'DP',
        pointEstimate: 0.25,
        confidenceInterval: {
          lower: 0.18,
          upper: 0.32,
          confidence: 0.95
        },
        interpretation: 'Significant demographic parity violation with 95% confidence interval [0.18, 0.32]'
      },
      eoQuantification: {
        metric: 'EO',
        pointEstimate: 0.22,
        confidenceInterval: {
          lower: 0.15,
          upper: 0.29,
          confidence: 0.95
        },
        interpretation: 'Significant equalized odds violation with 95% confidence interval [0.15, 0.29]'
      },
      clientResults: [
        {
          clientId: 'Client 1',
          demographicParity: 0.24,
          equalOpportunity: 0.20,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 28, fp: 5, tn: 28, fn: 5 },
          groupBConfusionMatrix: { tp: 15, fp: 2, tn: 45, fn: 5 }
        },
        {
          clientId: 'Client 2',
          demographicParity: 0.26,
          equalOpportunity: 0.22,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 28, fp: 5, tn: 28, fn: 5 },
          groupBConfusionMatrix: { tp: 15, fp: 1, tn: 45, fn: 5 }
        },
        {
          clientId: 'Client 3',
          demographicParity: 0.25,
          equalOpportunity: 0.21,
          isConsistent: true,
          groupAConfusionMatrix: { tp: 29, fp: 5, tn: 29, fn: 5 },
          groupBConfusionMatrix: { tp: 15, fp: 2, tn: 45, fn: 5 }
        }
      ],
      overallFairness: false,
      deploymentRecommendation: 'Not recommended for deployment - systematic bias detected across all clients',
      riskLevel: 'High'
    },
    overallAssessment: 'Model exhibits systematic bias: consistent unfairness across all clients'
  },
  
  heterogeneous: {
    name: 'Heterogeneous Bias Model',
    description: 'A model showing inconsistent fairness behavior across clients (stage 1 failed), indicating heterogeneous bias patterns.',
    groupA: { tp: 70, fp: 30, tn: 70, fn: 30 },
    groupB: { tp: 60, fp: 20, tn: 100, fn: 20 },
    fedE3Analysis: {
      twoStageTest: {
        stage1_pValue: 0.02, // < 0.05: Inconsistent across clients
        stage2_pValue: -1, // Not applicable since stage 1 failed
        stage1_testStatistic: 3.85,
        stage2_testStatistic: -1,
        stage1_description: 'Testing for consistency of fairness performance across clients',
        stage2_description: 'Not applicable - stage 1 failed',
        stage1_passed: false,
        stage2_passed: false
      },
      biasClassification: {
        biasType: 'heterogeneous',
        classificationReason: 'Stage 1 failed (p=0.02): inconsistent fairness behavior across clients',
        confidenceLevel: 0.95
      },
      dpQuantification: {
        metric: 'DP',
        pointEstimate: 0.15,
        confidenceInterval: {
          lower: 0.08,
          upper: 0.22,
          confidence: 0.95
        },
        interpretation: 'Moderate demographic parity violation with high variance across clients [0.08, 0.22]'
      },
      eoQuantification: {
        metric: 'EO',
        pointEstimate: 0.18,
        confidenceInterval: {
          lower: 0.11,
          upper: 0.25,
          confidence: 0.95
        },
        interpretation: 'Moderate equalized odds violation with high variance across clients [0.11, 0.25]'
      },
      clientResults: [
        {
          clientId: 'Client 1',
          demographicParity: 0.22, // High bias
          equalOpportunity: 0.23,
          isConsistent: false,
          groupAConfusionMatrix: { tp: 25, fp: 12, tn: 25, fn: 12 },
          groupBConfusionMatrix: { tp: 18, fp: 8, tn: 32, fn: 8 }
        },
        {
          clientId: 'Client 2',
          demographicParity: 0.05, // Low bias
          equalOpportunity: 0.06,
          isConsistent: false,
          groupAConfusionMatrix: { tp: 23, fp: 9, tn: 23, fn: 9 },
          groupBConfusionMatrix: { tp: 21, fp: 6, tn: 34, fn: 6 }
        },
        {
          clientId: 'Client 3',
          demographicParity: 0.18, // Medium bias
          equalOpportunity: 0.19,
          isConsistent: false,
          groupAConfusionMatrix: { tp: 22, fp: 9, tn: 22, fn: 9 },
          groupBConfusionMatrix: { tp: 21, fp: 6, tn: 34, fn: 6 }
        }
      ],
      overallFairness: false,
      deploymentRecommendation: 'Requires client-specific bias mitigation before deployment',
      riskLevel: 'Medium'
    },
    overallAssessment: 'Model exhibits heterogeneous bias: different fairness patterns across clients'
  }
};

export default modelFairnessScenarios;

// Fed-e³ Helper Functions
export const runTwoStageTest = (clientResults: ClientFairnessResult[]): TwoStageTest => {
  // Stage 1: Test for consistency across clients
  const dpValues = clientResults.map(c => c.demographicParity);
  const dpVariance = dpValues.reduce((sum, val) => sum + Math.pow(val - dpValues.reduce((a, b) => a + b) / dpValues.length, 2), 0) / (dpValues.length - 1);
  const stage1_testStatistic = dpVariance * 10; // Simplified test statistic
  const stage1_pValue = stage1_testStatistic > 3.84 ? 0.02 : 0.68; // Chi-square threshold
  
  // Stage 2: Test for fairness (if stage 1 passed)
  let stage2_pValue = -1;
  let stage2_testStatistic = -1;
  if (stage1_pValue > 0.05) {
    const avgDP = dpValues.reduce((a, b) => a + b) / dpValues.length;
    stage2_testStatistic = Math.abs(avgDP) * 20; // Simplified test statistic
    stage2_pValue = stage2_testStatistic > 1.96 ? 0.008 : 0.43; // Z-test threshold
  }
  
  return {
    stage1_pValue,
    stage2_pValue,
    stage1_testStatistic,
    stage2_testStatistic,
    stage1_description: 'Testing for consistency of fairness performance across clients',
    stage2_description: stage1_pValue > 0.05 ? 'Testing for overall fairness (given consistency)' : 'Not applicable - stage 1 failed',
    stage1_passed: stage1_pValue > 0.05,
    stage2_passed: stage2_pValue > 0.05
  };
};

export const classifyBias = (twoStageTest: TwoStageTest): BiasClassificationResult => {
  if (twoStageTest.stage1_passed && twoStageTest.stage2_passed) {
    return {
      biasType: 'fair',
      classificationReason: `Both stage 1 (p=${twoStageTest.stage1_pValue.toFixed(2)}) and stage 2 (p=${twoStageTest.stage2_pValue.toFixed(2)}) p-values > 0.05`,
      confidenceLevel: 0.95
    };
  } else if (twoStageTest.stage1_passed && !twoStageTest.stage2_passed) {
    return {
      biasType: 'systemic',
      classificationReason: `Stage 1 passed (p=${twoStageTest.stage1_pValue.toFixed(2)}) but stage 2 failed (p=${twoStageTest.stage2_pValue.toFixed(3)}): systematic bias across all clients`,
      confidenceLevel: 0.95
    };
  } else {
    return {
      biasType: 'heterogeneous',
      classificationReason: `Stage 1 failed (p=${twoStageTest.stage1_pValue.toFixed(2)}): inconsistent fairness behavior across clients`,
      confidenceLevel: 0.95
    };
  }
};

export const quantifyBias = (clientResults: ClientFairnessResult[], metric: 'DP' | 'EO'): FairnessQuantification => {
  const values = metric === 'DP' 
    ? clientResults.map(c => c.demographicParity)
    : clientResults.map(c => c.equalOpportunity);
  
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  const standardError = Math.sqrt(variance / values.length);
  const marginOfError = 1.96 * standardError; // 95% confidence interval
  
  return {
    metric,
    pointEstimate: mean,
    confidenceInterval: {
      lower: Math.max(0, mean - marginOfError),
      upper: Math.min(1, mean + marginOfError),
      confidence: 0.95
    },
    interpretation: `Significant ${metric === 'DP' ? 'demographic parity' : 'equal opportunity'} violation with 95% confidence interval [${(mean - marginOfError).toFixed(2)}, ${(mean + marginOfError).toFixed(2)}]`
  };
};
