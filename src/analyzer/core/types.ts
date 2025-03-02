/**
 * Types centraux pour le moteur d'analyse de code
 * 
 * @module analyzer/core/types
 */

import { CodeIssue, MetricType, SeverityLevel, CodeAnalyzer } from '../types';

/**
 * Interface de base pour tous les analyseurs spécifiques
 */
export interface CodeAnalyzer {
  /** Identifiant unique de l'analyseur */
  id: string;
  
  /** Nom descriptif de l'analyseur */
  name: string;
  
  /** Description des capacités de l'analyseur */
  description: string;
  
  /** Type de métrique principale fournie par l'analyseur */
  metricType: MetricType;
  
  /** Initialise l'analyseur avec les données nécessaires */
  initialize(): Promise<void>;
  
  /** Analyse le contenu d'un fichier */
  analyzeFile(filePath: string, fileContent: string): Promise<CodeIssue[]>;
  
  /** Nettoie les ressources utilisées par l'analyseur */
  cleanup(): Promise<void>;
}

/**
 * Statistiques globales d'analyse d'un projet
 */
export interface AnalysisStats {
  /** Nombre total de fichiers analysés */
  totalFiles: number;
  
  /** Nombre total de lignes de code */
  totalLines: number;
  
  /** Distribution des problèmes par sévérité */
  issuesBySeverity: Record<SeverityLevel, number>;
  
  /** Distribution des problèmes par type de métrique */
  issuesByMetric: Record<MetricType, number>;
  
  /** Score global sur 100 points */
  overallScore: number;
  
  /** Scores par dimension sur 100 points */
  dimensionScores: Record<MetricType, number>;
  
  /** Temps d'analyse en millisecondes */
  analysisTimeMs: number;
}

/**
 * Structure d'un fichier analysé
 */
export interface AnalyzedFile {
  /** Chemin du fichier */
  path: string;
  
  /** Nombre de lignes de code */
  lines: number;
  
  /** Liste des problèmes détectés */
  issues: CodeIssue[];
  
  /** Score de qualité global (0-100) */
  score: number;
  
  /** Scores par dimension (0-100) */
  metricScores: Partial<Record<MetricType, number>>;
}

/**
 * Résultat complet d'une analyse de code
 */
export interface AnalysisResult {
  /** Identifiant unique de l'analyse */
  analysisId: string;
  
  /** Timestamp de l'analyse */
  timestamp: number;
  
  /** Statistiques globales */
  stats: AnalysisStats;
  
  /** Détails par fichier */
  files: AnalyzedFile[];
  
  /** Liste complète des problèmes détectés */
  issues: CodeIssue[];
  
  /** Métriques calculées */
  metrics: Record<string, any>;
  
  /** Rapport d'analyse résumé */
  summary: string;
}

/**
 * Configuration pour le générateur de rapports
 */
export interface ReportGeneratorOptions {
  /** Format du rapport */
  format: 'json' | 'html' | 'markdown' | 'text';
  
  /** Inclure les détails complets */
  detailed: boolean;
  
  /** Chemin de sortie pour le rapport */
  outputPath?: string;
  
  /** Inclure des visualisations */
  includeVisualizations?: boolean;
  
  /** Filtres à appliquer */
  filters?: {
    minSeverity?: SeverityLevel;
    includeMetrics?: MetricType[];
    maxIssues?: number;
  };
}

/**
 * Configuration pour un analyseur
 */
export interface AnalyzerConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Configuration globale pour l'ensemble des analyseurs
 */
export interface AnalysisConfig {
  analyzers: Record<string, AnalyzerConfig>;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSizeKB: number;
}

/**
 * Interface pour le registre des analyseurs
 */
export interface AnalyzerRegistry {
  /**
   * Enregistre un analyseur
   * @param analyzer Instance d'analyseur
   */
  register(analyzer: CodeAnalyzer): void;
  
  /**
   * Récupère un analyseur par son ID
   * @param id ID de l'analyseur
   */
  get(id: string): CodeAnalyzer | undefined;
  
  /**
   * Récupère tous les analyseurs
   */
  getAll(): CodeAnalyzer[];
  
  /**
   * Récupère les analyseurs filtrés par type de métrique
   * @param metricType Type de métrique
   */
  getByMetricType(metricType: string): CodeAnalyzer[];
  
  /**
   * Supprime un analyseur
   * @param id ID de l'analyseur
   */
  unregister(id: string): boolean;
}
