/**
 * Types et interfaces pour le cœur du module d'optimisation
 * 
 * @module optimizer/core/types
 */

import { MetricType } from '../../analyzer/types';
import { AppliedTransformation, OptimizationType } from '../types';

/**
 * Résultat global du processus d'optimisation
 */
export interface OptimizationResult {
  /** Identifiant unique de la session d'optimisation */
  optimizationId: string;
  
  /** Timestamp de début d'optimisation */
  timestamp: number;
  
  /** Statistiques globales d'optimisation */
  stats: OptimizationStats;
  
  /** Liste des transformations appliquées */
  appliedTransformations: AppliedTransformation[];
  
  /** Liste des transformations rejetées */
  rejectedTransformations: AppliedTransformation[];
  
  /** Liste des fichiers modifiés */
  modifiedFiles: ModifiedFile[];
  
  /** Rapport textuel résumant les optimisations */
  summary: string;
}

/**
 * Statistiques sur le processus d'optimisation
 */
export interface OptimizationStats {
  /** Nombre de fichiers analysés */
  filesAnalyzed: number;
  
  /** Nombre de fichiers modifiés */
  filesModified: number;
  
  /** Nombre total de transformations appliquées */
  transformationsApplied: number;
  
  /** Nombre de transformations rejetées */
  transformationsRejected: number;
  
  /** Distribution des transformations par type */
  transformationsByType: Record<OptimizationType, number>;
  
  /** Scores d'amélioration estimés par métrique */
  improvementScores: Partial<Record<MetricType, number>>;
  
  /** Temps d'optimisation en millisecondes */
  optimizationTimeMs: number;
}

/**
 * Informations sur un fichier modifié
 */
export interface ModifiedFile {
  /** Chemin du fichier */
  path: string;
  
  /** Nombre de transformations appliquées */
  transformationsCount: number;
  
  /** Code original */
  originalContent: string;
  
  /** Code optimisé */
  optimizedContent: string;
  
  /** Scores d'amélioration estimés par métrique */
  improvementScores: Partial<Record<MetricType, number>>;
}

/**
 * Contexte pour une transformation de code
 */
export interface TransformationContext {
  /** Contenu du fichier */
  fileContent: string;
  
  /** Chemin du fichier */
  filePath: string;
  
  /** AST du code source */
  ast: any;
  
  /** Informations sur les problèmes détectés */
  issues: any[];
  
  /** Métadonnées additionnelles spécifiques à la transformation */
  metadata?: Record<string, any>;
}

/**
 * Résultat d'une validation de transformation
 */
export interface ValidationResult {
  /** La transformation est-elle valide */
  valid: boolean;
  
  /** Message d'erreur si non valide */
  errorMessage?: string;
  
  /** Scores des tests si applicable */
  testScores?: {
    passed: number;
    failed: number;
    total: number;
  };
  
  /** Métrique d'impact mesurée */
  measuredImpact?: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
}
