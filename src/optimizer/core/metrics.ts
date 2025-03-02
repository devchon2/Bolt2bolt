/**
 * Système de métriques pour l'optimiseur de code
 * 
 * Calcule les scores d'amélioration suite aux optimisations.
 * 
 * @module optimizer/core/metrics
 */

import { AppliedTransformation } from '../types';

/**
 * Calcule les scores d'amélioration entre le code original et optimisé
 * 
 * @param originalCode Code source original
 * @param optimizedCode Code optimisé
 * @param transformations Transformations appliquées
 * @returns Scores d'amélioration par métrique
 */
export function calculateImprovementScores(
  originalCode: string,
  optimizedCode: string,
  transformations: AppliedTransformation[]
): Record<string, number> {
  // Initialisation des scores
  const scores: Record<string, number> = {};
  
  // Agrège les métriques à partir des transformations appliquées
  const metricTypes = new Set<string>();
  for (const transformation of transformations) {
    metricTypes.add(transformation.transformation.type);
  }
  
  // Pour chaque type de métrique, calcule un score d'amélioration
  metricTypes.forEach(metricType => {
    // Calcul spécifique par type de métrique
    switch (metricType) {
      case 'security':
        scores[metricType] = calculateSecurityImprovement(originalCode, optimizedCode, transformations);
        break;
      case 'performance':
        scores[metricType] = calculatePerformanceImprovement(originalCode, optimizedCode, transformations);
        break;
      case 'complexity':
        scores[metricType] = calculateComplexityImprovement(originalCode, optimizedCode, transformations);
        break;
      case 'maintainability':
        scores[metricType] = calculateMaintainabilityImprovement(originalCode, optimizedCode, transformations);
        break;
      default:
        // Pour les autres métriques, utilise une méthode générique
        scores[metricType] = calculateGenericImprovement(originalCode, optimizedCode, transformations);
        break;
    }
  });
  
  return scores;
}

/**
 * Calcule l'amélioration de sécurité
 */
function calculateSecurityImprovement(
  originalCode: string,
  optimizedCode: string,
  transformations: AppliedTransformation[]
): number {
  // Filtre les transformations liées à la sécurité
  const securityTransformations = transformations.filter(
    t => t.transformation.type === 'security'
  );
  
  if (securityTransformations.length === 0) {
    return 0;
  }
  
  // Base le score sur l'impact des transformations et leur sévérité
  let totalImpact = 0;
  for (const transformation of securityTransformations) {
    // L'impact est plus élevé pour les problèmes critiques
    const severityMultiplier = 
      transformation.transformation.severity === 'critical' ? 2.0 :
      transformation.transformation.severity === 'error' ? 1.5 :
      transformation.transformation.severity === 'warning' ? 1.0 : 0.5;
    
    totalImpact += transformation.transformation.impact * severityMultiplier;
  }
  
  // Normalise le score entre 0 et 10
  return Math.min(10, totalImpact);
}

/**
 * Calcule l'amélioration de performance
 */
function calculatePerformanceImprovement(
  originalCode: string,
  optimizedCode: string,
  transformations: AppliedTransformation[]
): number {
  // Filtre les transformations liées à la performance
  const performanceTransformations = transformations.filter(
    t => t.transformation.type === 'performance'
  );
  
  if (performanceTransformations.length === 0) {
    return 0;
  }
  
  // Pour une évaluation plus précise, il faudrait mesurer réellement la performance
  // Ici, nous utilisons une approximation basée sur les transformations
  let totalImpact = 0;
  for (const transformation of performanceTransformations) {
    totalImpact += transformation.transformation.impact;
  }
  
  // Normalise le score entre 0 et 10
  return Math.min(10, totalImpact * 0.8); // Un peu plus conservateur pour la performance
}

/**
 * Calcule l'amélioration de complexité
 */
function calculateComplexityImprovement(
  originalCode: string,
  optimizedCode: string,
  transformations: AppliedTransformation[]
): number {
  // Filtre les transformations liées à la