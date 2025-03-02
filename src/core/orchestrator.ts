// #codebase: [CONTEXTE] Orchestrateur central du système Bolt2bolt.
// #codebase: [RESPONSABILITÉ] Coordination de l'analyse, optimisation et validation.
// #codebase: [PATTERN:MEDIATOR] Utiliser ce pattern pour gérer la communication entre composants.

import { CodeAnalyzer } from './analyzer';
import { CodeOptimizer } from './optimizer';
import { CodeValidator } from './validator';
import { Reporter } from './reporter';
import { AnalysisResult } from '../types/analysis';
import { OptimizationResult } from '../types/optimization';
import { ValidationResult } from '../types/validation';
import { BoltConfig } from '../types/config';
import { Logger } from '../utils/logger';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CircularDependencyHandler } from '../utils/circular-dependency-handler';

/*
[COPILOT_PROMPTS]
# Orchestrateur - Directives d'Implémentation

## Responsabilité
- Coordonner le cycle complet d'auto-optimisation du code
- Faciliter la communication entre les différents composants
- Gérer le flux de données entre analyse, optimisation et validation
- Maintenir l'état global du processus

## Architecture
- Pattern Mediator pour la communication entre composants
- Pattern Template Method pour définir le flux de travail
- System de hooks pour permettre l'extension du flux standard

## Anti-patterns
- Éviter la duplication de logique avec les composants spécialisés
- Ne pas implémenter de logique d'analyse/optimisation/validation spécifique
- Éviter les couplages forts entre l'orchestrateur et les composants
[COPILOT_PROMPTS]
*/

/**
 * Options pour l'exécution d'un cycle complet
 */
export interface CycleOptions {
  /**
   * Chemin vers le code source à traiter
   */
  targetPath: string;
  
  /**
   * Chemin où stocker les résultats
   */
  outputPath: string;
  
  /**
   * Niveau de verbosité (1-5)
   */
  verbosity?: number;
  
  /**
   * Annuler les optimisations si la validation échoue
   */
  rollbackOnFailure?: boolean;
  
  /**
   * Conserver l'historique des optimisations
   */
  keepHistory?: boolean;
}

/**
 * Statut du cycle d'optimisation
 */
export type CycleStatus = 'pending' | 'analyzing' | 'optimizing' | 'validating' | 'reporting' | 'completed' | 'failed';

/**
 * Résultat du cycle complet
 */
export interface CycleResult {
  /**
   * Statut du cycle
   */
  status: CycleStatus;
  
  /**
   * Horodatage de début
   */
  startTime: number;
  
  /**
   * Horodatage de fin
   */
  endTime?: number;
  
  /**
   * Durée totale en ms
   */
  duration?: number;
  
  /**
   * Résultat de l'analyse
   */
  analysisResult?: AnalysisResult;
  
  /**
   * Résultat de l'optimisation
   */
  optimizationResult?: OptimizationResult;
  
  /**
   * Résultat de la validation
   */
  validationResult?: ValidationResult;
  
  /**
   * Score d'amélioration global (0-100)
   */
  improvementScore?: number;
  
  /**
   * Messages d'erreur éventuels
   */
  errors?: string[];
  
  /**
   * Chemins des rapports générés
   */
  reportPaths?: Record<string, string>;
}

/**
 * Orchestrateur principal de Bolt2bolt
 * 
 * Coordonne le flux d'analyse, optimisation et validation
 */
export class Orchestrator {
  private currentCycle: CycleResult | null = null;
  
  /**
   * Crée une nouvelle instance de l'orchestrateur
   */
  constructor(
    private logger: Logger,
    private analyzer: CodeAnalyzer,
    private optimizer: CodeOptimizer,
    private validator: CodeValidator,
    private reporter: Reporter,
    private config: BoltConfig
  ) {
    this.logger.debug('Orchestrator initialized');
  }
  
  /**
   * Exécute un cycle complet d'analyse, optimisation et validation
   * 
   * // #codebase: [FLUX-PRINCIPAL] Point d'entrée principal du système.
   */
  public async runFullCycle(options: CycleOptions): Promise<CycleResult> {
    this.logger.info('Starting full optimization cycle', { targetPath: options.targetPath });
    
    try {
      // Initialiser le cycle
      this.currentCycle = {
        status: 'pending',
        startTime: Date.now(),
        errors: []
      };
      
      // Préparer le répertoire de sortie
      await fs.ensureDir(options.outputPath);
      
      // #codebase: [HOOK:PRE-ANALYSE] Point d'extension avant analyse.
      
      // Étape 1: Analyse
      this.currentCycle.status = 'analyzing';
      this.logger.info('Starting code analysis');
      const sourceCode = await this.readSourceCode(options.targetPath);
      const analysisResult = await this.analyzer.analyze(sourceCode, {
        maxDepth: this.config.components.analyzer.maxDepth,
        analysisTypes: this.config.components.analyzer.defaultTypes,
        verbose: (options.verbosity || 3) > 3
      });
      this.currentCycle.analysisResult = analysisResult;
      
      // Sauvegarder les résultats d'analyse
      const analysisPath = path.join(options.outputPath, 'analysis-result.json');
      await fs.writeJson(analysisPath, analysisResult, { spaces: 2 });
      this.logger.debug('Analysis results saved', { path: analysisPath });
      
      // #codebase: [HOOK:POST-ANALYSE] Point d'extension après analyse.
      // #codebase: [HOOK:PRE-OPTIMISATION] Point d'extension avant optimisation.
      
      // Étape 2: Optimisation
      this.currentCycle.status = 'optimizing';
      this.logger.info('Starting code optimization');
      const optimizationResult = await this.optimizer.optimize(sourceCode, analysisResult, {
        aggressiveness: this.config.components.optimizer.aggressiveness,
        performanceVsReadability: this.config.components.optimizer.performanceVsReadability,
        safeMode: this.config.components.optimizer.safeMode
      });
      this.currentCycle.optimizationResult = optimizationResult;
      
      // Sauvegarder le code optimisé
      const optimizedCodePath = path.join(options.outputPath, 'optimized-code');
      await fs.ensureDir(optimizedCodePath);
      await fs.writeFile(
        path.join(optimizedCodePath, 'optimized.ts'),
        optimizationResult.optimizedCode
      );
      
      // Sauvegarder les résultats d'optimisation
      const optimizationPath = path.join(options.outputPath, 'optimization-result.json');
      await fs.writeJson(optimizationPath, optimizationResult, { spaces: 2 });
      this.logger.debug('Optimization results saved', { path: optimizationPath });
      
      // #codebase: [HOOK:POST-OPTIMISATION] Point d'extension après optimisation.
      // #codebase: [HOOK:PRE-VALIDATION] Point d'extension avant validation.
      
      // Étape 3: Validation
      this.currentCycle.status = 'validating';
      this.logger.info('Validating optimized code');
      const validationResult = await this.validator.validate(optimizationResult, {
        validationTypes: ['syntax', 'functionality', 'standards'],
        minSeverity: this.config.components.validator.minSeverity,
        runTests: this.config.components.validator.runTests
      });
      this.currentCycle.validationResult = validationResult;
      
      // Sauvegarder les résultats de validation
      const validationPath = path.join(options.outputPath, 'validation-result.json');
      await fs.writeJson(validationPath, validationResult, { spaces: 2 });
      this.logger.debug('Validation results saved', { path: validationPath });
      
      // Vérifier le résultat de la validation
      if (!validationResult.valid && options.rollbackOnFailure) {
        this.logger.warn('Validation failed, rolling back optimizations');
        this.currentCycle.errors?.push('Validation failed: rolling back optimizations');
        this.currentCycle.status = 'failed';
        
        // TODO: Implémenter le rollback des optimisations
      }
      
      // #codebase: [HOOK:POST-VALIDATION] Point d'extension après validation.
      // #codebase: [HOOK:PRE-RAPPORT] Point d'extension avant rapport.
      
      // Étape 4: Génération de rapports
      this.currentCycle.status = 'reporting';
      this.logger.info('Generating reports');
      
      const reportPaths: Record<string, string> = {};
      
      for (const format of this.config.components.reporter.formats) {
        const reportPath = path.join(options.outputPath, `report.${format}`);
        
        const report = await this.reporter.generateReport(
          format, 
          {
            analysis: analysisResult,
            optimization: optimizationResult,
            validation: validationResult
          },
          { groupBy: this.config.components.reporter.groupBy }
        );
        
        if (format === 'html') {
          await fs.writeFile(reportPath, report);
        } else if (format === 'json') {
          await fs.writeJson(reportPath, JSON.parse(report), { spaces: 2 });
        } else {
          await fs.writeFile(reportPath, report);
        }
        
        reportPaths[format] = reportPath;
      }
      
      this.currentCycle.reportPaths = reportPaths;
      this.logger.debug('Reports generated', { paths: reportPaths });
      
      // #codebase: [HOOK:POST-RAPPORT] Point d'extension après rapport.
      
      // Finaliser le cycle
      this.currentCycle.status = 'completed';
      this.currentCycle.endTime = Date.now();
      this.currentCycle.duration = this.currentCycle.endTime - this.currentCycle.startTime;
      
      // Calculer un score d'amélioration global
      this.currentCycle.improvementScore = this.calculateImprovementScore(
        analysisResult,
        optimizationResult,
        validationResult
      );
      
      this.logger.info('Full optimization cycle completed', {
        duration: this.currentCycle.duration,
        score: this.currentCycle.improvementScore
      });
      
      return this.currentCycle;
    } catch (error) {
      this.logger.error('Error during optimization cycle', { error });
      
      if (this.currentCycle) {
        this.currentCycle.status = 'failed';
        this.currentCycle.endTime = Date.now();
        this.currentCycle.duration = this.currentCycle.endTime - this.currentCycle.startTime;
        this.currentCycle.errors?.push(error instanceof Error ? error.message : String(error));
      }
      
      throw error;
    }
  }
  
  /**
   * Exécute uniquement la phase d'analyse
   */
  public async analyze(targetPath: string): Promise<AnalysisResult> {
    this.logger.info('Running analysis only', { targetPath });
    const sourceCode = await this.readSourceCode(targetPath);
    
    return this.analyzer.analyze(sourceCode, {
      maxDepth: this.config.components.analyzer.maxDepth,
      analysisTypes: this.config.components.analyzer.defaultTypes
    });
  }
  
  /**
   * Exécute uniquement la phase d'optimisation
   */
  public async optimize(
    targetPath: string,
    analysisResult: AnalysisResult
  ): Promise<OptimizationResult> {
    this.logger.info('Running optimization only', { targetPath });
    const sourceCode = await this.readSourceCode(targetPath);
    
    return this.optimizer.optimize(sourceCode, analysisResult, {
      aggressiveness: this.config.components.optimizer.aggressiveness,
      performanceVsReadability: this.config.components.optimizer.performanceVsReadability,
      safeMode: this.config.components.optimizer.safeMode
    });
  }
  
  /**
   * Exécute uniquement la phase de validation
   */
  public async validate(
    optimizationResult: OptimizationResult
  ): Promise<ValidationResult> {
    this.logger.info('Running validation only');
    
    return this.validator.validate(optimizationResult, {
      validationTypes: ['syntax', 'functionality', 'standards'],
      minSeverity: this.config.components.validator.minSeverity,
      runTests: this.config.components.validator.runTests
    });
  }
  
  /**
   * Génère un rapport spécifique
   */
  public generateReport(
    type: 'analysis' | 'optimization' | 'validation' | 'full',
    result: any,
    format: string = 'markdown'
  ): string {
    this.logger.debug(`Generating ${type} report in ${format} format`);
    
    let reportData;
    
    switch (type) {
      case 'analysis':
        reportData = { analysis: result };
        break;
      case 'optimization':
        reportData = { optimization: result };
        break;
      case 'validation':
        reportData = { validation: result };
        break;
      case 'full':
        reportData = result;
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
    
    return this.reporter.generateReport(
      format,
      reportData,
      { groupBy: this.config.components.reporter.groupBy }
    );
  }
  
  /**
   * Récupère l'état du cycle actuel
   */
  public getCurrentCycleStatus(): CycleStatus {
    return this.currentCycle?.status || 'pending';
  }
  
  /**
   * Lit le code source d'un répertoire
   */
  private async readSourceCode(targetPath: string): Promise<string> {
    this.logger.debug('Reading source code', { path: targetPath });
    
    // Vérifier si le chemin pointe vers un fichier unique
    const stats = await fs.stat(targetPath);
    
    if (stats.isFile()) {
      return fs.readFile(targetPath, 'utf-8');
    }
    
    // Sinon, c'est un répertoire - lire tous les fichiers TS
    const includePaths = Array.isArray((this.config.paths as any).include)
      ? (this.config.paths as any).include.map(pattern => 
          path.join(targetPath, pattern.replace(/^\.\//, ''))
        )
      : [];
    
    interface ConfigPaths {
      ignore: string[];
      include?: string[];
    }

    const ignoredPaths: string[] = Array.isArray(this.config.paths.ignore)
      ? this.config.paths.ignore.map((pattern: string): string =>
        path.join(targetPath, pattern.replace(/^\.\//, ''))
      )
      : [];
    
    // TODO: Implémenter la lecture récursive avec glob patterns
    // Pour l'instant, utilisons une implémentation simplifiée
    
    // Simuler la lecture de plusieurs fichiers
    return `// Code source agrégé depuis ${targetPath}\n\nfunction example() {\n  console.log("Hello from Bolt2bolt");\n}\n`;
  }
  
  /**
   * Calcule un score d'amélioration global basé sur les résultats
   */
  private calculateImprovementScore(
    analysis: AnalysisResult,
    optimization: OptimizationResult,
    validation: ValidationResult
  ): number {
    // #codebase: [AMÉLIORATION] Implémenter un algorithme plus sophistiqué pour le score.
    
    // Score de base
    let score = 50;
    
    // Facteur d'optimisation (basé sur les métriques d'amélioration)
    const optimizationFactor = Object.values(optimization.improvementMetrics)
      .reduce((sum, value) => sum + value, 0) / Object.values(optimization.improvementMetrics).length;
    
    score += optimizationFactor * 20;
    
    // Pénalité basée sur les problèmes de validation
    if (validation.issues.length > 0) {
      const severitySum = validation.issues.reduce((sum, issue) => sum + issue.severity, 0);
      const averageSeverity = severitySum / validation.issues.length;
      
      // Pénalité proportionnelle à la sévérité moyenne et au nombre de problèmes
      score -= Math.min(40, averageSeverity * validation.issues.length * 2);
    }
    
    // Facteur de qualité depuis la validation
    if (validation.qualityScore !== undefined) {
      score = (score + validation.qualityScore) / 2;
    }
    
    // Limiter le score entre 0 et 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

/*
[COPILOT_PROMPTS]
# Tests pour Orchestrator

## Structure Recommandée
describe('Orchestrator', () => {
  describe('runFullCycle', () => {
    it('devrait exécuter le cycle complet avec succès');
    it('devrait gérer correctement les erreurs durant le cycle');
    it('devrait générer tous les rapports demandés');
    it('devrait respecter l\'option rollbackOnFailure');
  });

  describe('analyze/optimize/validate', () => {
    it('devrait exécuter uniquement la phase d\'analyse');
    it('devrait exécuter uniquement la phase d\'optimisation');
    it('devrait exécuter uniquement la phase de validation');
  });

  describe('calculateImprovementScore', () => {
    it('devrait calculer un score approprié pour diverses entrées');
    it('devrait pénaliser correctement les problèmes de validation');
    it('devrait récompenser les bonnes optimisations');
  });
});

## Mocks Nécessaires
- CodeAnalyzer: pour simuler différents résultats d'analyse
- CodeOptimizer: pour simuler différentes optimisations
- CodeValidator: pour simuler différents résultats de validation
- Reporter: pour vérifier la génération de rapports sans dépendances externes
- fs-extra: pour éviter les I/O réels
[COPILOT_PROMPTS]
*/
