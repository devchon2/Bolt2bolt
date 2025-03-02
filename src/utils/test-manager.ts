// #codebase: [CONTEXTE] Gestionnaire de tests pour l'application Bolt2bolt
// #codebase: [PATTERN:FACADE] Fournit une interface unifiée pour exécuter et gérer les tests
// #codebase: [DIRECTIVE] Centraliser la gestion des tests pour uniformiser les rapports et l'exécution

/*
[COPILOT_PROMPTS]
# Gestionnaire de Tests - Directives d'Implémentation

## Responsabilité
- Fournir une interface unifiée pour exécuter des tests
- Gérer la découverte et l'organisation des tests
- Générer des rapports de couverture et de résultats

## Points d'Extension
- Support pour différents frameworks de test
- Configuration flexible des suites de tests
- Intégration avec les outils de CI/CD

## Anti-patterns
- Éviter de dupliquer la fonctionnalité des frameworks de test
- Ne pas introduire de dépendances inutiles entre les tests
- Éviter de rendre les tests dépendants de l'ordre d'exécution
[COPILOT_PROMPTS]
*/

import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import LoggerService from '../core/services/logger.service';
import { AutoTestGenerator } from './auto-test-generator';

const execAsync = promisify(exec);

/**
 * Interface pour les options du gestionnaire de tests
 */
export interface TestManagerOptions {
  /** Répertoire racine des tests */
  testDir: string;
  /** Framework de test à utiliser */
  testFramework: 'jest' | 'vitest' | 'mocha';
  /** Générer automatiquement les tests manquants */
  generateMissingTests?: boolean;
  /** Options spécifiques au framework */
  frameworkOptions?: Record<string, any>;
  /** Commande d'exécution personnalisée */
  customCommand?: string;
  /** Cible d'environnement pour les tests */
  environment?: 'node' | 'jsdom' | 'custom';
  /** Logger personnalisé */
  logger?: LoggerService;
}

/**
 * Interface pour les résultats d'exécution des tests
 */
export interface TestResults {
  /** Tests passés avec succès */
  passed: number;
  /** Tests échoués */
  failed: number;
  /** Tests ignorés */
  skipped: number;
  /** Durée d'exécution en ms */
  duration: number;
  /** Fichiers testés */
  files: string[];
  /** Détails par test */
  results: Array<{
    file: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  /** Informations de couverture */
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
    files: Array<{
      file: string;
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    }>;
  };
}

/**
 * Interface pour les filtres de test
 */
export interface TestFilter {
  /** Pattern de fichiers à inclure */
  filePattern?: string;
  /** Noms de tests à inclure */
  testNamePattern?: string;
  /** Tags à inclure */
  tags?: string[];
  /** Fichiers à exclure */
  exclude?: string[];
}

/**
 * Gestionnaire central des tests
 */
export class TestManager {
  private options: TestManagerOptions;
  private testResults: TestResults | null = null;
  private isRunning: boolean = false;
  private logger: LoggerService;
  
  /**
   * Constructeur
   * @param options Options de configuration
   */
  constructor(options: TestManagerOptions) {
    this.options = {
      generateMissingTests: false,
      environment: 'node',
      ...options
    };
    
    this.logger = options.logger || LoggerService.getInstance();
  }
  
  /**
   * Exécute les tests
   * @param filter Filtres optionnels pour les tests
   */
  public async runTests(filter?: TestFilter): Promise<TestResults> {
    if (this.isRunning) {
      throw new Error('Tests already running');
    }
    
    this.isRunning = true;
    this.logger.info('Exécution des tests...', 'TestManager');
    
    try {
      // Générer les tests manquants si demandé
      if (this.options.generateMissingTests) {
        await this.generateMissingTests();
      }
      
      // Construire la commande d'exécution selon le framework
      const command = this.buildTestCommand(filter);
      this.logger.debug(`Commande d'exécution: ${command}`, 'TestManager');
      
      // Mesurer le temps d'exécution
      const startTime = Date.now();
      
      // Exécuter la commande
      const { stdout, stderr } = await execAsync(command);
      
      // Mesurer la durée
      const duration = Date.now() - startTime;
      
      // Traiter les résultats selon le framework
      this.testResults = this.parseTestResults(stdout, stderr, duration);
      
      // Journaliser les résultats
      this.logTestResults(this.testResults);
      
      return this.testResults;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Même en cas d'erreur, essayer de parser les résultats
      if (error && typeof error === 'object' && 'stdout' in error && 'stderr' in error) {
        const stdout = (error as any).stdout?.toString() || '';
        const stderr = (error as any).stderr?.toString() || '';
        
        this.testResults = this.parseTestResults(stdout, stderr, duration, true);
        this.logTestResults(this.testResults);
        
        return this.testResults;
      }
      
      this.logger.error('Erreur lors de l\'exécution des tests', error as Error, 'TestManager');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Construit la commande d'exécution des tests
   * @param filter Filtres optionnels
   */
  private buildTestCommand(filter?: TestFilter): string {
    // Utiliser une commande personnalisée si fournie
    if (this.options.customCommand) {
      let command = this.options.customCommand;
      
      // Ajouter les filtres si définis
      if (filter) {
        if (filter.filePattern) {
          command += ` --testPathPattern="${filter.filePattern}"`;
        }
        if (filter.testNamePattern) {
          command += ` --testNamePattern="${filter.testNamePattern}"`;
        }
      }
      
      return command;
    }
    
    // Construire la commande selon le framework
    switch (this.options.testFramework) {
      case 'jest':
        let jestCommand = 'npx jest --colors';
        
        // Ajouter les options de couverture
        jestCommand += ' --coverage';
        
        // Ajouter les filtres si définis
        if (filter) {
          if (filter.filePattern) {
            jestCommand += ` --testPathPattern="${filter.filePattern}"`;
          }
          if (filter.testNamePattern) {
            jestCommand += ` --testNamePattern="${filter.testNamePattern}"`;
          }
          if (filter.tags && filter.tags.length > 0) {
            const tags = filter.tags.join(' || ');
            jestCommand += ` --testPathIgnorePatterns="${tags}"`;
          }
        }
        
        // Ajouter les options spécifiques
        if (this.options.frameworkOptions) {
          for (const [key, value] of Object.entries(this.options.frameworkOptions)) {
            jestCommand += ` --${key}="${value}"`;
          }
        }
        
        return jestCommand;
        
      case 'vitest':
        let vitestCommand = 'npx vitest run --reporter=verbose';
        
        // Ajouter les options de couverture
        vitestCommand += ' --coverage';
        
        // Ajouter les filtres si définis
        if (filter) {
          if (filter.filePattern) {
            vitestCommand += ` ${filter.filePattern}`;
          }
          if (filter.testNamePattern) {
            vitestCommand += ` --testNamePattern="${filter.testNamePattern}"`;
          }
        }
        
        // Ajouter l'environnement
        if (this.options.environment) {
          vitestCommand += ` --environment=${this.options.environment}`;
        }
        
        // Ajouter les options spécifiques
        if (this.options.frameworkOptions) {
          for (const [key, value] of Object.entries(this.options.frameworkOptions)) {
            vitestCommand += ` --${key}="${value}"`;
          }
        }
        
        return vitestCommand;
        
      case 'mocha':
        let mochaCommand = 'npx mocha';
        
        // Ajouter le pattern de fichiers
        if (filter?.filePattern) {
          mochaCommand += ` "${filter.filePattern}"`;
        } else {
          mochaCommand += ` "${this.options.testDir}/**/*.test.{js,ts}"`;
        }
        
        // Ajouter les options de compilation TypeScript
        mochaCommand += ' --require ts-node/register';
        
        // Ajouter les filtres de noms de tests
        if (filter?.testNamePattern) {
          mochaCommand += ` --grep="${filter.testNamePattern}"`;
        }
        
        // Ajouter les options spécifiques
        if (this.options.frameworkOptions) {
          for (const [key, value] of Object.entries(this.options.frameworkOptions)) {
            mochaCommand += ` --${key}="${value}"`;
          }
        }
        
        return mochaCommand;
        
      default:
        throw new Error(`Framework de test non supporté: ${this.options.testFramework}`);
    }
  }
  
  /**
   * Parse les résultats de l'exécution des tests
   * @param stdout Sortie standard
   * @param stderr Sortie d'erreur
   * @param duration Durée d'exécution
   * @param hasFailed Indique si l'exécution a échoué
   */
  private parseTestResults(stdout: string, stderr: string, duration: number, hasFailed: boolean = false): TestResults {
    // Résultat par défaut
    const results: TestResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      files: [],
      results: []
    };
    
    try {
      // Parser les résultats selon le framework
      switch (this.options.testFramework) {
        case 'jest':
          return this.parseJestResults(stdout, stderr, duration, hasFailed);
        case 'vitest':
          return this.parseVitestResults(stdout, stderr, duration, hasFailed);
        case 'mocha':
          return this.parseMochaResults(stdout, stderr, duration, hasFailed);
        default:
          return results;
      }
    } catch (error) {
      this.logger.error('Erreur lors du parsing des résultats de tests', error as Error, 'TestManager');
      
      // Retourner des résultats minimaux en cas d'erreur
      return {
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        files: [],
        results: [{
          file: 'unknown',
          name: 'Parse error',
          status: 'failed',
          duration: 0,
          error: String(error)
        }]
      };
    }
  }
  
  /**
   * Parse les résultats pour Jest
   */
  private parseJestResults(stdout: string, stderr: string, duration: number, hasFailed: boolean): TestResults {
    const results: TestResults = {
      passed: 0,
      failed: hasFailed ? 1 : 0,
      skipped: 0,
      duration,
      files: [],
      results: []
    };
    
    // Extraire le résumé des tests
    const summaryMatch = stdout.match(/Tests:\s+(\d+) passed,\s+(\d+) failed,\s+(\d+) total/);
    if (summaryMatch) {
      results.passed = parseInt(summaryMatch[1], 10);
      results.failed = parseInt(summaryMatch[2], 10);
      const total = parseInt(summaryMatch[3], 10);
      results.skipped = total - results.passed - results.failed;
    }
    
    // Extraire les fichiers testés
    const fileMatches = stdout.match(/PASS|FAIL\s+([\w\-/.]+)/g);
    if (fileMatches) {
      results.files = fileMatches.map(match => match.split(/\s+/)[1]);
    }
    
    // Extraire les informations de couverture
    const coverageMatch = stdout.match(/All files[^\n]*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1].trim().replace('%', '')),
        branches: parseFloat(coverageMatch[2].trim().replace('%', '')),
        functions: parseFloat(coverageMatch[3].trim().replace('%', '')),
        lines: parseFloat(coverageMatch[4].trim().replace('%', '')),
        files: []
      };
    }
    
    return results;
  }
  
  /**
   * Parse les résultats pour Vitest
   */
  private parseVitestResults(stdout: string, stderr: string, duration: number, hasFailed: boolean): TestResults {
    const results: TestResults = {
      passed: 0,
      failed: hasFailed ? 1 : 0,
      skipped: 0,
      duration,
      files: [],
      results: []
    };
    
    // Extraire le résumé des tests
    const summaryMatch = stdout.match(/Tests:\s+(\d+) passed,\s+(\d+) failed,\s+(\d+) total/);
    if (summaryMatch) {
      results.passed = parseInt(summaryMatch[1], 10);
      results.failed = parseInt(summaryMatch[2], 10);
      const total = parseInt(summaryMatch[3], 10);
      results.skipped = total - results.passed - results.failed;
    }
    
    // Extraire les fichiers testés
    const fileMatches = stdout.match(/PASS|FAIL\s+([\w\-/.]+)/g);
    if (fileMatches) {
      results.files = fileMatches.map(match => match.split(/\s+/)[1]);
    }
    
    // Extraire les informations de couverture
    const coverageMatch = stdout.match(/All files[^\n]*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1].trim().replace('%', '')),
        branches: parseFloat(coverageMatch[2].trim().replace('%', '')),
        functions: parseFloat(coverageMatch[3].trim().replace('%', '')),
        lines: parseFloat(coverageMatch[4].trim().replace('%', '')),
        files: []
      };
    }
    
    return results;
  }
  
  /**
   * Parse les résultats pour Mocha
   */
  private parseMochaResults(stdout: string, stderr: string, duration: number, hasFailed: boolean): TestResults {
    const results: TestResults = {
      passed: 0,
      failed: hasFailed ? 1 : 0,
      skipped: 0,
      duration,
      files: [],
      results: []
    };
    
    // Extraire le résumé des tests
    const summaryMatch = stdout.match(/(\d+) passing/);
    if (summaryMatch) {
      results.passed = parseInt(summaryMatch[1], 10);
    }
    
    const failedMatch = stdout.match(/(\d+) failing/);
    if (failedMatch) {
      results.failed = parseInt(failedMatch[1], 10);
    }
    
    const skippedMatch = stdout.match(/(\d+) pending/);
    if (skippedMatch) {
      results.skipped = parseInt(skippedMatch[1], 10);
    }
    
    // Extraire les fichiers testés
    const fileMatches = stdout.match(/(\d+)\) ([\w\-/.]+)/g);
    if (fileMatches) {
      results.files = fileMatches.map(match => match.split(/\s+/)[1]);
    }
    
    return results;
  }
  
  /**
   * Journalise les résultats des tests
   * @param results Résultats des tests
   */
  private logTestResults(results: TestResults): void {
    this.logger.info(`Tests passés: ${results.passed}`, 'TestManager');
    this.logger.info(`Tests échoués: ${results.failed}`, 'TestManager');
    this.logger.info(`Tests ignorés: ${results.skipped}`, 'TestManager');
    this.logger.info(`Durée d'exécution: ${results.duration}ms`, 'TestManager');
    
    if (results.coverage) {
      this.logger.info('Couverture:', 'TestManager');
      this.logger.info(`  Statements: ${results.coverage.statements}%`, 'TestManager');
      this.logger.info(`  Branches: ${results.coverage.branches}%`, 'TestManager');
      this.logger.info(`  Functions: ${results.coverage.functions}%`, 'TestManager');
      this.logger.info(`  Lines: ${results.coverage.lines}%`, 'TestManager');
    }
  }
  
  /**
   * Génère les tests manquants
   */
  private async generateMissingTests(): Promise<void> {
    this.logger.info('Génération des tests manquants...', 'TestManager');
    
    const generator = new AutoTestGenerator({
      testDir: this.options.testDir,
      framework: this.options.testFramework
    });
    
    await generator.generate();
  }

  /**
   * Génère des tests unitaires paramétrés basés sur un ensemble de cas de test.
   * @param options Options de génération de tests
   * @param testCases Ensemble de cas { input, expected }
   */
  public generateParameterizedTests(options: TestGenerationOptions, testCases: Array<{input: any, expected: any, name?: string}>): string {
    let imports = `import { describe, it, expect } from 'vitest';\n`;
    
    // Ajouter l'import du module à tester
    if (options.moduleName) {
      imports += `import { ${options.functionName} } from '${options.moduleName}';\n`;
    }
    
    let tests = `${imports}\n`;
    tests += `describe('${options.functionName}', () => {\n`;
    
    // Générer un test pour chaque cas de test
    testCases.forEach((testCase, index) => {
      const testName = testCase.name || `Test case ${index + 1}`;
      tests += `  it('${testName}', () => {\n`;
      tests += `    // Arrange\n`;
      
      // Formater les entrées de manière lisible
      let inputStr = JSON.stringify(testCase.input, null, 2)
        .replace(/\n/g, '\n    ')
        .replace(/^/gm, '    ');
      
      tests += `    const input = ${inputStr};\n`;
      
      // Formater les résultats attendus de manière lisible
      let expectedStr = JSON.stringify(testCase.expected, null, 2)
        .replace(/\n/g, '\n    ')
        .replace(/^/gm, '    ');
      
      tests += `    const expected = ${expectedStr};\n`;
      tests += `    \n    // Act\n`;
      
      // Déterminer comment appeler la fonction selon le type d'entrée
      if (Array.isArray(testCase.input)) {
        tests += `    const result = ${options.functionName}(...input);\n`;
      } else if (typeof testCase.input === 'object' && testCase.input !== null) {
        tests += `    const result = ${options.functionName}(input);\n`;
      } else {
        tests += `    const result = ${options.functionName}(input);\n`;
      }
      
      tests += `    \n    // Assert\n`;
      
      // Choisir le matcher approprié selon le type de résultat attendu
      if (typeof testCase.expected === 'object' && testCase.expected !== null) {
        tests += `    expect(result).toEqual(expected);\n`;
      } else {
        tests += `    expect(result).toBe(expected);\n`;
      }
      
      tests += `  });\n\n`;
    });
    
    tests += '});';
    return tests;
  }
}

export default TestManager;
