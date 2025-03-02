// #codebase: [CONTEXTE] Analyseur central du système Bolt2bolt.
// #codebase: [PATTERN:STRATEGY] Utiliser ce pattern pour les différentes analyses.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et couverture.

/*
[COPILOT_PROMPTS]
# Analyseur de Code - Directives d'Implémentation

## Responsabilité
- Analyse statique et dynamique du code source
- Détection des problèmes et opportunités d'optimisation
- Génération de métadonnées pour l'optimiseur

## Points d'Extension
- Interface IAnalyzer pour créer des analyseurs spécialisés
- Système de règles personnalisables
- Pipeline configurable d'analyse

## Anti-patterns
- Éviter les analyses bloquantes
- Ne pas stocker l'AST complet en mémoire pour de grands projets
- Éviter les dépendances directes vers des implémentations concrètes
[COPILOT_PROMPTS]
*/

import * as ts from 'typescript';
import * as path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { CircularDependencyHandler } from '../../../utils/circular-dependency-handler';
import { handleCircularDependencies } from '../../../utils/circular-dependency-handler';
import { CoverageAnalysisStrategy } from "../../../tools/coverage-analysis-strategy";

/**
 * Interface pour les options d'analyse
 */
export interface AnalyzerOptions {
  projectOptions?: {
    tsConfigFilePath?: string;
    compilerOptions?: ts.CompilerOptions;
  };
  rules?: {
    complexity?: {
      maxCyclomaticComplexity?: number;
      maxCognitiveComplexity?: number;
    };
    patterns?: {
      detectCircularDependencies?: boolean;
      enforceNamingConventions?: boolean;
    };
    security?: {
      detectInsecurePatterns?: boolean;
      noEval?: boolean;
    };
  };
}

/**
 * Interface pour les résultats d'analyse
 */
export interface AnalysisResult {
  metrics: {
    complexity?: {
      average: number;
      max: number;
      hotspots: Array<{ file: string; line: number; complexity: number }>;
    };
    size?: {
      totalLines: number;
      codeLines: number;
      commentLines: number;
    };
  };
  patterns: {
    detected: Array<{ name: string; locations: Array<{ file: string; line: number }> }>;
    issues: Array<{ name: string; severity: string; locations: Array<{ file: string; line: number }> }>;
  };
  security: {
    issues: Array<{ name: string; severity: string; locations: Array<{ file: string; line: number }> }>;
  };
  dependencies: {
    circular: Array<{ cycle: string[]; severity: string }>;
    unused: string[];
  };
  suggestions: string[];
}

/**
 * Stratégie d'analyse de code
 */
export interface IAnalysisStrategy {
  analyze(sourceFile: SourceFile): { [key: string]: any };
}

/**
 * Classe principale d'analyse de code
 */
export class Analyzer {
  private project: Project;
  private options: AnalyzerOptions;
  private strategies: Map<string, IAnalysisStrategy> = new Map();
  private filesToAnalyze: Set<string> = new Set();
  private analyzeProgress: number = 0;
  private onProgressCallback?: (progress: number) => void;
  private circularDependencyHandler: CircularDependencyHandler;
  
  /**
   * Constructeur
   * @param options Options d'analyse
   */
  constructor(options: AnalyzerOptions = {}) {
    this.options = options;
    
    // Initialiser le projet ts-morph
    this.project = new Project({
      tsConfigFilePath: options.projectOptions?.tsConfigFilePath,
      compilerOptions: options.projectOptions?.compilerOptions,
    });
    this.circularDependencyHandler = new CircularDependencyHandler();
    this.registerStrategy('coverage', new CoverageAnalysisStrategy());
  }
  
  /**
   * Ajoute une stratégie d'analyse
   * @param name Nom de la stratégie
   * @param strategy Stratégie d'analyse
   */
  public registerStrategy(name: string, strategy: IAnalysisStrategy): void {
    this.strategies.set(name, strategy);
  }
  
  /**
   * Enregistre une fonction de rappel pour suivre la progression de l'analyse
   * @param callback Fonction appelée avec la progression (0-100)
   */
  public onProgress(callback: (progress: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Ajoute des fichiers spécifiques à analyser
   * @param filePaths Chemins des fichiers à analyser
   */
  public addFilesToAnalyze(filePaths: string[]): void {
    filePaths.forEach(file => this.filesToAnalyze.add(file));
  }

  /**
   * Analyse un fichier source spécifique
   * @param filePath Chemin du fichier à analyser
   */
  public async analyzeFile(filePath: string): Promise<Partial<AnalysisResult>> {
    console.log(`Analyzing single file: ${filePath}...`);
    
    // Ajouter le fichier au projet
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    
    // Résultats par défaut
    const result: AnalysisResult = {
      metrics: {
        complexity: {
          average: 0,
          max: 0,
          hotspots: []
        },
        size: {
          totalLines: 0,
          codeLines: 0,
          commentLines: 0
        }
      },
      patterns: {
        detected: [],
        issues: []
      },
      security: {
        issues: []
      },
      dependencies: {
        circular: [],
        unused: []
      },
      suggestions: []
    };
    
    // Analyser le fichier
    await this.analyzeSourceFile(sourceFile, result);
    
    // Vérifier les dépendances circulaires spécifiques à ce fichier
    if (this.options.rules?.patterns?.detectCircularDependencies) {
      this.detectCircularDependenciesForFile(sourceFile, result);
    }
    
    return result;
  }

  /**
   * Détecte les dépendances circulaires pour un fichier spécifique
   * @param sourceFile Fichier source à analyser
   * @param result Résultats cumulatifs
   */
  private detectCircularDependenciesForFile(sourceFile: SourceFile, result: AnalysisResult): void {
    const circularDependencies = this.circularDependencyHandler.detect(sourceFile);
    
    if (circularDependencies.length > 0) {
      result.dependencies = result.dependencies || { circular: [], unused: [] };
      result.dependencies.circular = circularDependencies.map(dep => ({
        cycle: [dep, sourceFile.getFilePath()],
        severity: 'major'
      }));
    }
  }

  /**
   * Exporte les résultats d'analyse au format JSON
   * @param result Résultats d'analyse
   * @param outputPath Chemin du fichier de sortie
   */
  public exportResults(result: AnalysisResult, outputPath: string): void {
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Analysis results exported to ${outputPath}`);
  }

  /**
   * Filtre les résultats d'analyse selon des critères
   * @param result Résultats d'analyse
   * @param filters Filtres à appliquer
   */
  public filterResults(
    result: AnalysisResult,
    filters: {
      minComplexity?: number;
      severityLevel?: string;
      filePatterns?: string[];
    }
  ): AnalysisResult {
    const filteredResult = { ...result };
    
    // Filtrer sur la complexité
    if (filters.minComplexity && filteredResult.metrics.complexity) {
      filteredResult.metrics.complexity.hotspots = filteredResult.metrics.complexity.hotspots.filter(
        spot => spot.complexity >= filters.minComplexity!
      );
    }
    
    // Filtrer sur le niveau de sévérité
    if (filters.severityLevel) {
      filteredResult.patterns.issues = filteredResult.patterns.issues.filter(
        issue => issue.severity === filters.severityLevel
      );
      
      filteredResult.security.issues = filteredResult.security.issues.filter(
        issue => issue.severity === filters.severityLevel
      );
    }
    
    // Filtrer sur les patterns de fichiers
    if (filters.filePatterns && filters.filePatterns.length > 0) {
      const matchesPattern = (filePath: string) => {
        return filters.filePatterns!.some(pattern => {
          // Transformer le pattern en expression régulière
          const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'));
          return regexPattern.test(filePath);
        });
      };
      
      if (filteredResult.metrics.complexity) {
        filteredResult.metrics.complexity.hotspots = filteredResult.metrics.complexity.hotspots.filter(
          spot => matchesPattern(spot.file)
        );
      }
      
      filteredResult.patterns.issues = filteredResult.patterns.issues.filter(
        issue => issue.locations.some(loc => matchesPattern(loc.file))
      );
      
      filteredResult.security.issues = filteredResult.security.issues.filter(
        issue => issue.locations.some(loc => matchesPattern(loc.file))
      );
    }
    
    return filteredResult;
  }

  /**
   * Analyse un projet à partir d'un chemin
   * @param sourcePath Chemin du projet à analyser
   */
  public async analyzeProject(sourcePath: string): Promise<AnalysisResult> {
    console.log(`Analyzing project at ${sourcePath}...`);
    
    // Ajouter les fichiers source au projet
    const globPatterns = [
      path.join(sourcePath, '**/*.ts'),
      path.join(sourcePath, '**/*.tsx'),
    ];
    
    this.project.addSourceFilesAtPaths(globPatterns);
    
    // Filtrer les fichiers à analyser si une liste spécifique a été fournie
    let sourceFiles = this.project.getSourceFiles();
    if (this.filesToAnalyze.size > 0) {
      sourceFiles = sourceFiles.filter(file => 
        this.filesToAnalyze.has(file.getFilePath())
      );
    }
    
    console.log(`Found ${sourceFiles.length} source files to analyze.`);
    
    // Résultats par défaut
    const result: AnalysisResult = {
      metrics: {
        complexity: {
          average: 0,
          max: 0,
          hotspots: []
        },
        size: {
          totalLines: 0,
          codeLines: 0,
          commentLines: 0
        }
      },
      patterns: {
        detected: [],
        issues: []
      },
      security: {
        issues: []
      },
      dependencies: {
        circular: [],
        unused: []
      },
      suggestions: []
    };
    
    // Analyser chaque fichier source avec suivi de progression
    let filesProcessed = 0;
    const totalFiles = sourceFiles.length;
    
    for (const sourceFile of sourceFiles) {
      await this.analyzeSourceFile(sourceFile, result);
      
      // Mise à jour de la progression
      filesProcessed++;
      const progress = Math.floor((filesProcessed / totalFiles) * 100);
      
      if (progress !== this.analyzeProgress) {
        this.analyzeProgress = progress;
        if (this.onProgressCallback) {
          this.onProgressCallback(progress);
        }
      }
    }
    
    // Analyser les dépendances circulaires si demandé
    if (this.options.rules?.patterns?.detectCircularDependencies) {
      this.detectCircularDependencies(sourceFiles, result);
    }
    
    // Calculer les métriques globales
    this.calculateGlobalMetrics(result);
    
    // Générer des suggestions basées sur l'analyse
    this.generateSuggestions(result);
    
    return result;
  }

  /**
   * Analyse un seul fichier source
   * @param sourceFile Fichier source à analyser
   * @param result Résultats cumulatifs
   */
  private async analyzeSourceFile(sourceFile: SourceFile, result: AnalysisResult): Promise<void> {
    const filePath = sourceFile.getFilePath();
    console.log(`Analyzing file: ${filePath}`);
    
    // Exécuter toutes les stratégies d'analyse enregistrées
    for (const [name, strategy] of this.strategies.entries()) {
      try {
        const strategyResult = strategy.analyze(sourceFile);
        this.mergeResults(result, strategyResult, filePath);
      } catch (error) {
        console.error(`Error executing ${name} strategy on ${filePath}:`, error);
      }
    }
    
    // Analyser la complexité (si aucune stratégie ne le fait déjà)
    if (!this.strategies.has('complexity')) {
      const complexity = this.analyzeComplexity(sourceFile);
      if (complexity.max > (result.metrics.complexity?.max || 0)) {
        result.metrics.complexity!.max = complexity.max;
      }
      
      result.metrics.complexity!.hotspots.push(...complexity.hotspots);
    }
    
    // Analyser la taille (si aucune stratégie ne le fait déjà)
    if (!this.strategies.has('size')) {
      const size = this.analyzeSize(sourceFile);
      result.metrics.size!.totalLines += size.totalLines;
      result.metrics.size!.codeLines += size.codeLines;
      result.metrics.size!.commentLines += size.commentLines;
    }
    
    // Analyser la sécurité (si configuré et si aucune stratégie ne le fait déjà)
    if (this.options.rules?.security?.detectInsecurePatterns && !this.strategies.has('security')) {
      const securityIssues = this.analyzeSecurityIssues(sourceFile);
      result.security.issues.push(...securityIssues);
    }
  }
  
  /**
   * Fusionne les résultats d'une stratégie dans le résultat global
   * @param globalResult Résultat global
   * @param strategyResult Résultat de la stratégie
   * @param filePath Chemin du fichier analysé
   */
  private mergeResults(globalResult: AnalysisResult, strategyResult: { [key: string]: any }, filePath: string): void {
    // Implémenter la fusion des résultats selon la structure de chaque stratégie
    // Pour cet exemple, nous supposons une structure simple
    
    if (strategyResult.complexity) {
      if (strategyResult.complexity.max > (globalResult.metrics.complexity?.max || 0)) {
        globalResult.metrics.complexity!.max = strategyResult.complexity.max;
      }
      
      if (strategyResult.complexity.hotspots) {
        globalResult.metrics.complexity!.hotspots.push(...strategyResult.complexity.hotspots);
      }
    }
    
    if (strategyResult.patterns) {
      if (strategyResult.patterns.detected) {
        globalResult.patterns.detected.push(...strategyResult.patterns.detected);
      }
      
      if (strategyResult.patterns.issues) {
        globalResult.patterns.issues.push(...strategyResult.patterns.issues);
      }
    }
    
    if (strategyResult.security && strategyResult.security.issues) {
      globalResult.security.issues.push(...strategyResult.security.issues);
    }
    
    if (strategyResult.suggestions) {
      globalResult.suggestions.push(...strategyResult.suggestions);
    }
  }
  
  /**
   * Analyse la complexité d'un fichier source
   * @param sourceFile Fichier source à analyser
   */
  private analyzeComplexity(sourceFile: SourceFile): { max: number; hotspots: Array<{ file: string; line: number; complexity: number }> } {
    const filePath = sourceFile.getFilePath();
    let maxComplexity = 0;
    const hotspots: Array<{ file: string; line: number; complexity: number }> = [];
    
    // Parcourir toutes les fonctions et méthodes
    sourceFile.forEachDescendant(node => {
      if (ts.isFunctionDeclaration(node) || 
          ts.isMethodDeclaration(node) || 
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node)) {
        
        // Calculer une complexité simplifiée
        const complexity = this.calculateCyclomaticComplexity(node);
        
        if (complexity > maxComplexity) {
          maxComplexity = complexity;
        }
        
        // Enregistrer les points chauds (complexité élevée)
        if (complexity > (this.options.rules?.complexity?.maxCyclomaticComplexity || 10)) {
          const line = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
          hotspots.push({
            file: filePath,
            line,
            complexity
          });
        }
      }
    });
    
    return {
      max: maxComplexity,
      hotspots
    };
  }
  
  /**
   * Calcule la complexité cyclomatique d'un nœud AST
   * @param node Nœud AST à analyser
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity
    
    function visit(n: ts.Node): void {
      switch (n.kind) {
        // Structures conditionnelles
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.DefaultClause:
        case ts.SyntaxKind.CatchClause:
          complexity++;
          break;
          
        // Boucles
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
          complexity++;
          break;
          
        // Opérateurs logiques binaires
        case ts.SyntaxKind.BinaryExpression:
          const binaryExpr = n as ts.BinaryExpression;
          if (
            binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ) {
            complexity++;
          }
          break;
      }
      
      ts.forEachChild(n, visit);
    }
    
    visit(node);
    return complexity;
  }
  
  /**
   * Analyse la taille d'un fichier source
   * @param sourceFile Fichier source à analyser
   */
  private analyzeSize(sourceFile: SourceFile): { totalLines: number; codeLines: number; commentLines: number } {
    const text = sourceFile.getFullText();
    const lines = text.split('\n');
    
    let commentLines = 0;
    let emptyLines = 0;
    
    // Compter les lignes de commentaires et vides
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        commentLines++;
      } else if (trimmedLine === '') {
        emptyLines++;
      }
    }
    
    return {
      totalLines: lines.length,
      codeLines: lines.length - commentLines - emptyLines,
      commentLines
    };
  }
  
  /**
   * Analyse les problèmes de sécurité dans un fichier source
   * @param sourceFile Fichier source à analyser
   */
  private analyzeSecurityIssues(sourceFile: SourceFile): Array<{ name: string; severity: string; locations: Array<{ file: string; line: number }> }> {
    const filePath = sourceFile.getFilePath();
    const issues: Array<{ name: string; severity: string; locations: Array<{ file: string; line: number }> }> = [];
    
    // Vérifier les appels à eval si configuré
    if (this.options.rules?.security?.noEval) {
      sourceFile.forEachDescendant(node => {
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isIdentifier(expression) && expression.text === 'eval') {
            const line = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
            issues.push({
              name: 'use-of-eval',
              severity: 'high',
              locations: [{ file: filePath, line }]
            });
          }
        }
      });
    }
    
    return issues;
  }
  
  /**
   * Détecte les dépendances circulaires entre les fichiers
   * @param sourceFiles Fichiers sources à analyser
   * @param result Résultats cumulatifs
   */
  private detectCircularDependencies(sourceFiles: SourceFile[], result: AnalysisResult): void {
    const filePaths = sourceFiles.map(file => file.getFilePath());
    
    const circularDeps = this.circularDependencyHandler.detectCircularDependencies(filePaths);
    
    // Convertir au format attendu dans le résultat
    result.dependencies.circular = circularDeps.map(dep => ({
      cycle: dep.files,
      severity: dep.severity
    }));
  }
  
  /**
   * Calcule les métriques globales à partir des métriques individuelles
   * @param result Résultats d'analyse
   */
  private calculateGlobalMetrics(result: AnalysisResult): void {
    // Calculer la complexité moyenne
    const hotspots = result.metrics.complexity?.hotspots || [];
    if (hotspots.length > 0) {
      const totalComplexity = hotspots.reduce((sum, spot) => sum + spot.complexity, 0);
      result.metrics.complexity!.average = totalComplexity / hotspots.length;
    }
  }
  
  /**
   * Génère des suggestions basées sur les résultats d'analyse
   * @param result Résultats d'analyse
   */
  private generateSuggestions(result: AnalysisResult): void {
    const suggestions: string[] = [];
    
    // Suggestions basées sur la complexité
    if ((result.metrics.complexity?.max || 0) > 15) {
      suggestions.push('Considérer la refactorisation des fonctions avec une complexité élevée (>15)');
    }
    
    // Suggestions basées sur les dépendances circulaires
    if (result.dependencies.circular.length > 0) {
      suggestions.push(`Résoudre les ${result.dependencies.circular.length} dépendances circulaires détectées`);
    }
    
    // Suggestions basées sur les problèmes de sécurité
    const highSeverityIssues = result.security.issues.filter(issue => issue.severity === 'high');
    if (highSeverityIssues.length > 0) {
      suggestions.push(`Corriger les ${highSeverityIssues.length} problèmes de sécurité critiques`);
    }
    
    // Ajouter les suggestions au résultat
    result.suggestions.push(...suggestions);
  }

  /**
   * Analyse la qualité du code et génère un score
   * @param result Résultats d'analyse
   */
  public calculateCodeQualityScore(result: AnalysisResult): {
    overallScore: number;
    categories: {
      complexity: number;
      maintainability: number;
      security: number;
      patterns: number;
    };
  } {
    // Calculer le score de complexité (100 = meilleur, 0 = pire)
    const complexityScore = Math.max(0, 100 - (
      (result.metrics.complexity?.average || 0) * 5 + 
      Math.min(100, (result.metrics.complexity?.hotspots.length || 0) * 2)
    ));
    
    // Calculer le score de maintenabilité
    const commentRatio = result.metrics.size ?
      (result.metrics.size.commentLines / Math.max(1, result.metrics.size.codeLines)) : 0;
    const maintainabilityScore = Math.min(100, 
      50 + Math.min(25, commentRatio * 100) - 
      Math.min(50, (result.patterns.issues.length * 2))
    );
    
    // Calculer le score de sécurité
    const securityIssueWeight = {
      'high': 10,
      'medium': 5,
      'low': 1
    };
    
    const securityPenalty = result.security.issues.reduce((sum, issue) => {
      return sum + (securityIssueWeight[issue.severity as keyof typeof securityIssueWeight] || 5);
    }, 0);
    
    const securityScore = Math.max(0, 100 - securityPenalty);
    
    // Calculer le score de patterns
    const patternScore = Math.max(0, 100 - 
      (result.dependencies.circular.length * 10) -
      (result.patterns.issues.length * 2)
    );
    
    // Calculer le score global
    const overallScore = Math.round(
      (complexityScore * 0.3) +
      (maintainabilityScore * 0.3) +
      (securityScore * 0.25) +
      (patternScore * 0.15)
    );
    
    return {
      overallScore,
      categories: {
        complexity: Math.round(complexityScore),
        maintainability: Math.round(maintainabilityScore),
        security: Math.round(securityScore),
        patterns: Math.round(patternScore)
      }
    };
  }

  /**
   * Ferme le projet et libère les ressources
   */
  public dispose(): void {
    this.project = new Project(); // Créer un nouveau projet vide pour libérer l'ancien
  }

  /**
   * Analyse les dépendances d'un fichier source
   * @param sourceFile Fichier source à analyser
   * @returns Liste des dépendances détectées
   */
  public analyzeDependencies(sourceFile: SourceFile): string[] {
    // TODO: Implémenter l'analyse des dépendances
    console.log(`Analyse des dépendances pour ${sourceFile.getFilePath()} à implémenter`);
    // Retourner un tableau vide pour l'instant
    return [];
  }
}

/**
 * Implémentation d'une stratégie d'analyse de performance
 */
export class PerformanceAnalysisStrategy implements IAnalysisStrategy {
  analyze(sourceFile: SourceFile): { [key: string]: any } {
    const filePath = sourceFile.getFilePath();
    const result = {
      performance: {
        potentialIssues: []
      }
    };
    
    // Détecter les boucles imbriquées profondes
    sourceFile.forEachDescendant(node => {
      if (this.isLoopNode(node)) {
        let depth = 1;
        let parent = node.getParent();
        while (parent) {
          if (this.isLoopNode(parent)) {
            depth++;
          }
          parent = parent.getParent();
        }
        
        if (depth >= 3) {
          const line = sourceFile.getLineAndColumnAtPos(node.getPos()).line;
          result.performance.potentialIssues.push({
            type: 'nested-loops',
            severity: depth >= 4 ? 'high' : 'medium',
            message: `Boucle imbriquée de profondeur ${depth} détectée`,
            location: { file: filePath, line }
          });
        }
      }
    });
    
    return result;
  }
  
  private isLoopNode(node: ts.Node): boolean {
    return node.kind === ts.SyntaxKind.ForStatement ||
           node.kind === ts.SyntaxKind.ForInStatement ||
           node.kind === ts.SyntaxKind.ForOfStatement ||
           node.kind === ts.SyntaxKind.WhileStatement ||
           node.kind === ts.SyntaxKind.DoStatement;
  }
}

/**
 * Implémentation d'une stratégie d'analyse de style de code
 */
export class StyleAnalysisStrategy implements IAnalysisStrategy {
  analyze(sourceFile: SourceFile): { [key: string]: any } {
    const filePath = sourceFile.getFilePath();
    const result = {
      style: {
        issues: []
      }
    };
    
    // Vérifier la longueur des fonctions
    sourceFile.forEachDescendant(node => {
      if (
        ts.isFunctionDeclaration(node) || 
        ts.isMethodDeclaration(node) || 
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        const startLine = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
        const endLine = sourceFile.getLineAndColumnAtPos(node.getEnd()).line;
        const lineCount = endLine - startLine + 1;
        
        if (lineCount > 50) {
          result.style.issues.push({
            type: 'function-too-long',
            severity: lineCount > 100 ? 'high' : 'medium',
            message: `Fonction trop longue (${lineCount} lignes)`,
            location: { file: filePath, line: startLine }
          });
        }
      }
    });
    
    // Vérifier la convention de nommage
    sourceFile.forEachDescendant(node => {
      if (ts.isVariableDeclaration(node) && node.name.kind === ts.SyntaxKind.Identifier) {
        const name = (node.name as ts.Identifier).text;
        
        // Variables en camelCase
        if (!/^[a-z][a-zA-Z0-9]*$/.test(name) && !/^_[a-z][a-zA-Z0-9]*$/.test(name)) {
          const line = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
          result.style.issues.push({
            type: 'naming-convention',
            severity: 'low',
            message: `Variable '${name}' ne suit pas la convention de nommage camelCase`,
            location: { file: filePath, line }
          });
        }
      }
      
      // Classes en PascalCase
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          const line = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
          result.style.issues.push({
            type: 'naming-convention',
            severity: 'low',
            message: `Classe '${name}' ne suit pas la convention de nommage PascalCase`,
            location: { file: filePath, line }
          });
        }
      }
    });
    
    return result;
  }
}
