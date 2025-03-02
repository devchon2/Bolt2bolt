/**
 * Types communs utilisés à travers l'application Bolt2bolt
 */

// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.

// Types pour l'analyseur de code
export interface CodeIssue {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location: {
    file?: string;
    startLine?: number;
    endLine?: number;
    startColumn?: number;
    endColumn?: number;
  };
  category: 'security' | 'performance' | 'maintainability' | 'style' | 'correctness';
  suggestions?: string[];
  circularDependency?: boolean;
}

export interface CodeLocation {
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface CodeMetrics {
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  size: {
    lines: number;
    functions: number;
  };
  maintainability: {
    score: number;
  };
}

export interface AnalysisReport {
  sourceFile?: string;
  timestamp: number;
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: string[];
}

// Types pour l'optimiseur de code
export interface Transformation {
  id: string;
  type: string;
  description: string;
  locations: CodeLocation[];
  reasoning: string;
}

export interface OptimizationResult {
  originalCode: string;
  optimizedCode: string;
  appliedTransformations: Transformation[];
  performanceImpact: number;
  risks: string[];
}

// Types pour le validateur de code
export interface TestResult {
  name: string;
  passed: boolean;
  duration?: number;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  tests: TestResult[];
  behaviouralCheck: {
    behaviorPreserved: boolean;
    impact: 'none' | 'low' | 'medium' | 'high';
  };
}

// Types pour le générateur de rapports
export interface ReportOptions {
  format?: string[];
  detailLevel?: 'summary' | 'detailed' | 'technical';
  includeSections?: string[];
  outputPath?: string;
}

// Types de configuration
export interface AnalyzerOptions {
  includeMetrics: string[];
  maxComplexity: number;
  securityLevel: 'low' | 'medium' | 'high';
  rulesets: string[];
}

export interface OptimizerOptions {
  // ...existing code...
}

export interface ValidatorOptions {
  generateTests: boolean;
  validateTypes: boolean;
  checkBehavior: boolean;
}

export interface ReporterOptions {
  formats: string[];
  detailLevel: 'summary' | 'detailed' | 'technical';
  outputDir?: string;
}

export interface NewCommonType {
  // Définition du nouveau type
}
