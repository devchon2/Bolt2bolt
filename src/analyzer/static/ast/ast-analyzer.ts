/**
 * Analyseur AST (Abstract Syntax Tree)
 * 
 * Utilise le compilateur TypeScript pour analyser la structure du code
 * et fournir une représentation arborescente aux autres analyseurs.
 * 
 * @module analyzer/static/ast
 */

import * as ts from 'typescript';
import { v4 as uuidv4 } from 'uuid';
import { CodeAnalyzer } from '../../core/types';
import { CodeIssue, MetricType, SeverityLevel, CodeLocation } from '../../types';
import { createProgram, getNodeLocation, parseFile } from './ast-utils';

/**
 * Analyseur fondamental qui fournit l'AST TypeScript
 */
export class AstAnalyzer implements CodeAnalyzer {
  id = 'ast-analyzer';
  name = 'Analyseur AST TypeScript';
  description = 'Analyse la structure syntaxique du code à travers l\'AST TypeScript';
  metricType: MetricType = 'typescript';
  
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.React,
    allowJs: true,
    checkJs: true,
    strict: true
  };

  /**
   * Initialise l'analyseur AST
   */
  async initialize(): Promise<void> {
    // L'initialisation complète se fait au moment de l'analyse
    // car nous avons besoin des fichiers spécifiques
  }

  /**
   * Analyse le contenu d'un fichier
   * @param filePath Chemin du fichier
   * @param fileContent Contenu du fichier
   * @returns Liste des problèmes détectés
   */
  async analyzeFile(filePath: string, fileContent: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    try {
      // Parse le fichier
      const sourceFile = parseFile(fileContent, filePath);
      
      // Vérifie les erreurs syntaxiques de base
      const syntaxErrors = this.findSyntaxErrors(sourceFile, filePath);
      issues.push(...syntaxErrors);
      
      // Vérifie les problèmes de typage si on a un programme complet
      if (!this.program) {
        this.program = createProgram([filePath], this.compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
      }
      
      if (this.typeChecker) {
        const typeErrors = this.findTypeErrors(filePath);
        issues.push(...typeErrors);
      }
      
      // Vérifie les constructions TypeScript problématiques
      const astIssues = this.analyzeAstStructure(sourceFile, filePath);
      issues.push(...astIssues);
    }
    catch (error) {
      console.error(`Error in AST analysis for file ${filePath}:`, error);
      issues.push({
        id: uuidv4(),
        title: 'Erreur d\'analyse AST',
        description: `Une erreur s'est produite lors de l'analyse AST: ${error.message}`,
        location: { filePath, line: 1, column: 1 },
        severity: SeverityLevel.Error,
        metricType: this.metricType
      });
    }
    
    return issues;
  }

  /**
   * Nettoie les ressources utilisées par l'analyseur
   */
  async cleanup(): Promise<void> {
    this.program = null;
    this.typeChecker = null;
  }

  /**
   * Détecte les erreurs de syntaxe dans un fichier source
   */
  private findSyntaxErrors(sourceFile: ts.SourceFile, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Vérifie les erreurs de syntaxe
    const syntacticDiagnostics = ts.getSyntacticDiagnostics(sourceFile);
    
    for (const diagnostic of syntacticDiagnostics) {
      const location = this.getDiagnosticLocation(diagnostic, filePath);
      
      issues.push({
        id: uuidv4(),
        title: 'Erreur de syntaxe',
        description: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        location,
        severity: SeverityLevel.Error,
        metricType: this.metricType
      });
    }
    
    return issues;
  }

  /**
   * Détecte les erreurs de typage dans un fichier
   */
  private findTypeErrors(filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    if (!this.program) {
      return issues;
    }
    
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return issues;
    }
    
    // Vérifie les erreurs semantiques (typage)
    const semanticDiagnostics = ts.getSemanticDiagnostics(sourceFile, this.program);
    
    for (const diagnostic of semanticDiagnostics) {
      const location = this.getDiagnosticLocation(diagnostic, filePath);
      
      issues.push({
        id: uuidv4(),
        title: 'Erreur de typage',
        description: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        location,
        severity: SeverityLevel.Warning,
        metricType: this.metricType
      });
    }
    
    return issues;
  }

  /**
   * Convertit un diagnostic TypeScript en localisation de code
   */
  private getDiagnosticLocation(diagnostic: ts.Diagnostic, filePath: string): CodeLocation {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      
      let endLine: number | undefined;
      let endColumn: number | undefined;
      
      if (diagnostic.length !== undefined) {
        const endPos = diagnostic.start + diagnostic.length;
        const endLineChar = diagnostic.file.getLineAndCharacterOfPosition(endPos);
        endLine = endLineChar.line + 1;
        endColumn = endLineChar.character + 1;
      }
      
      return {
        filePath: diagnostic.file.fileName,
        line: line + 1,
        column: character + 1,
        endLine,
        endColumn
      };
    }
    
    return {
      filePath,
      line: 1,
      column: 1
    };
  }

  /**
   * Analyse la structure AST pour détecter des problèmes potentiels
   */
  private analyzeAstStructure(sourceFile: ts.SourceFile, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Visite l'AST pour analyser sa structure
    const visit = (node: ts.Node) => {
      // Vérifie l'utilisation de "any"
      if (node.kind === ts.SyntaxKind.AnyKeyword && node.parent && 
          (ts.isTypeReferenceNode(node.parent) || ts.isParameter(node.parent))) {
        const location = getNodeLocation(node, sourceFile, filePath);
        
        issues.push({
          id: uuidv4(),
          title: 'Utilisation du type "any"',
          description: 'Le type "any" désactive la vérification de type TypeScript. Utilisez un type plus précis ou "unknown" si le type est vraiment indéterminé.',
          location,
          severity: SeverityLevel.Warning,
          metricType: this.metricType,
          suggestions: ['Remplacer par un type spécifique', 'Utiliser "unknown" au lieu de "any"']
        });
      }
      
      // Vérifie l'utilisation de @ts-ignore ou @ts-nocheck
      if (ts.isCommentContainingNode(node)) {
        const commentText = node.getText();
        if (commentText.includes('@ts-ignore') || commentText.includes('@ts-nocheck')) {
          const location = getNodeLocation(node, sourceFile, filePath);
          
          issues.push({
            id: uuidv4(),
            title: 'Suppression des vérifications TypeScript',
            description: 'Les directives @ts-ignore ou @ts-nocheck désactivent la vérification de type. Essayez plutôt de résoudre les erreurs de typage.',
            location,
            severity: SeverityLevel.Warning,
            metricType: this.metricType
          });
        }
      }
      
      // Analyse les noeuds enfants
      ts.forEachChild(node, visit);
    };
    
    // Visite l'arbre complet
    visit(sourceFile);
    
    return issues;
  }
}
