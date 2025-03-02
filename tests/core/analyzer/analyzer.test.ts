// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.

import { Analyzer, analyze } from '../../../src/core/analyzer/analyzer';
import { Project } from 'ts-morph';
import { describe, it, expect, vi } from 'vitest';
import { analyzeCode } from '../../src/analyzer';

describe('Analyzer', () => {
  let analyzer: Analyzer;
  
  beforeEach(() => {
    analyzer = new Analyzer({
      projectOptions: { 
        tsConfigFilePath: 'tsconfig.json'
      }
    });
  });

  describe('analyzeProject', () => {
    it('should analyze a project and return valid results', async () => {
      // Arrange
      const sourcePath = './test-fixtures/sample-project';
      
      // Act
      const result = await analyzer.analyzeProject(sourcePath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.security).toBeDefined();
    });
  });

  describe('handleCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const code = `
        import { B } from './moduleB';
        export const A = B;
      `;
      const result = analyzeCode(code);
      expect(result.warnings).toContain('CIRCULAR_REF');
    });

    it('should detect circular dependencies correctly', () => {
      const sourcePath = './test-fixtures/circular-dependencies';
      const result = analyzer.analyzeProject(sourcePath);
      expect(result.dependencies.circular.length).toBeGreaterThan(0);
    });
  });
});

describe('scanForDeprecatedMethods', () => {
  it('devrait détecter les méthodes dépréciées dans le code', () => {
    const sourceCode = `
      function test() {
        oldMethod1();
        oldMethod2();
      }
    `;
    const result = scanForDeprecatedMethods(sourceCode);
    expect(result).toEqual(['oldMethod1', 'oldMethod2']);
  });

  it('ne devrait pas détecter de méthodes dépréciées si elles ne sont pas présentes', () => {
    const sourceCode = `
      function test() {
        newMethod();
      }
    `;
    const result = scanForDeprecatedMethods(sourceCode);
    expect(result).toEqual([]);
  });
});

describe('CodeValidator', () => {
  it('devrait valider le code avec la nouvelle méthode', () => {
    const code = 'function test() {}';
    const result = validator.newValidationMethod(code);
    expect(result).toBeDefined();
  });
});
