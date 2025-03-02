import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeAnalyzer } from './code-analyzer';
import { AnalysisReport, CodeIssue } from '../types/common';
import { eventBus, Events } from '../utils/events';

// Mock des dépendances
vi.mock('../utils/events', () => ({
  eventBus: {
    emit: vi.fn()
  },
  Events: {
    ANALYSIS_STARTED: 'ANALYSIS_STARTED',
    ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED'
  }
}));

// Configuration de test
const mockConfig = {
  analyzer: {
    maxComplexity: 10
  }
};

vi.mock('../config/env-config', () => ({
  config: mockConfig
}));

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;
  
  beforeEach(() => {
    analyzer = new CodeAnalyzer();
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('devrait émettre les événements appropriés lors de l\'analyse', () => {
      // Arrange
      const testCode = 'function test() { return 1 + 1; }';
      const filePath = 'test.js';
      
      // Act
      analyzer.analyze(testCode, filePath);
      
      // Assert
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledWith(Events.ANALYSIS_STARTED, { codeLength: testCode.length, filePath });
      expect(eventBus.emit).toHaveBeenCalledWith(Events.ANALYSIS_COMPLETED, expect.any(Object));
    });
    
    it('devrait détecter l\'utilisation de eval() comme problème critique', () => {
      // Arrange
      const testCode = 'function dangerousCode() { eval("alert(\'hello\')"); }';
      
      // Act
      const report = analyzer.analyze(testCode);
      
      // Assert
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]).toEqual(expect.objectContaining({
        id: 'security-001',
        severity: 'critical',
        category: 'security'
      }));
    });
    
    it('devrait détecter console.log comme problème de style', () => {
      // Arrange
      const testCode = 'function logSomething() { console.log("Debug info"); }';
      
      // Act
      const report = analyzer.analyze(testCode);
      
      // Assert
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]).toEqual(expect.objectContaining({
        id: 'style-001',
        severity: 'info',
        category: 'maintainability'
      }));
    });
    
    it('devrait signaler une complexité élevée lorsque le code dépasse le seuil configuré', () => {
      // Arrange
      // Créer du code avec une complexité cyclomatique élevée
      let complexCode = 'function complexFunction() {';
      for (let i = 0; i < mockConfig.analyzer.maxComplexity + 5; i++) {
        complexCode += `if (condition${i}) { doSomething${i}(); }`;
      }
      complexCode += 'return result; }';
      
      // Act
      const report = analyzer.analyze(complexCode);
      
      // Assert
      expect(report.issues.some(issue => issue.id === 'complexity-001')).toBe(true);
      expect(report.metrics.complexity.cyclomatic).toBeGreaterThan(mockConfig.analyzer.maxComplexity);
    });
    
    it('devrait générer des métriques valides pour un code simple', () => {
      // Arrange
      const simpleCode = 'function add(a, b) { return a + b; }';
      
      // Act
      const report = analyzer.analyze(simpleCode);
      
      // Assert
      expect(report.metrics).toBeDefined();
      expect(report.metrics.complexity.cyclomatic).toBe(2); // 1 de base + 1 pour la fonction
      expect(report.metrics.size.lines).toBe(1);
      expect(report.metrics.size.functions).toBe(1);
    });
    
    it('devrait inclure des suggestions dans le rapport', () => {
      // Arrange
      const testCode = 'var x = 1;';
      
      // Act
      const report = analyzer.analyze(testCode);
      
      // Assert
      expect(report.suggestions).toBeDefined();
      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(Array.isArray(report.suggestions)).toBe(true);
    });
  });
  
  describe('calculateComplexity', () => {
    it('devrait calculer correctement la complexité pour différentes structures de contrôle', () => {
      // Ces tests accèdent à une méthode privée, nous utilisons donc une approche indirecte
      
      // Arrange & Act: Code avec if
      const ifCode = 'function test() { if(true) { return 1; } }';
      const ifReport = analyzer.analyze(ifCode);
      
      // Arrange & Act: Code avec for
      const forCode = 'function test() { for(let i=0; i<10; i++) { console.log(i); } }';
      const forReport = analyzer.analyze(forCode);
      
      // Arrange & Act: Code avec while
      const whileCode = 'function test() { while(true) { break; } }';
      const whileReport = analyzer.analyze(whileCode);
      
      // Arrange & Act: Code avec switch
      const switchCode = 'function test() { switch(x) { case 1: return 1; case 2: return 2; } }';
      const switchReport = analyzer.analyze(switchCode);
      
      // Arrange & Act: Code avec ternaire
      const ternaryCode = 'function test() { return x ? 1 : 2; }';
      const ternaryReport = analyzer.analyze(ternaryCode);
      
      // Assert: Vérifier que chaque structure augmente la complexité
      expect(ifReport.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      expect(forReport.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      expect(whileReport.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      expect(switchReport.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      expect(ternaryReport.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      
      // Le code avec plus de structures devrait avoir une complexité plus élevée
      const complexCode = `
        function test() { 
          if(x) { 
            for(let i=0; i<10; i++) { 
              while(y) { 
                switch(z) { 
                  case 1: return x ? 1 : 2; 
                  default: return 3; 
                } 
              } 
            } 
          } 
        }
      `;
      const complexReport = analyzer.analyze(complexCode);
      
      expect(complexReport.metrics.complexity.cyclomatic).toBeGreaterThan(
        ifReport.metrics.complexity.cyclomatic
      );
    });
  });
  
  describe('countFunctions', () => {
    it('devrait compter correctement les fonctions avec différentes syntaxes', () => {
      // Arrange & Act: Fonction nommée
      const namedFunc = 'function test() { return 1; }';
      const namedReport = analyzer.analyze(namedFunc);
      
      // Arrange & Act: Fonction anonyme
      const anonFunc = 'const test = function() { return 1; }';
      const anonReport = analyzer.analyze(anonFunc);
      
      // Arrange & Act: Méthode d'objet
      const objMethod = 'const obj = { test: function() { return 1; } }';
      const objMethodReport = analyzer.analyze(objMethod);
      
      // Arrange & Act: Arrow function
      const arrowFunc = 'const test = () => { return 1; }';
      const arrowReport = analyzer.analyze(arrowFunc);
      
      // Arrange & Act: Arrow function inline
      const inlineArrowFunc = 'const test = () => 1;';
      const inlineArrowReport = analyzer.analyze(inlineArrowFunc);
      
      // Assert: Vérifier que chaque fonction est comptée
      expect(namedReport.metrics.size.functions).toBe(1);
      expect(anonReport.metrics.size.functions).toBe(1);
      expect(objMethodReport.metrics.size.functions).toBe(1);
      expect(arrowReport.metrics.size.functions).toBe(1);
      expect(inlineArrowReport.metrics.size.functions).toBe(1);
      
      // Arrange & Act: Code avec plusieurs fonctions
      const multiFuncCode = `
        function test1() { return 1; }
        const test2 = function() { return 2; };
        const obj = { 
          test3: function() { return 3; },
          test4() { return 4; }
        };
        const test5 = () => 5;
      `;
      const multiFuncReport = analyzer.analyze(multiFuncCode);
      
      // Assert: Vérifier que toutes les fonctions sont comptées
      expect(multiFuncReport.metrics.size.functions).toBeGreaterThanOrEqual(5);
    });
  });
  
  describe('handleCircularDependencies', () => {
    it('devrait être inclus dans les méthodes disponibles', () => {
      // Note: handleCircularDependencies est une méthode privée,
      // nous vérifions donc indirectement si elle existe dans la classe
      expect(analyzer).toHaveProperty('handleCircularDependencies');
    });
    
    // Des tests plus complets pour handleCircularDependencies nécessiteraient
    // une exposition de la méthode ou une restructuration pour la testabilité
  });
});
