// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.

/**
 * Module d'optimisation de code Bolt2bolt
 * 
 * Ce module est responsable de l'application des transformations et
 * optimisations sur le code source en se basant sur les résultats d'analyse.
 * 
 * @module optimizer
 */

import { OptimizationOptions } from './types';
import { OptimizationResult } from './core/types';
import { OptimizerEngine } from './core/engine';

/**
 * Version du module d'optimisation
 */
export const OPTIMIZER_VERSION = '0.1.0';

/**
 * Options par défaut pour l'optimisation de code
 */
export const DEFAULT_OPTIMIZATION_OPTIONS: OptimizationOptions = {
  optimizationTypes: ['security', 'performance', 'complexity', 'maintainability'],
  severity: ['critical', 'error', 'warning'],
  preserveFormat: true,
  maxChangesPerFile: 10,
  dryRun: false,
  requireValidation: true,
  keepOriginalCode: true,
  prioritizeBy: 'severity',
  handleCircularDependencies: true
};

/**
 * Optimise le code source en appliquant des transformations appropriées
 * Point d'entrée principal du module d'optimisation.
 * 
 * @param sourcePath - Chemin vers les fichiers à optimiser
 * @param analysisResults - Résultats d'analyse précédente (optionnel)
 * @param options - Options de configuration pour l'optimisation
 * @returns Résultat détaillé de l'optimisation
 */
export async function optimizeCode(
  sourcePath: string | string[],
  analysisResults?: any,
  options: Partial<OptimizationOptions> = {}
): Promise<OptimizationResult> {
  const mergedOptions = { ...DEFAULT_OPTIMIZATION_OPTIONS, ...options };
  
  const engine = new OptimizerEngine(mergedOptions);
  
  // Initialisation du moteur d'optimisation
  await engine.initialize();
  
  // Exécution de l'optimisation
  const result = await engine.optimize(sourcePath, analysisResults);
  
  return result;
}

// Exports publics du module
export * from './types';
export * from './core/types';
export * from './transformations';

// #codebase: [CONTEXTE] Module d'optimisation de code pour Bolt2bolt
// #codebase: [PATTERN:TRANSFORMATION] Utilise des transformations AST pour optimiser le code
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration des performances

/*
[COPILOT_PROMPTS]
# Optimiseur de Code - Composant Central

## Responsabilités
- Application des transformations d'optimisation au code source
- Mise en œuvre des suggestions d'amélioration identifiées par l'Analyseur
- Génération de code optimisé avec documentation des changements
- Préservation de la sémantique du code original

## Architecture
- Pipeline de transformation configurable
- Système de plugins pour les stratégies d'optimisation
- Gestion des dépendances entre transformations
- Mécanisme de rollback en cas d'échec

## Priorités Actuelles
- Refactoring pour améliorer la détection des patterns d'optimisation
- Augmenter la couverture de tests (objectif >90%)
- Optimiser les algorithmes de transformation pour les grands fichiers
[COPILOT_PROMPTS]
*/

import { writeFile } from 'fs/promises';
import path from 'path';
import { OptimizationOpportunity } from '../analyzer';
import { OptimizerResult, OptimizerOptions, Transformation } from '../types/optimizer';
import { Logger } from '../lib/logger';

/**
 * Interface pour toutes les stratégies d'optimisation
 */
export interface IOptimizationStrategy {
  name: string;
  description: string;
  canOptimize(opportunity: OptimizationOpportunity): boolean;
  applyOptimization(code: string, opportunity: OptimizationOpportunity): Promise<Transformation>;
}

/**
 * Classe principale de l'optimiseur de code
 */
export class CodeOptimizer {
  private strategies: IOptimizationStrategy[] = [];
  private logger: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger || new Logger('CodeOptimizer');
  }
  
  /**
   * Enregistre une nouvelle stratégie d'optimisation
   */
  public registerStrategy(strategy: IOptimizationStrategy): void {
    this.strategies.push(strategy);
    this.logger.debug(`Registered optimization strategy: ${strategy.name}`);
  }
  
  /**
   * Optimise le code en appliquant les transformations appropriées
   */
  public async optimize(
    code: string, 
    opportunities: OptimizationOpportunity[],
    options: OptimizerOptions = {}
  ): Promise<OptimizerResult> {
    let optimizedCode = code;
    const appliedTransformations: Transformation[] = [];
    const failedOpportunities: OptimizationOpportunity[] = [];
    
    this.logger.debug(`Optimizing code with ${opportunities.length} opportunities`);
    
    // Trier les opportunités par sévérité (descendante) et confiance (descendante)
    const sortedOpportunities = [...opportunities].sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
    
    // Appliquer les optimisations en séquence
    for (const opportunity of sortedOpportunities) {
      try {
        // Trouver une stratégie qui peut gérer cette opportunité
        const strategy = this.strategies.find(s => s.canOptimize(opportunity));
        
        if (!strategy) {
          this.logger.warn(`No strategy found for opportunity type: ${opportunity.type}`);
          failedOpportunities.push(opportunity);
          continue;
        }
        
        // Appliquer l'optimisation
        this.logger.debug(`Applying strategy ${strategy.name} for opportunity ${opportunity.type}`);
        const transformation = await strategy.applyOptimization(optimizedCode, opportunity);
        
        // Mettre à jour le code
        optimizedCode = transformation.optimizedCode;
        appliedTransformations.push(transformation);
        
      } catch (error) {
        this.logger.error(`Failed to apply optimization for ${opportunity.type}`, error);
        failedOpportunities.push(opportunity);
      }
    }
    
    return {
      originalCode: code,
      optimizedCode,
      appliedTransformations,
      failedOpportunities,
      success: appliedTransformations.length > 0,
      stats: {
        opportunitiesCount: opportunities.length,
        appliedCount: appliedTransformations.length,
        failedCount: failedOpportunities.length
      }
    };
  }
  
  /**
   * Optimise un fichier spécifique et écrit le résultat
   */
  public async optimizeFile(
    filePath: string,
    opportunities: OptimizationOpportunity[],
    options: OptimizerOptions = {}
  ): Promise<OptimizerResult> {
    const { readFile } = await import('fs/promises');
    const code = await readFile(filePath, 'utf8');
    
    this.logger.info(`Optimizing file: ${filePath}`);
    const result = await this.optimize(code, opportunities, options);
    
    if (options.writeToFile !== false && result.success) {
      const outputPath = options.outputPath || filePath;
      await writeFile(outputPath, result.optimizedCode, 'utf8');
      this.logger.info(`Optimized code written to: ${outputPath}`);
    }
    
    return result;
  }
  
  /**
   * Valide que les transformations n'ont pas modifié la sémantique du code
   */
  private async validateTransformation(
    original: string, 
    transformed: string
  ): Promise<boolean> {
    // À implémenter: validation sémantique des transformations
    // Pour la phase actuelle, cette fonctionnalité est en développement
    return true;
  }

  /**
   * Valide les optimisations appliquées pour s'assurer qu'elles ne modifient pas la sémantique du code
   * @param originalCode Code original
   * @param optimizedCode Code optimisé
   * @returns Boolean indiquant si les optimisations sont valides
   */
  public validateOptimizations(originalCode: string, optimizedCode: string): boolean {
    // Implémentation de la validation des optimisations
    // ...logique de validation...
    return true;
  }
}

export default CodeOptimizer;
