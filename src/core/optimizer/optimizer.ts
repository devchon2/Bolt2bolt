import { Project, SourceFile } from 'ts-morph';
import { ASTTransformer } from './transformer/ast-transformer';
import { OptimizationStrategy } from './strategies/optimization-strategy';
import { SecurityOptimizer } from './strategies/security-optimizer';
import { PerformanceOptimizer } from './strategies/performance-optimizer';
import { MaintainabilityOptimizer } from './strategies/maintainability-optimizer';
import { OptimizationResult, OptimizerOptions } from './types';
import { AnalysisResult } from '../analyzer/types';
import { CircularDependencyHandler } from '../utils/circular-dependency-handler';

/**
 * Optimiseur de code de Bolt2bolt
 * 
 * Applique des transformations intelligentes au code source
 * en fonction des résultats d'analyse et des stratégies d'optimisation
 */
export class Optimizer {
  private project: Project;
  private transformer: ASTTransformer;
  private strategies: OptimizationStrategy[];
  private circularDependencyHandler: CircularDependencyHandler;
  private options: OptimizerOptions;
  
  constructor(options: OptimizerOptions) {
    this.options = options;
    this.project = new Project(options.projectOptions);
    this.transformer = new ASTTransformer();
    this.circularDependencyHandler = new CircularDependencyHandler({
      verbose: options.verbose,
      maxDepth: options.maxAnalysisDepth || 20
    });
    
    // Initialiser les stratégies d'optimisation
    this.strategies = [
      new SecurityOptimizer(),
      new PerformanceOptimizer(),
      new MaintainabilityOptimizer()
    ];
  }
  
  /**
   * Optimise un projet en fonction des résultats d'analyse
   * @param analysisResult Résultats de l'analyse du projet
   * @param sourcePath Chemin vers le code source à optimiser
   */
  public async optimizeProject(analysisResult: AnalysisResult, sourcePath: string): Promise<OptimizationResult> {
    console.log(`Optimizing project at ${sourcePath}...`);
    
    // Ajouter les fichiers du projet
    this.project.addSourceFilesAtPaths(`${sourcePath}/**/*.{ts,tsx}`);
    
    // Préparer le résultat d'optimisation
    const result: OptimizationResult = {
      optimizationsApplied: [],
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: 0,
        impactScore: 0,
        transformationTypes: {}
      }
    };
    
    // Appliquer les stratégies d'optimisation sur chaque fichier
    for (const sourceFile of this.project.getSourceFiles()) {
      try {
        const fileOptimizations = await this.optimizeFile(sourceFile, analysisResult);
        result.optimizationsApplied.push(...fileOptimizations.optimizationsApplied);
        
        // Mettre à jour le résumé
        result.summary.totalOptimizations += fileOptimizations.summary.totalOptimizations;
        result.summary.impactScore += fileOptimizations.summary.impactScore;
        
        // Fusionner les types de transformation
        for (const [type, count] of Object.entries(fileOptimizations.summary.transformationTypes)) {
          result.summary.transformationTypes[type] = (result.summary.transformationTypes[type] || 0) + count;
        }
      } catch (error) {
        console.error(`Erreur lors de l'optimisation de ${sourceFile.getFilePath()}: ${error.message}`);
        // Continuer avec les autres fichiers, mais enregistrer l'erreur
        result.optimizationsApplied.push({
          filePath: sourceFile.getFilePath(),
          type: 'unknown',
          description: `Échec de l'optimisation: ${error.message}`,
          impact: 0,
          sourceCode: sourceFile.getText()
        });
      }
    }
    
    // Sauvegarder les modifications
    try {
      await this.project.save();
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde du projet: ${error.message}`);
      // Gérer l'erreur de sauvegarde
    }
    
    return result;
  }
  
  /**
   * Optimise un fichier spécifique
   * @param sourceFile Fichier source à optimiser
   * @param analysisResult Résultats de l'analyse
   */
  private async optimizeFile(sourceFile: SourceFile, analysisResult: AnalysisResult): Promise<OptimizationResult> {
    console.log(`Optimizing file: ${sourceFile.getFilePath()}`);
    
    const fileResult: OptimizationResult = {
      optimizationsApplied: [],
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: 0,
        impactScore: 0,
        transformationTypes: {}
      },
      filePath: sourceFile.getFilePath(),
      warnings: [] // Ajout d'un tableau de warnings
    };
    
    // Appliquer chaque stratégie d'optimisation
    for (const strategy of this.strategies) {
      const strategyResult = await strategy.optimize(sourceFile, analysisResult, this.transformer);
      
      // Ajouter les optimisations appliquées
      fileResult.optimizationsApplied.push(...strategyResult.optimizationsApplied);
      
      // Mettre à jour le résumé
      fileResult.summary.totalOptimizations += strategyResult.optimizationsApplied.length;
      fileResult.summary.impactScore += strategyResult.impactScore;
      
      // Ajouter les types de transformation
      for (const optimization of strategyResult.optimizationsApplied) {
        const type = optimization.type;
        fileResult.summary.transformationTypes[type] = (fileResult.summary.transformationTypes[type] || 0) + 1;
      }
    }
    
    // Vérifier les dépendances circulaires si l'option est activée
    if (this.options.handleCircularDependencies) {
      const circularResult = this.handleCircularDependencies(sourceFile);
      if (circularResult.hasCircularDependencies) {
        fileResult.warnings.push({
          code: 'CIRCULAR_REF',
          message: `Dépendances circulaires détectées: ${circularResult.cycles.length} cycle(s)`,
          details: circularResult.cycles,
          suggestions: circularResult.suggestions
        });
      }
    }
    
    return fileResult;
  }

  /**
   * Détecte et gère les dépendances circulaires dans un fichier source
   * @param sourceFile Fichier source à analyser
   * @returns Résultat de l'analyse des dépendances circulaires
   */
  private handleCircularDependencies(sourceFile: SourceFile) {
    return this.circularDependencyHandler.detectCircularDependencies(sourceFile, this.project);
  }
}
