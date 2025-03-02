// #codebase: [CONTEXTE] Générateur automatique de tests unitaires pour Bolt2bolt
// #codebase: [PATTERN:FACTORY] Génère des tests unitaires à partir de l'analyse du code source
// #codebase: [DIRECTIVE] Prioriser la couverture maximum et l'efficacité des tests générés

/*
[COPILOT_PROMPTS]
# Générateur Automatique de Tests - Directives d'Implémentation

## Responsabilité
- Analyser le code source pour identifier les unités testables (fonctions, classes, méthodes)
- Générer des tests unitaires qui maximisent la couverture de code
- Prendre en compte les spécificités des différents frameworks de tests

## Points d'Extension
- Support pour différents frameworks de test (Jest, Vitest, Mocha)
- Stratégies de génération de données de test pour différents types
- Intégration avec les systèmes d'analyse statique

## Anti-patterns
- Éviter de générer des tests redondants ou inutiles
- Ne pas faire d'hypothèses sur l'implémentation interne des fonctions testées
- Éviter les dépendances directes vers des implémentations concrètes
[COPILOT_PROMPTS]
*/

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execSync } from 'child_process';
import { testUtils } from './test-utils';
import LoggerService from '../core/services/logger.service';

/**
 * Interface pour les options du générateur de tests
 */
export interface AutoTestGeneratorOptions {
  /** Répertoire des tests */
  testDir: string;
  /** Framework de test à utiliser */
  framework: 'jest' | 'vitest' | 'mocha';
  /** Pattern pour trouver les fichiers source */
  sourcePattern?: string[];
  /** Ignorer certains fichiers ou dossiers */
  ignore?: string[];
  /** Générer des mocks automatiquement */
  autoMock?: boolean;
  /** Stratégie de génération de données de test */
  testDataStrategy?: 'random' | 'boundary' | 'realistic' | 'mock';
  /** Niveau de verbosité des tests générés */
  verbosity?: 'minimal' | 'normal' | 'detailed';
}

/**
 * Interface pour les métadonnées extraites d'un fichier source
 */
interface SourceFileMetadata {
  filePath: string;
  importedModules: string[];
  exportedElements: Array<{
    name: string;
    type: 'function' | 'class' | 'interface' | 'constant' | 'type';
    node: ts.Node;
  }>;
  hasExistingTests: boolean;
}

/**
 * Classe responsable de générer automatiquement des tests unitaires
 */
export class AutoTestGenerator {
  private options: AutoTestGeneratorOptions;
  private logger: LoggerService;
  private sourceFiles: Map<string, SourceFileMetadata> = new Map();
  private projectRoot: string;
  
  /**
   * Constructeur
   * @param options Options de configuration
   */
  constructor(options: AutoTestGeneratorOptions) {
    this.options = {
      sourcePattern: ['**/*.ts', '**/*.tsx'],
      ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      autoMock: true,
      testDataStrategy: 'boundary',
      verbosity: 'normal',
      ...options
    };
    
    this.logger = LoggerService.getInstance();
    this.projectRoot = this.findProjectRoot();
  }
  
  /**
   * Trouve la racine du projet
   */
  private findProjectRoot(): string {
    let currentDir = process.cwd();
    
    // Rechercher le fichier package.json en remontant les dossiers
    while (currentDir !== path.parse(currentDir).root) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Si non trouvé, utiliser le répertoire courant
    return process.cwd();
  }
  
  /**
   * Génère des tests pour les fichiers sans couverture suffisante
   */
  public async generate(): Promise<{
    testsGenerated: number;
    filesProcessed: number;
    coverage: { before: number; after: number };
  }> {
    this.logger.info('Démarrage de la génération automatique de tests', 'AutoTestGenerator');
    
    // 1. Analyser la couverture actuelle
    const initialCoverage = await this.analyzeCoverage();
    
    // 2. Scanner les fichiers source
    await this.scanSourceFiles();
    
    // 3. Identifier les fichiers ayant besoin de tests
    const filesToTest = await this.identifyFilesRequiringTests();
    
    this.logger.info(`${filesToTest.length} fichiers identifiés comme nécessitant des tests`, 'AutoTestGenerator');
    
    // 4. Générer les tests
    let testsGenerated = 0;
    
    for (const fileMetadata of filesToTest) {
      try {
        const testFilePath = this.getTestFilePath(fileMetadata.filePath);
        
        // Vérifier si le fichier de test existe déjà
        const testFileExists = fs.existsSync(testFilePath);
        
        // Générer ou compléter le fichier de test
        if (testFileExists) {
          this.logger.debug(`Compléter le fichier de test existant: ${testFilePath}`, 'AutoTestGenerator');
          const testContent = await this.completeExistingTest(fileMetadata, testFilePath);
          if (testContent) {
            fs.writeFileSync(testFilePath, testContent, 'utf-8');
            testsGenerated++;
          }
        } else {
          this.logger.debug(`Générer un nouveau fichier de test: ${testFilePath}`, 'AutoTestGenerator');
          const testContent = await this.generateTestFile(fileMetadata);
          
          // Créer le répertoire parent si nécessaire
          const testDir = path.dirname(testFilePath);
          if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
          }
          
          fs.writeFileSync(testFilePath, testContent, 'utf-8');
          testsGenerated++;
        }
      } catch (error) {
        this.logger.error(`Erreur lors de la génération du test pour ${fileMetadata.filePath}`, error as Error, 'AutoTestGenerator');
      }
    }
    
    // 5. Analyser la nouvelle couverture
    const finalCoverage = await this.analyzeCoverage();
    
    this.logger.info(`Génération de tests terminée. ${testsGenerated} tests générés.`, 'AutoTestGenerator');
    this.logger.info(`Couverture: ${initialCoverage}% → ${finalCoverage}%`, 'AutoTestGenerator');
    
    return {
      testsGenerated,
      filesProcessed: filesToTest.length,
      coverage: {
        before: initialCoverage,
        after: finalCoverage
      }
    };
  }
  
  /**
   * Analyse la couverture de code actuelle
   * @returns Pourcentage de couverture
   */
  private async analyzeCoverage(): Promise<number> {
    try {
      const coverageOutputPath = path.join(this.projectRoot, 'coverage.json');
      
      // Exécuter les tests avec génération de couverture
      execSync(`npx ${this.options.framework} --coverage --json --outputFile=${coverageOutputPath}`, {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      
      // Lire le fichier de couverture
      if (fs.existsSync(coverageOutputPath)) {
        const coverageContent = fs.readFileSync(coverageOutputPath, 'utf-8');
        const coverageData = JSON.parse(coverageContent);
        
        const totalStatements = coverageData.total.statements.total;
        const coveredStatements = coverageData.total.statements.covered;
        return Math.round((coveredStatements / totalStatements) * 100);
      }
      
      return 0;
    } catch (error) {
      this.logger.warn('Erreur lors de l\'analyse de couverture', 'AutoTestGenerator');
      return 0;
    }
  }
  
  /**
   * Scan les fichiers source du projet
   */
  private async scanSourceFiles(): Promise<void> {
    this.logger.info('Scan des fichiers source...', 'AutoTestGenerator');
    
    // Utiliser glob pour trouver les fichiers
    const glob = require('glob');
    const sourceFiles: string[] = [];
    
    for (const pattern of this.options.sourcePattern!) {
      const files = glob.sync(pattern, {
        cwd: this.projectRoot,
        ignore: this.options.ignore,
        absolute: true
      });
      
      sourceFiles.push(...files);
    }
    
    this.logger.debug(`${sourceFiles.length} fichiers source trouvés`, 'AutoTestGenerator');
    
    // Analyser chaque fichier
    for (const filePath of sourceFiles) {
      try {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          filePath,
          sourceCode,
          ts.ScriptTarget.Latest,
          true
        );
        
        const metadata = this.extractFileMetadata(sourceFile, filePath);
        this.sourceFiles.set(filePath, metadata);
      } catch (error) {
        this.logger.error(`Erreur lors de l'analyse du fichier ${filePath}`, error as Error, 'AutoTestGenerator');
      }
    }
  }
  
  /**
   * Extrait les métadonnées d'un fichier source
   * @param sourceFile Fichier source TypeScript
   * @param filePath Chemin du fichier
   */
  private extractFileMetadata(sourceFile: ts.SourceFile, filePath: string): SourceFileMetadata {
    const importedModules: string[] = [];
    const exportedElements: SourceFileMetadata['exportedElements'] = [];
    
    // Vérifier s'il existe déjà un fichier de test
    const testFilePath = this.getTestFilePath(filePath);
    const hasExistingTests = fs.existsSync(testFilePath);
    
    // Parcourir l'AST pour trouver les imports et les exports
    sourceFile.forEachChild(node => {
      // Traiter les imports
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        importedModules.push(moduleSpecifier);
      }
      
      // Traiter les exports de fonctions
      if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.name) {
          exportedElements.push({
            name: node.name.text,
            type: 'function',
            node
          });
        }
      }
      
      // Traiter les exports de classes
      if (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.name) {
          exportedElements.push({
            name: node.name.text,
            type: 'class',
            node
          });
        }
      }
      
      // Traiter les exports d'interfaces
      if (ts.isInterfaceDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exportedElements.push({
          name: node.name.text,
          type: 'interface',
          node
        });
      }
      
      // Traiter les exports de constantes et types
      if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportedElements.push({
              name: decl.name.text,
              type: 'constant',
              node: decl
            });
          }
        }
      }
      
      // Traiter les exports de types
      if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exportedElements.push({
          name: node.name.text,
          type: 'type',
          node
        });
      }
    });
    
    return {
      filePath,
      importedModules,
      exportedElements,
      hasExistingTests
    };
  }
  
  /**
   * Identifie les fichiers nécessitant des tests
   */
  private async identifyFilesRequiringTests(): Promise<SourceFileMetadata[]> {
    const filesToTest: SourceFileMetadata[] = [];
    
    // Trouver les fichiers qui ont des exports mais pas de tests existants
    // ou des tests mais avec une couverture insuffisante
    for (const [_, metadata] of this.sourceFiles) {
      // Ignorer les fichiers sans éléments exportés
      if (metadata.exportedElements.length === 0) {
        continue;
      }
      
      // Priorité aux fichiers sans tests existants
      if (!metadata.hasExistingTests) {
        filesToTest.push(metadata);
        continue;
      }
      
      // Pour les fichiers avec tests existants, vérifier la couverture
      const fileCoverage = await this.getFileCoverage(metadata.filePath);
      if (fileCoverage < 80) { // Seuil de 80% de couverture
        filesToTest.push(metadata);
      }
    }
    
    return filesToTest;
  }
  
  /**
   * Obtient la couverture pour un fichier spécifique
   * @param filePath Chemin du fichier
   */
  private async getFileCoverage(filePath: string): Promise<number> {
    try {
      const coverageOutputPath = path.join(this.projectRoot, 'coverage.json');
      
      if (fs.existsSync(coverageOutputPath)) {
        const coverageContent = fs.readFileSync(coverageOutputPath, 'utf-8');
        const coverageData = JSON.parse(coverageContent);
        
        // Trouver l'entrée de couverture pour ce fichier
        const relativePath = path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
        const fileData = coverageData.coverageMap && coverageData.coverageMap[relativePath];
        
        if (fileData && fileData.statements) {
          return fileData.statements.pct || 0;
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Génère un fichier de test complet pour un fichier source
   * @param fileMetadata Métadonnées du fichier source
   */
  private async generateTestFile(fileMetadata: SourceFileMetadata): Promise<string> {
    const relativePath = path.relative(this.projectRoot, fileMetadata.filePath);
    const modulePath = this.getModuleImportPath(fileMetadata.filePath);
    
    let testContent = '';
    
    // Ajouter l'en-tête et les imports
    testContent += this.generateTestFileHeader(relativePath);
    testContent += this.generateImports(fileMetadata, modulePath);
    
    // Ajouter les mocks si nécessaire
    if (this.options.autoMock) {
      testContent += this.generateMocks(fileMetadata);
    }
    
    // Générer les tests pour chaque élément exporté
    for (const element of fileMetadata.exportedElements) {
      // Ignorer les interfaces et les types pour les tests directs
      if (element.type === 'interface' || element.type === 'type') {
        continue;
      }
      
      testContent += this.generateTestForElement(element, fileMetadata);
    }
    
    return testContent;
  }
  
  /**
   * Complète un fichier de test existant
   * @param fileMetadata Métadonnées du fichier source
   * @param testFilePath Chemin du fichier de test
   */
  private async completeExistingTest(fileMetadata: SourceFileMetadata, testFilePath: string): Promise<string | null> {
    try {
      const testContent = fs.readFileSync(testFilePath, 'utf-8');
      const testAst = ts.createSourceFile(
        testFilePath,
        testContent,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Analyser les éléments testés existants
      const testedElements = new Set<string>();
      
      testAst.forEachChild(node => {
        // Rechercher les appels à describe pour identifier les éléments déjà testés
        if (ts.isExpressionStatement(node) && 
            ts.isCallExpression(node.expression) && 
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'describe') {
          
          const args = node.expression.arguments;
          if (args.length > 0 && ts.isStringLiteral(args[0])) {
            testedElements.add(args[0].text);
          }
        }
      });
      
      // Générer des tests pour les éléments non testés
      let addedContent = '';
      let hasNewTests = false;
      
      for (const element of fileMetadata.exportedElements) {
        // Ignorer les interfaces et les types
        if (element.type === 'interface' || element.type === 'type') {
          continue;
        }
        
        // Vérifier si l'élément est déjà testé
        if (!testedElements.has(element.name)) {
          addedContent += this.generateTestForElement(element, fileMetadata);
          hasNewTests = true;
        }
      }
      
      if (hasNewTests) {
        // Trouver la position où ajouter les nouveaux tests
        return testContent + '\n' + addedContent;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Erreur lors de la complétion du test ${testFilePath}`, error as Error, 'AutoTestGenerator');
      return null;
    }
  }
  
  /**
   * Génère l'en-tête du fichier de test
   * @param relativePath Chemin relatif du fichier source
   */
  private generateTestFileHeader(relativePath: string): string {
    return `// Tests générés automatiquement pour ${relativePath}
// #codebase: [TEST:UNITAIRE] Tests unitaires générés automatiquement
// #codebase: [DIRECTIVE] Compléter avec des assertions spécifiques au besoin

`;
  }
  
  /**
   * Génère les imports pour le fichier de test
   * @param fileMetadata Métadonnées du fichier source
   * @param modulePath Chemin d'importation du module à tester
   */
  private generateImports(fileMetadata: SourceFileMetadata, modulePath: string): string {
    let imports = '';
    
    // Import des outils de test selon le framework
    switch (this.options.framework) {
      case 'jest':
        imports += `import { describe, test, expect } from '@jest/globals';\n`;
        break;
      case 'vitest':
        imports += `import { describe, it, expect } from 'vitest';\n`;
        break;
      case 'mocha':
        imports += `import { describe, it } from 'mocha';\nimport { expect } from 'chai';\n`;
        break;
    }
    
    // Import des éléments à tester
    if (fileMetadata.exportedElements.length > 0) {
      const elementsToImport = fileMetadata.exportedElements
        .filter(e => e.type !== 'interface' && e.type !== 'type')
        .map(e => e.name)
        .join(', ');
      
      if (elementsToImport) {
        imports += `import { ${elementsToImport} } from '${modulePath}';\n`;
      }
    }
    
    imports += '\n';
    return imports;
  }
  
  /**
   * Génère des mocks pour les dépendances
   * @param fileMetadata Métadonnées du fichier source
   */
  private generateMocks(fileMetadata: SourceFileMetadata): string {
    let mocks = '';
    
    // Générer des mocks pour les modules importés si nécessaire
    if (this.options.autoMock && fileMetadata.importedModules.length > 0) {
      // Filtrer les modules qui ne sont pas des imports relatifs ni des modules node
      const externalModules = fileMetadata.importedModules.filter(
        m => !m.startsWith('.') && !m.startsWith('fs') && !m.startsWith('path')
      );
      
      if (externalModules.length > 0) {
        mocks += '// Mocks automatiques pour les dépendances externes\n';
        
        switch (this.options.framework) {
          case 'jest':
            externalModules.forEach(module => {
              mocks += `jest.mock('${module}');\n`;
            });
            break;
          case 'vitest':
            externalModules.forEach(module => {
              mocks += `import { vi } from 'vitest';\nvi.mock('${module}');\n`;
            });
            break;
          case 'mocha':
            // Pour Mocha, utiliser sinon ou un autre framework de mock
            mocks += `// Note: Pour Mocha, configurez manuellement les mocks avec sinon ou une autre bibliothèque\n`;
            break;
        }
        
        mocks += '\n';
      }
    }
    
    return mocks;
  }
  
  /**
   * Génère un test pour un élément exporté
   * @param element Élément exporté
   * @param fileMetadata Métadonnées du fichier source
   */
  private generateTestForElement(
    element: SourceFileMetadata['exportedElements'][0],
    fileMetadata: SourceFileMetadata
  ): string {
    switch (element.type) {
      case 'function':
        return this.generateFunctionTest(element, fileMetadata);
      case 'class':
        return this.generateClassTest(element, fileMetadata);
      case 'constant':
        return this.generateConstantTest(element);
      default:
        return '';
    }
  }
  
  /**
   * Génère un test pour une fonction
   * @param element Élément de fonction
   * @param fileMetadata Métadonnées du fichier
   */
  private generateFunctionTest(
    element: SourceFileMetadata['exportedElements'][0],
    fileMetadata: SourceFileMetadata
  ): string {
    const functionNode = element.node as ts.FunctionDeclaration;
    const parameters = functionNode.parameters.map(p => p.name.getText());
    
    let testCases = '';
    
    // Générer des cas de test si possible
    if (this.options.testDataStrategy === 'boundary') {
      testCases = this.generateBoundaryTestCases(functionNode);
    }
    
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    return `describe('${element.name}', () => {
  ${testFnName}('devrait être défini', () => {
    expect(${element.name}).toBeDefined();
  });
  
  ${testFnName}('devrait s\'exécuter sans erreur', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode)}
    
    // Act & Assert
    expect(() => ${element.name}(${parameters.map(() => 'undefined').join(', ')})).not.toThrow();
  });
  
  ${testCases}
});\n\n`;
  }
  
  /**
   * Génère des cas de test limites pour une fonction
   * @param functionNode Nœud de fonction
   */
  private generateBoundaryTestCases(functionNode: ts.FunctionDeclaration): string {
    let testCases = '';
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    // Pour chaque paramètre, générer des cas de test limites
    functionNode.parameters.forEach((param, index) => {
      const paramName = param.name.getText();
      
      // Détecter le type du paramètre
      let paramType = param.type ? param.type.getText() : 'any';
      
      // Générer des valeurs de test selon le type
      if (paramType.includes('string')) {
        testCases += `
  ${testFnName}('devrait gérer une chaîne vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, '""')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, '""')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('number')) {
        testCases += `
  ${testFnName}('devrait gérer la valeur zéro pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, '0')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, '0')});
    
    // Assert
    expect(result).toBeDefined();
  });
  
  ${testFnName}('devrait gérer une grande valeur pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, '99999')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, '99999')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('boolean')) {
        testCases += `
  ${testFnName}('devrait gérer la valeur true pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, 'true')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, 'true')});
    
    // Assert
    expect(result).toBeDefined();
  });
  
  ${testFnName}('devrait gérer la valeur false pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, 'false')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, 'false')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('[]') || paramType.includes('Array')) {
        testCases += `
  ${testFnName}('devrait gérer un tableau vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, '[]')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, '[]')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('object') || paramType.startsWith('{')) {
        testCases += `
  ${testFnName}('devrait gérer un objet vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(functionNode, index, '{}')}
    
    // Act
    const result = ${functionNode.name!.getText()}(${this.generateParameterValues(functionNode, index, '{}')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      }
    });
    
    return testCases;
  }
  
  /**
   * Génère des mocks pour les paramètres d'une fonction
   * @param functionNode Nœud de fonction
   * @param targetIndex Index du paramètre à modifier (optionnel)
   * @param targetValue Valeur à utiliser pour le paramètre ciblé (optionnel)
   */
  private generateParameterMocks(
    functionNode: ts.FunctionDeclaration,
    targetIndex: number = -1,
    targetValue: string = ''
  ): string {
    return '';
  }
  
  /**
   * Génère des valeurs pour les paramètres d'une fonction
   * @param functionNode Nœud de fonction
   * @param targetIndex Index du paramètre à modifier (optionnel)
   * @param targetValue Valeur à utiliser pour le paramètre ciblé (optionnel)
   */
  private generateParameterValues(
    functionNode: ts.FunctionDeclaration,
    targetIndex: number = -1,
    targetValue: string = ''
  ): string {
    return functionNode.parameters.map((param, index) => {
      if (index === targetIndex) {
        return targetValue;
      }
      return 'undefined';
    }).join(', ');
  }
  
  /**
   * Génère un test pour une classe
   * @param element Élément de classe
   * @param fileMetadata Métadonnées du fichier
   */
  private generateClassTest(
    element: SourceFileMetadata['exportedElements'][0],
    fileMetadata: SourceFileMetadata
  ): string {
    const classNode = element.node as ts.ClassDeclaration;
    
    let testCases = '';
    
    // Générer des cas de test pour les méthodes de la classe
    classNode.members.forEach(member => {
      if (ts.isMethodDeclaration(member)) {
        testCases += this.generateMethodTest(member, classNode);
      }
    });
    
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    return `describe('${element.name}', () => {
  ${testFnName}('devrait être défini', () => {
    expect(${element.name}).toBeDefined();
  });
  
  ${testFnName}('devrait pouvoir être instancié', () => {
    const instance = new ${element.name}();
    expect(instance).toBeInstanceOf(${element.name});
  });
  
  ${testCases}
});\n\n`;
  }
  
  /**
   * Génère un test pour une méthode de classe
   * @param methodNode Nœud de méthode
   * @param classNode Nœud de classe
   */
  private generateMethodTest(
    methodNode: ts.MethodDeclaration,
    classNode: ts.ClassDeclaration
  ): string {
    const methodName = methodNode.name.getText();
    const parameters = methodNode.parameters.map(p => p.name.getText());
    
    let testCases = '';
    
    // Générer des cas de test si possible
    if (this.options.testDataStrategy === 'boundary') {
      testCases = this.generateBoundaryTestCases(methodNode);
    }
    
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    return `describe('${methodName}', () => {
  ${testFnName}('devrait être défini', () => {
    const instance = new ${classNode.name!.getText()}();
    expect(instance.${methodName}).toBeDefined();
  });
  
  ${testFnName}('devrait s\'exécuter sans erreur', () => {
    const instance = new ${classNode.name!.getText()}();
    
    // Arrange
    ${this.generateParameterMocks(methodNode)}
    
    // Act & Assert
    expect(() => instance.${methodName}(${parameters.map(() => 'undefined').join(', ')})).not.toThrow();
  });
  
  ${testCases}
});\n\n`;
  }
  
  /**
   * Génère des cas de test limites pour une méthode
   * @param methodNode Nœud de méthode
   */
  private generateBoundaryTestCases(methodNode: ts.MethodDeclaration): string {
    let testCases = '';
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    // Pour chaque paramètre, générer des cas de test limites
    methodNode.parameters.forEach((param, index) => {
      const paramName = param.name.getText();
      
      // Détecter le type du paramètre
      let paramType = param.type ? param.type.getText() : 'any';
      
      // Générer des valeurs de test selon le type
      if (paramType.includes('string')) {
        testCases += `
  ${testFnName}('devrait gérer une chaîne vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, '""')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, '""')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('number')) {
        testCases += `
  ${testFnName}('devrait gérer la valeur zéro pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, '0')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, '0')});
    
    // Assert
    expect(result).toBeDefined();
  });
  
  ${testFnName}('devrait gérer une grande valeur pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, '99999')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, '99999')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('boolean')) {
        testCases += `
  ${testFnName}('devrait gérer la valeur true pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, 'true')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, 'true')});
    
    // Assert
    expect(result).toBeDefined();
  });
  
  ${testFnName}('devrait gérer la valeur false pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, 'false')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, 'false')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('[]') || paramType.includes('Array')) {
        testCases += `
  ${testFnName}('devrait gérer un tableau vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, '[]')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, '[]')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      } else if (paramType.includes('object') || paramType.startsWith('{')) {
        testCases += `
  ${testFnName}('devrait gérer un objet vide pour ${paramName}', () => {
    // Arrange
    ${this.generateParameterMocks(methodNode, index, '{}')}
    
    // Act
    const result = instance.${methodNode.name!.getText()}(${this.generateParameterValues(methodNode, index, '{}')});
    
    // Assert
    expect(result).toBeDefined();
  });`;
      }
    });
    
    return testCases;
  }
  
  /**
   * Génère des mocks pour les paramètres d'une méthode
   * @param methodNode Nœud de méthode
   * @param targetIndex Index du paramètre à modifier (optionnel)
   * @param targetValue Valeur à utiliser pour le paramètre ciblé (optionnel)
   */
  private generateParameterMocks(
    methodNode: ts.MethodDeclaration,
    targetIndex: number = -1,
    targetValue: string = ''
  ): string {
    return '';
  }
  
  /**
   * Génère des valeurs pour les paramètres d'une méthode
   * @param methodNode Nœud de méthode
   * @param targetIndex Index du paramètre à modifier (optionnel)
   * @param targetValue Valeur à utiliser pour le paramètre ciblé (optionnel)
   */
  private generateParameterValues(
    methodNode: ts.MethodDeclaration,
    targetIndex: number = -1,
    targetValue: string = ''
  ): string {
    return methodNode.parameters.map((param, index) => {
      if (index === targetIndex) {
        return targetValue;
      }
      return 'undefined';
    }).join(', ');
  }
  
  /**
   * Génère un test pour une constante
   * @param element Élément de constante
   */
  private generateConstantTest(element: SourceFileMetadata['exportedElements'][0]): string {
    const testFnName = this.options.framework === 'jest' ? 'test' : 'it';
    
    return `describe('${element.name}', () => {
  ${testFnName}('devrait être défini', () => {
    expect(${element.name}).toBeDefined();
  });
});\n\n`;
  }
  
  /**
   * Obtient le chemin d'importation du module à tester
   * @param filePath Chemin du fichier source
   */
  private getModuleImportPath(filePath: string): string {
    const relativePath = path.relative(this.options.testDir, filePath);
    return './' + relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
  }

  /**
   * Génère des tests d'intégration pour les composants principaux
   * @param components Liste des composants à tester
   * @returns Code source des tests générés
   */
  public generateIntegrationTests(components: string[]): string {
    // Implémentation de la génération des tests d'intégration
    // ...logique de génération...
    return `// Tests d'intégration générés pour les composants: ${components.join(', ')}`;
  }
}

export default AutoTestGenerator;