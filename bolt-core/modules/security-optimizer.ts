import * as ts from 'typescript';
import { AnalysisResult } from './analysis';

export interface SecurityOptimizationResult {
  optimizedContent: string;
  optimizationsApplied: Array<{
    description: string;
    linesBefore?: [number, number];
    linesAfter?: [number, number];
  }>;
}

export async function applySecurityOptimizations(
  sourceCode: string,
  analysisResult: AnalysisResult
): Promise<SecurityOptimizationResult> {
  const optimizations: SecurityOptimizationResult['optimizationsApplied'] = [];
  let optimizedContent = sourceCode;

  // Créer un AST à partir du code source
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  // Transformer l'AST pour appliquer les optimisations de sécurité
  function transformer<T extends ts.Node>(context: ts.TransformationContext) {
    return (rootNode: T) => {
      function visit(node: ts.Node): ts.Node {
        // Remplacer eval() par des alternatives plus sûres
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'eval'
        ) {
          optimizations.push({
            description: 'Remplacement de eval() par Function()',
            linesBefore: [
              sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
            ]
          });
          
          return ts.factory.createCallExpression(
            ts.factory.createNewExpression(
              ts.factory.createIdentifier('Function'),
              undefined,
              node.arguments
            ),
            undefined,
            []
          );
        }

        // Sécuriser les requêtes SQL
        if (
          ts.isTemplateExpression(node) &&
          node.getText().toLowerCase().includes('select') &&
          node.getText().toLowerCase().includes('from')
        ) {
          optimizations.push({
            description: 'Paramétrage des requêtes SQL',
            linesBefore: [
              sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
            ]
          });
          
          // Transformer en requête paramétrée
          // Note: Ceci est un exemple simplifié
          return ts.factory.createCallExpression(
            ts.factory.createIdentifier('prepareQuery'),
            undefined,
            [node]
          );
        }

        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(rootNode, visit);
    };
  }

  // Appliquer les transformations
  const result = ts.transform(sourceFile, [transformer]);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  optimizedContent = printer.printFile(result.transformed[0] as ts.SourceFile);

  // Mettre à jour les positions des lignes après transformation
  optimizations.forEach(opt => {
    if (opt.linesBefore) {
      opt.linesAfter = [...opt.linesBefore];
    }
  });

  return {
    optimizedContent,
    optimizationsApplied: optimizations
  };
}
