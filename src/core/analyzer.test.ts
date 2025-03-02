/// <reference types="mocha" />
// #codebase: [CONTEXTE] Tests unitaires pour le composant Analyseur.
// #codebase: [RESPONSABILITÉ] Vérifier le fonctionnement correct de l'analyse de code.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et amélioration de la couverture.

import { CodeAnalyzer, AnalysisStrategy } from './analyzer';
import { AnalysisResult, AnalysisOptions } from '../types/analysis';
import { Logger } from '../utils/logger';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { beforeEach, describe, it } from 'vitest';

// Mock pour le Logger
class MockLogger implements Logger {
  info = sinon.stub();
  debug = sinon.stub();
  warn = sinon.stub();
  error = sinon.stub();
}

// Mock pour les stratégies d'analyse
class MockAnalysisStrategy implements AnalysisStrategy {
  execute = sinon.stub().resolves({
    issues: [{ id: 'test-issue', type: 'warning', message: 'Test issue', severity: 2 }],
    suggestions: [{ id: 'test-suggestion', description: 'Test suggestion', impact: 3, type: 'quality', confidence: 0.8 }],
    metrics: { cyclomaticComplexity: 5 }
  });
}

/*
[COPILOT_PROMPTS]
# Directives pour les Tests de l'Analyseur

## Principes à suivre
- Isoler complètement l'Analyseur de ses dépendances externes
- Tester chaque méthode publique avec différents scénarios
- Vérifier la gestion des erreurs et cas limites
- Valider l'intégration correcte des stratégies d'analyse

## Structure de test recommandée
- describe pour chaque méthode publique
- Sous-cas organisés par comportement attendu
- Assertions précises sur chaque aspect du comportement

## Scénarios prioritaires à tester
1. Analyse réussie avec différentes stratégies
2. Gestion des erreurs dans les stratégies
3. Fusion correcte des résultats d'analyse
4. Sélection appropriée des stratégies selon les options
5. Journalisation adéquate des opérations et erreurs
[COPILOT_PROMPTS]
*/

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;
  let logger: MockLogger;
  let mockStrategy: MockAnalysisStrategy;

  beforeEach(() => {
    logger = new MockLogger();
    analyzer = new CodeAnalyzer(logger);
    mockStrategy = new MockAnalysisStrategy();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('analyze', () => {
    it('should successfully analyze code with default options', async () => {
      // Arrange
      analyzer.registerStrategy('test', mockStrategy);
      const code = 'function test() { return true; }';
      
      // Act
      const result = await analyzer.analyze(code, {});
      
      // Assert
      expect(result).to.be.an('object');
      expect(result.issues).to.be.an('array');
      expect(result.suggestions).to.be.an('array');
      expect(result.metrics).to.be.an('object');
      expect(logger.info.calledOnce).to.be.true;
    });

    it('should use selected strategies based on options', async () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      const strategy2 = new MockAnalysisStrategy();
      analyzer.registerStrategy('syntax', strategy1);
      analyzer.registerStrategy('security', strategy2);
      
      const code = 'const x = 5;';
      const options: AnalysisOptions = {
        analysisTypes: ['syntax']
      };
      
      // Act
      await analyzer.analyze(code, options);
      
      // Assert
      expect(strategy1.execute.calledOnce).to.be.true;
      expect(strategy2.execute.called).to.be.false;
    });

    it('should merge results from multiple strategies', async () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      strategy1.execute.resolves({
        issues: [{ id: 'issue1', type: 'error', message: 'Error 1', severity: 5 }],
        suggestions: [],
        metrics: { cyclomaticComplexity: 10 }
      });
      
      const strategy2 = new MockAnalysisStrategy();
      strategy2.execute.resolves({
        issues: [{ id: 'issue2', type: 'warning', message: 'Warning 1', severity: 3 }],
        suggestions: [{ id: 'sug1', description: 'Suggestion 1', impact: 4, type: 'performance', confidence: 0.9 }],
        metrics: { linesOfCode: 100 }
      });
      
      analyzer.registerStrategy('quality', strategy1);
      analyzer.registerStrategy('performance', strategy2);
      
      // Act
      const result = await analyzer.analyze('code', { analysisTypes: ['quality', 'performance'] });
      
      // Assert
      expect(result.issues).to.have.lengthOf(2);
      expect(result.suggestions).to.have.lengthOf(1);
      expect(result.metrics).to.have.property('cyclomaticComplexity', 10);
      expect(result.metrics).to.have.property('linesOfCode', 100);
    });

    it('should handle empty code input', async () => {
      // Arrange
      analyzer.registerStrategy('test', mockStrategy);
      
      // Act
      const result = await analyzer.analyze('', {});
      
      // Assert
      expect(result).to.be.an('object');
      expect(logger.warn.calledOnce).to.be.true;
    });

    it('should handle errors in analysis strategies', async () => {
      // Arrange
      const errorStrategy = new MockAnalysisStrategy();
      const error = new Error('Strategy execution failed');
      errorStrategy.execute.rejects(error);
      
      analyzer.registerStrategy('error', errorStrategy);
      
      // Act & Assert
      try {
        await analyzer.analyze('code', { analysisTypes: ['quality'] });
        expect.fail('Should have thrown an error');
      } catch (e) {
        expect(e.message).to.include('Analysis failed');
        expect(logger.error.calledOnce).to.be.true;
      }
    });
  });

  describe('registerStrategy', () => {
    it('should register a new strategy', () => {
      // Act
      analyzer.registerStrategy('test', mockStrategy);
      
      // Assert
      expect(logger.debug.calledOnce).to.be.true;
      expect(logger.debug.firstCall.args[0]).to.include('test');
    });

    it('should replace existing strategy with the same name', () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      const strategy2 = new MockAnalysisStrategy();
      
      // Act
      analyzer.registerStrategy('test', strategy1);
      analyzer.registerStrategy('test', strategy2);
      
      // Act - Verify the correct strategy is used
      analyzer.analyze('code', {});
      
      // Assert - The second strategy should be called, not the first
      expect(strategy1.execute.called).to.be.false;
      expect(strategy2.execute.called).to.be.true;
    });
  });

  describe('selectStrategies', () => {
    it('should select all strategies when no types specified', async () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      const strategy2 = new MockAnalysisStrategy();
      analyzer.registerStrategy('type1', strategy1);
      analyzer.registerStrategy('type2', strategy2);
      
      // Act
      await analyzer.analyze('code', {});
      
      // Assert
      expect(strategy1.execute.calledOnce).to.be.true;
      expect(strategy2.execute.calledOnce).to.be.true;
    });

    it('should handle empty strategies list', async () => {
      // Act
      const result = await analyzer.analyze('code', {});
      
      // Assert
      expect(result.issues).to.be.an('array').that.is.empty;
      expect(result.suggestions).to.be.an('array').that.is.empty;
      expect(result.metrics).to.be.an('object').that.is.empty;
      expect(logger.warn.calledOnce).to.be.true;
    });
  });

  describe('mergeResults', () => {
    it('should correctly merge metrics from multiple results', async () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      strategy1.execute.resolves({
        issues: [],
        suggestions: [],
        metrics: { metric1: 10, metric2: 20 }
      });
      
      const strategy2 = new MockAnalysisStrategy();
      strategy2.execute.resolves({
        issues: [],
        suggestions: [],
        metrics: { metric2: 30, metric3: 40 }
      });
      
      analyzer.registerStrategy('test1', strategy1);
      analyzer.registerStrategy('test2', strategy2);
      
      // Act
      const result = await analyzer.analyze('code', {});
      
      // Assert - metric2 from second strategy should override the first
      expect(result.metrics).to.deep.equal({
        metric1: 10,
        metric2: 30,
        metric3: 40
      });
    });

    it('should deduplicate issues by ID', async () => {
      // Arrange
      const strategy1 = new MockAnalysisStrategy();
      strategy1.execute.resolves({
        issues: [
          { id: 'duplicate', type: 'warning', message: 'First occurrence', severity: 2 },
          { id: 'unique1', type: 'error', message: 'Unique 1', severity: 4 }
        ],
        suggestions: [],
        metrics: {}
      });
      
      const strategy2 = new MockAnalysisStrategy();
      strategy2.execute.resolves({
        issues: [
          { id: 'duplicate', type: 'warning', message: 'Second occurrence', severity: 3 },
          { id: 'unique2', type: 'info', message: 'Unique 2', severity: 1 }
        ],
        suggestions: [],
        metrics: {}
      });
      
      analyzer.registerStrategy('test1', strategy1);
      analyzer.registerStrategy('test2', strategy2);
      
      // Act
      const result = await analyzer.analyze('code', {});
      
      // Assert - should have 3 issues (duplicate counted once)
      expect(result.issues).to.have.lengthOf(3);
      // The duplicate should have the details from the last strategy that provided it
      const duplicateIssue = result.issues.find(issue => issue.id === 'duplicate');
      expect(duplicateIssue?.message).to.equal('Second occurrence');
      expect(duplicateIssue?.severity).to.equal(3);
    });
  });
});


function afterEach(arg0: () => void) {
    throw new Error('Function not implemented.');
}
/*
[COPILOT_PROMPTS]
# Améliorations de Test à Considérer

## Couverture Additionnelle
- Tester la performance avec de grands volumes de code
- Vérifier le comportement avec différentes options de configuration
- Ajouter des tests paramétriques pour couvrir plusieurs scénarios
- Tester les cas limites (options invalides, stratégies incompatibles)

## Bonnes Pratiques
- Organiser les tests par méthode puis par scénario
- Utiliser des fixtures pour les entrées de test communes
- Implémenter des helpers pour simplifier la création de mocks
- Assurer l'isolation complète entre les tests

## Prochaines Étapes
- Intégrer ces tests dans la pipeline CI/CD
- Configurer un rapport de couverture de code
- Ajouter des tests d'intégration avec d'autres composants
- Implémenter des tests de performance/charge pour les scénarios critiques
[COPILOT_PROMPTS]
*/
