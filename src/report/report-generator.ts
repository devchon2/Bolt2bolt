import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../analyzer/analyzer';
import { Transformation } from '../optimizer/optimizer';
import { ValidationResult } from '../validator/validator';

/*
[COPILOT_PROMPTS]
# Contexte Report Generator
- Le générateur de rapports est responsable de la création de rapports détaillés sur l'analyse et l'optimisation
- Les rapports doivent être lisibles par des humains et des machines (formats multiples: JSON, HTML, Markdown)
- Les rapports doivent inclure des métriques, des visualisations et des recommandations
- Les rapports doivent permettre de comparer les versions avant/après optimisation

# Points d'extension prioritaires:
- Ajout de nouvelles visualisations (graphiques, heatmaps)
- Intégration de comparaisons historiques (tendances)
- Amélioration du formatage pour différents formats de sortie
- Ajout de recommandations personnalisées basées sur les résultats
[COPILOT_PROMPTS]
*/

/**
 * Interface pour la structure d'un rapport
 */
export interface Report {
  summary: {
    title: string;
    timestamp: string;
    metrics: Record<string, any>;
    overallScore: number;
    comparison?: any;
  };
  details: {
    fileReports: Array<{
      filePath: string;
      metrics: Record<string, any>;
      issues: Array<any>;
      recommendations?: Array<string>;
    }>;
    transformations: Array<Transformation>;
    validations: Array<ValidationResult>;
  };
  visualizations?: Array<{
    type: string;
    title: string;
    data: any;
  }>;
}

/**
 * Interface pour les données à inclure dans le rapport
 */
export interface ReportData {
  analysisResults: AnalysisResult[];
  transformations: Transformation[];
  validationResults?: ValidationResult[];
  appliedCount?: number;
}

/**
 * Interface pour les options de configuration du générateur de rapports
 */
export interface ReportGeneratorConfig {
  outputDir?: string;
  formats?: Array<'json' | 'html' | 'markdown'>;
  includeVisualization?: boolean;
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Interface pour la configuration d'une comparaison
 */
export interface ComparisonConfig {
  basePath: string;  // Chemin du rapport de base
  includeUnchanged?: boolean;  // Inclure les fichiers inchangés
  detailLevel?: 'summary' | 'detailed';  // Niveau de détail
}

/**
 * Générateur de rapports pour les analyses et optimisations
 */
export class ReportGenerator {
  private config: ReportGeneratorConfig;

  constructor(config: ReportGeneratorConfig = {}) {
    this.config = {
      outputDir: './reports',
      formats: ['json', 'markdown'],
      includeVisualization: true,
      detailLevel: 'detailed',
      theme: 'auto',
      ...config
    };
  }

  /**
   * Génère un rapport complet basé sur les données fournies
   * @param data Données à inclure dans le rapport
   */
  public generateReport(data: ReportData): Report {
    console.log('Generating report...');
    
    const report: Report = {
      summary: {
        title: 'Bolt2bolt - Rapport d\'analyse et d\'optimisation amélioré',
        timestamp: new Date().toISOString(),
        metrics: this.calculateSummaryMetrics(data.analysisResults),
        overallScore: this.calculateOverallScore(data.analysisResults)
      },
      details: {
        fileReports: this.generateFileReports(data.analysisResults),
        transformations: data.transformations,
        validations: data.validationResults || []
      }
    };

    if (this.config.includeVisualization) {
      report.visualizations = this.generateVisualizations(data);
    }

    this.exportReport(report);

    return report;
  }

  /**
   * Génère un rapport de comparaison entre une analyse actuelle et une précédente
   * @param data Données d'analyse actuelles
   * @param comparisonConfig Configuration de la comparaison
   */
  public generateComparisonReport(data: ReportData, comparisonConfig: ComparisonConfig): Report {
    try {
      // Charger le rapport précédent
      const baseReport = this.loadReport(comparisonConfig.basePath);
      
      // Générer le rapport actuel
      const currentReport = this.generateReport(data);
      
      // Calculer les différences
      const comparisonSummary = this.calculateDifferences(baseReport, currentReport);
      
      // Intégrer les informations de comparaison dans le rapport actuel
      currentReport.summary.title += ' (Comparaison)';
      currentReport.summary.comparison = comparisonSummary;
      
      // Ajouter des visualisations de comparaison
      if (currentReport.visualizations && this.config.includeVisualization) {
        currentReport.visualizations.push({
          type: 'diffChart',
          title: 'Évolution des métriques',
          data: {
            before: baseReport.summary.metrics,
            after: currentReport.summary.metrics
          }
        });
      }
      
      return currentReport;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de comparaison:', error);
      throw error;
    }
  }
  
  /**
   * Charge un rapport existant
   */
  private loadReport(reportPath: string): Report {
    try {
      const content = fs.readFileSync(reportPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Erreur lors du chargement du rapport ${reportPath}:`, error);
      throw new Error(`Impossible de charger le rapport pour la comparaison: ${error.message}`);
    }
  }
  
  /**
   * Calcule les différences entre deux rapports
   */
  private calculateDifferences(baseReport: Report, currentReport: Report): any {
    const result = {
      metrics: {} as Record<string, {before: number, after: number, change: number, changePercent: string}>,
      issues: {
        added: 0,
        resolved: 0,
        unchanged: 0
      },
      score: {
        before: baseReport.summary.overallScore,
        after: currentReport.summary.overallScore,
        change: currentReport.summary.overallScore - baseReport.summary.overallScore
      }
    };
    
    // Calculer les différences de métriques
    for (const [key, value] of Object.entries(currentReport.summary.metrics)) {
      if (typeof value === 'number' && typeof baseReport.summary.metrics[key] === 'number') {
        const before = baseReport.summary.metrics[key];
        const after = value;
        const change = after - before;
        const changePercent = before === 0 ? 'N/A' : `${(change / before * 100).toFixed(1)}%`;
        
        result.metrics[key] = { before, after, change, changePercent };
      }
    }
    
    // Compter les problèmes ajoutés, résolus et inchangés
    const baseIssues = this.getAllIssues(baseReport);
    const currentIssues = this.getAllIssues(currentReport);
    
    const baseIssueKeys = new Set(baseIssues.map(i => this.getIssueKey(i)));
    const currentIssueKeys = new Set(currentIssues.map(i => this.getIssueKey(i)));
    
    for (const issueKey of baseIssueKeys) {
      if (currentIssueKeys.has(issueKey)) {
        result.issues.unchanged++;
      } else {
        result.issues.resolved++;
      }
    }
    
    for (const issueKey of currentIssueKeys) {
      if (!baseIssueKeys.has(issueKey)) {
        result.issues.added++;
      }
    }
    
    return result;
  }
  
  /**
   * Extrait tous les problèmes d'un rapport
   */
  private getAllIssues(report: Report): any[] {
    const issues: any[] = [];
    for (const fileReport of report.details.fileReports) {
      issues.push(...fileReport.issues);
    }
    return issues;
  }
  
  /**
   * Génère une clé unique pour un problème
   */
  private getIssueKey(issue: any): string {
    return `${issue.type}-${issue.message}-${issue.location?.start}`;
  }

  /**
   * Calcule les métriques globales du projet
   */
  private calculateSummaryMetrics(analysisResults: AnalysisResult[]): Record<string, any> {
    if (!analysisResults || analysisResults.length === 0) {
      return {
        filesAnalyzed: 0,
        avgComplexity: 0,
        avgMaintainability: 0,
        securityScore: 0,
        performanceScore: 0
      };
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
    
    return {
      filesAnalyzed: count,
      avgComplexity: +(totalComplexity / count).toFixed(2),
      avgMaintainability: +(totalMaintainability / count).toFixed(2),
      securityScore: +(totalSecurity / count).toFixed(2),
      performanceScore: +(totalPerformance / count).toFixed(2),
      issueCounts: this.countIssuesByType(analysisResults)
    };
  }

  /**
   * Calcule le score global du projet
   */
  private calculateOverallScore(analysisResults: AnalysisResult[]): number {
    if (!analysisResults || analysisResults.length === 0) {
      return 0;
    }

    // Calcul pondéré basé sur toutes les métriques
    const metrics = this.calculateSummaryMetrics(analysisResults);
    
    // Formule: 100 - (complexité relative) + (maintenabilité) + (sécurité) + (performance) / 4
    const complexityScore = Math.max(0, 100 - (metrics.avgComplexity * 5)); // Pénalité pour complexité
    const maintainabilityScore = metrics.avgMaintainability;
    const securityScore = metrics.securityScore;
    const performanceScore = metrics.performanceScore;
    
    const overallScore = (complexityScore + maintainabilityScore + securityScore + performanceScore) / 4;
    
    return +overallScore.toFixed(1);
  }

  /**
   * Compte les problèmes par type et sévérité
   */
  private countIssuesByType(analysisResults: AnalysisResult[]): Record<string, any> {
    const counts = {
      security: { critical: 0, major: 0, minor: 0, total: 0 },
      performance: { critical: 0, major: 0, minor: 0, total: 0 },
      maintainability: { critical: 0, major: 0, minor: 0, total: 0 },
      complexity: { critical: 0, major: 0, minor: 0, total: 0 },
      total: { critical: 0, major: 0, minor: 0, all: 0 }
    };

    for (const result of analysisResults) {
      for (const issue of result.issues) {
        counts[issue.type][issue.severity]++;
        counts[issue.type].total++;
        counts.total[issue.severity]++;
        counts.total.all++;
      }
    }

    return counts;
  }

  /**
   * Génère les rapports détaillés pour chaque fichier
   */
  private generateFileReports(analysisResults: AnalysisResult[]): Array<Report['details']['fileReports'][0]> {
    return analysisResults.map(result => {
      // Génération de recommandations basées sur les problèmes détectés
      const recommendations = this.generateRecommendations(result);
      
      return {
        filePath: result.filePath,
        metrics: result.metrics,
        issues: result.issues,
        recommendations
      };
    });
  }

  /**
   * Génère des visualisations basées sur les données
   */
  private generateVisualizations(data: ReportData): Report['visualizations'] {
    const visualizations = [];
    
    // Exemple de visualisation: distribution des problèmes par type
    visualizations.push({
      type: 'pieChart',
      title: 'Distribution des problèmes par type',
      data: this.calculateIssueDistribution(data.analysisResults)
    });
    
    // Exemple de visualisation: fichiers les plus problématiques
    visualizations.push({
      type: 'barChart',
      title: 'Top 5 des fichiers les plus problématiques',
      data: this.findMostProblematicFiles(data.analysisResults, 5)
    });

    return visualizations;
  }

  /**
   * Calcule la distribution des problèmes par type
   */
  private calculateIssueDistribution(analysisResults: AnalysisResult[]): Record<string, number> {
    const distribution: Record<string, number> = {
      security: 0,
      performance: 0,
      maintainability: 0,
      complexity: 0
    };

    for (const result of analysisResults) {
      for (const issue of result.issues) {
        distribution[issue.type]++;
      }
    }

    return distribution;
  }

  /**
   * Trouve les fichiers les plus problématiques
   */
  private findMostProblematicFiles(analysisResults: AnalysisResult[], limit: number): Array<{name: string; issues: number}> {
    return analysisResults
      .map(result => ({
        name: path.basename(result.filePath),
        issues: result.issues.length
      }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, limit);
  }

  /**
   * Génère des recommandations basées sur les problèmes détectés
   */
  private generateRecommendations(analysisResult: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    // Recommandations basées sur la complexité
    if (analysisResult.metrics.complexity > 20) {
      recommendations.push("Refactorisez ce fichier en composants plus petits pour réduire sa complexité.");
    } else if (analysisResult.metrics.complexity > 10) {
      recommendations.push("Envisagez d'extraire certaines fonctionnalités dans des modules séparés.");
    }
    
    // Recommandations basées sur la maintenabilité
    if (analysisResult.metrics.maintainability < 70) {
      recommendations.push("Améliorez la documentation et la cohérence du code pour augmenter sa maintenabilité.");
    }
    
    // Recommandations basées sur les problèmes de sécurité
    const securityIssues = analysisResult.issues.filter(i => i.type === 'security');
    if (securityIssues.length > 0) {
      const criticalSecurity = securityIssues.filter(i => i.severity === 'critical').length;
      if (criticalSecurity > 0) {
        recommendations.push(`Corrigez en priorité les ${criticalSecurity} problèmes critiques de sécurité.`);
      }
    }
    
    // Recommandations basées sur la performance
    if (analysisResult.metrics.performance < 80) {
      recommendations.push("Optimisez les portions de code critiques pour améliorer les performances.");
    }
    
    return recommendations;
  }

  /**
   * Exporte le rapport dans les formats demandés
   */
  private exportReport(report: Report): void {
    // Création du répertoire de sortie si nécessaire
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const baseFilename = `bolt2bolt-report-${timestamp}`;
    
    for (const format of this.config.formats!) {
      try {
        const filepath = path.join(this.config.outputDir!, `${baseFilename}.${format}`);
        
        switch (format) {
          case 'json':
            fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
            break;
            
          case 'markdown':
            fs.writeFileSync(filepath, this.convertToMarkdown(report), 'utf8');
            break;
            
          case 'html':
            fs.writeFileSync(filepath, this.convertToHtml(report), 'utf8');
            break;
        }
        
        console.log(`Report saved to ${filepath}`);
      } catch (error) {
        console.error(`Error exporting report as ${format}:`, error);
      }
    }
  }

  /**
   * Convertit le rapport en format Markdown
   */
  private convertToMarkdown(report: Report): string {
    let markdown = `# ${report.summary.title}\n\n`;
    markdown += `*Généré le ${new Date(report.summary.timestamp).toLocaleString()}*\n\n`;
    
    markdown += `## 📊 Résumé\n\n`;
    markdown += `- **Score Global**: ${report.summary.overallScore}/100\n`;
    markdown += `- **Fichiers Analysés**: ${report.summary.metrics.filesAnalyzed}\n`;
    markdown += `- **Complexité Moyenne**: ${report.summary.metrics.avgComplexity}\n`;
    markdown += `- **Maintenabilité Moyenne**: ${report.summary.metrics.avgMaintainability}/100\n\n`;
    
    markdown += `### Problèmes Détectés\n\n`;
    markdown += `| Type | Critique | Majeur | Mineur | Total |\n`;
    markdown += `|------|----------|--------|--------|-------|\n`;
    
    const counts = report.summary.metrics.issueCounts;
    markdown += `| Sécurité | ${counts.security.critical} | ${counts.security.major} | ${counts.security.minor} | ${counts.security.total} |\n`;
    markdown += `| Performance | ${counts.performance.critical} | ${counts.performance.major} | ${counts.performance.minor} | ${counts.performance.total} |\n`;
    markdown += `| Maintenabilité | ${counts.maintainability.critical} | ${counts.maintainability.major} | ${counts.maintainability.minor} | ${counts.maintainability.total} |\n`;
    markdown += `| Complexité | ${counts.complexity.critical} | ${counts.complexity.major} | ${counts.complexity.minor} | ${counts.complexity.total} |\n`;
    markdown += `| **Total** | ${counts.total.critical} | ${counts.total.major} | ${counts.total.minor} | ${counts.total.all} |\n\n`;
    
    markdown += `## 📝 Détails par Fichier\n\n`;
    
    // Limiter le nombre de fichiers dans le rapport pour ne pas surcharger
    const topFiles = report.details.fileReports
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 10);
    
    for (const fileReport of topFiles) {
      markdown += `### ${path.basename(fileReport.filePath)}\n\n`;
      markdown += `- **Chemin**: \`${fileReport.filePath}\`\n`;
      markdown += `- **Complexité**: ${fileReport.metrics.complexity}\n`;
      markdown += `- **Maintenabilité**: ${fileReport.metrics.maintainability}/100\n`;
      markdown += `- **Problèmes**: ${fileReport.issues.length}\n\n`;
      
      if (fileReport.issues.length > 0) {
        markdown += `#### Problèmes Détectés\n\n`;
        markdown += `| Type | Sévérité | Message |\n`;
        markdown += `|------|----------|--------|\n`;
        
        for (const issue of fileReport.issues.slice(0, 5)) {
          markdown += `| ${issue.type} | ${issue.severity} | ${issue.message} |\n`;
        }
        
        if (fileReport.issues.length > 5) {
          markdown += `\n*...et ${fileReport.issues.length - 5} autres problèmes*\n`;
        }
        
        markdown += `\n`;
      }
      
      if (fileReport.recommendations && fileReport.recommendations.length > 0) {
        markdown += `#### Recommandations\n\n`;
        for (const rec of fileReport.recommendations) {
          markdown += `- ${rec}\n`;
        }
        markdown += `\n`;
      }
    }
    
    if (report.details.fileReports.length > 10) {
      markdown += `\n*...et ${report.details.fileReports.length - 10} autres fichiers*\n\n`;
    }
    
    markdown += `## 💡 Transformations Proposées\n\n`;
    markdown += `Total: ${report.details.transformations.length} transformations\n\n`;
    
    const topTransformations = report.details.transformations.slice(0, 5);
    for (const transformation of topTransformations) {
      markdown += `### ${path.basename(transformation.filePath)}\n\n`;
      markdown += `- **Type**: ${transformation.type}\n`;
      markdown += `- **Sévérité**: ${transformation.severity}\n`;
      markdown += `- **Description**: ${transformation.description}\n`;
      markdown += `- **Confiance**: ${(transformation.confidence * 100).toFixed(0)}%\n\n`;
      
      markdown += "```diff\n";
      markdown += transformation.original.text + "\n";
      markdown += "+" + transformation.replacement + "\n";
      markdown += "```\n\n";
    }
    /*
    [COPILOT_PROMPTS]
    # Markdown Conversion Context
    - Convert the report to Markdown format.
    
    # Extension points:
    - Improve formatting for different output formats.
    - Add custom recommendations based on the results.
    [COPILOT_PROMPTS]
    */
    return markdown;
  }

  /**
   * Convertit le rapport en format HTML
   */
  private convertToHtml(report: Report): string {
    // Style CSS pour le rapport HTML
    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1, h2, h3, h4 { color: #0366d6; }
      .summary { background-color: #f6f8fa; border-radius: 6px; padding: 20px; margin-bottom: 30px; }
      .score { font-size: 2em; font-weight: bold; }
      .metrics { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
      .metric-card { background-color: white; border: 1px solid #e1e4e8; border-radius: 6px; padding: 15px; min-width: 200px; }
      .metric-value { font-size: 1.5em; font-weight: bold; color: #0366d6; }
      table { width: 100%; border-collapse: collapse; margin: 25px 0; }
      th, td { padding: 12px 15px; border-bottom: 1px solid #e1e4e8; text-align: left; }
      th { background-color: #f6f8fa; }
      tr:hover { background-color: #f6f8fa; }
      .issue { margin-bottom: 15px; padding: 10px; border-left: 4px solid #0366d6; background-color: #f6f8fa; }
      .issue.critical { border-left-color: #cb2431; }
      .issue.major { border-left-color: #f66a0a; }
      .issue.minor { border-left-color: #ffea7f; }
      .recommendations { margin-top: 20px; }
      .recommendation { padding: 10px; background-color: #dcffe4; border-radius: 6px; margin-bottom: 10px; }
      .file-details { margin-bottom: 30px; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
      .file-header { background-color: #f6f8fa; padding: 10px 15px; border-bottom: 1px solid #e1e4e8; }
    `;

    let html = `<html><head><meta charset="UTF-8"><title>${report.summary.title}</title><style>${styles}</style></head><body>`;
    html += `<h1>${report.summary.title}</h1>`;
    html += `<p>Généré le ${new Date(report.summary.timestamp).toLocaleString()}</p>`;
    html += `<div class="summary">`;
    html += `<h2>Résumé</h2>`;
    html += `<div class="score">Score Global: ${report.summary.overallScore}/100</div>`;
    html += `<div class="metrics">`;
    html += `<div class="metric-card"><div class="metric-value">${report.summary.metrics.filesAnalyzed}</div><div>Fichiers Analysés</div></div>`;
    html += `<div class="metric-card"><div class="metric-value">${report.summary.metrics.avgComplexity}</div><div>Complexité Moyenne</div></div>`;
    html += `<div class="metric-card"><div class="metric-value">${report.summary.metrics.avgMaintainability}/100</div><div>Maintenabilité Moyenne</div></div>`;
    html += `</div></div>`;

    html += `<h2>Problèmes Détectés</h2>`;
    html += `<table><thead><tr><th>Type</th><th>Critique</th><th>Majeur</th><th>Mineur</th><th>Total</th></tr></thead><tbody>`;
    const counts = report.summary.metrics.issueCounts;
    html += `<tr><td>Sécurité</td><td>${counts.security.critical}</td><td>${counts.security.major}</td><td>${counts.security.minor}</td><td>${counts.security.total}</td></tr>`;
    html += `<tr><td>Performance</td><td>${counts.performance.critical}</td><td>${counts.performance.major}</td><td>${counts.performance.minor}</td><td>${counts.performance.total}</td></tr>`;
    html += `<tr><td>Maintenabilité</td><td>${counts.maintainability.critical}</td><td>${counts.maintainability.major}</td><td>${counts.maintainability.minor}</td><td>${counts.maintainability.total}</td></tr>`;
    html += `<tr><td>Complexité</td><td>${counts.complexity.critical}</td><td>${counts.complexity.major}</td><td>${counts.complexity.minor}</td><td>${counts.complexity.total}</td></tr>`;
    html += `<tr><td><strong>Total</strong></td><td><strong>${counts.total.critical}</strong></td><td><strong>${counts.total.major}</strong></td><td><strong>${counts.total.minor}</strong></td><td><strong>${counts.total.all}</strong></td></tr>`;
    html += `</tbody></table>`;

    html += `<h2>Détails par Fichier</h2>`;
    const topFiles = report.details.fileReports.sort((a, b) => b.issues.length - a.issues.length).slice(0, 10);
    for (const fileReport of topFiles) {
      html += `<div class="file-details"><div class="file-header"><h3>${path.basename(fileReport.filePath)}</h3></div>`;
      html += `<div class="file-body"><p><strong>Chemin:</strong> ${fileReport.filePath}</p>`;
      html += `<p><strong>Complexité:</strong> ${fileReport.metrics.complexity}</p>`;
      html += `<p><strong>Maintenabilité:</strong> ${fileReport.metrics.maintenability}/100</p>`;
      html += `<p><strong>Problèmes:</strong> ${fileReport.issues.length}</p>`;

      if (fileReport.issues.length > 0) {
        html += `<h4>Problèmes Détectés</h4>`;
        html += `<table><thead><tr><th>Type</th><th>Sévérité</th><th>Message</th></tr></thead><tbody>`;
        for (const issue of fileReport.issues.slice(0, 5)) {
          html += `<tr><td>${issue.type}</td><td>${issue.severity}</td><td>${issue.message}</td></tr>`;
        }
        if (fileReport.issues.length > 5) {
          html += `<tr><td colspan="3">...et ${fileReport.issues.length - 5} autres problèmes</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      if (fileReport.recommendations && fileReport.recommendations.length > 0) {
        html += `<h4>Recommandations</h4>`;
        for (const rec of fileReport.recommendations) {
          html += `<div class="recommendation">${rec}</div>`;
        }
      }
      html += `</div></div>`;
    }

    if (report.details.fileReports.length > 10) {
      html += `<p>...et ${report.details.fileReports.length - 10} autres fichiers</p>`;
    }

    html += `<h2>Transformations Proposées</h2>`;
    html += `<p>Total: ${report.details.transformations.length} transformations</p>`;
    const topTransformations = report.details.transformations.slice(0, 5);
    for (const transformation of topTransformations) {
      html += `<div class="transformation"><h3>${path.basename(transformation.filePath)}</h3>`;
      html += `<p><strong>Type:</strong> ${transformation.type}</p>`;
      html += `<p><strong>Sévérité:</strong> ${transformation.severity}</p>`;
      html += `<p><strong>Description:</strong> ${transformation.description}</p>`;
      html += `<p><strong>Confiance:</strong> ${(transformation.confidence * 100).toFixed(0)}%</p>`;
      html += `<pre><code>${transformation.original.text}\n+${transformation.replacement}</code></pre></div>`;
    }

    html += `</body></html>`;
    return html;
  }
}
