import { ProjectOptions } from '../types';
import { LLMProvider } from '../../lib/types/llm';

// [COPILOT_PROMPT]: Étendez ces interfaces pour ajouter de nouvelles fonctionnalités à l'orchestrateur.
// [COPILOT_PROMPT]: Pour chaque nouvelle phase d'optimisation, ajoutez les types correspondants.

/**
 * Statut d'une optimisation
 */
export type OptimizationStatus = 
  | 'pending'    // En attente de traitement
  | 'analyzing'  // Analyse en cours
  | 'optimizing' // Optimisation en cours
  | 'validating' // Validation en cours
  | 'completed'  // Terminé avec succès
  | 'failed'     // Échec
  | 'rolled-back'; // Annulé et retour à l'état précédent

/**
 * Options pour l'analyseur
 */
export interface AnalyzerOptions {
  projectOptions: ProjectOptions;
  includeDirs?: string[];
  excludeDirs?: string[];
  fileTypes?: string[];
  analysisDepth?: 'shallow' | 'normal' | 'deep';
}

/**
 * Résultat de l'analyse
 */
export interface AnalysisResult {
  issuesFound: number;
  optimizationScore: number;
  recommendedActions: RecommendedAction[];
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  codeQualityIssues: CodeQualityIssue[];
  summary: string;
  timestamp: Date;
}

/**
 * Options pour l'optimiseur
 */
export interface OptimizerOptions {
  projectOptions: ProjectOptions;
  llmProvider?: LLMProvider;
  optimizationLevel?: 'safe' | 'balanced' | 'aggressive';
  maxConcurrency?: number;
  preserveComments?: boolean;
}

/**
 * Résultat d'une optimisation
 */
export interface OptimizationResult {
  status: OptimizationStatus;
  affectedFiles: string[];
  optimizationScore: number;
  improvementRatio: number;
  executionTimeMs: number;
  changes: FileChange[];
  summary: string;
  timestamp: Date;
}

/**
 * Options pour le validateur
 */
export interface ValidatorOptions {
  projectOptions: ProjectOptions;
  runTests?: boolean;
  validateSyntax?: boolean;
  validateSemantic?: boolean;
  validatePerformance?: boolean;
}

/**
 * Résultat de la validation
 */
export interface ValidationResult {
  isValid: boolean;
  validationScore: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  syntaxErrors: number;
  semanticErrors: number;
  performanceRegressions: number;
  rollbackRecommended: boolean;
  issues: ValidationIssue[];
  summary: string;
  timestamp: Date;
}

/**
 * Action recommandée suite à l'analyse
 */
export interface RecommendedAction {
  id: string;
  type: 'refactoring' | 'optimization' | 'security' | 'structure';
  priority: number;
  description: string;
  file: string;
  lines?: { start: number; end: number };
  estimatedImpact: 'low' | 'medium' | 'high';
}

/**
 * Problème de sécurité détecté
 */
export interface SecurityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file: string;
  lines?: { start: number; end: number };
  cwe?: string; // Common Weakness Enumeration ID
  recommendation: string;
}

/**
 * Problème de performance détecté
 */
export interface PerformanceIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  file: string;
  lines?: { start: number; end: number };
  impact?: string;
  recommendation: string;
}

/**
 * Problème de qualité de code détecté
 */
export interface CodeQualityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  file: string;
  lines?: { start: number; end: number };
  category: 'complexity' | 'duplication' | 'maintainability' | 'style' | 'documentation';
  recommendation: string;
}

/**
 * Pour le champ "category" des CodeQualityIssue, il est attendu que :
 * - 'complexity' réfère à une complexité excessive,
 * - 'duplication' indique un niveau élevé de code dupliqué,
 * - 'maintainability' est lié à la facilité de maintenance,
 * - 'style' concerne la cohérence du code,
 * - 'documentation' indique les lacunes en documentation.
 */

/**
 * Changement appliqué à un fichier
 */
export interface FileChange {
  file: string;
  changeType: 'modified' | 'created' | 'deleted';
  diff?: string;
  beforeSize?: number;
  afterSize?: number;
  complexity?: {
    before: number;
    after: number;
  };
}

/**
 * Problème détecté lors de la validation
 */
export interface ValidationIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file: string;
  testName?: string;
  category: 'syntax' | 'semantic' | 'test' | 'performance';
  stackTrace?: string;
}

/**
 * Options de configuration de l'orchestrateur
 */
export interface OrchestratorOptions {
  analyzerOptions: AnalyzerOptions;
  optimizerOptions: OptimizerOptions;
  validatorOptions?: ValidatorOptions;
  autoRollback?: boolean;
  generateReports?: boolean;
  reportFormat?: 'markdown' | 'html' | 'json';
}
