// #codebase: [CONTEXTE] Types pour le système d'optimisation de Bolt2bolt.
// #codebase: [DIRECTIVE] Étendre ces interfaces selon les besoins sans casser la compatibilité existante.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et couverture de code.

/*
[COPILOT_PROMPTS]
# Types d'Optimisation - Directives d'Extension

## Principes Clés
- Les interfaces doivent représenter clairement le flux d'optimisation
- Préserver la traçabilité des transformations appliquées
- Permettre l'extensibilité pour de nouveaux types d'optimisations

## Modifications Prioritaires
1. Enrichir les métriques d'amélioration pour mesurer l'impact des optimisations
2. Améliorer la typologie des règles d'optimisation
3. Ajouter support pour optimisations conditionnelles

## Garde-fous
- Assurer que les options de configuration sont cohérentes
- Maintenir des identifiants uniques pour chaque transformation
- Structurer les résultats pour faciliter l'analyse
[COPILOT_PROMPTS]
*/

/**
 * Types d'optimisation disponibles
 */
export type OptimizationType = 
  | 'performance'    // Améliorations de performance
  | 'size'           // Réduction de taille
  | 'readability'    // Amélioration de la lisibilité
  | 'security'       // Renforcement de la sécurité
  | 'maintainability'// Amélioration de la maintenabilité
  | 'complexity';    // Réduction de la complexité

/**
 * Options pour configurer l'optimisation du code
 */
export interface OptimizationOptions {
  /**
   * Types d'optimisations à appliquer
   */
  optimizationTypes?: OptimizationType[];
  
  /**
   * Règles spécifiques à exclure (par ID)
   */
  excludeRules?: string[];
  
  /**
   * Niveau d'agressivité des optimisations (1-10, 10 étant le plus agressif)
   */
  aggressiveness?: number;
  
  /**
   * Priorité entre lisibilité et performance (0-1, 1 = priorité à la performance)
   */
  performanceVsReadability?: number;
  
  /**
   * Préserver les commentaires dans le code
   */
  preserveComments?: boolean;
  
  /**
   * Mode sécurisé (limite les optimisations aux transformations à faible risque)
   */
  safeMode?: boolean;
  
  /**
   * Préserver la structure générale du code
   */
  preserveStructure?: boolean;
  
  // #codebase: [EXTENSION] Ajouter support pour optimisations spécifiques au langage.
  // #codebase: [EXTENSION] Considérer un système de règles personnalisées.
}

/**
 * Résultat d'une optimisation de code
 */
export interface OptimizationResult {
  /**
   * Code original avant optimisation
   */
  originalCode: string;
  
  /**
   * Code après optimisation
   */
  optimizedCode: string;
  
  /**
   * Liste des IDs des règles appliquées
   */
  appliedRules: string[];
  
  /**
   * Temps d'optimisation en ms
   */
  optimizationTime: number;
  
  /**
   * Métriques d'amélioration
   */
  improvementMetrics: Record<string, number>;
  
  /**
   * Timestamp de l'optimisation
   */
  timestamp?: number;
  
  /**
   * Version de l'optimiseur
   */
  optimizerVersion?: string;
  
  /**
   * Avertissements rencontrés durant l'optimisation
   */
  warnings?: string[];
  
  /**
   * Impact estimé des optimisations
   */
  estimatedImpact?: {
    performance?: number;  // % d'amélioration estimée
    maintainability?: number;
    security?: number;
  };
  
  // #codebase: [EXTENSION] Ajouter traçabilité des transformations.
  // #codebase: [EXTENSION] Implémenter rollback sélectif des optimisations.
}

/**
 * Description d'une transformation appliquée au code
 */
export interface CodeTransformation {
  /**
   * ID unique de la transformation
   */
  id: string;
  
  /**
   * Type de transformation
   */
  type: OptimizationType;
  
  /**
   * Emplacement dans le code (début)
   */
  startPosition: {
    line: number;
    column: number;
  };
  
  /**
   * Emplacement dans le code (fin)
   */
  endPosition: {
    line: number;
    column: number;
  };
  
  /**
   * Code avant transformation
   */
  originalCode: string;
  
  /**
   * Code après transformation
   */
  transformedCode: string;
  
  /**
   * Description de la transformation
   */
  description: string;
  
  /**
   * Impact estimé (1-5, 5 étant le plus impactant)
   */
  impact: number;
  
  /**
   * ID de la règle qui a appliqué la transformation
   */
  ruleId: string;
  
  // #codebase: [EXTENSION] Ajouter métriques spécifiques à la transformation.
  // #codebase: [SÉCURITÉ] Intégrer une analyse de risque pour chaque transformation.
}

/*
[COPILOT_PROMPTS]
# Tests Unitaires pour les Types d'Optimisation

## Structure de Test Recommandée
```typescript
describe('Optimization Types', () => {
  describe('OptimizationOptions validation', () => {
    it('should accept valid options');
    it('should handle missing optional parameters');
    it('should validate optimization types');
  });
  
  describe('OptimizationResult structure', () => {
    it('should include all required properties');
    it('should calculate metrics correctly');
    it('should track applied rules properly');
  });
  
  describe('CodeTransformation', () => {
    it('should represent code positions accurately');
    it('should maintain original and transformed code');
  });
});

## Points à Tester
- Validation des options d'optimisation
- Construction correcte des résultats d'optimisation
- Représentation précise des transformations de code
- Calcul des métriques d'amélioration
