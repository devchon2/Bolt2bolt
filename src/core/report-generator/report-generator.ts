import { AnalysisResult } from '../analyzer/types';
import { OptimizationResult } from '../optimizer/types';
import { ValidationResult } from '../validator/types';
import { MarkdownGenerator } from './formats/markdown-generator';
import { HTMLGenerator } from './formats/html-generator';
import { JSONGenerator } from './formats/json-generator';
import { ReportOptions, Report, ReportFormat } from './types';

/**
 * Générateur de Rapports de Bolt2bolt
 * 
 * Crée des rapports détaillés sur les analyses, optimisations
 * et validations effectuées sur le code
 */
export class ReportGenerator {
  private markdownGenerator: MarkdownGenerator;
  private htmlGenerator: HTMLGenerator;
  private jsonGenerator: JSONGenerator;
  private options: ReportOptions;
  
  constructor(options: ReportOptions) {
    this.options = options;
    this.markdownGenerator = new MarkdownGenerator();
    this.htmlGenerator = new HTMLGenerator();
    this.jsonGenerator = new JSONGenerator();
  }
  
  /**
   * Génère un rapport complet basé sur les résultats d'analyse, d'optimisation et de validation
   * @param analysisResult Résultat de l'analyse
   * @param optimizationResult Résultat des optimisations
   * @param validationResult Résultat de la validation
   * @param format Format de sortie du rapport
   */
  public async generateReport(
    analysisResult: AnalysisResult,
    optimizationResult?: OptimizationResult,
    validationResult?: ValidationResult,
    format: ReportFormat = 'markdown'
  ): Promise<Report> {
    console.log(`Generating report in ${format} format...`);
    
    // Préparer les données du rapport
    const reportData = {
      project: this.options.projectName || 'Unnamed Project',
      timestamp: new Date().toISOString(),
      analysis: analysisResult,
      optimization: optimizationResult,
      validation: validationResult,
      summary: this.generateSummary(analysisResult, optimizationResult, validationResult)
    };
    
    // Générer le rapport dans le format demandé
    let content: string;
    try {
      switch (format) {
        case 'html':
          content = await this.htmlGenerator.generate(reportData);
          break;
        case 'json':
          content = await this.jsonGenerator.generate(reportData);
          break;
        case 'markdown':
        default:
          content = await this.markdownGenerator.generate(reportData);
      }
    } catch (error) {
      console.error(`Erreur lors de la génération du rapport ${format}: ${error.message}`);
      content = `Erreur lors de la génération du rapport: ${error.message}`;
    }
    
    // Créer l'objet rapport
    const report: Report = {
      content,
      format,
      timestamp: reportData.timestamp,
      projectName: reportData.project
    };
    
    return report;
  }
  
  /**
   * Génère un résumé global des résultats
   */
  private generateSummary(
    analysisResult: AnalysisResult,
    optimizationResult?: OptimizationResult,
    validationResult?: ValidationResult
  ) {
    // Créer un résumé global du rapport
    return {
      analysisScore: analysisResult.summary.maintainabilityIndex,
      totalIssuesDetected: analysisResult.summary.totalIssues,
      totalOptimizationsApplied: optimizationResult?.summary.totalOptimizations || 0,
      validationSuccess: validationResult?.validationPassed || false,
      improvementScore: this.calculateImprovementScore(analysisResult, optimizationResult)
    };
  }
  
  /**
   * Calcule un score d'amélioration basé sur l'analyse et l'optimisation
   */
  private calculateImprovementScore(
    analysisResult: AnalysisResult,
    optimizationResult?: OptimizationResult
  ): number {
    if (!optimizationResult) {
      return 0;
    }
    
    // Algorithme simple de calcul de score d'amélioration
    const issuesFactor = analysisResult.summary.totalIssues > 0 
      ? optimizationResult.summary.totalOptimizations / analysisResult.summary.totalIssues 
      : 0;
    
    const impactScore = optimizationResult.summary.impactScore;
    
    // Score combiné (0-100)
    return Math.min(100, Math.round((issuesFactor * 50) + (impactScore * 50)));
  }
}
