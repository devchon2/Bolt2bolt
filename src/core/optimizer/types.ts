import { ProjectOptions } from 'ts-morph';

export interface OptimizerOptions {
  projectOptions: ProjectOptions;
}

export interface Optimization {
  filePath: string;
  type: string;
  description: string;
  impact: number;
  sourceCode?: string;
}

export interface OptimizationResult {
  optimizationsApplied: Optimization[];
  timestamp: string;
  summary: {
    totalOptimizations: number;
    impactScore: number;
    transformationTypes: Record<string, number>;
  };
  filePath?: string;
}
