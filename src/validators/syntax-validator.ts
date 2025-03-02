// #codebase: [CONTEXTE] Validateur syntaxique pour Bolt2bolt
// #codebase: [PATTERN:CHAIN] Implémente l'interface IValidator pour la chaîne de validation
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration de la couverture

/*
[COPILOT_PROMPTS]
# Validateur Syntaxique - Composant Validation

## Responsabilités
- Vérification syntaxique du code source
- Premier maillon de la chaîne de validation
- Détection des erreurs de syntaxe avant analyses plus poussées
- Support de plusieurs langages (JS/TS)

## Architecture
- Utilise les parseurs sous-jacents pour la vérification
- Implémente l'interface IValidator
- Priorité élevée dans la chaîne de validateurs
[COPILOT_PROMPTS]
*/

import * as ts from 'typescript';
import * as acorn from 'acorn';
import { IValidator } from '../validator';
import { ValidationResult, ValidationOptions, ValidationRule, Severity } from '../types/validator';
import { Logger } from '../lib/logger';

/**
 * Validateur qui vérifie la syntaxe du code
 */
export class SyntaxValidator implements IValidator {
  name: string = 'SyntaxValidator';
  priority: number = 10; // Priorité élevée, ce validateur doit s'exécuter en premier
  private logger: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger || new Logger('SyntaxValidator');
  }
  
  /**
   * Vérifie si le code est syntaxiquement valide
   */
  public async validate(code: string, options?: ValidationOptions): Promise<ValidationResult> {
    this.logger.debug('Validating syntax');
    
    // Déterminer le type de fichier à valider (JS ou TS)
    const isTypeScript = options?.filePath?.endsWith('.ts') || options?.filePath?.endsWith('.tsx');
    
    try {
      if (isTypeScript) {
        return this.validateTypeScript(code, options);
      } else {
        return this.validateJavaScript(code, options);
      }
    } catch (error) {
      this.logger.error('Syntax validation error', error);
      
      return {
        valid: false,
        issues: [{
          name: 'syntax_error',
          description: `Syntax error: ${error instanceof Error ? error.message : String(error)}`,
          severity: Severity.ERROR,
          line: this.extractLineNumber(error) || 1,
          column: this.extractColumnNumber(error) || 1
        }],
        stats: { total: 1, errors: 1, warnings: 0, infos: 0 }
      };
    }
  }
  
  /**
   * Valide la syntaxe TypeScript
   */
  private validateTypeScript(code: string, options?: ValidationOptions): ValidationResult {
    const issues: ValidationRule[] = [];
    
    // Créer un fichier source TypeScript
    const sourceFile = ts.createSourceFile(
      options?.filePath || 'anonymous.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Vérifier les erreurs de syntaxe
    const program = ts.createProgram({
      rootNames: [options?.filePath || 'anonymous.ts'],
      options: {
        noEmit: true,
        allowJs: true,
        checkJs: true
      },
      host: {
        fileExists: (filePath) => filePath === (options?.filePath || 'anonymous.ts'),
        readFile: (filePath) => filePath === (options?.filePath || 'anonymous.ts') ? code : undefined,
        getSourceFile: (fileName, languageVersion) => {
          if (fileName === (options?.filePath || 'anonymous.ts')) {
            return sourceFile;
          }
          return undefined;
        },
        getDefaultLibFileName: () => "lib.d.ts",
        writeFile: () => {},
        getCurrentDirectory: () => process.cwd(),
        getDirectories: () => [],
        getCanonicalFileName: fileName => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
      }
    });
    
    const diagnostics = ts.getPreEmitDiagnostics(program);
    
    // Convertir les diagnostics en issues
    for (const diagnostic of diagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        
        issues.push({
          name: 'typescript_error',
          description: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          severity: this.mapDiagnosticSeverity(diagnostic.category),
          line: line + 1, // Convertir en indexation depuis 1
          column: character + 1
        });
      } else {
        issues.push({
          name: 'typescript_error',
          description: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          severity: this.mapDiagnosticSeverity(diagnostic.category),
          line: 1,
          column: 1
        });
      }
    }
    
    const valid = issues.length === 0;
    const stats = this.countSeverities(issues);
    
    return {
      valid,
      issues,
      stats
    };
  }
  
  /**
   * Valide la syntaxe JavaScript
   */
  private validateJavaScript(code: string, options?: ValidationOptions): ValidationResult {
    const issues: ValidationRule[] = [];
    
    try {
      // Parser le code avec Acorn
      acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true
      });
      
      // Si aucune erreur n'est levée, la syntaxe est valide
      return {
        valid: true,
        issues: [],
        stats: { total: 0, errors: 0, warnings: 0, infos: 0 }
      };
    } catch (error) {
      // Acorn lance une exception en cas d'erreur de syntaxe
      if (error instanceof SyntaxError) {
        const acornError = error as any; // Pour accéder aux propriétés spécifiques d'Acorn
        
        issues.push({
          name: 'javascript_syntax_error',
          description: error.message,
          severity: Severity.ERROR,
          line: acornError.loc?.line || 1,
          column: acornError.loc?.column || 1
        });
      } else {
        issues.push({
          name: 'unknown_syntax_error',
          description: error instanceof Error ? error.message : String(error),
          severity: Severity.ERROR,
          line: 1,
          column: 1
        });
      }
      
      const stats = this.countSeverities(issues);
      
      return {
        valid: false,
        issues,
        stats
      };
    }
  }
  
  /**
   * Mappe les catégories de diagnostic TS vers nos niveaux de sévérité
   */
  private mapDiagnosticSeverity(category: ts.DiagnosticCategory): Severity {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return Severity.ERROR;
      case ts.DiagnosticCategory.Warning:
        return Severity.WARNING;
      case ts.DiagnosticCategory.Suggestion:
      case ts.DiagnosticCategory.Message:
      default:
        return Severity.INFO;
    }
  }
  
  /**
   * Essaie d'extraire un numéro de ligne à partir d'une erreur
   */
  private extractLineNumber(error: any): number | null {
    if (!error) return null;
    
    // Cas pour Acorn
    if (error.loc && typeof error.loc.line === 'number') {
      return error.loc.line;
    }
    
    // Extraction depuis le message d'erreur
    const lineMatch = /line\s+(\d+)/i.exec(String(error.message || error));
    if (lineMatch && lineMatch[1]) {
      return parseInt(lineMatch[1], 10);
    }
    
    return null;
  }
  
  /**
   * Essaie d'extraire un numéro de colonne à partir d'une erreur
   */
  private extractColumnNumber(error: any): number | null {
    if (!error) return null;
    
    // Cas pour Acorn
    if (error.loc && typeof error.loc.column === 'number') {
      return error.loc.column;
    }
    
    // Extraction depuis le message d'erreur
    const columnMatch = /column\s+(\d+)/i.exec(String(error.message || error));
    if (columnMatch && columnMatch[1]) {
      return parseInt(columnMatch[1], 10);
    }
    
    return null;
  }
  
  /**
   * Compte les occurrences de chaque niveau de sévérité dans les issues
   */
  private countSeverities(issues: ValidationRule[]) {
    return issues.reduce((counts, issue) => {
      switch (issue.severity) {
        case Severity.ERROR:
          counts.errors++;
          break;
        case Severity.WARNING:
          counts.warnings++;
          break;
        case Severity.INFO:
          counts.infos++;
          break;
      }
      counts.total++;
      return counts;
    }, { total: 0, errors: 0, warnings: 0, infos: 0 });
  }
}

export default SyntaxValidator;
