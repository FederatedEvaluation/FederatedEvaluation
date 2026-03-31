export interface ClientContribution {
  id: string;
  dataSize: number; // e.g., number of samples
  trueContribution: number; // Reference contribution level
  traditionalScore: number; // Score from a naive method (e.g., based on data size)
  proposedScore: number; // Score from your advanced method
  // D³EM algorithm specific fields
  dataQuality: number; // Data quality score (0-1)
  featureDiversity: number; // Feature diversity score (0-1)
  gradientSparsity: number; // Gradient sparsity ratio (0-1)
  noiseLevel: number; // Noise level in data (0-1)
  d3emScore: number; // Final D³EM contribution score
  incentiveAllocation: number; // Final incentive allocation percentage
}

export interface D3EMStep {
  stepName: string;
  description: string;
  value: number;
  isActive: boolean;
}

export interface GradientSparsification {
  originalGradients: number;
  sparsifiedGradients: number;
  compressionRatio: number;
  communicationReduction: number;
}

export interface Scenario {
  name: string;
  description: string;
  clients: ClientContribution[];
  // D³EM evaluation results
  d3emSteps: D3EMStep[];
  gradientSparsification: GradientSparsification;
  collaborativeFairnessScore: number; // Overall fairness score (0-1)
  noiseFilteringEfficiency: number; // Noise filtering efficiency (0-1)
}

const scenarios: { [key: string]: Scenario } = {
  balanced: {
    name: 'Scenario 1: Balanced & Homogeneous',
    description: 'All clients have similar data size and contribute effectively to the model.',
    clients: [
      { 
        id: 'Client 1', 
        dataSize: 1000, 
        trueContribution: 0.25, 
        traditionalScore: 0.25, 
        proposedScore: 0.25,
        dataQuality: 0.85,
        featureDiversity: 0.80,
        gradientSparsity: 0.15,
        noiseLevel: 0.10,
        d3emScore: 0.24,
        incentiveAllocation: 0.25
      },
      { 
        id: 'Client 2', 
        dataSize: 1000, 
        trueContribution: 0.25, 
        traditionalScore: 0.25, 
        proposedScore: 0.25,
        dataQuality: 0.83,
        featureDiversity: 0.82,
        gradientSparsity: 0.18,
        noiseLevel: 0.12,
        d3emScore: 0.25,
        incentiveAllocation: 0.25
      },
      { 
        id: 'Client 3', 
        dataSize: 1000, 
        trueContribution: 0.25, 
        traditionalScore: 0.25, 
        proposedScore: 0.25,
        dataQuality: 0.87,
        featureDiversity: 0.78,
        gradientSparsity: 0.12,
        noiseLevel: 0.08,
        d3emScore: 0.26,
        incentiveAllocation: 0.25
      },
      { 
        id: 'Client 4', 
        dataSize: 1000, 
        trueContribution: 0.25, 
        traditionalScore: 0.25, 
        proposedScore: 0.25,
        dataQuality: 0.84,
        featureDiversity: 0.81,
        gradientSparsity: 0.16,
        noiseLevel: 0.11,
        d3emScore: 0.25,
        incentiveAllocation: 0.25
      },
    ],
    d3emSteps: [
      { stepName: 'Data Volume Assessment', description: 'Initial evaluation based on client data scale', value: 0.25, isActive: true },
      { stepName: 'Data Quality Analysis', description: 'Assess data quality and feature diversity', value: 0.30, isActive: true },
      { stepName: 'Noise Filtering', description: 'Dynamic denoising and quality enhancement', value: 0.35, isActive: true },
      { stepName: 'Contribution Calculation', description: 'Final D³EM contribution scoring', value: 0.10, isActive: true }
    ],
    gradientSparsification: {
      originalGradients: 10000,
      sparsifiedGradients: 1500,
      compressionRatio: 0.85,
      communicationReduction: 0.85
    },
    collaborativeFairnessScore: 0.92,
    noiseFilteringEfficiency: 0.88
  },
  skewed: {
    name: 'Scenario 2: Skewed with a High-Value Client',
    description: 'One client (Client 4) has less data but it is of much higher quality/impact.',
    clients: [
      { 
        id: 'Client 1', 
        dataSize: 1200, 
        trueContribution: 0.15, 
        traditionalScore: 0.34, 
        proposedScore: 0.16,
        dataQuality: 0.70,
        featureDiversity: 0.65,
        gradientSparsity: 0.30,
        noiseLevel: 0.25,
        d3emScore: 0.14,
        incentiveAllocation: 0.15
      },
      { 
        id: 'Client 2', 
        dataSize: 1100, 
        trueContribution: 0.15, 
        traditionalScore: 0.31, 
        proposedScore: 0.14,
        dataQuality: 0.72,
        featureDiversity: 0.68,
        gradientSparsity: 0.28,
        noiseLevel: 0.22,
        d3emScore: 0.16,
        incentiveAllocation: 0.16
      },
      { 
        id: 'Client 3', 
        dataSize: 800, 
        trueContribution: 0.20, 
        traditionalScore: 0.23, 
        proposedScore: 0.21,
        dataQuality: 0.80,
        featureDiversity: 0.75,
        gradientSparsity: 0.20,
        noiseLevel: 0.15,
        d3emScore: 0.21,
        incentiveAllocation: 0.20
      },
      { 
        id: 'Client 4', 
        dataSize: 400, 
        trueContribution: 0.50, 
        traditionalScore: 0.12, 
        proposedScore: 0.49,
        dataQuality: 0.95,
        featureDiversity: 0.92,
        gradientSparsity: 0.05,
        noiseLevel: 0.03,
        d3emScore: 0.49,
        incentiveAllocation: 0.49
      },
    ],
    d3emSteps: [
      { stepName: 'Data Volume Assessment', description: 'Initial evaluation based on client data scale', value: 0.20, isActive: true },
      { stepName: 'Data Quality Analysis', description: 'Assess data quality and feature diversity', value: 0.40, isActive: true },
      { stepName: 'Noise Filtering', description: 'Dynamic denoising and quality enhancement', value: 0.30, isActive: true },
      { stepName: 'Contribution Calculation', description: 'Final D³EM contribution scoring', value: 0.10, isActive: true }
    ],
    gradientSparsification: {
      originalGradients: 10000,
      sparsifiedGradients: 2000,
      compressionRatio: 0.80,
      communicationReduction: 0.80
    },
    collaborativeFairnessScore: 0.85,
    noiseFilteringEfficiency: 0.78
  },
  noisy: {
    name: 'Scenario 3: High Noise Environment',
    description: 'Environment with significant noise where D³EM shows its noise filtering capabilities.',
    clients: [
      { 
        id: 'Client 1', 
        dataSize: 950, 
        trueContribution: 0.28, 
        traditionalScore: 0.24, 
        proposedScore: 0.30,
        dataQuality: 0.60,
        featureDiversity: 0.55,
        gradientSparsity: 0.40,
        noiseLevel: 0.35,
        d3emScore: 0.27,
        incentiveAllocation: 0.28
      },
      { 
        id: 'Client 2', 
        dataSize: 1050, 
        trueContribution: 0.22, 
        traditionalScore: 0.26, 
        proposedScore: 0.20,
        dataQuality: 0.65,
        featureDiversity: 0.60,
        gradientSparsity: 0.35,
        noiseLevel: 0.30,
        d3emScore: 0.23,
        incentiveAllocation: 0.22
      },
      { 
        id: 'Client 3', 
        dataSize: 850, 
        trueContribution: 0.35, 
        traditionalScore: 0.21, 
        proposedScore: 0.32,
        dataQuality: 0.88,
        featureDiversity: 0.85,
        gradientSparsity: 0.10,
        noiseLevel: 0.08,
        d3emScore: 0.34,
        incentiveAllocation: 0.35
      },
      { 
        id: 'Client 4', 
        dataSize: 1150, 
        trueContribution: 0.15, 
        traditionalScore: 0.29, 
        proposedScore: 0.18,
        dataQuality: 0.55,
        featureDiversity: 0.50,
        gradientSparsity: 0.45,
        noiseLevel: 0.40,
        d3emScore: 0.16,
        incentiveAllocation: 0.15
      },
    ],
    d3emSteps: [
      { stepName: 'Data Volume Assessment', description: 'Initial evaluation based on client data scale', value: 0.15, isActive: true },
      { stepName: 'Data Quality Analysis', description: 'Assess data quality and feature diversity', value: 0.25, isActive: true },
      { stepName: 'Noise Filtering', description: 'Dynamic denoising and quality enhancement', value: 0.50, isActive: true },
      { stepName: 'Contribution Calculation', description: 'Final D³EM contribution scoring', value: 0.10, isActive: true }
    ],
    gradientSparsification: {
      originalGradients: 10000,
      sparsifiedGradients: 3000,
      compressionRatio: 0.70,
      communicationReduction: 0.70
    },
    collaborativeFairnessScore: 0.76,
    noiseFilteringEfficiency: 0.92
  }
};

export default scenarios;

// Helper functions for D³EM calculations
export const calculateD3EMScore = (client: ClientContribution): number => {
  const dataWeight = 0.2;
  const qualityWeight = 0.4;
  const diversityWeight = 0.3;
  const noiseWeight = 0.1;
  
  return (
    (client.dataSize / 1200) * dataWeight +
    client.dataQuality * qualityWeight +
    client.featureDiversity * diversityWeight +
    (1 - client.noiseLevel) * noiseWeight
  );
};

export const calculateGradientSparsity = (client: ClientContribution): number => {
  // Higher noise leads to higher sparsity
  return Math.min(0.5, client.noiseLevel + 0.1);
};

export const calculateIncentiveAllocation = (clients: ClientContribution[]): ClientContribution[] => {
  const totalD3EMScore = clients.reduce((sum, client) => sum + client.d3emScore, 0);
  return clients.map(client => ({
    ...client,
    incentiveAllocation: client.d3emScore / totalD3EMScore
  }));
};
