/**
 * Définitions de types pour le module d'analyse Bolt2bolt.
 * 
 * @module analyzer/types
 */

/**
 * Niveaux de sévérité des problèmes détectés
 */
export enum SeverityLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

/**
 * Types de métriques d'analyse disponibles
 */
export type MetricType = 
  | 'complexity'    // Complexité du code
  | 'security'      // Sécurité et vulnérabilités
  | 'performance'   // Efficacité et performances
  | 'maintainability' // Facilité de maintenance
  | 'documentation' // Qualité de la documentation
  | 'typescript'    // Utilisation des fonctionnalités TypeScript
  | 'duplication'   // Code dupliqué
  | 'dependencies'  // Analyse des dépendances
  | 'tests';        // Couverture et qualité des tests

/**
 * Niveau d'analyse de sécurité
 */
export type SecurityScanLevel = 'basic' | 'standard' | 'thorough';

/**
 * Cible d'optimisation principale
 */
export type OptimizationTarget = 'performance' | 'security' | 'maintainability' | 'balanced';

/**
 * Options de configuration pour l'analyse de code
 */
export interface AnalysisOptions {
  /** Active l'analyse statique (sans exécution) */
  staticAnalysis: boolean;
  
  /** Active l'analyse dynamique (avec exécution) */
  dynamicAnalysis: boolean;
  
  /** Active l'analyse des dépendances */
  dependencyAnalysis: boolean;
  
  /** Types de métriques à calculer */
  metrics: MetricType[];
  
  /** Taille maximale des fichiers à analyser en Ko */
  maxFileSizeKb: number;
  
  /** Patterns de fichiers à exclure */
  excludePatterns: string[];
  
  /** Niveau d'analyse de sécurité */
  securityScanLevel: SecurityScanLevel;
  
  /** Cible principale d'optimisation */
  optimizationTarget: OptimizationTarget;
}

/**
 * Localisation précise dans le code source
 */
export interface CodeLocation {
  /** Chemin du fichier */
  filePath: string;
  
  /** Numéro de ligne (commence à 1) */
  line: number;
  
  /** Position de colonne (commence à 1) */
  column: number;
  
  /** Position de fin de ligne (optionnel) */
  endLine?: number;
  
  /** Position de fin de colonne (optionnel) */
  endColumn?: number;
}

/**
 * Structure d'un problème détecté lors de l'analyse
 */
export interface CodeIssue {
  /** Identifiant unique du problème */
  id: string;
  
  /** Titre court du problème */
  title: string;
  
  /** Description détaillée du problème */
  description: string;
  
  /** Localisation du problème dans le code */
  location: CodeLocation;
  
  /** Niveau de sévérité */
  severity: SeverityLevel;
  
  /** Type de métrique concernée */
  metricType: MetricType;
  
  /** Code exemple corrigé (optionnel) */
  fixExample?: string;
  
  /** Liens vers la documentation (optionnel) */
  documentationLinks?: string[];
  
  /** Suggestions automatiques pour correction (optionnel) */
  suggestions?: string[];
}

/**
 * Types d'analyseurs disponibles
 */
export enum AnalyzerType {
  AST = 'ast',
  Complexity = 'complexity',
  SecurityVulnerability = 'security',
  CodePatterns = 'patterns',
  Performance = 'performance',
  MemoryUsage = 'memory',
  ExecutionTracing = 'tracing',
  Dependencies = 'dependencies',
  CodeDuplication = 'duplication'
}

/**
 * Interface pour tous les analyseurs de code
 */
export interface CodeAnalyzer {
  id: string;
  name: string;
  description: string;
  metricType: MetricType;
  
  /**
   * Initialise l'analyseur
   */
  initialize(): Promise<void>;
  
  /**
   * Analyse le contenu d'un fichier
   * @param filePath Chemin du fichier
   * @param fileContent Contenu du fichier
   */
  analyzeFile(filePath: string, fileContent: string): Promise<CodeIssue[]>;
  
  /**
   * Libère les ressources utilisées
   */
  cleanup(): Promise<void>;
}

export interface AnalysisPattern {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  type: 'security' | 'performance' | 'maintainability' | 'code-style';
  impact: number; // 0-100
}
