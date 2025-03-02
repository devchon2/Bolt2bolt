/**
 * Générateur de rapports d'analyse
 * 
 * Crée des rapports détaillés à partir des résultats d'analyse
 * dans différents formats (JSON, HTML, Markdown, texte).
 * 
 * @module analyzer/core/reporter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisResult, ReportGeneratorOptions } from './types';
import { CodeIssue, MetricType, SeverityLevel } from '../types';
import { getScoreRating, generateMetricsSummary } from './metrics';

/**
 * Classe pour générer des rapports à partir des résultats d'analyse
 */
export class ReportGenerator {
  /**
   * Crée un rapport basé sur les résultats d'analyse et les options spécifiées
   * 
   * @param result Résultat de l'analyse
   * @param options Options de génération du rapport
   * @returns Contenu du rapport
   */
  async generateReport(
    result: AnalysisResult,
    options: ReportGeneratorOptions
  ): Promise<string> {
    // Filtrer les problèmes selon les options
    const filteredIssues = this.filterIssues(result.issues, options);
    
    // Génère le rapport dans le format demandé
    let reportContent = '';
    switch (options.format) {
      case 'json':
        reportContent = this.generateJsonReport(result, filteredIssues, options);
        break;
      case 'html':
        reportContent = this.generateHtmlReport(result, filteredIssues, options);
        break;
      case 'markdown':
        reportContent = this.generateMarkdownReport(result, filteredIssues, options);
        break;
      case 'text':
      default:
        reportContent = this.generateTextReport(result, filteredIssues, options);
        break;
    }
    
    // Sauvegarde le rapport si un chemin est spécifié
    if (options.outputPath) {
      const outputDir = path.dirname(options.outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.outputPath, reportContent);
    }
    
    return reportContent;
  }
  
  /**
   * Filtre les problèmes selon les options spécifiées
   */
  private filterIssues(issues: CodeIssue[], options: ReportGeneratorOptions): CodeIssue[] {
    if (!options.filters) {
      return issues;
    }
    
    let filtered = issues;
    
    // Filtre par niveau de sévérité minimum
    if (options.filters.minSeverity) {
      const severityLevels = Object.values(SeverityLevel);
      const minSeverityIndex = severityLevels.indexOf(options.filters.minSeverity);
      
      filtered = filtered.filter(issue => {
        const issueIndex = severityLevels.indexOf(issue.severity);
        return issueIndex >= minSeverityIndex;
      });
    }
    
    // Filtre par types de métriques
    if (options.filters.includeMetrics && options.filters.includeMetrics.length > 0) {
      filtered = filtered.filter(issue => 
        options.filters.includeMetrics.includes(issue.metricType)
      );
    }
    
    // Limite le nombre de problèmes
    if (options.filters.maxIssues && filtered.length > options.filters.maxIssues) {
      // Priorise les problèmes de sévérité plus élevée
      filtered.sort((a, b) => {
        const severityDiff = 
          Object.values(SeverityLevel).indexOf(b.severity) - 
          Object.values(SeverityLevel).indexOf(a.severity);
        
        if (severityDiff !== 0) return severityDiff;
        
        // En cas d'égalité, priorise par type de métrique (sécurité en premier)
        const metricPriority: MetricType[] = [
          'security', 'performance', 'complexity', 'maintainability',
          'typescript', 'duplication', 'dependencies', 'documentation', 'tests'
        ];
        
        return metricPriority.indexOf(a.metricType) - metricPriority.indexOf(b.metricType);
      });
      
      filtered = filtered.slice(0, options.filters.maxIssues);
    }
    
    return filtered;
  }
  
  /**
   * Génère un rapport au format JSON
   */
  private generateJsonReport(
    result: AnalysisResult,
    filteredIssues: CodeIssue[],
    options: ReportGeneratorOptions
  ): string {
    const report = {
      analysisId: result.analysisId,
      timestamp: result.timestamp,
      date: new Date(result.timestamp).toISOString(),
      summary: result.summary,
      stats: result.stats,
      issues: filteredIssues,
      metrics: result.metrics,
      detailed: options.detailed
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Génère un rapport au format HTML
   */
  private generateHtmlReport(
    result: AnalysisResult,
    filteredIssues: CodeIssue[],
    options: ReportGeneratorOptions
  ): string {
    const date = new Date(result.timestamp).toLocaleString();
    
    let issuesHtml = '';
    filteredIssues.forEach(issue => {
      const severityClass = this.getSeverityClass(issue.severity);
      
      issuesHtml += `
        <div class="issue ${severityClass}">
          <h3>${issue.title} <span class="badge ${severityClass}">${issue.severity}</span></h3>
          <p>${issue.description}</p>
          <div class="location">
            <strong>Emplacement:</strong> ${issue.location.filePath}:${issue.location.line}:${issue.location.column}
          </div>
          ${issue.suggestions && issue.suggestions.length > 0 ? `
            <div class="suggestions">
              <strong>Suggestions:</strong>
              <ul>
                ${issue.suggestions.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    // Génère des graphiques si demandé
    let visualizations = '';
    if (options.includeVisualizations) {
      visualizations = `
        <div class="visualizations">
          <h2>Visualisations</h2>
          <div class="charts">
            <div class="chart">
              <h3>Répartition par sévérité</h3>
              <div class="chart-placeholder" id="chart-severity">${this.generateSeverityDistributionHtml(result)}</div>
            </div>
            <div class="chart">
              <h3>Scores par métrique</h3>
              <div class="chart-placeholder" id="chart-metrics">${this.generateMetricsScoreHtml(result)}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Structure HTML complète du rapport
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapport d'analyse</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .container { padding: 20px; }
          .issue { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
          .badge { padding: 5px; border-radius: 3px; }
          .severity-low { background-color: #d4edda; color: #155724; }
          .severity-medium { background-color: #fff3cd; color: #856404; }
          .severity-high { background-color: #f8d7da; color: #721c24; }
          .visualizations { margin-top: 20px; }
          .chart { margin-bottom: 20px; }
          .chart-placeholder { width: 100%; height: 300px; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Rapport d'analyse</h1>
          <p><strong>ID de l'analyse:</strong> ${result.analysisId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <h2>Résumé</h2>
          <p>${result.summary}</p>
          <h2>Statistiques</h2>
          <pre>${JSON.stringify(result.stats, null, 2)}</pre>
          <h2>Problèmes</h2>
          ${issuesHtml}
          ${visualizations}
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Génère un rapport au format Markdown
   */
  private generateMarkdownReport(
    result: AnalysisResult,
    filteredIssues: CodeIssue[],
    options: ReportGeneratorOptions
  ): string {
    const date = new Date(result.timestamp).toLocaleString();
    
    let issuesMarkdown = '';
    filteredIssues.forEach(issue => {
      issuesMarkdown += `
## ${issue.title} [${issue.severity}]
**Description:** ${issue.description}
**Emplacement:** ${issue.location.filePath}:${issue.location.line}:${issue.location.column}
${issue.suggestions && issue.suggestions.length > 0 ? `
**Suggestions:**
${issue.suggestions.map(s => `- ${s}`).join('\n')}
` : ''}
      `;
    });
    
    return `
# Rapport d'analyse

**ID de l'analyse:** ${result.analysisId}
**Date:** ${date}

## Résumé
${result.summary}

## Statistiques
\`\`\`json
${JSON.stringify(result.stats, null, 2)}
\`\`\`

## Problèmes
${issuesMarkdown}
    `;
  }
  
  /**
   * Génère un rapport au format texte
   */
  private generateTextReport(
    result: AnalysisResult,
    filteredIssues: CodeIssue[],
    options: ReportGeneratorOptions
  ): string {
    const date = new Date(result.timestamp).toLocaleString();
    
    let issuesText = '';
    filteredIssues.forEach(issue => {
      issuesText += `
Titre: ${issue.title}
Sévérité: ${issue.severity}
Description: ${issue.description}
Emplacement: ${issue.location.filePath}:${issue.location.line}:${issue.location.column}
${issue.suggestions && issue.suggestions.length > 0 ? `
Suggestions:
${issue.suggestions.map(s => `- ${s}`).join('\n')}
` : ''}
      `;
    });
    
    return `
Rapport d'analyse

ID de l'analyse: ${result.analysisId}
Date: ${date}

Résumé:
${result.summary}

Statistiques:
${JSON.stringify(result.stats, null, 2)}

Problèmes:
${issuesText}
    `;
  }
  
  /**
   * Retourne la classe CSS correspondant au niveau de sévérité
   */
  private getSeverityClass(severity: SeverityLevel): string {
    switch (severity) {
      case 'low':
        return 'severity-low';
      case 'medium':
        return 'severity-medium';
      case 'high':
        return 'severity-high';
      default:
        return '';
    }
  }
  
  /**
   * Génère le HTML pour la distribution des sévérités
   */
  private generateSeverityDistributionHtml(result: AnalysisResult): string {
    // Implémentation de la génération de la distribution des sévérités
    return '<div>Distribution des sévérités</div>';
  }
  
  /**
   * Génère le HTML pour les scores des métriques
   */
  private generateMetricsScoreHtml(result: AnalysisResult): string {
    // Implémentation de la génération des scores des métriques
    return '<div>Scores des métriques</div>';
  }
}
