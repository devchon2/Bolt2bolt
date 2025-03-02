/**
 * Calculateur de métriques de code
 * 
 * Calcule et agrège diverses métriques de qualité de code
 * pour fournir une vue d'ensemble de la santé du projet.
 * 
 * @module analyzer/core/metrics
 */

import * as path from 'path';
import { CodeIssue, MetricType, SeverityLevel } from '../types';

/**
 * Poids des différentes sévérités pour le calcul des scores
 */
const SEVERITY_WEIGHTS = {
  [SeverityLevel.Info]: 0,
  [SeverityLevel.Warning]: 1,
  [SeverityLevel.Error]: 3,
  [SeverityLevel.Critical]: 5
};

/**
 * Seuils pour les scores de métriques (0-100)
 */
const METRIC_THRESHOLDS = {
  complexity: { good: 85, acceptable: 70, poor: 50 },
  security: { good: 90, acceptable: 75, poor: 60 },
  performance: { good: 85, acceptable: 70, poor: 50 },
  maintainability: { good: 80, acceptable: 65, poor: 45 },
  documentation: { good: 75, acceptable: 60, poor: 40 },
  typescript: { good: 85, acceptable: 70, poor: 50 },
  duplication: { good: 90, acceptable: 75, poor: 60 },
  dependencies: { good: 90, acceptable: 75, poor: 60 },
  tests: { good: 80, acceptable: 65, poor: 45 }
};

/**
 * Facteurs d'impact des métriques sur le score global
 */
const METRIC_WEIGHTS: Record<MetricType, number> = {
  security: 0.25,
  performance: 0.20,
  maintainability: 0.20,
  complexity: 0.15,
  typescript: 0.10,
  documentation: 0.05,
  duplication: 0.05,
  dependencies: 0.05,
  tests: 0.05
};

/**
 * Calcule les scores de métriques pour un fichier à partir des problèmes détectés
 * 
 * @param filePath Chemin du fichier
 * @param fileContent Contenu du fichier
 * @param issues Problèmes détectés dans le fichier
 * @returns Scores par dimension de métrique (0-100)
 */
export function calculateMetrics(
  filePath: string, 
  fileContent: string, 
  issues: CodeIssue[]
): Partial<Record<MetricType, number>> {
  const metricScores: Partial<Record<MetricType, number>> = {};
  const fileExtension = path.extname(filePath).toLowerCase();
  
  // Initialise le score de base pour chaque métrique
  // Un score de 100 signifie parfait, 0 signifie problématique
  Object.keys(METRIC_WEIGHTS).forEach(metric => {
    metricScores[metric as MetricType] = 100;
  });
  
  // Calcule les pénalités basées sur les problèmes détectés
  for (const issue of issues) {
    const metric = issue.metricType;
    const penaltyWeight = SEVERITY_WEIGHTS[issue.severity];
    
    // Soustrait une pénalité basée sur la sévérité
    if (metricScores[metric] !== undefined) {
      metricScores[metric] = Math.max(0, metricScores[metric] - penaltyWeight * 5);
    }
  }
  
  // Ajuste certaines métriques en fonction d'autres facteurs
  
  // Documentation: vérifie la présence de commentaires JSDoc
  if (fileExtension === '.ts' || fileExtension === '.js' || fileExtension === '.tsx' || fileExtension === '.jsx') {
    const docScore = calculateDocumentationScore(fileContent);
    metricScores.documentation = docScore;
  }
  
  // Complexité: affecte aussi la maintenabilité
  if (metricScores.complexity < 70 && metricScores.maintenabilité > 50) {
    metricScores.maintenabilité = Math.max(
      metricScores.maintenabilité - (70 - metricScores.complexité) / 2,
      50
    );
  }
  
  // Duplication: basé sur d'autres analyses (sera implémenté plus tard)
  // Tests: basé sur d'autres analyses (sera implémenté plus tard)
  
  return metricScores;
}

/**
 * Calcule un score global à partir des métriques individuelles
 * 
 * @param metricScores Scores par métrique
 * @returns Score global (0-100)
 */
export function calculateOverallScore(
  metricScores: Partial<Record<MetricType, number>>
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [metric, score] of Object.entries(metricScores)) {
    const metricType = metric as MetricType;
    const weight = METRIC_WEIGHTS[metricType];
    
    if (weight && score !== undefined) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }
  
  if (totalWeight === 0) {
    return 0;
  }
  
  // Normalise pour obtenir un score sur 100
  return Math.round(weightedSum / totalWeight);
}

/**
 * Calcule la qualité de documentation d'un fichier
 * 
 * @param fileContent Contenu du fichier
 * @returns Score de documentation (0-100)
 */
function calculateDocumentationScore(fileContent: string): number {
  // Détection de base des commentaires JSDoc
  const lines = fileContent.split('\n');
  const totalLines = lines.length;
  if (totalLines === 0) return 0;
  
  // Compte les lignes de code et les fonctions/classes/interfaces
  let codeLines = 0;
  let docCommentLines = 0;
  let functionCount = 0;
  let documentedFunctions = 0;
  let inDocComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Ignore les lignes vides
    if (line === '') continue;
    
    // Détecte les commentaires de documentation
    if (line.startsWith('/**')) {
      inDocComment = true;
      docCommentLines++;
      continue;
    }
    
    if (inDocComment) {
      if (line.includes('*/')) {
        inDocComment = false;
      }
      docCommentLines++;
      continue;
    }
    
    // Détecte les déclarations de fonctions et classes
    if (line.match(/^(export\s+)?(abstract\s+)?(class|interface|function|const\s+\w+\s*=\s*(\(|\w+\s*=>)|enum)/)) {
      functionCount++;
      
      // Vérifie si la ligne précédente termine un bloc de commentaire JSDoc
      if (i > 0 && lines[i-1].trim().includes('*/')) {
        documentedFunctions++;
      }
    }
    
    // Compte les lignes de code (hors commentaires)
    if (!line.startsWith('//') && !line.startsWith('/*') && !inDocComment) {
      codeLines++;
    }
  }
  
  // Calcul du score basé sur:
  // 1. Ratio de fonctions documentées
  // 2. Ratio de commentaires par rapport au code
  let score = 100;
  
  if (functionCount > 0) {
    const documentationRatio = documentedFunctions / functionCount;
    score = Math.round(documentationRatio * 100);
  }
  
  // Ajuste le score en fonction de la densité de commentaires
  if (codeLines > 0) {
    const commentDensity = docCommentLines / codeLines;
    if (commentDensity < 0.1) {
      score = Math.max(score - 30, 0); // Pénalise fortement le manque de commentaires
    } else if (commentDensity < 0.2) {
      score = Math.max(score - 15, 0); // Pénalise légèrement
    }
  }
  
  return score;
}

/**
 * Obtient une évaluation textuelle d'un score numérique
 * 
 * @param score Score numérique
 * @param metricType Type de métrique
 * @returns Évaluation textuelle (Excellent, Bon, Moyen, Faible, Critique)
 */
export function getScoreRating(score: number, metricType?: MetricType): string {
  let thresholds = { good: 80, acceptable: 60, poor: 40 };
  
  if (metricType && METRIC_THRESHOLDS[metricType]) {
    thresholds = METRIC_THRESHOLDS[metricType];
  }
  
  if (score >= 90) return 'Excellent';
  if (score >= thresholds.good) return 'Bon';
  if (score >= thresholds.acceptable) return 'Moyen';
  if (score >= thresholds.poor) return 'Faible';
  return 'Critique';
}

/**
 * Génère un résumé textuel des métriques
 * 
 * @param metricScores Scores par métrique
 * @returns Résumé textuel des points forts et axes d'amélioration
 */
export function generateMetricsSummary(metricScores: Partial<Record<MetricType, number>>): string {
  const sortedMetrics = Object.entries(metricScores)
    .filter(([_, score]) => score !== undefined)
    .sort((a, b) => b[1] - a[1]);
  
  let summary = '';
  
  // Points forts (top 2)
  const strengths = sortedMetrics.slice(0, 2);
  if (strengths.length > 0) {
    summary += 'Points forts:\n';
    strengths.forEach(([metric, score]) => {
      summary += `- ${formatMetricName(metric as MetricType)}: ${score} (${getScoreRating(score, metric as MetricType)})\n`;
    });
  }
  
  // Points faibles (derniers 2)
  const weaknesses = sortedMetrics.slice(-2).filter(([_, score]) => score < 70);
  if (weaknesses.length > 0) {
    summary += '\nAxes d\'amélioration:\n';
    weaknesses.forEach(([metric, score]) => {
      summary += `- ${formatMetricName(metric as MetricType)}: ${score} (${getScoreRating(score, metric as MetricType)})\n`;
    });
  }
  
  return summary;
}

/**
 * Formate le nom d'une métrique pour l'affichage
 * 
 * @param metric Type de métrique
 * @returns Nom formaté pour l'affichage
 */
function formatMetricName(metric: MetricType): string {
  const names: Record<MetricType, string> = {
    security: 'Sécurité',
    performance: 'Performance',
    maintainability: 'Maintenabilité',
    complexity: 'Complexité',
    documentation: 'Documentation',
    typescript: 'Utilisation TypeScript',
    duplication: 'Non-duplication',
    dependencies: 'Gestion des dépendances',
    tests: 'Tests'
  };
  
  return names[metric] || metric;
}

export default {
  calculateMetrics,
  calculateOverallScore,
  getScoreRating,
  generateMetricsSummary
};