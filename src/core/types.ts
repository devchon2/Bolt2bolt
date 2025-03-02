// [COPILOT_PROMPT]: Lors de l'ajout de nouvelles options au projet, mettez à jour l'interface ProjectOptions.
// [COPILOT_PROMPT]: Assurez-vous que toutes les options sont bien documentées avec des commentaires JSDoc.

/**
 * Options générales du projet
 */
export interface ProjectOptions {
  /**
   * Nom du projet
   */
  projectName: string;
  
  /**
   * Chemin de base du projet
   */
  basePath: string;
  
  /**
   * Dossiers à exclure de l'analyse
   */
  excludeDirs?: string[];
  
  /**
   * Types de fichiers à analyser
   */
  fileTypes?: string[];
  
  /**
   * Version minimale de Node.js requise
   */
  nodeVersion?: string;
  
  /**
   * Chemin vers la configuration personnalisée
   */
  configPath?: string;
  
  /**
   * Options spécifiques au projet
   */
  options?: Record<string, unknown>;
}

/**
 * Source d'un fichier
 */
export interface FileSource {
  /**
   * Chemin du fichier
   */
  path: string;
  
  /**
   * Contenu du fichier
   */
  content: string;
  
  /**
   * Type du fichier
   */
  fileType: string;
  
  /**
   * Métadonnées supplémentaires
   */
  metadata?: Record<string, unknown>;
}

/**
 * Phase d'optimisation
 */
export type OptimizationPhase =
  | 'planning'
  | 'analysis'
  | 'optimization'
  | 'validation'
  | 'reporting';

/**
 * Niveau de sévérité
 */
export type SeverityLevel =
  | 'info'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

/**
 * Options de formatage de sortie
 */
export interface OutputFormatOptions {
  /**
   * Format de sortie
   */
  format: 'text' | 'json' | 'markdown' | 'html';
  
  /**
   * Inclure les détails supplémentaires
   */
  verbose: boolean;
  
  /**
   * Colorer la sortie (pour les formats texte)
   */
  colors: boolean;
  
  /**
   * Chemin de sortie pour les rapports
   */
  outputPath?: string;
}
