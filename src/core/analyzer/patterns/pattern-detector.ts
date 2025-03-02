import { Project, SourceFile } from 'ts-morph';
import { PatternsResult } from '../types';

export class PatternDetector {
  async detectPatterns(project: Project): Promise<PatternsResult> {
    console.log('Detecting patterns in project...');
    const sourceFiles = project.getSourceFiles();
    const issues: any[] = [];
    
    // Analyse chaque fichier pour détecter des problèmes
    for (const sourceFile of sourceFiles) {
      const fileIssues = await this.detectFilePatterns(sourceFile);
      issues.push(...fileIssues.issues);
    }
    
    return {
      issues,
      count: issues.length
    };
  }
  
  async detectFilePatterns(sourceFile: SourceFile): Promise<PatternsResult> {
    console.log(`Detecting patterns in file: ${sourceFile.getFilePath()}`);
    
    // Placeholder pour la détection de patterns
    const issues: any[] = [];
    
    // Exemple simple: vérifier la longueur des fonctions
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      const body = func.getBody();
      if (body) {
        const lines = body.getFullText().split('\n').length;
        if (lines > 20) {
          issues.push({
            type: 'function-too-long',
            message: `Function ${func.getName() || 'anonymous'} is too long (${lines} lines)`,
            location: {
              filePath: sourceFile.getFilePath(),
              line: func.getStartLineNumber()
            }
          });
        }
      }
    }
    
    return {
      issues,
      count: issues.length
    };
  }
}
