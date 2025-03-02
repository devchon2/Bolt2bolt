import { SourceFile } from "ts-morph";
import { IAnalysisStrategy } from "../src/core/analyzer/analyzer";

export class CoverageAnalysisStrategy implements IAnalysisStrategy {
  analyze(sourceFile: SourceFile): { [key: string]: any } {
    const filePath = sourceFile.getFilePath();
    const coverageData = {
      filePath,
      lines: {
        covered: 0,
        total: 0
      },
      statements: {
        covered: 0,
        total: 0
      },
      branches: {
        covered: 0,
        total: 0
      },
      functions: {
        covered: 0,
        total: 0
      }
    };
    
    // Logique simplifiée de couverture : calculer les lignes totales
    // et estimer un pourcentage de couverture
    const text = sourceFile.getFullText().split('\n');
    coverageData.lines.total = text.length;
    
    // Analyse des fonctions et méthodes pour les statistiques
    let functionCount = 0;
    sourceFile.forEachDescendant(node => {
      if (node.getKindName() === 'FunctionDeclaration' || 
          node.getKindName() === 'MethodDeclaration' || 
          node.getKindName() === 'ArrowFunction') {
        functionCount++;
      }
    });
    
    coverageData.functions.total = functionCount;
    
    // Pour cet exemple, on simule une couverture basée sur la présence de commentaires
    // En pratique, on utiliserait des outils comme Istanbul/NYC
    let commentedLines = 0;
    text.forEach(line => {
      if (line.includes('//') || line.includes('/*') || line.includes('*/') || line.includes('*')) {
        commentedLines++;
      }
    });
    
    const commentRatio = commentedLines / Math.max(text.length, 1);
    
    // Simuler une couverture plus élevée pour les fichiers bien commentés
    const estimatedCoverage = 0.4 + (commentRatio * 0.3);
    
    // Appliquer l'estimation aux différentes métriques
    coverageData.lines.covered = Math.floor(coverageData.lines.total * estimatedCoverage);
    coverageData.functions.covered = Math.floor(functionCount * estimatedCoverage);
    coverageData.statements.total = coverageData.lines.total * 1.2; // Estimation
    coverageData.statements.covered = Math.floor(coverageData.statements.total * estimatedCoverage);
    coverageData.branches.total = functionCount * 2; // Estimation
    coverageData.branches.covered = Math.floor(coverageData.branches.total * estimatedCoverage);
    
    return { coverage: coverageData };
  }
}