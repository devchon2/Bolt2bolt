/**
 * Types de configuration pour Bolt2bolt
 * 
 * Ces types définissent la structure de configuration du système
 */

// [COPILOT_PROMPT]: Pour étendre la configuration, ajoutez de nouveaux champs dans BoltConfig tout en préservant la rétrocompatibilité.

/**
 * Configuration d'un modèle d'IA
 */
export interface AIModelConfig {
  /** Priorité du modèle (plus petit = plus haute priorité) */
  priority: number;
  /** Taille de la fenêtre de contexte en tokens */
  contextWindow: number;
  /** Clé API pour ce modèle (optionnel si définie dans les variables d'environnement) */
  apiKey?: string;
  /** Options par défaut pour ce modèle */
  defaultOptions: {
    /** Température pour la génération (0-1) */
    temperature: number;
    /** Nombre maximum de tokens à générer */
    maxTokens: number;
    /** Modèles à éviter dans les réponses */
    stopSequences?: string[];
    /** Nombre de résultats à générer */
    n?: number;
    /** Pénalité de présence */
    presencePenalty?: number;
    /** Pénalité de fréquence */
    frequencyPenalty?: number;
  };
}

/**
 * Seuils de qualité du code
 */
export interface ThresholdConfig {
  /** Complexité cyclomatique maximale */
  maxComplexity: number;
  /** Pourcentage maximal de duplication de code */
  maxDuplication: number;
  /** Couverture minimale des tests en pourcentage */
  minTestCoverage: number;
}

/**
 * Configuration principale de Bolt2bolt
 */
export interface BoltConfig {
  components: any;
  /** Configuration des modèles d'IA disponibles */
  aiModels: Record<string, AIModelConfig>;
  /** Seuils de qualité de code */
  threshold: ThresholdConfig;
  /** Configuration optionnelle des chemins */
  paths?: {
    /** Dossier de sortie pour les rapports */
    reports?: string;
    /** Dossier des tests */
    tests?: string;
  };
  /** Comportement personnalisé */
  behavior?: {
    /** Activer l'auto-commit après optimisation */
    autoCommit?: boolean;
    /** Créer une branche pour les optimisations */
    createBranch?: boolean;
    /** Génération automatique de tests */
    autoGenerateTests?: boolean;
  };
}

/**
 * Environnements supportés
 */
export type Environment = 'local' | 'ci' | 'production';
