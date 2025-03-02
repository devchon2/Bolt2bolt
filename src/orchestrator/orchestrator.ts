// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.
import * as path from 'path';
import * as fs from 'fs';
import { Analyzer, AnalysisResult } from '../analyzer/analyzer';
import { Optimizer, Transformation } from '../optimizer/optimizer';
import { Validator, ValidationResult } from '../validator/validator';
import { ReportGenerator, ReportData } from '../report/report-generator';
import { config } from "../config/env-config";
import { eventBus, Events } from "../utils/events";
import { readFileContent, fileExists } from "../utils/file-utils";
import { 
  AnalysisReport, 
  OptimizationResult, 
  ValidationResult as OldValidationResult,
  ReportOptions
} from "../types/common";

/*
[COPILOT_PROMPTS]
# Contexte Orchestrator
- L'orchestrateur est le composant central qui coordonne les différentes étapes du processus d'auto-optimisation
- Il gère le flux de travail: Analyse -> Optimisation -> Validation -> Rapport -> Apprentissage
- Il maintient l'état global du processus et assure la communication entre les composants
- Il implémente la boucle d'auto-amélioration et la logique d'apprentissage

# Points d'extension prioritaires:
- Amélioration de la gestion d'état entre les étapes pour assurer la cohérence et la traçabilité
- Intégration de règles de décision plus sophistiquées pour l'application des transformations, basées sur le contexte et les métriques
- Ajout de mécanismes d'apprentissage pour améliorer les futures optimisations, en analysant les succès et les échecs des itérations précédentes
- Optimisation de la gestion des erreurs et des rollbacks pour garantir la stabilité du système

# Directives spécifiques:
- Concentrez-vous sur l'amélioration de la robustesse et de l'efficacité de l'orchestrateur
- Assurez-vous que chaque étape du processus est correctement gérée et que les erreurs sont traitées de manière appropriée
- Mettez en œuvre des mécanismes d'apprentissage pour améliorer continuellement les performances du système
[COPILOT_PROMPTS]
*/

// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.
// #codebase: Ajoutez des mécanismes d'apprentissage pour améliorer les futures optimisations.
// #codebase: Intégrez des règles de décision plus sophistiquées pour l'application des transformations.

/**
 * Interface pour les résultats du processus d'auto-optimisation
 */
export interface OptimizationProcessResult {
  success: boolean;
  stats: {
    filesAnalyzed: number;
    issuesFound: number;
    transformationsProposed: number;
    transformationsApplied: number;
    score: {
      before: number;
      after: number;
      improvement: number;
    };
  };
  duration: number; // Durée en ms
  reportPath?: string;
}

/**
 * Interface pour les options de configuration de l'orchestrateur
 */
export interface OrchestratorOptions {
  projectPath: string;
  outputDir?: string;
  autoApply?: boolean; // Appliquer automatiquement les transformations validées
  minConfidence?: number; // Seuil de confiance pour les transformations (0-1)
  generateReports?: boolean;
  learningEnabled?: boolean; // Activer l'apprentissage des patterns réussis
}

/**
 * Orchestrateur principal du processus d'auto-optimisation
 * Coordonne les différentes étapes: analyse, optimisation, validation, rapport
 */
export class Orchestrator {
  private analyzer: Analyzer;
  private optimizer: Optimizer;
  private validator: Validator;
  private reportGenerator: ReportGenerator;
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions, 
              analyzer?: Analyzer, 
              optimizer?: Optimizer, 
              validator?: Validator, 
              reportGenerator?: ReportGenerator) {
    this.options = {
      outputDir: './output',
      autoApply: false,
      minConfidence: 0.8,
      generateReports: true,
      learningEnabled: true,
      ...options
    };

    // Initialiser les composants s'ils ne sont pas fournis
    this.analyzer = analyzer || new Analyzer();
    this.optimizer = optimizer || new Optimizer();
    this.validator = validator || new Validator();
    this.reportGenerator = reportGenerator || new ReportGenerator({
      outputDir: path.join(this.options.outputDir || '.', 'reports')
    });
  }

  /**
   * Exécute le processus complet d'auto-optimisation sur un projet
   */
  public async run(): Promise<OptimizationProcessResult> {
    console.log(`🚀 Démarrage du processus d'auto-optimisation pour: ${this.options.projectPath}`);
    const startTime = Date.now();
    
    try {
      // ÉTAPE 1: ANALYSE
      console.log('📊 Analyse du code en cours...');
      const analysisResults = await this.analyzeProject();
      console.log(`✅ Analyse terminée: ${analysisResults.length} fichiers analysés`);
      
      // Calculer les statistiques avant optimisation
      const issuesCount = this.countTotalIssues(analysisResults);
      console.log(`🔎 ${issuesCount} problèmes détectés au total`);
      const initialScore = this.calculateOverallScore(analysisResults);
      
      // ÉTAPE 2: OPTIMISATION
      console.log('🔧 Génération des optimisations...');
      const transformations = await this.generateOptimizations(analysisResults);
      console.log(`✅ ${transformations.length} optimisations potentielles générées`);
      
      // Filtrer les transformations selon le seuil de confiance
      const eligibleTransformations = transformations.filter(t => 
        t.confidence >= (this.options.minConfidence || 0.8)
      );
      console.log(`✅ ${eligibleTransformations.length} optimisations éligibles (seuil de confiance: ${this.options.minConfidence})`);
      
      // ÉTAPE 3: VALIDATION
      console.log('🧪 Validation des optimisations...');
      const validationResults = await this.validateOptimizations(analysisResults, eligibleTransformations);
      console.log(`✅ Validation terminée`);
      
      // Extraire les transformations validées
      const validTransformations = this.extractValidTransformations(eligibleTransformations, validationResults);
      console.log(`✅ ${validTransformations.length} optimisations validées`);
      
      // ÉTAPE 4: APPLICATION (si activé)
      let appliedCount = 0;
      if (this.options.autoApply && validTransformations.length > 0) {
        console.log('📝 Application des optimisations validées...');
        appliedCount = await this.applyOptimizations(validTransformations);
        console.log(`✅ ${appliedCount} optimisations appliquées avec succès`);
      }
      
      // ÉTAPE 5: RAPPORT
      let reportPath;
      if (this.options.generateReports) {
        console.log('📋 Génération du rapport...');
        reportPath = await this.generateReport({
          analysisResults,
          transformations: validTransformations,
          validationResults,
          appliedCount
        });
        console.log(`✅ Rapport généré: ${reportPath}`);
      }
      
      // ÉTAPE 6: APPRENTISSAGE (si activé)
      if (this.options.learningEnabled) {
        console.log('🧠 Enregistrement des patterns pour apprentissage...');
        await this.learnFromProcess(analysisResults, validTransformations, validationResults);
        console.log(`✅ Apprentissage terminé`);
      }
      
      // Calcul de la durée et des métriques finales
      const duration = Date.now() - startTime;
      const finalScore = this.options.autoApply ? 
        await this.recalculateScore() : initialScore;
      
      // Construction du résultat
      const result: OptimizationProcessResult = {
        success: true,
        stats: {
          filesAnalyzed: analysisResults.length,
          issuesFound: issuesCount,
          transformationsProposed: transformations.length,
          transformationsApplied: appliedCount,
          score: {
            before: initialScore,
            after: finalScore,
            improvement: finalScore - initialScore
          }
        },
        duration,
        reportPath
      };
      
      console.log(`✨ Processus terminé en ${(duration / 1000).toFixed(2)}s`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors du processus d\'auto-optimisation:', error);
      
      return {
        success: false,
        stats: {
          filesAnalyzed: 0,
          issuesFound: 0,
          transformationsProposed: 0,
          transformationsApplied: 0,
          score: {
            before: 0,
            after: 0,
            improvement: 0
          }
        },
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Analyse le projet pour détecter les problèmes
   */
  private async analyzeProject(): Promise<AnalysisResult[]> {
    // Implémentation : Utiliser l'analyseur pour parcourir le projet
    // et analyser tous les fichiers compatibles
    const projectPath = this.options.projectPath;
    const tsFiles = await this.findTypeScriptFiles(projectPath);
    const analysisResults: AnalysisResult[] = [];

    for (const filePath of tsFiles) {
      try {
        const result = await this.analyzer.analyzeFile(filePath);
        analysisResults.push(result);
      } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
      }
    }

    return analysisResults;
  }

  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const tsFiles: string[] = [];
  
    // Real implementation to search for files
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        const subFiles = await this.findTypeScriptFiles(filePath);
        tsFiles.push(...subFiles);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        tsFiles.push(filePath);
      }
    }
  
    return tsFiles;
  }

  /**
   * Génère des optimisations basées sur les résultats d'analyse
   */
  private async generateOptimizations(analysisResults: AnalysisResult[]): Promise<Transformation[]> {
    return this.optimizer.generateOptimizations(analysisResults);
  }

  /**
   * Valide les optimisations proposées
   */
  private async validateOptimizations(
    analysisResults: AnalysisResult[],
    transformations: Transformation[]
  ): Promise<ValidationResult[]> {
    // Construire une map des sources originales
    const sourceFileMap = new Map<string, string>();
    
    for (const result of analysisResults) {
      if (!sourceFileMap.has(result.filePath)) {
        try {
          const content = await fs.promises.readFile(result.filePath, 'utf8');
          sourceFileMap.set(result.filePath, content);
        } catch (error) {
          console.error(`Erreur lors de la lecture du fichier ${result.filePath}:`, error);
        }
      }
    }
    
    // Valider les transformations
    return this.validator.validateTransformations(transformations, sourceFileMap);
  }

  /**
   * Extrait les transformations validées
   */
  private extractValidTransformations(
    transformations: Transformation[],
    validationResults: ValidationResult[]
  ): Transformation[] {
    const validTransformationsMap = new Map<string, boolean>();
    
    for (const result of validationResults) {
      if (result.valid && result.recommendation === 'apply') {
        const key = `${result.transformation.filePath}:${result.transformation.original.start}:${result.transformation.original.end}`;
        validTransformationsMap.set(key, true);
      }
    }
    
    return transformations.filter(transformation => {
      const key = `${transformation.filePath}:${transformation.original.start}:${transformation.original.end}`;
      return validTransformationsMap.has(key);
    });
  }

  /**
   * Applique les optimisations validées au code source
   */
  private async applyOptimizations(transformations: Transformation[]): Promise<number> {
    if (transformations.length === 0) {
      return 0;
    }
    
    // Appliquer les transformations
    const modifications = await this.optimizer.applyTransformations(transformations);
    
    // Sauvegarder les modifications
    await this.optimizer.saveModifications(modifications);
    
    return modifications.size;
  }

  /**
   * Génère un rapport détaillé du processus
   */
  private async generateReport(data: ReportData): Promise<string | undefined> {
    const report = this.reportGenerator.generateReport(data);
    // Dans une implémentation réelle, nous retournerions le chemin du fichier généré
    return `${this.options.outputDir}/reports/latest-report`;
  }
  /*
  [COPILOT_PROMPTS]
  # Report Generation Context
  - Generate a detailed report of the process.
  
  # Extension points:
  - Improve state management between steps.
  - Integrate more sophisticated decision rules for applying transformations.
  [COPILOT_PROMPTS]
  */

  /**
   * Enregistre les données pour l'apprentissage continu
   */
  private async learnFromProcess(
    analysisResults: AnalysisResult[],
    appliedTransformations: Transformation[],
    validationResults: ValidationResult[]
  ): Promise<void> {
    // Dans une implémentation réelle, nous stockerions des informations sur:
    // 1. Les types de problèmes détectés
    // 2. Les transformations qui ont fonctionné
    // 3. Les transformations qui ont échoué et pourquoi
    // Pour améliorer les futures optimisations
    
    // Exemple simple:
    const learningData = {
      timestamp: new Date().toISOString(),
      successfulPatterns: appliedTransformations.map(t => ({
        type: t.type,
        description: t.description,
      })),
      failedPatterns: validationResults
        .filter(r => !r.valid)
        .map(r => ({
          type: r.transformation.type,
          description: r.transformation.description,
          reason: r.issues.map(i => i.message).join('; ')
        }))
    };
    
    // Dans une implémentation réelle, nous sauvegarderions ces données
    console.log('Données d\'apprentissage:', JSON.stringify(learningData, null, 2));
  }

  /**
   * Recalcule le score après l'application des optimisations
   */
  private async recalculateScore(): Promise<number> {
    // Dans une implémentation réelle, nous réanalyserions le projet
    // après avoir appliqué les optimisations pour calculer le nouveau score
    return 90; // Valeur simulée
  }

  /**
   * Compte le nombre total de problèmes dans les résultats d'analyse
   */
  private countTotalIssues(analysisResults: AnalysisResult[]): number {
    return analysisResults.reduce((count, result) => count + result.issues.length, 0);
  }

  /**
   * Calcule le score global du projet
   */
  private calculateOverallScore(analysisResults: AnalysisResult[]): number {
    if (!analysisResults || analysisResults.length === 0) {
      return 0;
    }
    
    // Calcul des moyennes des métriques
    let totalComplexity = 0;
    let totalMaintainability = 0;
    let totalSecurity = 0;
    let totalPerformance = 0;
    
    for (const result of analysisResults) {
      totalComplexity += result.metrics.complexity;
      totalMaintainability += result.metrics.maintainability;
      totalSecurity += result.metrics.security;
      totalPerformance += result.metrics.performance;
    }
    
    const count = analysisResults.length;
    
    // Formule: 100 - (complexité relative) + (maintenabilité) + (sécurité) + (performance) / 4
    const complexityScore = Math.max(0, 100 - ((totalComplexity / count) * 5)); // Pénalité pour complexité
    const maintainabilityScore = totalMaintainability / count;
    const securityScore = totalSecurity / count;
    const performanceScore = totalPerformance / count;
    
    const overallScore = (complexityScore + maintainabilityScore + securityScore + performanceScore) / 4;
    
    return +overallScore.toFixed(1);
  }

  async optimize(analysis: AnalysisResult): Promise<OptimizationResult> {
    // ...existing code...
    if (this.config.handleCircularDependencies) {
      const hasCircularDependencies = this.handleCircularDependencies(ast);
      if (hasCircularDependencies) {
        optimization.warnings.push('CIRCULAR_REF');
      }
    }
    // ...existing code...
  }
}

export default Orchestrator;
