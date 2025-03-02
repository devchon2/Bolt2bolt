import { Project, ProjectOptions } from 'ts-morph';

export interface AnalyzerOptions {
  projectOptions: ProjectOptions;
}

export interface MetricsResult {
  averageComplexity?: number;
  maintainabilityIndex?: number;
  [key: string]: any;
}

export interface PatternsResult {
  issues: any[];
  [key: string]: any;
}

export interface SecurityResult {
  vulnerabilities: any[];
  securityScore: number;
  [key: string]: any;
}

export interface AnalysisResult {
  metrics: MetricsResult;
  patterns: PatternsResult;
  security: SecurityResult;
  timestamp: string;
  summary: {
    totalIssues: number;
    complexityScore: number;
    maintainabilityIndex: number;
    securityScore: number;
  };
  filePath?: string;
  error?: string;
}
