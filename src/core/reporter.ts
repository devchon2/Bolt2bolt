// #codebase: [CONTEXTE] Système de génération de rapports pour Bolt2bolt.
// #codebase: [RESPONSABILITÉ] Produire des rapports détaillés sur l'analyse et l'optimisation.
// #codebase: [PATTERN:STRATEGY] Utiliser pour les différents formats de rapport.

import { AnalysisResult } from '../types/analysis';
import { OptimizationResult } from '../types/optimization';
import { ValidationResult } from '../types/validation';
import { Logger } from '../utils/logger';

/*
[COPILOT_PROMPTS]
# Rapporteur - Directives d'Implémentation

## Responsabilité
- Générer des rapports détaillés sur les processus d'analyse et d'optimisation
- Présenter les résultats dans différents formats (Markdown, HTML, JSON)
- Fournir des métriques et des visualisations pertinentes
- Mettre en évidence les améliorations et les points d'attention

## Architecture
- Pattern Strategy pour les différents formats de rapport
- Pattern Builder pour la construction progressive des rapports
- Interfaces claires pour l'extension avec de nouveaux formats

## Bonnes Pratiques
- Séparation claire entre données et présentation
- Formatage adapté à chaque type de rapport
- Structure cohérente entre les différents formats
- Documentation intégrée des métriques présentées
[COPILOT_PROMPTS]
*/

/**
 * Chaque rapport généré doit inclure une section “Métriques” avec :
 * - L’interprétation des valeurs (ex: score de maintenabilité, complexité, sécurité, etc.).
 * - Les seuils d’alerte (ex: score < 70 = point à améliorer).
 * Référez-vous à /docs/architecture.md pour la signification détaillée de chaque métrique.
 */

/**
 * Représente les données complètes pour un rapport
 */
export interface ReportData {
  /**
   * Résultat d'analyse
   */
  analysis?: AnalysisResult;
  
  /**
   * Résultat d'optimisation
   */
  optimization?: OptimizationResult;
  
  /**
   * Résultat de validation
   */
  validation?: ValidationResult;
}

/**
 * Options pour la génération de rapports
 */
export interface ReportOptions {
  /**
   * Mode de regroupement des informations
   */
  groupBy?: 'type' | 'file' | 'severity';
  
  /**
   * Inclure des détails supplémentaires
   */
  detailed?: boolean;
  
  /**
   * Inclure des graphiques (pour formats supportés)
   */
  includeCharts?: boolean;
}

/**
 * Interface pour les stratégies de génération de rapports
 */
interface ReportStrategy {
  /**
   * Génère un rapport dans un format spécifique
   */
  generate(data: ReportData, options: ReportOptions): Promise<string>;
}

/**
 * Stratégie pour les rapports en Markdown
 */
class MarkdownReportStrategy implements ReportStrategy {
  async generate(data: ReportData, options: ReportOptions): Promise<string> {
    let report = '# Rapport Bolt2bolt\n\n';
    report += `*Généré le ${new Date().toLocaleString()}*\n\n`;
    
    // Section Analyse
    if (data.analysis) {
      report += '## Analyse du Code\n\n';
      
      // Résumé des métriques
      report += '### Métriques\n\n';
      report += '| Métrique | Valeur |\n';
      report += '|----------|--------|\n';
      
      for (const [key, value] of Object.entries(data.analysis.metrics)) {
        report += `| ${key} | ${value} |\n`;
      }
      
      report += '\n';
      
      // Problèmes détectés
      report += '### Problèmes Détectés\n\n';
      
      if (data.analysis.issues.length === 0) {
        report += '*Aucun problème détecté.*\n\n';
      } else {
        // Grouper les problèmes selon l'option choisie
        const issues = [...data.analysis.issues];
        
        if (options.groupBy === 'severity') {
          issues.sort((a, b) => b.severity - a.severity);
        } else if (options.groupBy === 'file') {
          issues.sort((a, b) => (a.filePath || '').localeCompare(b.filePath || ''));
        } else { // par défaut: type
          issues.sort((a, b) => a.type.localeCompare(b.type));
        }
        
        for (const issue of issues) {
          report += `- **[${issue.type.toUpperCase()}]** `;
          report += `${issue.message} `;
          
          if (issue.filePath) {
            report += `(dans \`${issue.filePath}\``;
            
            if (issue.position) {
              report += ` ligne ${issue.position.line}`;
            }
            
            report += ')';
          }
          
          report += `\n  - Sévérité: ${issue.severity}/5\n`;
          
          if (options.detailed && issue.codeSnippet) {
            report += '\n  ```typescript\n';
            report += '  ' + issue.codeSnippet.replace(/\n/g, '\n  ');
            report += '\n  ```\n\n';
          }
        }
      }
      
      // Suggestions
      report += '### Suggestions d\'Amélioration\n\n';
      
      if (data.analysis.suggestions.length === 0) {
        report += '*Aucune suggestion disponible.*\n\n';
      } else {
        for (const suggestion of data.analysis.suggestions) {
          report += `- **[${suggestion.type.toUpperCase()}]** `;
          report += `${suggestion.description} `;
          
          if (suggestion.filePath) {
            report += `(dans \`${suggestion.filePath}\`)`;
          }
          
          report += `\n  - Impact: ${suggestion.impact}/5\n`;
          report += `  - Confiance: ${Math.round(suggestion.confidence * 100)}%\n`;
          
          if (options.detailed && suggestion.originalCode && suggestion.suggestedCode) {
            report += '\n  Avant:\n';
            report += '  ```typescript\n';
            report += '  ' + suggestion.originalCode.replace(/\n/g, '\n  ');
            report += '\n  ```\n\n';
            
            report += '  Après:\n';
            report += '  ```typescript\n';
            report += '  ' + suggestion.suggestedCode.replace(/\n/g, '\n  ');
            report += '\n  ```\n\n';
          }
        }
      }
    }
    
    // Section Optimisation
    if (data.optimization) {
      report += '## Optimisation du Code\n\n';
      
      // Métriques d'amélioration
      report += '### Améliorations\n\n';
      report += '| Métrique | Amélioration |\n';
      report += '|----------|-------------|\n';
      
      for (const [key, value] of Object.entries(data.optimization.improvementMetrics)) {
        report += `| ${key} | ${value > 0 ? '+' : ''}${value}% |\n`;
      }
      
      report += '\n';
      
      // Règles appliquées
      report += '### Règles d\'Optimisation Appliquées\n\n';
      
      if (data.optimization.appliedRules.length === 0) {
        report += '*Aucune règle appliquée.*\n\n';
      } else {
        for (const rule of data.optimization.appliedRules) {
          report += `- ${rule}\n`;
        }
        report += '\n';
      }
      
      // Temps d'optimisation
      report += `Temps d'optimisation: ${data.optimization.optimizationTime}ms\n\n`;
    }
    
    // Section Validation
    if (data.validation) {
      report += '## Validation\n\n';
      
      report += `Résultat: **${data.validation.valid ? 'VALIDE ✅' : 'ÉCHEC ❌'}**\n\n';
      
      if (data.validation.qualityScore !== undefined) {
        report += `Score de qualité: ${data.validation.qualityScore}/100\n\n`;
      }
      
      // Problèmes détectés
      if (data.validation.issues.length === 0) {
        report += '*Aucun problème de validation détecté.*\n\n';
      } else {
        report += '### Problèmes de Validation\n\n';
        
        // Grouper les problèmes selon l'option choisie
        const issues = [...data.validation.issues];
        
        if (options.groupBy === 'severity') {
          issues.sort((a, b) => b.severity - a.severity);
        } else if (options.groupBy === 'type') {
          issues.sort((a, b) => a.type.localeCompare(b.type));
        }
        
        for (const issue of issues) {
          report += `- **[${issue.type.toUpperCase()}]** `;
          report += `${issue.message}`;
          
          if (issue.location) {
            report += ` (ligne ${issue.location.line})`;
          }
          
          report += `\n  - Sévérité: ${issue.severity}/5\n`;
          
          if (issue.suggestions && issue.suggestions.length > 0) {
            report += '  - Suggestions:\n';
            for (const suggestion of issue.suggestions) {
              report += `    - ${suggestion}\n`;
            }
          }
          
          if (options.detailed && issue.code) {
            report += '\n  ```typescript\n';
            report += '  ' + issue.code.replace(/\n/g, '\n  ');
            report += '\n  ```\n\n';
          }
        }
      }
      
      // Temps de validation
      report += `\nTemps de validation: ${data.validation.validationTime}ms\n`;
    }
    
    return report;
  }
}