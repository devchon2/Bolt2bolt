// #codebase: [CONTEXTE] Définitions de types pour le module de validation de Bolt2bolt
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires

/**
 * Niveaux de sévérité pour les problèmes détectés
 */
export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Représente une règle de validation et ses résultats
 */
export interface ValidationRule {
  /**
   * Identificateur unique de la règle
   */
  name: string;
  
  /**
   * Description du problème détecté
   */
  description: string;
  
  /**
   * Niveau de sévérité du problème
   */
  severity: Severity;
  
  /**
   * Ligne où se trouve le problème
   */
  line: number;
  
  /**
   * Colonne où se trouve le problème
   */
  column: number;
  
  /**
   * Extrait de code concerné par le problème
   */
  codeSnippet?: string;
  
  /**
   * Suggestion de correction
   */
  suggestion?: string;
  
  /**
   * Identifiant de la documentation associée
   */
  documentationId?: string;
}

/**
 * Options pour configurer le processus de validation
 */
export interface ValidationOptions {
  /**
   * Si vrai, arrêter à la première validation échouée
   */
  failFast?: boolean;
  
  /**
   * Niveaux de sévérité à prendre en compte
   */
  severityFilter?: Severity[];
  
  /**
   * Groupes de règles à activer ou désactiver
   */
  ruleGroups?: {
    [groupName: string]: boolean;
  };
  
  /**
   * Règles spécifiques à activer ou désactiver
   */
  rules?: {
    [ruleName: string]: boolean;
  };
  
  /**
   * Fichiers ou patterns à ignorer
   */
  ignore?: string[];
  
  /**
   * Configuration spécifique aux plugins de validation
   */
  pluginOptions?: Record<string, any>;
}

/**
 * Résultat du processus de validation
 */
export interface ValidationResult {
  /**
   * Indique si la validation a réussi (aucun problème critique)
   */
  valid: boolean;
  
  /**
   * Problèmes détectés lors de la validation
   */
  issues: ValidationRule[];
  
  /**
   * Statistiques sur les problèmes détectés
   */
  stats: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  
  /**
   * Métadonnées optionnelles sur la validation
   */
  metadata?: Record<string, any>;
}

/**
 * Configuration pour un plugin de validation
 */
export interface ValidatorPluginConfig {
  enabled: boolean;
  name: string;
  options: Record<string, any>;
  priority: number;
}
