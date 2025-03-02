import { OptimizationResult } from '../optimizer/types';

export interface ValidatorOptions {
  projectOptions?: any;
}

export interface ValidationResult {
  validationPassed: boolean;
  tests: {
    total: number;
    passed: number;
    failed: number;
  };
  issues: ValidationIssue[];
  timestamp: string;
}

export interface ValidationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  optimization?: {
    filePath: string;
    type: string;
  };
}
