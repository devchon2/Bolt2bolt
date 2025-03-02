import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// Types pour les résultats d'analyse
type PerformanceIssue = {
    type: 'performance';
    description: string;
    severity: 'low' | 'medium' | 'high';
};

type SecurityFlaw = {
    type: 'security';
    description: string;
    risk: 'low' | 'medium' | 'high';
};

type ComplexityMetric = {
    type: 'complexity';
    score: number;
    details: string;
};

/**
 * Interface pour les résultats d'analyse de sécurité
 */
export interface SecurityAnalysisResult {
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    location: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  }>;
  overallRisk: 'low' | 'medium' | 'high';
}

/**
 * Interface pour les résultats d'analyse de performance
 */
export interface PerformanceAnalysisResult {
  timeComplexity: 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)' | 'O(2ⁿ)';
  memoryUsage: 'low' | 'medium' | 'high';
  bottlenecks: Array<{
    type: string;
    impact: 'low' | 'medium' | 'high';
    message: string;
    location?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  }>;
}

/**
 * Interface pour les résultats d'analyse de complexité
 */
export interface ComplexityAnalysisResult {
  cyclomatic: number;
  cognitive: number;
  halstead: {
    difficulty: number;
    volume: number;
  };
}

/**
 * Interface pour les résultats d'analyse de maintenabilité
 */
export interface MaintainabilityAnalysisResult {
  commentRatio: number;
  issues: Array<{
    type: string;
    impact: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

/**
 * Interface pour les résultats d'analyse complets
 */
export interface AnalysisResult {
  security: SecurityAnalysisResult;
  performance: PerformanceAnalysisResult;
  complexity: ComplexityAnalysisResult;
  maintainability: MaintainabilityAnalysisResult;
}

/**
 * Interface pour les résultats d'analyse
 */
export interface AnalysisResult {
  filePath: string;
  fileType: string;
  metrics: CodeMetrics;
  issues: CodeIssue[];
  dependencies: DependencyInfo[];
  complexParts: ComplexCodePart[];
  securityVulnerabilities: SecurityVulnerability[];
  performanceIssues: PerformanceIssue[];
  recommendedOptimizations: string[];
  requiresOptimization: boolean;
}

/**
 * Interface pour l'analyse de fichier spécifique
 */
export interface FileAnalysisResult extends AnalysisResult {
  fileName: string;
  fileExtension: string;
}

/**
 * Métriques de code
 */
export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  maintainability: number;
  duplications: number;
  testCoverage?: number;
  commentRatio: number;
}

/**
 * Problème détecté dans le code
 */
export interface CodeIssue {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  location?: {
    line: number;
    column: number;
  };
  fix?: {
    description: string;
    automated: boolean;
  };
}

/**
 * Information sur une dépendance
 */
export interface DependencyInfo {
  name: string;
  type: 'import' | 'package' | 'cdn' | 'unknown';
  version?: string;
  path?: string;
  isExternal: boolean;
  security?: {
    vulnerabilities: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Partie complexe du code
 */
export interface ComplexCodePart {
  type: 'function
}

/**
 * Représente un nœud du graphe de dépendances
 */
export interface DependencyNode {
  id: string;
  name: string;
  path: string;
  dependencies: string[];
  size: number;
  complexity: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

/**
 * Graphe de dépendances complet du projet
 */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: Array<{
    source: string;
    target: string;
    type: 'import' | 'require' | 'dynamic';
  }>;
}

/**
 * Classification de la dette technique
 */
export enum TechnicalDebtClassification {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export function analyzePerformance(): PerformanceIssue[] {
    // Implémentation de base de l'analyse de performance
    return [{
        type: 'performance',
        description: 'Initial performance analysis',
        severity: 'low'
    }];
}

export function analyzeSecurity(): SecurityFlaw[] {
    // Implémentation de base de l'analyse de sécurité
    return [{
        type: 'security',
        description: 'Initial security scan',
        risk: 'low'
    }];
}

export function analyzeComplexity(): ComplexityMetric[] {
    // Implémentation de base de l'analyse de complexité
    return [{
        type: 'complexity',
        score: 0,
        details: 'Initial complexity measurement'
    }];
}

/**
 * Analyse la complexité cyclomatique d'un AST TypeScript
 */
export function analyzeCyclomaticComplexity(sourceFile: ts.SourceFile): number {
  let complexity = 1; // Base complexity

  function visit(node: ts.Node) {
    // Augmenter la complexité pour les structures de contrôle
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression: // ternary
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression;
        if (
          binaryExpr.operatorToken &&
          (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken)
        ) {
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
 * Analyse les problèmes de sécurité potentiels dans le code
 */
export function analyzeSecurityIssues(sourceFile: ts.SourceFile): AnalysisResult['security'] {
  const vulnerabilities: AnalysisResult['security']['vulnerabilities'] = [];
  
  function visit(node: ts.Node) {
    // Détecter l'utilisation de eval
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'eval'
    ) {
      vulnerabilities.push({
        severity: 'high',
        type: 'code-injection',
        location: `${sourceFile.fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
        suggestion: 'Évitez d\'utiliser eval() qui peut introduire des vulnérabilités d\'injection de code',
      });
    }

    // Détecter les chaînes SQL potentiellement dangereuses
    if (ts.isStringLiteral(node) || ts.isTemplateExpression(node)) {
      const text = node.getText(sourceFile).toLowerCase();
      if (
        text.includes('select ') && 
        text.includes('from ') && 
        !text.includes('parameterized')
      ) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'sql-injection',
          location: `${sourceFile.fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
          suggestion: 'Utilisez des requêtes SQL paramétrées pour éviter les injections SQL',
        });
      }
    }

    // Détecter l'utilisation non sécurisée d'API système
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'execSync'
    ) {
      vulnerabilities.push({
        severity: 'critical',
        type: 'command-injection',
        location: `${sourceFile.fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
        suggestion: 'Validez les entrées utilisateur avant de les passer à execSync pour éviter les injections de commandes',
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  
  // Calculer un score de sécurité de 0 à 100
  const securityScore = Math.max(0, 100 - vulnerabilities.reduce((score, vuln) => {
    switch (vuln.severity) {
      case 'low': return score + 5;
      case 'medium': return score + 15;
      case 'high': return score + 30;
      case 'critical': return score + 50;
      default: return score;
    }
  }, 0));

  return {
    vulnerabilities,
    score: securityScore
  };
}

/**
 * Analyse les performances potentielles d'un module
 */
export function analyzePerformance(sourceFile: ts.SourceFile): AnalysisResult['performance'] {
  const bottlenecks: string[] = [];
  let timeComplexity: AnalysisResult['performance']['timeComplexity'] = 'O(1)';
  let memoryUsage: AnalysisResult['performance']['memoryUsage'] = 'low';
  
  // Détecter les boucles imbriquées
  let maxLoopDepth = 0;
  
  function calculateLoopDepth(node: ts.Node): number {
    if (
      ts.isForStatement(node) || 
      ts.isForInStatement(node) || 
      ts.isForOfStatement(node) || 
      ts.isWhileStatement(node) || 
      ts.isDoStatement(node)
    ) {
      let maxChildDepth = 0;
      ts.forEachChild(node, child => {
        maxChildDepth = Math.max(maxChildDepth, calculateLoopDepth(child));
      });
      return 1 + maxChildDepth;
    }

    let maxChildDepth = 0;
    ts.forEachChild(node, child => {
      maxChildDepth = Math.max(maxChildDepth, calculateLoopDepth(child));
    });
    return maxChildDepth;
  }

  maxLoopDepth = calculateLoopDepth(sourceFile);
  
  // Déterminer la complexité en fonction de la profondeur des boucles
  if (maxLoopDepth >= 3) {
    timeComplexity = 'O(n³)';
    memoryUsage = 'high';
    bottlenecks.push(`Boucles imbriquées de profondeur ${maxLoopDepth} détectées`);
  } else if (maxLoopDepth === 2) {
    timeComplexity = 'O(n²)';
    memoryUsage = 'medium';
    bottlenecks.push('Boucles imbriquées de profondeur 2 détectées');
  } else if (maxLoopDepth === 1) {
    timeComplexity = 'O(n)';
    memoryUsage = 'low';
  }

  // Détecter les créations massives d'objets
// sourcery skip: avoid-function-declarations-in-blocks
  function checkMemoryUsage(node: ts.Node) {
    if (ts.isNewExpression(node) && ts.isArrayLiteralExpression(node.arguments?.[0])) {
      const arrayLiteral = node.arguments[0] as ts.ArrayLiteralExpression;
      if (arrayLiteral.elements.length > 1000) {
        memoryUsage = 'high';
        bottlenecks.push(`Grande allocation de tableau avec ${arrayLiteral.elements.length} éléments`);
      }
    }

    ts.forEachChild(node, checkMemoryUsage);
  }

  checkMemoryUsage(sourceFile);

  return {
    timeComplexity,
    memoryUsage,
    bottlenecks
  };
}

/**
 * Analyse la maintenabilité du code
 */
export function analyzeMaintainability(sourceFile: ts.SourceFile): AnalysisResult['maintainability'] {
  const issues: string[] = [];
  
  // Longueur des fonctions
  function checkFunctionLength(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (node.body && ts.isBlock(node.body)) {
        const startLine = sourceFile.getLineAndCharacterOfPosition(node.body.getStart()).line;
        const endLine = sourceFile.getLineAndCharacterOfPosition(node.body.getEnd()).line;
        const lineCount = endLine - startLine;
        
        if (lineCount > 50) {
          const functionName = ts.isFunctionDeclaration(node) && node.name 
            ? node.name.text 
            : 'Fonction anonyme';
          issues.push(`${functionName} est trop longue (${lineCount} lignes)`);
        }
      }
    }
    
    ts.forEachChild(node, checkFunctionLength);
  }
  
  // Vérifier les commentaires pour les fonctions publiques
  function checkDocumentation(node: ts.Node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && 
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      
      const startPos = node.getFullStart();
      const leadingComments = ts.getLeadingCommentRanges(sourceFile.text, startPos);
      
      if (!leadingComments || leadingComments.length === 0) {
        const name = ts.isFunctionDeclaration(node) && node.name 
            ? node.name.text 
            : ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) 
            ? node.name.text 
            : 'Méthode anonyme';
        issues.push(`La fonction/méthode exportée "${name}" n'a pas de documentation (JSDoc)`);
      }
    }
    
    ts.forEachChild(node, checkDocumentation);
  }
  
  checkFunctionLength(sourceFile);
  checkDocumentation(sourceFile);
  
  // Calculer un score de maintenabilité
  let score = 100;
  score -= issues.length * 5; // Chaque problème réduit le score
  
  return {
    score: Math.max(0, score),
    issues
  };
}

/**
 * Analyse complète d'un fichier TypeScript
 */
export function analyzeSourceFile(filePath: string): AnalysisResult {
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS
  });
  
  const sourceFile = program.getSourceFile(filePath);
  
  if (!sourceFile) {
    throw new Error(`Impossible d'analyser le fichier: ${filePath}`);
  }
  
  const cyclomatic = analyzeCyclomaticComplexity(sourceFile);
  
  // Calculer la complexité cognitive
  const cognitive = Math.round(cyclomatic * 1.3); // Estimation simplifiée
  
  // Calculer les métriques Halstead simplifiées
  const halstead = {
    difficulty: cyclomatic * 0.8,
    effort: cyclomatic * cognitive * 5,
    volume: cyclomatic * 100
  };
  
  const security = analyzeSecurityIssues(sourceFile);
  const performance = analyzePerformance(sourceFile);
  const maintainability = analyzeMaintainability(sourceFile);
  
  return {
    complexity: {
      cyclomatic,
      cognitive,
      halstead
    },
    security,
    performance,
    maintainability
  };
}

/**
 * Analyse un projet complet pour identifier les problèmes
 */
export function analyzeProject(rootDir: string, patterns: string[] = ['**/*.ts', '**/*.tsx']): Record<string, AnalysisResult> {
  const results: Record<string, AnalysisResult> = {};
  
  function processFile(filePath: string) {
    try {
      const result = analyzeSourceFile(filePath);
      results[filePath] = result;
    } catch (error) {
      console.error(`Erreur lors de l'analyse de ${filePath}:`, error);
    }
  }
  
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.git')) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        processFile(fullPath);
      }
    }
  }
  
  scanDirectory(rootDir);
  return results;
}
