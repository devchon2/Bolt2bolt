/**
 * Types fondamentaux partagés par les différents modules de Bolt2bolt
 */

/**
 * Niveau de sévérité d'une issue (info, warning, error, critical)
 */
export enum IssueSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

/**
 * Type d'issue (sécurité, performance, maintenabilité, etc.)
 */
export enum IssueType {
  Security = 'security',
  Performance = 'performance',
  Maintainability = 'maintainability',
  Complexity = 'complexity',
  BestPractice = 'best-practice',
  AntiPattern = 'anti-pattern'
}

/**
 * Position précise dans un fichier (ligne, colonne, offset)
 */
export interface FilePosition {
  line: number;
  column: number;
  offset: number;
}

/**
 * Plage de caractères dans un fichier (début et fin)
 */
export interface FileRange {
  start: FilePosition;
  end: FilePosition;
}

/**
 * Issue détectée dans le code, incluant le type, la sévérité, le message, etc.
 */
export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  filePath: string;
  range?: FileRange;
  code?: string;
  rule?: string;
  suggestions?: string[];
}

/**
 * Options de configuration du projet (nom, chemin de base)
 */
export interface ProjectOptions {
  projectName: string;
  basePath: string;
}

/**
 * Type d'optimisation appliquée (sécurité, performance, complexité, etc.)
 */
export enum OptimizationType {
  SecurityFix = 'security-fix',
  PerformanceBoost = 'performance-boost',
  ComplexityReduction = 'complexity-reduction',
  CodeCleanup = 'code-cleanup',
  RefactorPattern = 'refactor-pattern',
  TypeImprovement = 'type-improvement'
}
