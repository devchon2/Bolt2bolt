/**
 * Types et interfaces pour le module d'optimisation
 * 
 * @module optimizer/types
 */

import { MetricType, SeverityLevel } from '../analyzer/types';

/**
 * Types d'optimisations disponibles
 */
export type OptimizationType = MetricType;

/**
 * Méthodes de priorisation des optimisations
 */
export type OptimizationPriority = 
  | 'severity'        // Priorise par niveau de sévérité des problèmes
  | 'impact'          // Priorise par impact estimé sur la qualité globale 
  | 'complexity'      // Priorise les optimisations les moins complexes en premier
  | 'file'            // Optimise fichier par fichier
  | 'type';           // Groupe par type d'optimisation

/**
 * Options de configuration pour l'optimisation de code
 */
export interface OptimizationOptions {
  /** Types d'optimisations à appliquer */
  optimizationTypes: OptimizationType[];
  
  /** Niveaux de sévérité à traiter */
  severity: SeverityLevel[];
  
  /** Préserver le format du code (espaces, indentation) */
  preserveFormat: boolean;
  
  /** Nombre maximum de changements par fichier */
  maxChangesPerFile: number;
  
  /** Mode simulation (génère le rapport mais n'applique pas les changements) */
  dryRun: boolean;
  
  /** Exige une validation pour chaque modification appliquée */
  requireValidation: boolean;
  
  /** Conserve une copie du code original */
  keepOriginalCode: boolean;
  
  /** Méthode de priorisation des optimisations */
  prioritizeBy: OptimizationPriority;
}

/**
 * Représente une transformation à appliquer au code
 */
export interface CodeTransformation {
  /** Identifiant unique de la transformation */
  id: string;
  
  /** Titre descriptif court */
  title: string;
  
  /** Description détaillée de la transformation */
  description: string;
  
  /** Type principal d'optimisation */
  type: OptimizationType;
  
  /** Fonction qui détermine si la transformation est applicable */
  isApplicable: (node: any, context: any) => boolean;
  
  /** Fonction qui applique la transformation */
  transform: (node: any, context: any) => any;
  
  /** Priorité de la transformation (plus le nombre est élevé, plus la priorité est haute) */
  priority: number;
  
  /** Difficulté estimée de la transformation (1-5, plus c'est élevé plus c'est difficile) */
  complexity: number;
  
  /** Impact estimé de la transformation (1-5, plus c'est élevé plus l'impact est important) */
  impact: number;
  
  /** Sévérité du problème que la transformation résout */
  severity: SeverityLevel;
}

/**
 * Résultat d'une transformation appliquée
 */
export interface AppliedTransformation {
  /** Transformation appliquée */
  transformation: CodeTransformation;
  
  /** Chemin du fichier modifié */
  filePath: string;
  
  /** Position de début dans le code */
  startPosition: { line: number; column: number };
  
  /** Position de fin dans le code */
  endPosition: { line: number; column: number };
  
  /** Code avant la transformation */
  originalCode: string;
  
  /** Code après la transformation */
  transformedCode: string;
  
  /** La transformation a-t-elle été validée */
  validated: boolean;
  
  /** Raison d'échec si la validation a échoué */
  validationError?: string;
}
