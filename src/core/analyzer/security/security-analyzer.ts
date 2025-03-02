import { Project, SourceFile } from 'ts-morph';
import { SecurityResult } from '../types';

export class SecurityAnalyzer {
  async analyzeSecurity(project: Project): Promise<SecurityResult> {
    console.log('Analyzing security for project...');
    const sourceFiles = project.getSourceFiles();
    const vulnerabilities: any[] = [];
    
    // Analyse de sécurité pour chaque fichier
    for (const sourceFile of sourceFiles) {
      const fileResult = await this.analyzeFileSecurity(sourceFile);
      vulnerabilities.push(...fileResult.vulnerabilities);
    }
    
    // Calcul du score de sécurité (simple pour l'exemple)
    const securityScore = sourceFiles.length > 0 
      ? Math.max(0, 100 - (vulnerabilities.length * 10))
      : 100;
    
    return {
      vulnerabilities,
      securityScore
    };
  }
  
  async analyzeFileSecurity(sourceFile: SourceFile): Promise<SecurityResult> {
    console.log(`Analyzing security for file: ${sourceFile.getFilePath()}`);
    
    // Placeholder pour l'analyse de sécurité
    const vulnerabilities: any[] = [];
    
    // Exemple simple: vérifier l'utilisation de eval
    const text = sourceFile.getFullText();
    if (text.includes('eval(')) {
      vulnerabilities.push({
        type: 'eval-usage',
        severity: 'high',
        message: 'Unsafe eval() detected',
        location: {
          filePath: sourceFile.getFilePath(),
          line: text.split('\n').findIndex(line => line.includes('eval(')) + 1
        }
      });
    }
    
    // Score de sécurité (simple pour l'exemple)
    const securityScore = Math.max(0, 100 - (vulnerabilities.length * 20));
    
    return {
      vulnerabilities,
      securityScore
    };
  }
}
