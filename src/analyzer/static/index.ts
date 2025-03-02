/**
 * Analyseurs statiques pour Bolt2bolt
 * 
 * Ce module fournit des analyseurs statiques de code qui examinent
 * le code source sans l'exécuter.
 * 
 * @module analyzer/static
 */

import { AnalysisOptions } from '../types';
import { CodeAnalyzer } from '../core/types';
import { AstAnalyzer } from './ast/ast-analyzer';
import { ComplexityAnalyzer } from './complexity/complexity-analyzer';
import { SecurityAnalyzer } from './security/security-analyzer';
import { PatternsAnalyzer } from './patterns/patterns-analyzer';

/**
 * Crée les instances d'analyseurs statiques en fonction des options
 * 
 * @param options Options de configuration pour l'analyse
 * @returns Liste des analyseurs statiques configurés
 */
export async function createStaticAnalyzers(
  options: AnalysisOptions
): Promise<CodeAnalyzer[]> {
  const analyzers: CodeAnalyzer[] = [];
  
  // AST Analyzer est toujours inclus car fondamental
  analyzers.push(new AstAnalyzer());
  
  // Ajoute les analyseurs selon les métriques demandées
  if (options.metrics.includes('complexity')) {
    analyzers.push(new ComplexityAnalyzer());
  }
  
  if (options.metrics.includes('security')) {
    analyzers.push(new SecurityAnalyzer(options.securityScanLevel));
  }
  
  if (options.metrics.includes('maintainability') || 
      options.metrics.includes('performance')) {
    analyzers.push(new PatternsAnalyzer(options.metrics));
  }
  
  return analyzers;
}

// Exports des sous-modules
export * from './ast';
export * from './complexity';
export * from './security';
export * from './patterns';
