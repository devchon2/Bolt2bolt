// #codebase: [CONTEXTE] Parser TypeScript pour le module d'analyse
// #codebase: [PATTERN:VISITOR] Utilise le pattern Visitor pour parcourir l'AST
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration de la couverture

/*
[COPILOT_PROMPTS]
# TypeScript Parser - Module d'Analyse

## Responsabilités
- Analyser le code TypeScript pour générer un AST
- Détecter les opportunités d'optimisation spécifiques à TypeScript
- Extraire les métriques de qualité et de complexité
- Fournir des informations précises sur la localisation des problèmes

## Architecture
- Utilise le compilateur TypeScript pour l'analyse
- Implémente l'interface IAnalyzer
- Visite récursivement l'AST pour identifier des patterns
[COPILOT_PROMPTS]
*/

import * as ts from 'typescript';
import { IAnalyzer } from '../analyzer';
import { AnalysisOptions, AnalysisResult } from '../types/analyzer';
import { Logger } from '../lib/logger';

/**
 * Analyseur de code TypeScript
 */
export class TypeScriptParser implements IAnalyzer {
  supportedExtensions = ['.ts', '.tsx'];
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('TypeScriptParser');
  }
  
  /**
   * Analyse du code TypeScript
   */
  public async analyze(code: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    this.logger.debug('Starting TypeScript code analysis');
    
    try {
      // Créer un fichier source pour le compilateur TypeScript
      const sourceFile = ts.createSourceFile(
        options.filePath || 'anonymous.ts',
        code,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Obtenir l'AST complet si demandé
      const ast = options.parseAST ? sourceFile : undefined;
      
      // Extraire les métriques de base
      const metrics = this.extractMetrics(sourceFile);
      
      // Analyser l'AST pour détecter les opportunités d'optimisation
      const opportunities = this.detectOpportunities(sourceFile, options);
      
      this.logger.info(`Analysis complete: Found ${opportunities.length} optimization opportunities`);
      
      return {
        success: true,
        opportunities,
        metadata: {
          ...metrics,
          language: 'typescript',
          version: ts.version
        },
        ast
      };
    } catch (error) {
      this.logger.error('Error analyzing TypeScript code', error);
      return {
        success: false,
        error: `TypeScript analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        opportunities: []
      };
    }
  }
  
  /**
   * Extrait les métriques de base du code
   */
  private extractMetrics(sourceFile: ts.SourceFile): Record<string, any> {
    // Compter les lignes de code (non vides)
    const lines = sourceFile.text.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
    
    // Déterminer la complexité (simplifiée)
    const complexity = this.calculateComplexity(sourceFile);
    
    // Extraire les dépendances importées
    const dependencies = this.extractDependencies(sourceFile);
    
    return {
      lines: lines.length,
      nonEmptyLines,
      complexity,
      dependencies
    };
  }
  
  /**
   * Calcule la complexité cyclomatique du code (simplifiée)
   */
  private calculateComplexity(sourceFile: ts.SourceFile): number {
    let complexity = 1; // Démarrer à 1 (base)
    
    // Fonction récursive pour visiter l'AST
    function visit(node: ts.Node) {
      // Augmenter la complexité pour les structures de contrôle
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression: // opérateur ternaire
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause: // switch case
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.BinaryExpression:
          // Vérifier si c'est un && ou ||
          if (node.kind === ts.SyntaxKind.BinaryExpression) {
            const binExpr = node as ts.BinaryExpression;
            if (
              binExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || 
              binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
            ) {
              complexity++;
            }
          } else {
            complexity++;
          }
          break;
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return complexity;
  }
  
  /**
   * Extrait les dépendances importées par le module
   */
  private extractDependencies(sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];
    
    ts.forEachChild(sourceFile, node => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          dependencies.push(moduleSpecifier.text);
        }
      }
    });
    
    return dependencies;
  }
  
  /**
   * Détecte les opportunités d'optimisation dans le code
   */
  private detectOpportunities(
    sourceFile: ts.SourceFile,
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
    
    // Filtre de confiance minimal
    const confidenceThreshold = options.confidenceThreshold || 0.5;
    
    // Fonction d'aide pour obtenir les informations de position
    const getNodePosition = (node: ts.Node) => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return {
        file: options.filePath || 'anonymous.ts',
        line: line + 1, // Convertir en indexation à partir de 1
        column: character + 1
      };
    };
    
    // Fonction d'aide pour obtenir un snippet de code
    const getCodeSnippet = (node: ts.Node): string => {
      return sourceFile.text.substring(node.getStart(), node.getEnd());
    };
    
    // Fonction récursive pour visiter l'AST
    function visit(node: ts.Node) {
      // 1. Détecter les boucles imbriquées (problème de performance)
      if (
        ts.isForStatement(node) || 
        ts.isForOfStatement(node) || 
        ts.isForInStatement(node) ||
        ts.isWhileStatement(node)
      ) {
        ts.forEachChild(node, childNode => {
          if (
            ts.isForStatement(childNode) || 
            ts.isForOfStatement(childNode) || 
            ts.isForInStatement(childNode) ||
            ts.isWhileStatement(childNode)
          ) {
            opportunities.push({
              type: 'nested-loops',
              location: getNodePosition(childNode),
              description: 'Nested loops detected. Consider refactoring to improve performance.',
              severity: 'medium',
              confidence: 0.9,
              codeSnippet: getCodeSnippet(node),
              suggestion: 'Consider using a map/reduce approach or extracting the inner loop to a separate function.'
            });
          }
        });
      }
      
      // 2. Détecter les fonctions trop longues
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const nodeText = getCodeSnippet(node);
        const lineCount = nodeText.split('\n').length;
        
        if (lineCount > 50) {
          opportunities.push({
            type: 'long-function',
            location: getNodePosition(node),
            description: `Function is too long (${lineCount} lines). Consider refactoring.`,
            severity: 'medium',
            confidence: 0.7,
            codeSnippet: nodeText.length > 200 ? nodeText.substring(0, 200) + '...' : nodeText,
            suggestion: 'Break down the function into smaller, more focused functions.'
          });
        }
      }
      
      // 3. Détecter les any types (problème de type)
      if (
        ts.isTypeReferenceNode(node) && 
        ts.isIdentifier(node.typeName) && 
        node.typeName.text === 'any'
      ) {
        opportunities.push({
          type: 'any-type',
          location: getNodePosition(node),
          description: 'Usage of `any` type detected. Consider using a more specific type.',
          severity: 'low',
          confidence: 0.8,
          codeSnippet: getCodeSnippet(node),
          suggestion: 'Replace with a more specific type or use `unknown` if the type is truly not known.'
        });
      }
      
      // Poursuivre la visite pour les autres nœuds
      ts.forEachChild(node, visit);
    }
    
    // Démarrer la visite récursive
    visit(sourceFile);
    
    // Filtrer selon le seuil de confiance
    return opportunities.filter(opp => opp.confidence >= confidenceThreshold);
  }
}

export default TypeScriptParser;
