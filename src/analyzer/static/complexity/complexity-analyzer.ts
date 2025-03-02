/**
 * Analyseur de complexité de code
 * 
 * Calcule et analyse diverses métriques de complexité pour identifier
 * les zones de code trop complexes ou difficiles à maintenir.
 * 
 * @module analyzer/static/complexity
 */

import * as ts from 'typescript';
import { v4 as uuidv4 } from 'uuid';
import { CodeAnalyzer } from '../../core/types';
import { CodeIssue, MetricType, SeverityLevel } from '../../types';
import { parseFile, getNodeLocation, isFunction, getNodeName } from '../ast/ast-utils';

/**
 * Seuils pour les différentes métriques de complexité
 */
interface ComplexityThresholds {
  cyclomatic: {
    warning: number;
    error: number;
  };
  cognitive: {
    warning: number;
    error: number;
  };
  halstead: {
    warning: number;
    error: number;
  };
  nestingLevel: {
    warning: number;
    error: number;
  };
  parameterCount: {
    warning: number;
    error: number;
  };
  functionLength: {
    warning: number;
    error: number;
  };
}

/**
 * Seuils par défaut pour les métriques de complexité
 */
const DEFAULT_THRESHOLDS: ComplexityThresholds = {
  cyclomatic: {
    warning: 10,
    error: 20
  },
  cognitive: {
    warning: 15,
    error: 30
  },
  halstead: {
    warning: 30,
    error: 50
  },
  nestingLevel: {
    warning: 3,
    error: 5
  },
  parameterCount: {
    warning: 5,
    error: 8
  },
  functionLength: {
    warning: 50,
    error: 100
  }
};

/**
 * Analyseur de complexité qui détecte les fonctions et méthodes trop complexes
 */
export class ComplexityAnalyzer implements CodeAnalyzer {
  id = 'complexity-analyzer';
  name = 'Analyseur de Complexité';
  description = 'Analyse la complexité du code pour identifier les zones difficiles à comprendre et maintenir';
  metricType: MetricType = 'complexity';
  
  private thresholds: ComplexityThresholds;
  
  constructor(thresholds: Partial<ComplexityThresholds> = {}) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds
    };
  }
  
  /**
   * Initialise l'analyseur de complexité
   */
  async initialize(): Promise<void> {
    // Pas de préparation spécifique requise
  }

  /**
   * Analyse la complexité d'un fichier
   * @param filePath Chemin du fichier
   * @param fileContent Contenu du fichier
   * @returns Liste des problèmes de complexité détectés
   */
  async analyzeFile(filePath: string, fileContent: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    try {
      // Parse le fichier
      const sourceFile = parseFile(fileContent, filePath);
      
      // Analyse la complexité des fonctions
      this.analyzeFunctions(sourceFile, filePath, issues);
      
      // Analyse la complexité globale du fichier
      this.analyzeFileComplexity(sourceFile, filePath, issues);
    }
    catch (error) {
      console.error(`Error in complexity analysis for file ${filePath}:`, error);
      issues.push({
        id: uuidv4(),
        title: 'Erreur d\'analyse de complexité',
        description: `Une erreur s'est produite lors de l'analyse de complexité: ${error.message}`,
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
    // Pas de ressources à nettoyer
  }

  /**
   * Analyse la complexité de toutes les fonctions dans un fichier
   */
  private analyzeFunctions(sourceFile: ts.SourceFile, filePath: string, issues: CodeIssue[]): void {
    const visitNode = (node: ts.Node) => {
      // Analyse uniquement les nœuds de type fonction
      if (isFunction(node)) {
        const functionName = getNodeName(node) || '<anonymous>';
        
        // Calcule les différentes métriques de complexité
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
        const cognitiveComplexity = this.calculateCognitiveComplexity(node);
        const nestingLevel = this.calculateMaxNestingLevel(node);
        const parameterCount = (node as ts.FunctionLikeDeclaration).parameters.length;
        const functionLength = this.calculateFunctionLength(node, sourceFile);
        
        // Vérifie si les seuils sont dépassés
        this.checkComplexityThreshold(
          cyclomaticComplexity,
          'cyclomatic',
          `Complexité cyclomatique élevée dans la fonction '${functionName}'`,
          `La fonction a une complexité cyclomatique de ${cyclomaticComplexity}, ce qui la rend difficile à tester et maintenir.`,
          node, sourceFile, filePath, issues,
          [`Décomposer la fonction en fonctions plus petites`, `Simplifier les conditions`]
        );
        
        this.checkComplexityThreshold(
          cognitiveComplexity,
          'cognitive',
          `Complexité cognitive élevée dans la fonction '${functionName}'`,
          `La fonction a une complexité cognitive de ${cognitiveComplexity}, ce qui la rend difficile à comprendre.`,
          node, sourceFile, filePath, issues,
          [`Extraire les blocs logiques en fonctions nommées`, `Réduire l'imbrication des structures de contrôle`]
        );
        
        this.checkComplexityThreshold(
          nestingLevel,
          'nestingLevel',
          `Niveau d'imbrication excessif dans la fonction '${functionName}'`,
          `La fonction contient ${nestingLevel} niveaux d'imbrication, ce qui réduit la lisibilité.`,
          node, sourceFile, filePath, issues,
          [`Extraire les blocs imbriqués en fonctions séparées`, `Utiliser des retours anticipés pour réduire l'imbrication`]
        );
        
        this.checkComplexityThreshold(
          parameterCount,
          'parameterCount',
          `Nombre de paramètres excessif dans la fonction '${functionName}'`,
          `La fonction a ${parameterCount} paramètres, ce qui complique son utilisation et sa maintenance.`,
          node, sourceFile, filePath, issues,
          [`Grouper les paramètres reliés dans des objets`, `Diviser la fonction en fonctions plus spécifiques`]
        );
        
        this.checkComplexityThreshold(
          functionLength,
          'functionLength',
          `Fonction trop longue '${functionName}'`,
          `La fonction fait ${functionLength} lignes, ce qui complique sa compréhension et maintenance.`,
          node, sourceFile, filePath, issues,
          [`Décomposer en fonctions plus petites`, `Extraire les fonctionnalités réutilisables`]
        );
      }
      
      // Continue l'analyse récursivement sur tous les enfants
      ts.forEachChild(node, visitNode);
    };
    
    // Commence la visite à partir de la racine
    visitNode(sourceFile);
  }

  /**
   * Analyse la complexité globale du fichier
   */
  private analyzeFileComplexity(sourceFile: ts.SourceFile, filePath: string, issues: CodeIssue[]): void {
    // Compte le nombre de fonctions et classes
    let functionCount = 0;
    let classCount = 0;
    
    const visitNode = (node: ts.Node) => {
      if (isFunction(node)) {
        functionCount++;
      } else if (ts.isClassDeclaration(node)) {
        classCount++;
      }
      
      ts.forEachChild(node, visitNode);
    };
    
    visitNode(sourceFile);
    
    const fileName = filePath.split('/').pop() || filePath;
    const lineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
    
    // Vérifie si le fichier est trop long
    if (lineCount > 500) {
      issues.push({
        id: uuidv4(),
        title: 'Fichier trop volumineux',
        description: `Le fichier ${fileName} fait ${lineCount} lignes, ce qui peut indiquer qu'il contient trop de responsabilités.`,
        location: { filePath, line: 1, column: 1 },
        severity: lineCount > 1000 ? SeverityLevel.Error : SeverityLevel.Warning,
        metricType: this.metricType,
        suggestions: [
          'Diviser le fichier en modules plus petits avec des responsabilités spécifiques',
          'Extraire des classes ou fonctions vers des fichiers dédiés'
        ]
      });
    }
    
    // Vérifie si le fichier contient trop de fonctions
    if (functionCount > 20) {
      issues.push({
        id: uuidv4(),
        title: 'Trop de fonctions',
        description: `Le fichier ${fileName} contient ${functionCount} fonctions, ce qui peut rendre sa compréhension difficile.`,
        location: { filePath, line: 1, column: 1 },
        severity: functionCount > 30 ? SeverityLevel.Error : SeverityLevel.Warning,
        metricType: this.metricType,
        suggestions: [
          'Regrouper les fonctions reliées dans des fichiers séparés',
          'Créer des modules avec des responsabilités clairement définies'
        ]
      });
    }
    
    // Vérifie si le fichier contient trop de classes
    if (classCount > 3) {
      issues.push({
        id: uuidv4(),
        title: 'Trop de classes',
        description: `Le fichier ${fileName} contient ${classCount} classes, ce qui peut indiquer un manque de séparation des responsabilités.`,
        location: { filePath, line: 1, column: 1 },
        severity: classCount > 5 ? SeverityLevel.Error : SeverityLevel.Warning,
        metricType: this.metricType,
        suggestions: [
          'Déplacer chaque classe dans son propre fichier',
          'Revoir la conception pour assurer une meilleure cohésion'
        ]
      });
    }
  }

  /**
   * Compare une métrique de complexité à ses seuils et ajoute un problème si dépassé
   */
  private checkComplexityThreshold(
    value: number,
    metricType: keyof ComplexityThresholds,
    title: string,
    description: string,
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    issues: CodeIssue[],
    suggestions: string[] = []
  ): void {
    const thresholds = this.thresholds[metricType];
    let severity: SeverityLevel = SeverityLevel.Info;
    
    if (value >= thresholds.error) {
      severity = SeverityLevel.Error;
    } else if (value >= thresholds.warning) {
      severity = SeverityLevel.Warning;
    } else {
      // Pas de problème détecté
      return;
    }
    
    const location = getNodeLocation(node, sourceFile, filePath);
    
    issues.push({
      id: uuidv4(),
      title,
      description,
      location,
      severity,
      metricType: this.metricType,
      suggestions
    });
  }

  /**
   * Calcule la complexité cyclomatique d'une fonction
   * (nombre de chemins d'exécution indépendants à travers le code)
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    // Commence à 1 pour le chemin d'exécution de base
    let complexity = 1;
    
    const visit = (node: ts.Node) => {
      // Incrémente pour chaque branchement possible
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression: // ternary
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.QuestionQuestionToken: // ??
        case ts.SyntaxKind.BarBarToken: // ||
        case ts.SyntaxKind.AmpersandAmpersandToken: // &&
          complexity++;
          break;
      }
      
      // Visite les nœuds enfants mais s'arrête aux fonctions imbriquées
      if (!isFunction(node) || node === node) {
        ts.forEachChild(node, visit);
      }
    };
    
    visit(node);
    return complexity;
  }

  /**
   * Calcule la complexité cognitive d'une fonction
   * (mesure de l'effort mental nécessaire pour comprendre le code)
   */
  private calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;
    let nestingLevel = 0;
    
    const visit = (node: ts.Node) => {
      // Structures de contrôle de base
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
          complexity += 1 + nestingLevel; // +1 de base, +niveau d'imbrication
          nestingLevel++;
          break;
        
        case ts.SyntaxKind.CatchClause:
          complexity += 1 + nestingLevel;
          break;
        
        case ts.SyntaxKind.ConditionalExpression:
          complexity += 1 + nestingLevel;
          break;
        
        // Opérateurs logiques
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.QuestionQuestionToken:
          complexity += 1;
          break;
      }
      
      // Traitement récursif mais s'arrête aux fonctions imbriquées
      if (!isFunction(node) || node === node) {
        ts.forEachChild(node, visit);
      }
      
      // Diminue le niveau d'imbrication après avoir visité une structure de contrôle
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
          nestingLevel--;
          break;
      }
    };
    
    visit(node);
    return complexity;
  }

  /**
   * Calcule le niveau maximum d'imbrication dans une fonction
   */
  private calculateMaxNestingLevel(node: ts.Node): number {
    let maxLevel = 0;
    let currentLevel = 0;
    
    const visit = (node: ts.Node) => {
      // Incrémente le niveau pour chaque structure de contrôle
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
        case ts.SyntaxKind.TryStatement:
        case ts.SyntaxKind.Block:
          currentLevel++;
          maxLevel = Math.max(maxLevel, currentLevel);
          break;
      }
      
      // Visite récursivement mais s'arrête aux fonctions imbriquées
      if (!isFunction(node) || node === node) {
        ts.forEachChild(node, visit);
      }
      
      // Réduit le niveau après avoir visité la structure
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
        case ts.SyntaxKind.TryStatement:
        case ts.SyntaxKind.Block:
          currentLevel--;
          break;
      }
    };
    
    visit(node);
    return maxLevel;
  }

  /**
   * Calcule le nombre de lignes d'une fonction
   */
  private calculateFunctionLength(node: ts.Node, sourceFile: ts.SourceFile): number {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    
    const startLine = sourceFile.getLineAndCharacterOfPosition(start).line;
    const endLine = sourceFile.getLineAndCharacterOfPosition(end).line;
    
    return endLine - startLine + 1;
  }
}
