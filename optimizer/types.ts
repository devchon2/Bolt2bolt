// Types pour le système d'optimisation

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type IssueSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface CodeIssue {
  id: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  suggestion?: string;
  severity: IssueSeverity;
  type: 'incomplete' | 'complex' | 'duplicate' | 'inefficient' | 'other';
  autoFixable: boolean;
}

export interface TestIssue {
  id: string;
  file: string;
  function?: string;
  message: string;
  coverage?: number;
  missingTestTypes?: Array<'unit' | 'integration' | 'e2e'>;
  severity: IssueSeverity;
  suggestedTest?: string;
}

export interface DocIssue {
  id: string;
  file: string;
  line?: number;
  entity?: string;
  message: string;
  missingElements?: Array<'description' | 'params' | 'returns' | 'examples'>;
  severity: IssueSeverity;
  suggestedDoc?: string;
}

export interface PerformanceIssue {
  id: string;
  file: string;
  function?: string;
  message: string;
  metric?: {
    name: string;
    value: number;
    threshold: number;
    unit: string;
  };
  severity: IssueSeverity;
  suggestion?: string;
  potentialImprovement?: number;
}

export interface SecurityIssue {
  id: string;
  file?: string;
  dependency?: {
    name: string;
    version: string;
  };
  cveId?: string;
  message: string;
  severity: IssueSeverity;
  remediation?: string;
}

export interface ArchitectureIssue {
  id: string;
  files?: string[];
  components?: string[];
  message: string;
  pattern?: string;
  antiPattern?: string;
  suggestion?: string;
  severity: IssueSeverity;
  diagram?: string;
}

export interface OptimizerResult {
  codeIssues: CodeIssue[];
  testIssues: TestIssue[];
  docIssues: DocIssue[];
  perfIssues: PerformanceIssue[];
  securityIssues: SecurityIssue[];
  archIssues: ArchitectureIssue[];
  timestamp: Date;
  targetPath: string;
}

export interface AnalyzerOptions {
  deep?: boolean;
  quick?: boolean;
  fix?: boolean;
}

export interface SuggestionFilter {
  minSeverity?: IssueSeverity;
  types?: string[];
  autoFixableOnly?: boolean;
  files?: string[];
}
