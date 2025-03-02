// #codebase: [CONTEXTE] Types pour le système d'analyse de Bolt2bolt.
// #codebase: [DIRECTIVE] Étendre ces interfaces selon les besoins sans casser la compatibilité existante.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et couverture de code.

/*
[COPILOT_PROMPTS]
# Types d'Analyse - Directives d'Extension

## Principes Clés
- Les interfaces doivent rester extensibles pour les futures fonctionnalités
- Maintenir une séparation claire entre données d'analyse et logique de traitement
- Privilégier l'immutabilité pour les résultats d'analyse

## Modifications Prioritaires
1. Ajouter des champs pour le suivi de métriques avancées
2. Améliorer la typologie des problèmes détectés
3. Enrichir les suggestions avec des niveaux de confiance

## Garde-fous
- Éviter de casser la compatibilité avec les implémentations existantes
- Préserver les champs requis par les autres composants
- Documenter clairement tout changement de structure
[COPILOT_PROMPTS]
*/

/**
 * Options pour configurer l'analyse du code
 */
export interface AnalysisOptions {
  /**
   * Profondeur maximale d'analyse (pour limiter les ressources)
   */
  maxDepth?: number;
  
  /**
   * Types d'analyses à effectuer
   */
  analysisTypes?: Array<'syntax' | 'security' | 'performance' | 'quality' | 'complexity'>;
  
  /**
   * Règles à ignorer (par identifiant)
   */
  ignoreRules?: string[];
  
  /**
   * Fichiers ou patterns à exclure de l'analyse
   */
  exclude?: string[];
  
  /**
   * Mode verbose pour plus de détails dans les résultats
   */
  verbose?: boolean;
  
  /**
   * Options spécifiques au langage analysé
   */
  languageOptions?: Record<string, any>;
  
  // #codebase: [EXTENSION] Étendre avec des options pour l'analyse incrémentale.
  // #codebase: [EXTENSION] Ajouter support pour des plugins d'analyse externes.
}

/**
 * Structure pour les problèmes détectés lors de l'analyse
 */
export interface AnalysisIssue {
  /**
   * Identifiant unique de l'issue
   */
  id: string;
  
  /**
   * Type de problème détecté
   */
  type: 'error' | 'warning' | 'info' | 'security' | 'performance';
  
  /**
   * Message décrivant le problème
   */
  message: string;
  
  /**
   * Chemin du fichier concerné
   */
  filePath?: string;
  
  /**
   * Position dans le code (ligne, colonne)
   */
  position?: {
    line: number;
    column: number;
  };
  
  /**
   * Sévérité du problème (1-5, 5 étant le plus sévère)
   */
  severity: number;
  
  /**
   * Règle qui a détecté ce problème
   */
  rule?: string;
  
  /**
   * Code concerné
   */
  codeSnippet?: string;
  
  // [EXTENSION] Référence de documentation pour l'issue (ex: URL ou identifiant)
  documentationRef?: string;
  
  // #codebase: [QUALITÉ:DIAGNOSTIC] Ajouter champs pour mieux catégoriser les problèmes.
  // #codebase: [EXTENSION] Ajouter un champ pour des références à la documentation.
}

/**
 * Suggestion d'amélioration du code
 */
export interface AnalysisSuggestion {
  /**
   * Identifiant unique de la suggestion
   */
  id: string;
  
  /**
   * Description de la suggestion
   */
  description: string;
  
  /**
   * Code original à remplacer
   */
  originalCode?: string;
  
  /**
   * Code suggéré comme amélioration
   */
  suggestedCode?: string;
  
  /**
   * Chemin du fichier concerné
   */
  filePath?: string;
  
  /**
   * Position dans le code (ligne, colonne)
   */
  position?: {
    line: number;
    column: number;
  };
  
  /**
   * Impact estimé de l'amélioration (1-5, 5 étant le plus bénéfique)
   */
  impact: number;
  
  /**
   * Type d'amélioration 
   */
  type: 'performance' | 'security' | 'quality' | 'maintainability' | 'readability';
  
  /**
   * Niveau de confiance dans la suggestion (0-1)
   */
  confidence: number;
  
  // #codebase: [AMÉLIORATION] Ajouter des métadonnées pour qualification des suggestions.
  // #codebase: [EXTENSION] Implémenter un mécanisme de feedback sur les suggestions appliquées.
}

/**
 * Métriques calculées durant l'analyse
 */
export interface AnalysisMetrics {
  /**
   * Complexité cyclomatique
   */
  cyclomaticComplexity?: number;
  
  /**
   * Nombre de lignes de code (sans commentaires)
   */
  linesOfCode?: number;
  
  /**
   * Ratio commentaires/code
   */
  commentRatio?: number;
  
  /**
   * Profondeur maximale d'imbrication
   */
  maxNestingDepth?: number;
  
  /**
   * Nombre de fonctions/méthodes
   */
  functionCount?: number;
  
  /**
   * Score de maintenabilité (0-100, 100 étant le meilleur)
   */
  maintainabilityIndex?: number;
  
  /**
   * Niveau de couplage
   */
  coupling?: {
    afferent?: number; // Entrées
    efferent?: number; // Sorties
  };
  
  /**
   * Pourcentage de code dupliqué
   */
  duplication?: number;
  
  /**
   * Métriques additionnelles spécifiques à l'analyse
   */
  [key: string]: any;
  
  // #codebase: [EXTENSION] Ajouter des métriques pour l'analyse temporelle et évolutive.
  // #codebase: [QUALITÉ:MESURE] Inclure des métriques standardisées (ex: SQALE, LCOM).
}

/**
 * Résultat complet de l'analyse de code
 */
export interface AnalysisResult {
  /**
   * Liste des problèmes détectés
   */
  issues: AnalysisIssue[];
  
  /**
   * Suggestions d'amélioration
   */
  suggestions: AnalysisSuggestion[];
  
  /**
   * Métriques calculées
   */
  metrics: Partial<AnalysisMetrics>;
  
  /**
   * Timestamp de l'analyse
   */
  timestamp?: number;
  
  /**
   * Durée de l'analyse (ms)
   */
  duration?: number;
  
  /**
   * Version de l'analyseur
   */
  analyzerVersion?: string;
  
  /**
   * Métadonnées supplémentaires
   */
  metadata?: Record<string, any>;
  
  // #codebase: [EXTENSION] Ajouter un système de versionnement des résultats d'analyse.
  // #codebase: [AMÉLIORATION] Implémenter un mécanisme de comparaison entre analyses.
}

/*
[COPILOT_PROMPTS]
# Tests Unitaires pour les Types d'Analyse

## Structure de Test Recommandée
```typescript
describe('Analysis Types', () => {
  describe('AnalysisOptions validation', () => {
    it('should accept valid options');
    it('should handle missing optional parameters');
    it('should validate analysis types');
  });
  
  describe('AnalysisResult serialization', () => {
    it('should serialize to JSON correctly');
    it('should deserialize from JSON correctly');
    it('should maintain all properties during serialization cycle');
  });
});
```

## Points à Tester
- Validation des options d'analyse
- Conversion entre formats (JSON, objets)
- Construction correcte des résultats
- Conformité des structures aux interfaces

## Approche des Tests
- Utiliser des helpers de type (TypeScript) pour valider les types
- Tester avec des datasets représentatifs pour chaque structure
- Vérifier les cas limites et valeurs par défaut
[COPILOT_PROMPTS]
*/
