export interface ClientPerformance {
  id: string;
  accuracy: number;
  // Bootstrap statistics for normal distribution
  mean: number;
  std: number;
  confidence: number; // Confidence score for this client's performance
}

export interface PerformanceConfidenceInterval {
  lower: number;
  upper: number;
  mean: number;
  confidence: number; // e.g., 0.95 for 95% confidence
}

export interface Fed4FedAnalysis {
  globalModelFairness: boolean;
  statisticalSignificance: number; // p-value
  effectSize: number; // Cohen's d or similar
  performanceVariability: number;
  fairnessThreshold: number;
}

export interface PerformanceScenario {
  name: string;
  description: string;
  averageAccuracy: number;
  accuracyVariance: number;
  // H₀: The model performs consistently across all clients.
  pValue: number;
  clients: ClientPerformance[];
  // Fed4Fed framework additions
  confidenceInterval: PerformanceConfidenceInterval;
  fed4fedAnalysis: Fed4FedAnalysis;
  deploymentReadiness: boolean;
  fairnessAssessment: string;
}

const performanceScenarios: { [key: string]: PerformanceScenario } = {
  unfair: {
    name: 'Scenario 1: Model 1',
    description: 'A standard federated model that performs well on average, but has high variance across clients, indicating performance unfairness.',
    averageAccuracy: 0.85,
    accuracyVariance: 0.0225,
    pValue: 0.03, // p < 0.05, reject H₀
    clients: [
      { id: 'Client 1', accuracy: 0.95, mean: 0.95, std: 0.08, confidence: 0.88 },
      { id: 'Client 2', accuracy: 0.92, mean: 0.92, std: 0.06, confidence: 0.85 },
      { id: 'Client 3', accuracy: 0.75, mean: 0.75, std: 0.12, confidence: 0.62 },
      { id: 'Client 4', accuracy: 0.91, mean: 0.91, std: 0.07, confidence: 0.84 },
      { id: 'Client 5', accuracy: 0.72, mean: 0.72, std: 0.15, confidence: 0.58 },
      { id: 'Client 6', accuracy: 0.88, mean: 0.88, std: 0.09, confidence: 0.78 },
      { id: 'Client 7', accuracy: 0.83, mean: 0.83, std: 0.10, confidence: 0.73 },
      { id: 'Client 8', accuracy: 0.79, mean: 0.79, std: 0.11, confidence: 0.67 },
      { id: 'Client 9', accuracy: 0.86, mean: 0.86, std: 0.08, confidence: 0.76 },
      { id: 'Client 10', accuracy: 0.89, mean: 0.89, std: 0.07, confidence: 0.81 },
    ],
    confidenceInterval: {
      lower: 0.78,
      upper: 0.92,
      mean: 0.85,
      confidence: 0.95
    },
    fed4fedAnalysis: {
      globalModelFairness: false,
      statisticalSignificance: 0.03,
      effectSize: 0.82, // Large effect size
      performanceVariability: 0.087,
      fairnessThreshold: 0.05
    },
    deploymentReadiness: false,
    fairnessAssessment: 'Performance Unfair: Significant performance differences between clients detected, deployment not recommended'
  },
  fair: {
    name: 'Scenario 2: Model 2',
    description: 'After applying fairness-aware techniques, the model achieves consistent performance across all clients, with very low variance and overlapping normal distributions.',
    averageAccuracy: 0.86,
    accuracyVariance: 0.0008, // Much lower variance
    pValue: 0.65, // Much higher p-value, clearly fair
    clients: [
      { id: 'Client 1', accuracy: 0.86, mean: 0.86, std: 0.02, confidence: 0.95 },
      { id: 'Client 2', accuracy: 0.86, mean: 0.86, std: 0.021, confidence: 0.94 },
      { id: 'Client 3', accuracy: 0.86, mean: 0.86, std: 0.019, confidence: 0.96 },
      { id: 'Client 4', accuracy: 0.86, mean: 0.86, std: 0.022, confidence: 0.93 },
      { id: 'Client 5', accuracy: 0.86, mean: 0.86, std: 0.02, confidence: 0.95 },
      { id: 'Client 6', accuracy: 0.86, mean: 0.86, std: 0.018, confidence: 0.97 },
      { id: 'Client 7', accuracy: 0.86, mean: 0.86, std: 0.021, confidence: 0.94 },
      { id: 'Client 8', accuracy: 0.86, mean: 0.86, std: 0.02, confidence: 0.95 },
      { id: 'Client 9', accuracy: 0.86, mean: 0.86, std: 0.019, confidence: 0.96 },
      { id: 'Client 10', accuracy: 0.86, mean: 0.86, std: 0.022, confidence: 0.93 },
    ],
    confidenceInterval: {
      lower: 0.84,
      upper: 0.88,
      mean: 0.86,
      confidence: 0.95
    },
    fed4fedAnalysis: {
      globalModelFairness: true,
      statisticalSignificance: 0.65,
      effectSize: 0.05, // Very small effect size
      performanceVariability: 0.008,
      fairnessThreshold: 0.05
    },
    deploymentReadiness: true,
    fairnessAssessment: 'Performance Fair: Consistent performance across clients, meets deployment standards'
  },
  moderate: {
    name: 'Scenario 3: Model 3',
    description: 'A model with moderate performance unfairness, showing some improvements but still having statistically significant differences.',
    averageAccuracy: 0.84,
    accuracyVariance: 0.008,
    pValue: 0.02, // p < 0.05, indicating unfairness
    clients: [
      { id: 'Client 1', accuracy: 0.87, mean: 0.87, std: 0.04, confidence: 0.85 },
      { id: 'Client 2', accuracy: 0.82, mean: 0.82, std: 0.045, confidence: 0.80 },
      { id: 'Client 3', accuracy: 0.79, mean: 0.79, std: 0.055, confidence: 0.75 },
      { id: 'Client 4', accuracy: 0.88, mean: 0.88, std: 0.038, confidence: 0.86 },
      { id: 'Client 5', accuracy: 0.83, mean: 0.83, std: 0.042, confidence: 0.81 },
      { id: 'Client 6', accuracy: 0.85, mean: 0.85, std: 0.040, confidence: 0.83 },
      { id: 'Client 7', accuracy: 0.81, mean: 0.81, std: 0.048, confidence: 0.78 },
      { id: 'Client 8', accuracy: 0.86, mean: 0.86, std: 0.037, confidence: 0.84 },
      { id: 'Client 9', accuracy: 0.84, mean: 0.84, std: 0.041, confidence: 0.82 },
      { id: 'Client 10', accuracy: 0.85, mean: 0.85, std: 0.039, confidence: 0.83 },
    ],
    confidenceInterval: {
      lower: 0.80,
      upper: 0.88,
      mean: 0.84,
      confidence: 0.95
    },
    fed4fedAnalysis: {
      globalModelFairness: false,
      statisticalSignificance: 0.02,
      effectSize: 0.45, // Medium effect size
      performanceVariability: 0.035,
      fairnessThreshold: 0.05
    },
    deploymentReadiness: false,
    fairnessAssessment: 'Performance Unfair: Statistically significant performance differences detected, optimization required'
  }
};

export default performanceScenarios;

// Helper functions for Fed4Fed analysis
export const calculateConfidenceInterval = (performances: number[], confidence: number = 0.95): PerformanceConfidenceInterval => {
  const mean = performances.reduce((a, b) => a + b) / performances.length;
  const variance = performances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (performances.length - 1);
  const stdDev = Math.sqrt(variance);
  const margin = 1.96 * (stdDev / Math.sqrt(performances.length)); // 95% confidence
  
  return {
    lower: mean - margin,
    upper: mean + margin,
    mean,
    confidence
  };
};

export const assessPerformanceFairness = (scenario: PerformanceScenario): string => {
  if (scenario.pValue < 0.01) {
    return 'Severely Unfair: Significant performance differences exist, model redesign required';
  } else if (scenario.pValue < 0.05) {
    return 'Unfair: Statistically significant performance differences detected, optimization needed';
  } else if (scenario.pValue < 0.1) {
    return 'Borderline Fair: Performance differences within acceptable range, continued monitoring recommended';
  } else {
    return 'Fair: Consistent performance across clients, meets deployment standards';
  }
};

export const calculateEffectSize = (group1: number[], group2: number[]): number => {
  const mean1 = group1.reduce((a, b) => a + b) / group1.length;
  const mean2 = group2.reduce((a, b) => a + b) / group2.length;
  const pooledStd = Math.sqrt(
    (group1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) + 
     group2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0)) / 
    (group1.length + group2.length - 2)
  );
  return Math.abs(mean1 - mean2) / pooledStd;
};
