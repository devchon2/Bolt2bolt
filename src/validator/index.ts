// #codebase: [CONTEXTE] Module de validation de code pour Bolt2bolt
// #codebase: [PATTERN:CHAIN] Utilise le pattern Chain of Responsibility pour les validations
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Amélioration de la couverture des tests

/*
[COPILOT_PROMPTS]
# Validateur de Code - Composant Central

## Responsabilités
- Vérification de la qualité et de la conformité du code
- Validation des transformations effectuées par l'Optimiseur
- Détection des régressions potentielles
- Application des règles de style et de structure

## Architecture
- Chaîne de validateurs spécialisés
- Système de règles configurables
- Intégration avec les linters et analyseurs statiques

## Priorités Actuelles
- Améliorer la couverture des tests unitaires (objectif >90%)
- Ajouter des validations pour les patterns de performance
- Intégrer des règles d'accessibilité et de maintenabilité
[COPILOT_PROMPTS]
*/

import { ValidationResult, ValidationRule, ValidationOptions, Severity } from '../types/validator';
import { Logger } from '../lib/logger';

/**
 * Interface pour tous les validateurs spécialisés
 */
export interface IValidator {
  name: string;
  validate(code: string, options?: ValidationOptions): Promise<ValidationResult>;
  priority: number; // Détermine l'ordre d'exécution (plus petit = plus prioritaire)
}

/**
 * Validateur principal qui coordonne différentes règles de validation
 */
// #codebase: [RESPONSABILITÉ] Vérifie la qualité et la conformité du code
export class CodeValidator {
  private validators: IValidator[] = [];
  private logger: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger || new Logger('CodeValidator');
  }
  
  /**
   * Enregistre un nouveau validateur
   */
  // #codebase: [POINT-EXTENSION] Ajouter de nouveaux validateurs spécialisés ici
  public registerValidator(validator: IValidator): void {
    this.validators.push(validator);
    // Tri des validateurs par priorité
    this.validators.sort((a, b) => a.priority - b.priority);
    this.logger.debug(`Registered validator: ${validator.name}`);
  }
  
  /**
   * Valide un fragment de code en appliquant tous les validateurs enregistrés
   */
  // #codebase: [POINT-CRITIQUE] Point d'entrée principal du processus de validation
  public async validate(
    code: string, 
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    this.logger.debug(`Validating code with ${this.validators.length} validators`);
    
    const issues: ValidationRule[] = [];
    let valid = true;
    
    for (const validator of this.validators) {
      try {
        this.logger.debug(`Running validator: ${validator.name}`);
        const result = await validator.validate(code, options);
        
        if (!result.valid) {
          valid = false;
          issues.push(...result.issues);
          
          // Si c'est un validateur bloquant et qu'il échoue, on arrête la chaîne
          if (options.failFast && !result.valid) {
            this.logger.warn(`Validation stopped due to failFast option by validator: ${validator.name}`);
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Error in validator ${validator.name}`, error);
        valid = false;
        issues.push({
          name: 'validator_error',
          description: `Validator ${validator.name} failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: Severity.ERROR,
          line: -1,
          column: -1
        });
        
        if (options.failFast) {
          break;
        }
      }
    }
    
    const severeCounts = this.countSeverities(issues);
    
    return {
      valid,
      issues,
      stats: {
        total: issues.length,
        errors: severeCounts.error,
        warnings: severeCounts.warning,
        infos: severeCounts.info
      }
    };
  }
  
  /**
   * Compare deux versions de code et vérifie qu'elles sont sémantiquement équivalentes
   */
  // #codebase: [CONTRAINTE] Assurer que les optimisations préservent le comportement du code
  public async compareVersions(
    originalCode: string, 
    modifiedCode: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    this.logger.debug('Comparing original and modified code versions');
    
    // À implémenter: comparaison sémantique des versions
    // Pour la phase actuelle, cette fonctionnalité est en développement
    
    return {
      valid: true,
      issues: [],
      stats: { total: 0, errors: 0, warnings: 0, infos: 0 }
    };
  }
  
  /**
   * Compte les occurrences de chaque niveau de sévérité dans les issues
   */
  private countSeverities(issues: ValidationRule[]) {
    return issues.reduce((counts, issue) => {
      switch (issue.severity) {
        case Severity.ERROR:
          counts.error++;
          break;
        case Severity.WARNING:
          counts.warning++;
          break;
        case Severity.INFO:
          counts.info++;
          break;
      }
      return counts;
    }, { error: 0, warning: 0, info: 0 });
  }
}

export default CodeValidator;
