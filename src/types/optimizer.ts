// #codebase: [CONTEXTE] Définitions de types pour le module d'optimisation de Bolt2bolt
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires

/**
 * Options pour configurer l'optimisation de code
 */
export interface OptimizerOptions {
  /**
   * Chemin de sortie pour le code optimisé
   */
  outputPath?: string;
  
  /**
   * Si faux, ne pas écrire le résultat dans un fichier
   */
  writeToFile?: boolean;
  
  /**
   * Types d'optimisations à appliquer
   */
  optimizationTypes?: string[];
  
  /**
   * Si vrai, valider que l'optimisation ne change pas la sémantique du code
   */
  validateTransformation?: boolean;
  
  /**
   * Si vrai, créer une sauvegarde du fichier original avant l'optimisation
   */
  createBackup?: boolean;
  
  /**
   * Configuration spécifique aux plugins d'optimisation
   */
  pluginOptions?: Record<string, any>;
  
  /**
   * Si vrai, continuer même si certaines optimisations échouent
   */
  continueOnError?: boolean;
}

/**
 * Représente une transformation appliquée au code
 */
export interface Transformation {
  /**
   * Type d'optimisation appliquée
   */
  type: string;
  
  /**
   * Description de la transformation
   */
  description: string;
  
  /**
   * Code original avant l'optimisation
   */
  originalCode: string;
  
  /**
   * Code optimisé après la transformation
   */
  optimizedCode: string;
  
  /**
   * Estimation de l'amélioration (en pourcentage, lignes réduites, etc.)
   */
  improvement?: {
    type: 'performance' | 'size' | 'readability' | 'maintenance';
    value: number;
    unit: string;
  };
  
  /**
   * Emplacement de la transformation dans le code
   */
  location?: {
    startLine: number;
    endLine: number;
    file?: string;
  };
}

/**
 * Résultat du processus d'optimisation
 */
export interface OptimizerResult {
  /**
   * Code original avant optimization
   */
  originalCode: string;
  
  /**
   * Code optimisé après toutes les transformations
   */
  optimizedCode: string;
  
  /**
   * Liste des transformations appliquées
   */
  appliedTransformations: Transformation[];
  
  /**
   * Opportunités d'optimisation qui n'ont pas pu être appliquées
   */
  failedOpportunities: Array<any>; // Type OptimizationOpportunity from analyzer
  
  /**
   * Indique si au moins une optimisation a été appliquée avec succès
   */
  success: boolean;
  
  /**
   * Statistiques sur le processus d'optimisation
   */
  stats: {
    opportunitiesCount: number;
    appliedCount: number;
    failedCount: number;
  };
}

/**
 * Configuration pour un plugin d'optimisation
 */
export interface OptimizerPluginConfig {
  enabled: boolean;
  name: string;
  options: Record<string, any>;
  priority: number;
}
