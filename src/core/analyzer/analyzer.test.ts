import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Analyzer } from './analyzer';
import { Project, SourceFile } from 'ts-morph';
import { AnalyzerOptions, AnalysisResult } from './types';
import codeSamples from '../../../test-helpers/code-samples';

/*
[COPILOT_PROMPTS]
# Tests pour l'Analyzer

## Structure Recommandée
describe('Analyzer', () => {
  describe('analyzeProject', () => {
    it('devrait analyser correctement un projet complet');
    it('devrait gérer les erreurs lors de l\'analyse du projet');
  });
  
  describe('analyzeFile', () => {
    it('devrait analyser correctement un fichier individuel');
    it('devrait gérer les erreurs lors de l\'analyse d\'un fichier');
  });
});

## Cas Prioritaires
1. Test de l'initialisation avec différentes options
2. Vérification de la coordination entre les différentes analyses
3. Gestion des erreurs et cas limites

## Mocks Nécessaires
- Project (ts-morph): pour éviter les dépendances au système de fichiers
- MetricsCalculator, PatternDetector, SecurityAnalyzer: pour isoler les tests
[COPILOT_PROMPTS]
*/

// Mocks pour les dépendances
vi.mock('ts-morph', () => {
  const mockSourceFile = {
    getFilePath: () => 'test.ts',
    getFullText: () => codeSamples.simple
  };
  
  const mockProject = {
    addSourceFilesAtPaths: vi.fn().mockReturnValue([mockSourceFile]),
    addSourceFileAtPath: vi.fn().mockReturnValue(mockSourceFile)
  };
  
  return {
    Project: vi.fn(() => mockProject)
  };
});

// Mocks pour les analyseurs internes
vi.mock('./metrics/metrics-calculator', () => ({
  MetricsCalculator: vi.fn().mockImplementation(() => ({
    calculateMetrics: vi.fn().mockResolvedValue({
      linesOfCode: 100,
      cycloComplexity: 5,
      maintainabilityIndex: 85,
      averageComplexity: 2.5
    }),
    calculateFileMetrics: vi.fn().mockResolvedValue({
      linesOfCode: 25,
      cycloComplexity: 2,
      maintainabilityIndex: 90,
      averageComplexity: 1.5
    })
  }))
}));

vi.mock('./patterns/pattern-detector', () => ({
  PatternDetector: vi.fn().mockImplementation(() => ({
    detectPatterns: vi.fn().mockResolvedValue({
      issues: [
        { id: 'P001', name: 'Unused variable', severity: 'warning' }
      ]
    }),
    detectFilePatterns: vi.fn().mockResolvedValue({
      issues: []
    })
  }))
}));

vi.mock('./security/security-analyzer', () => ({
  SecurityAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeSecurity: vi.fn().mockResolvedValue({
      vulnerabilities: [
        { id: 'S001', name: 'Possible XSS', severity: 'critical' }
      ],
      securityScore: 75
    }),
    analyzeFileSecurity: vi.fn().mockResolvedValue({
      vulnerabilities: [],
      securityScore: 95
    })
  }))
}));

describe('Analyzer', () => {
  let analyzer: Analyzer;
  let defaultOptions: AnalyzerOptions;
  
  beforeEach(() => {
    // Configuration par défaut pour les tests
    defaultOptions = {
      projectOptions: {
        tsConfigFilePath: 'tsconfig.json'
      }
    };
    
    analyzer = new Analyzer(defaultOptions);
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('devrait initialiser correctement l\'analyseur avec les options par défaut', () => {
      // Arrange & Act
      const instance = new Analyzer(defaultOptions);
      
      // Assert
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(Analyzer);
      expect(Project).toHaveBeenCalledWith(defaultOptions.projectOptions);
    });
    
    it('devrait initialiser tous les analyseurs internes', () => {
      // Arrange & Act
      new Analyzer(defaultOptions);
      
      // Assert
      expect(vi.mocked(require('./metrics/metrics-calculator').MetricsCalculator)).toHaveBeenCalled();
      expect(vi.mocked(require('./patterns/pattern-detector').PatternDetector)).toHaveBeenCalled();
      expect(vi.mocked(require('./security/security-analyzer').SecurityAnalyzer)).toHaveBeenCalled();
    });
  });
  
  describe('analyzeProject', () => {
    it('devrait analyser correctement un projet complet', async () => {
      // Arrange
      const sourcePath = '/test/project';
      const mockProject = analyzer['project'] as jest.Mocked<Project>;
      
      // Act
      const result = await analyzer.analyzeProject(sourcePath);
      
      // Assert
      expect(mockProject.addSourceFilesAtPaths).toHaveBeenCalledWith(`${sourcePath}/**/*.{ts,tsx}`);
      expect(result).toMatchObject({
        metrics: {
          linesOfCode: 100,
          maintainabilityIndex: 85
        },
        patterns: {
          issues: [expect.objectContaining({ id: 'P001' })]
        },
        security: {
          vulnerabilities: [expect.objectContaining({ id: 'S001' })],
          securityScore: 75
        },
        summary: {
          totalIssues: 2, // 1 from patterns + 1 from security
          complexityScore: 2.5,
          maintainabilityIndex: 85,
          securityScore: 75
        }
      });
    });
    
    it('devrait coordonner tous les analyseurs internes', async () => {
      // Arrange
      const { MetricsCalculator } = require('./metrics/metrics-calculator');
      const { PatternDetector } = require('./patterns/pattern-detector');
      const { SecurityAnalyzer } = require('./security/security-analyzer');
      const mockCalcMetrics = vi.mocked(MetricsCalculator.mock.results[0].value.calculateMetrics);
      const mockDetectPatterns = vi.mocked(PatternDetector.mock.results[0].value.detectPatterns);
      const mockAnalyzeSecurity = vi.mocked(SecurityAnalyzer.mock.results[0].value.analyzeSecurity);
      
      // Act
      await analyzer.analyzeProject('/test/project');
      
      // Assert
      expect(mockCalcMetrics).toHaveBeenCalled();
      expect(mockDetectPatterns).toHaveBeenCalled();
      expect(mockAnalyzeSecurity).toHaveBeenCalled();
    });
  });
  
  describe('analyzeFile', () => {
    it('devrait analyser correctement un fichier spécifique', async () => {
      // Arrange
      const filePath = '/test/project/src/file.ts';
      const mockProject = analyzer['project'] as jest.Mocked<Project>;
      
      // Act
      const result = await analyzer.analyzeFile(filePath);
      
      // Assert
      expect(mockProject.addSourceFileAtPath).toHaveBeenCalledWith(filePath);
      expect(result).toMatchObject({
        metrics: {
          linesOfCode: 25,
          maintainabilityIndex: 90
        },
        patterns: {
          issues: []
        },
        security: {
          vulnerabilities: [],
          securityScore: 95
        },
        summary: {
          totalIssues: 0,
          complexityScore: 1.5,
          maintainabilityIndex: 90,
          securityScore: 95
        },
        filePath
      });
    });
    
    it('devrait gérer les erreurs lors de l\'analyse d\'un fichier', async () => {
      // Arrange
      const filePath = '/test/project/src/invalid.ts';
      const mockProject = analyzer['project'] as jest.Mocked<Project>;
      mockProject.addSourceFileAtPath.mockImplementationOnce(() => {
        throw new Error('Fichier non trouvé');
      });
      
      // Act
      const result = await analyzer.analyzeFile(filePath);
      
      // Assert
      expect(result).toMatchObject({
        metrics: {},
        patterns: { issues: [] },
        security: { vulnerabilities: [], securityScore: 0 },
        summary: {
          totalIssues: 0,
          complexityScore: 0,
          maintainabilityIndex: 0,
          securityScore: 0
        },
        filePath,
        error: 'Fichier non trouvé'
      });
    });
    
    it('devrait coordonner les analyseurs internes pour un seul fichier', async () => {
      // Arrange
      const { MetricsCalculator } = require('./metrics/metrics-calculator');
      const { PatternDetector } = require('./patterns/pattern-detector');
      const { SecurityAnalyzer } = require('./security/security-analyzer');
      const mockCalcFileMetrics = vi.mocked(MetricsCalculator.mock.results[0].value.calculateFileMetrics);
      const mockDetectFilePatterns = vi.mocked(PatternDetector.mock.results[0].value.detectFilePatterns);
      const mockAnalyzeFileSecurity = vi.mocked(SecurityAnalyzer.mock.results[0].value.analyzeFileSecurity);
      
      // Act
      await analyzer.analyzeFile('/test/file.ts');
      
      // Assert
      expect(mockCalcFileMetrics).toHaveBeenCalled();
      expect(mockDetectFilePatterns).toHaveBeenCalled();
      expect(mockAnalyzeFileSecurity).toHaveBeenCalled();
    });
  });
  
  describe('handleCircularDependencies', () => {
    it('devrait être défini comme méthode privée', () => {
      // On vérifie indirectement l'existence de cette méthode privée
      expect((analyzer as any).handleCircularDependencies).toBeDefined();
      expect(typeof (analyzer as any).handleCircularDependencies).toBe('function');
    });
    
    it('devrait retourner un booléen', () => {
      // Test de la méthode privée
      const result = (analyzer as any).handleCircularDependencies({});
      expect(typeof result).toBe('boolean');
    });
  });
  
  // Tests supplémentaires pour la gestion des erreurs et des cas limites
  describe('gestion d\'erreurs', () => {
    it('devrait gérer les projets vides lors de l\'analyse', async () => {
      // Arrange
      const mockProject = analyzer['project'] as jest.Mocked<Project>;
      mockProject.addSourceFilesAtPaths.mockReturnValueOnce([]);
      
      // Act
      const result = await analyzer.analyzeProject('/empty/project');
      
      // Assert
      expect(result).toBeDefined();
      expect(result.summary.totalIssues).toBe(0);
    });
    
    it('devrait maintenir une structure de résultat cohérente même en cas d\'erreur', async () => {
      // Arrange
      const { MetricsCalculator } = require('./metrics/metrics-calculator');
      const mockCalcMetrics = vi.mocked(MetricsCalculator.mock.results[0].value.calculateMetrics);
      mockCalcMetrics.mockRejectedValueOnce(new Error('Erreur de métriques'));
      
      // Act
      const result = await analyzer.analyzeProject('/test/project');
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('summary');
    });
  });
});
