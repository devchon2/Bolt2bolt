// #codebase: [CONTEXTE] Définitions de types pour le module d'analyse de Bolt2bolt
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires

/**
 * Options pour configurer l'analyse de code
 */
export interface AnalysisOptions {
  /**
   * Chemin du fichier en cours d'analyse
   */
  filePath?: string;
  
  /**
   * Niveaux de sévérité à inclure dans les résultats
   */
  severityFilter?: ('low' | 'medium' | 'high')[];
  
  /**
   * Seuil de confiance minimum pour inclure une opportunité (0-1)
   */
  confidenceThreshold?: number;
  
  /**
   * Active l'analyse en profondeur (peut être plus lent)
   */
  deepAnalysis?: boolean;
  
  /**
   * Types d'optimisations à rechercher
   */
  optimizationTypes?: string[];
  
  /**
   * Active ou désactive l'analyse syntaxique complète
   */
  parseAST?: boolean;
  
  /**
   * Configuration spécifique aux plugins d'analyse
   */
  pluginOptions?: Record<string, any>;
}

/**
 * Résultat de l'analyse de code
 */
export interface AnalysisResult {
  /**
   * Indique si l'analyse a réussi
   */
  success: boolean;
  
  /**
   * Message d'erreur en cas d'échec
   */
  error?: string;
  
  /**
   * Opportunités d'optimisation détectées
   */
  opportunities: Array<{
    type: string;
    location: {
      file: string;
      line: number;
      column: number;
    };
    description: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number; // 0-1
    codeSnippet?: string;
    suggestion?: string;
  }>;
  
  /**
   * Métadonnées optionnelles sur le code analysé
   */
  metadata?: {
    lines?: number;
    tokens?: number;
    complexity?: number;
    dependencies?: string[];
    [key: string]: any;
  };
  
  /**
   * Arbre syntaxique abstrait (AST) du code, si demandé et disponible
   */
  ast?: any;
}

/**
 * Métrique de performance pour une analyse
 */
export interface PerformanceMetric {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
}

/**
 * Configuration pour un plugin d'analyse
 */
export interface AnalyzerPluginConfig {
  enabled: boolean;
  name: string;
  options: Record<string, any>;
  priority: number;
}
