/**
 * Configuration centrale pour l'optimiseur de prompts Bolt2bolt
 * Personnalise le comportement et les stratégies d'optimisation
 */

import { PromptOptimizerOptions } from '../utils/prompt-optimizer';

/**
 * Configuration globale de l'optimiseur
 */
export const OPTIMIZER_CONFIG: PromptOptimizerOptions = {
  // Mode d'optimisation par défaut: faux pour l'optimisation conservatrice
  aggressiveOptimization: false,
  
  // Application automatique: faux pour nécessiter une validation manuelle
  autoApply: false,
  
  // Seuil de score minimum pour déclencher une optimisation
  minScoreThreshold: 70,
  
  // Taille maximale recommandée pour un prompt (en caractères)
  maxPromptSize: 3000,
  
  // Concepts prioritaires à inclure dans les prompts
  priorityConcepts: [
    // Concepts architecturaux
    'architecture',
    'pattern',
    'module',
    'responsabilité',
    'séparation',
    
    // Concepts techniques
    'optimisation',
    'performance',
    'validation',
    'test',
    'sécurité',
    
    // Concepts méthodologiques
    'itération',
    'phase',
    'priorité',
    'directive'
  ]
};

/**
 * Configurations spécifiques par type de fichier
 */
export const FILE_TYPE_CONFIGS: Record<string, Partial<PromptOptimizerOptions>> = {
  // Fichiers de test
  'test.ts': {
    priorityConcepts: [
      'test unitaire',
      'cas de test',
      'mock',
      'fixture',
      'assertion',
      'couverture'
    ],
    minScoreThreshold: 75
  },
  
  // Fichiers d'interface utilisateur
  'tsx': {
    priorityConcepts: [
      'composant',
      'props',
      'état',
      'rendu',
      'style',
      'accessibilité'
    ],
    minScoreThreshold: 65
  },
  
  // Fichiers de configuration
  'json': {
    aggressiveOptimization: false,
    maxPromptSize: 1000,
    priorityConcepts: [
      'configuration',
      'paramètre',
      'option',
      'environnement'
    ]
  }
};

/**
 * Obtenir la configuration d'optimisation pour un type de fichier spécifique
 */
export function getOptimizerConfig(filePath: string): PromptOptimizerOptions {
  const extension = filePath.split('.').pop() || '';
  const isTest = filePath.includes('.test.') || filePath.includes('.spec.');
  
  let fileTypeConfig: Partial<PromptOptimizerOptions> = {};
  
  // Sélectionner la configuration spécifique au type de fichier
  if (isTest && FILE_TYPE_CONFIGS['test.ts']) {
    fileTypeConfig = FILE_TYPE_CONFIGS['test.ts'];
  } else if (FILE_TYPE_CONFIGS[extension]) {
    fileTypeConfig = FILE_TYPE_CONFIGS[extension];
  }
  
  // Fusionner avec la configuration globale
  return {
    ...OPTIMIZER_CONFIG,
    ...fileTypeConfig
  };
}

/**
 * Configuration des modèles de prompt par type de composant
 */
export const PROMPT_TEMPLATES = {
  // Modèles pour les fichiers de code
  codeFiles: {
    context: 'Module {{role}} dans le système Bolt2bolt.',
    responsibility: 'Gérer {{functionality}} et assurer {{purpose}}.',
    currentIteration: 'Phase 5: Optimisation des prompts et chaînage intelligent.'
  },
  
  // Modèles pour les fichiers de test
  testFiles: {
    context: 'Tests unitaires pour {{componentName}}.',
    testStrategy: 'Tester tous les cas nominaux et scénarios d\'erreur.',
    mocking: 'Utiliser des mocks pour isoler les dépendances.'
  },
  
  // Modèles pour les fichiers de documentation
  docFiles: {
    context: 'Documentation pour {{component}}.',
    audience: 'Destiné aux développeurs implémentant {{functionality}}.',
    examples: 'Inclure des exemples concrets pour chaque fonctionnalité.'
  }
};
