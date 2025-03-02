// #codebase: [CONTEXTE] Types pour le système de validation de Bolt2bolt.
// #codebase: [DIRECTIVE] Étendre ces interfaces selon les besoins sans casser la compatibilité existante.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et couverture de code.

/*
[COPILOT_PROMPTS]
# Types de Validation - Directives d'Extension

## Principes Clés
- Les interfaces doivent capturer tous les aspects de la validation
- Maintenir une classification claire des problèmes détectés
- Structurer les résultats pour faciliter l'interprétation

## Modifications Prioritaires
1. Enrichir la typologie des validations possibles
2. Améliorer la granularité des rapports de validation
3. Ajouter support pour validation contextuelle

## Garde-fous
- Assurer que les options de configuration sont cohérentes
- Maintenir une traçabilité complète des problèmes détectés
- Permettre des validations personnalisées sans modifier le core
[COPILOT_PROMPTS]
*/

/**
 * Types de validation disponibles
 */
export type ValidationType = 
  | 'syntax'         // Validation syntaxique
  | 'semantic'       // Validation sémantique
  | 'functionality'  // Équivalence fonctionnelle
  | 'standards'      // Conformité aux standards
  | 'security'       // Vérification de sécurité
  | 'performance';   // Impact sur la performance

/**
 * Options pour configurer la validation
 */
export interface ValidationOptions {
  /**
   * Types de validation à effectuer
   */
  validationTypes?: ValidationType[];
  
  /**
   * Validateurs spécifiques à désactiver
   */
  disableValidators?: string[];
  
  /**
   * Niveau de sévérité minimal pour considérer un problème comme bloquant
   * (1-5, 5 étant le plus sévère)
   */
  minSeverity?: number;
  
  /**
   * Autoriser les optimisations qui affectent légèrement le comportement
   */
  allowBehaviorChanges?: boolean;
  
  /**
   * Exécuter des tests unitaires si disponibles
   */
  runTests?: boolean;
  
  /**
   * Niveau de détail du rapport de validation
   */
  verbosity?: 'minimal' | 'normal' | 'detailed';
  
  /**
   * Valider uniquement les parties modifiées du code
   */
  validateChangedPartsOnly?: boolean;
  
  // #codebase: [EXTENSION] Ajouter support pour validation basée sur des règles personnalisées.
  // #codebase: [EXTENSION] Intégrer avec des linters/formatters externes.
}

/**
 * Résultat d'une validation de code
 */
export interface ValidationResult {
  /**
   * Indique si la validation est réussie (pas d'erreurs bloquantes)
   */
  valid: boolean;
  
  /**
   * Liste des problèmes détectés
   */
  issues: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    location?: { line: number; column: number; };
    code?: string;
    severity: number;
    validatorId: string;
    suggestions?: string[];
  }>;
  
  /**
   *