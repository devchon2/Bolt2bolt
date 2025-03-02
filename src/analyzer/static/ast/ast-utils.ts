/**
 * Utilitaires pour l'analyse de l'AST TypeScript
 */

import * as ts from 'typescript';
import * as path from 'path';
import { CodeLocation } from '../../types';

/**
 * Parse un fichier TypeScript et retourne l'AST
 * @param content Contenu du fichier
 * @param fileName Nom du fichier (optionnel)
 * @returns AST du fichier
 */
export function parseFile(content: string, fileName: string = 'file.ts'): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true
  );
}

/**
 * Crée un programme TypeScript à partir d'une liste de fichiers
 * 
 * @param fileNames Liste des chemins de fichiers
 * @param options Options du compilateur TypeScript
 * @returns Programme TypeScript
 */
export function createProgram(
  fileNames: string[],
  options: ts.CompilerOptions
): ts.Program {
  const host = ts.createCompilerHost(options);
  return ts.createProgram(fileNames, options, host);
}

/**
 * Récupère la position d'un nœud dans le code source
 * @param node Nœud de l'AST
 * @param sourceFile Fichier source
 * @param filePath Chemin du fichier
 * @returns Position dans le code
 */
export function getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile, filePath: string): CodeLocation {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  
  return {
    filePath,
    line: start.line + 1,  // Les lignes commencent à 0 dans l'AST
    column: start.character + 1,  // Les colonnes commencent à 0 dans l'AST
    endLine: end.line + 1,
    endColumn: end.character + 1
  };
}

/**
 * Détermine si un nœud est exporté
 * 
 * @param node Nœud AST
 * @returns Vrai si le nœud est exporté
 */
export function isNodeExported(node: ts.Node): boolean {
  // Vérifie les modificateurs pour le mot-clé 'export'
  if (node.modifiers) {
    return node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  }
  
  // Vérifie si le nœud est dans une déclaration d'export
  const parent = node.parent;
  return !!(parent && 
          (ts.isExportAssignment(parent) ||
           ts.isExportDeclaration(parent) ||
           ts.isExportSpecifier(parent)));
}

/**
 * Détermine si un nœud a le modificateur 'async'
 * 
 * @param node Nœud AST
 * @returns Vrai si le nœud est asynchrone
 */
export function isNodeAsync(node: ts.Node): boolean {
  return !!(node.modifiers && 
           node.modifiers.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword));
}

/**
 * Obtient le texte formaté pour afficher une erreur avec contexte
 * 
 * @param sourceFile Fichier source
 * @param start Position de début
 * @param length Longueur du texte
 * @returns Texte formaté avec contexte
 */
export function getTextWithContext(
  sourceFile: ts.SourceFile, 
  start: number, 
  length: number
): string {
  const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(start);
  const lineStartPos = sourceFile.getPositionOfLineAndCharacter(startLine, 0);
  
  // Obtient la ligne complète contenant l'erreur
  let lineEndPos = sourceFile.text.indexOf('\n', lineStartPos);
  if (lineEndPos === -1) {
    lineEndPos = sourceFile.text.length;
  }
  
  const lineText = sourceFile.text.substring(lineStartPos, lineEndPos);
  const charPos = start - lineStartPos;
  
  // Crée une ligne d'indicateur pointant vers l'erreur
  let indicator = ' '.repeat(charPos) + '^'.repeat(Math.min(length, lineEndPos - start));
  
  return `${lineText}\n${indicator}`;
}

/**
 * Obtient tous les commentaires associés à un nœud
 * 
 * @param node Nœud AST
 * @param sourceFile Fichier source
 * @returns Texte des commentaires
 */
export function getNodeComments(node: ts.Node, sourceFile: ts.SourceFile): string {
  const comments: string[] = [];
  
  // Récupère les commentaires JSDoc
  const jsDocComments = ts.getJSDocCommentsAndTags(node);
  if (jsDocComments && jsDocComments.length > 0) {
    for (const comment of jsDocComments) {
      comments.push(comment.getText());
    }
  }
  
  // Récupère les commentaires de ligne ou blocs précédant le nœud
  const nodePos = node.getFullStart();
  let commentRanges = ts.getLeadingCommentRanges(sourceFile.text, nodePos);
  
  if (commentRanges) {
    for (const range of commentRanges) {
      const comment = sourceFile.text.substring(range.pos, range.end);
      comments.push(comment);
    }
  }
  
  return comments.join('\n');
}

/**
 * Obtient l'identifiant ou le nom d'un nœud si applicable
 * 
 * @param node Nœud AST
 * @returns Nom du nœud ou undefined
 */
export function getNodeName(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  
  if ((node as any).name && ts.isIdentifier((node as any).name)) {
    return (node as any).name.text;
  }
  
  return undefined;
}

/**
 * Vérifie si un nœud est une fonction ou méthode
 * @param node Nœud de l'AST
 * @returns true si le nœud est une fonction
 */
export function isFunction(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) ||
         ts.isMethodDeclaration(node) ||
         ts.isFunctionExpression(node) ||
         ts.isArrowFunction(node) ||
         ts.isConstructorDeclaration(node);
}

/**
 * Récupère le nom d'une fonction ou méthode
 * @param node Nœud de fonction
 * @returns Nom de la fonction ou undefined si anonyme
 */
export function getFunctionName(node: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    if (node.name && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
  }
  else if (ts.isFunctionExpression(node) && node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && 
           node.initializer && (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) {
    return node.name.text;
  }
  
  return undefined;
}

/**
 * Récupère la complexité cyclomatique d'une fonction
 * @param node Nœud de l'AST représentant une fonction
 * @returns Complexité cyclomatique
 */
export function getCyclomaticComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity
  
  function visit(node: ts.Node): void {
    // Statements that increase complexity
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCaseClause(node)
    ) {
      complexity++;
    }
    
    // Logical expressions with && or || increase complexity
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        complexity++;
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(node);
  return complexity;
}

/**
 * Récupère la profondeur de nidification maximale d'une fonction
 * @param node Nœud de l'AST représentant une fonction
 * @returns Profondeur de nidification maximale
 */
export function getMaxNestingLevel(node: ts.Node): number {
  let maxLevel = 0;
  
  function visit(node: ts.Node, level: number): void {
    // Update max level if current is higher
    maxLevel = Math.max(maxLevel, level);
    
    // Increase level for nesting structures
    if (
      ts.isBlock(node) &&
      (ts.isIfStatement(node.parent) ||
       ts.isForStatement(node.parent) ||
       ts.isForInStatement(node.parent) ||
       ts.isForOfStatement(node.parent) ||
       ts.isWhileStatement(node.parent) ||
       ts.isDoStatement(node.parent) ||
       ts.isCaseClause(node.parent))
    ) {
      // For nested blocks, increase level
      ts.forEachChild(node, child => visit(child, level + 1));
    } else {
      // For other nodes, keep the same level
      ts.forEachChild(node, child => visit(child, level));
    }
  }
  
  visit(node, 0);
  return maxLevel;
}

/**
 * Obtient tous les paramètres d'une fonction
 * 
 * @param node Nœud de fonction
 * @returns Liste des paramètres ou undefined si ce n'est pas une fonction
 */
export function getFunctionParameters(node: ts.Node): ts.ParameterDeclaration[] | undefined {
  if (isFunction(node)) {
    return (node as ts.FunctionLikeDeclaration).parameters;
  }
  return undefined;
}

/**
 * Exporte le module ast-utils
 */
export default {
  parseFile,
  createProgram,
  getNodeLocation,
  isNodeExported,
  isNodeAsync,
  getTextWithContext,
  getNodeComments,
  getNodeName,
  isFunction,
  getFunctionName,
  getCyclomaticComplexity,
  getMaxNestingLevel,
  getFunctionParameters
};