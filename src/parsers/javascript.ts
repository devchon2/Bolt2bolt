// #codebase: [CONTEXTE] Parser JavaScript pour le module d'analyse
// #codebase: [PATTERN:VISITOR] Utilise le pattern Visitor pour parcourir l'AST
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration de la couverture

/*
[COPILOT_PROMPTS]
# JavaScript Parser - Module d'Analyse

## Responsabilités
- Analyser le code JavaScript pour générer un AST
- Détecter les opportunités d'optimisation spécifiques à JavaScript
- Extraire les métriques de qualité et de complexité
- Fournir des informations précises sur la localisation des problèmes

## Architecture
- Utilise Acorn ou le compilateur TypeScript pour l'analyse
- Implémente l'interface IAnalyzer
- Visite récursivement l'AST pour identifier des patterns
[COPILOT_PROMPTS]
*/

import * as acorn from 'acorn';
import { walk } from 'acorn-walk';
import { IAnalyzer } from '../analyzer';
import { AnalysisOptions, AnalysisResult } from '../types/analyzer';
import { Logger } from '../lib/logger';

/**
 * Analyseur de code JavaScript
 */
export class JavaScriptParser implements IAnalyzer {
  supportedExtensions = ['.js', '.jsx'];
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('JavaScriptParser');
  }
  
  /**
   * Analyse du code JavaScript
   */
  public async analyze(code: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    this.logger.debug('Starting JavaScript code analysis');
    
    try {
      // Analyser le code avec Acorn pour obtenir l'AST
      const ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true
      });
      
      // Extraire les métriques de base
      const metrics = this.extractMetrics(code, ast);
      
      // Détecter les opportunités d'optimisation
      const opportunities = this.detectOpportunities(code, ast, options);
      
      this.logger.info(`Analysis complete: Found ${opportunities.length} optimization opportunities`);
      
      return {
        success: true,
        opportunities,
        metadata: {
          ...metrics,
          language: 'javascript'
        },
        ast: options.parseAST ? ast : undefined
      };
    } catch (error) {
      this.logger.error('Error analyzing JavaScript code', error);
      return {
        success: false,
        error: `JavaScript analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        opportunities: []
      };
    }
  }
  
  /**
   * Extrait les métriques de base du code
   */
  private extractMetrics(code: string, ast: any): Record<string, any> {
    // Compter les lignes de code (non vides)
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
    
    // Calculer la complexité (simplifiée)
    const complexity = this.calculateComplexity(ast);
    
    // Extraire les dépendances
    const dependencies = this.extractDependencies(ast);
    
    return {
      lines: lines.length,
      nonEmptyLines,
      complexity,
      dependencies
    };
  }
  
  /**
   * Calcule la complexité cyclomatique (simplifiée)
   */
  private calculateComplexity(ast: any): number {
    let complexity = 1; // Démarrer à 1 (base)
    
    walk.simple(ast, {
      IfStatement() {
        complexity++;
      },
      ConditionalExpression() {
        complexity++;
      },
      ForStatement() {
        complexity++;
      },
      ForInStatement() {
        complexity++;
      },
      ForOfStatement() {
        complexity++;
      },
      WhileStatement() {
        complexity++;
      },
      DoWhileStatement() {
        complexity++;
      },
      SwitchCase() {
        complexity++;
      },
      CatchClause() {
        complexity++;
      },
      LogicalExpression(node) {
        if (node.operator === '&&' || node.operator === '||') {
          complexity++;
        }
      }
    });
    
    return complexity;
  }
  
  /**
   * Extrait les dépendances importées
   */
  private extractDependencies(ast: any): string[] {
    const dependencies: string[] = [];
    
    walk.simple(ast, {
      ImportDeclaration(node) {
        if (node.source && node.source.value) {
          dependencies.push(node.source.value);
        }
      },
      CallExpression(node) {
        // Détecter require('module')
        if (
          node.callee.type === 'Identifier' && 
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          dependencies.push(node.arguments[0].value);
        }
      }
    });
    
    return dependencies;
  }
  
  /**
   * Détecte les opportunités d'optimisation dans le code
   */
  private detectOpportunities(
    code: string,
    ast: any,
    options: AnalysisOptions
  ): Array<{
    type: string;
    location: { file: string; line: number; column: number };
    description: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    codeSnippet?: string;
    suggestion?: string;
  }> {
    const opportunities: Array<{
      type: string;
      location: { file: string; line: number; column: number };
      description: string;
      severity: 'low' | 'medium' | 'high';
      confidence: number;
      codeSnippet?: string;
      suggestion?: string;
    }> = [];
    
    const confidenceThreshold = options.confidenceThreshold || 0.5;
    const filePath = options.filePath || 'anonymous.js';
    
    // Fonction d'aide pour obtenir un snippet de code
    const getCodeSnippet = (start: number, end: number): string => {
      return code.substring(start, end);
    };
    
    // Détecter les problèmes courants
    walk.ancestor(ast, {
      // 1. Détecter les boucles imbriquées (problème de performance)
      ForStatement(node, ancestors) {
        const parent = ancestors[ancestors.length - 2];
        if (
          parent && 
          (parent.type === 'ForStatement' || 
           parent.type === 'ForInStatement' || 
           parent.type === 'ForOfStatement' ||
           parent.type === 'WhileStatement')
        ) {
          opportunities.push({
            type: 'nested-loops',
            location: {
              file: filePath,
              line: node.loc.start.line,
              column: node.loc.start.column + 1
            },
            description: 'Nested loops detected. Consider refactoring to improve performance.',
            severity: 'medium',
            confidence: 0.9,
            codeSnippet: getCodeSnippet(node.start, node.end),
            suggestion: 'Consider using a map/reduce approach or extracting the inner loop to a separate function.'
          });
        }
      },
      
      // 2. Détecter les fonctions trop longues
      FunctionDeclaration(node) {
        if (node.body && node.body.end - node.body.start > 500) {
          opportunities.push({
            type: 'long-function',
            location: {
              file: filePath,
              line: node.loc.start.line,
              column: node.loc.start.column + 1
            },
            description: 'Function is too long. Consider refactoring.',
            severity: 'medium',
            confidence: 0.7,
            codeSnippet: getCodeSnippet(node.start, Math.min(node.start + 200, node.end)) + '...',
            suggestion: 'Break down the function into smaller, more focused functions.'
          });
        }
      },
      
      // 3. Détecter les variables non utilisées (simplifiée)
      VariableDeclarator(node, ancestors) {
        // Cette détection simple est imprécise et nécessiterait une analyse plus approfondie
        // dans un parseur réel, donc elle est laissée en tant qu'exemple.
        if (node.id && node.id.type === 'Identifier' && node.id.name === '_unused') {
          opportunities.push({
            type: 'unused-variable',
            location: {
              file: filePath,
              line: node.loc.start.line,
              column: node.loc.start.column + 1
            },
            description: `Variable '${node.id.name}' might be unused.`,
            severity: 'low',
            confidence: 0.6,
            codeSnippet: getCodeSnippet(node.start, node.end),
            suggestion: `If '${node.id.name}' is truly unused, remove it or prefix with an underscore.`
          });
        }
      },
      
      // 4. Détecter les constructions async/await inefficaces
      AwaitExpression(node, ancestors) {
        const parent = ancestors[ancestors.length - 2];
        if (parent && parent.type === 'ForOfStatement') {
          opportunities.push({
            type: 'sequential-await',
            location: {
              file: filePath,
              line: node.loc.start.line,
              column: node.loc.start.column + 1
            },
            description: 'Sequential await in loop detected. Consider using Promise.all for parallel execution.',
            severity: 'high',
            confidence: 0.8,
            codeSnippet: getCodeSnippet(parent.start, parent.end),
            suggestion: 'Use Promise.all to run promises in parallel instead of awaiting each one sequentially in a loop.'
          });
        }
      },
      
      // 5. Détecter les gros objets littéraux (problème de lisibilité)
      ObjectExpression(node) {
        if (node.properties.length > 10) {
          opportunities.push({
            type: 'large-object-literal',
            location: {
              file: filePath,
              line: node.loc.start.line,
              column: node.loc.start.column + 1
            },
            description: `Large object literal with ${node.properties.length} properties. Consider refactoring.`,
            severity: 'low',
            confidence: 0.7,
            codeSnippet: getCodeSnippet(node.start, Math.min(node.start + 200, node.end)) + '...',
            suggestion: 'Break down into smaller objects or use a factory function/class.'
          });
        }
      }
    });
    
    // Filtrer selon le seuil de confiance
    return opportunities.filter(opp => opp.confidence >= confidenceThreshold);
  }
}

export default JavaScriptParser;