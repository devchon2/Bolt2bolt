import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptOptimizer, PromptOptimizerOptions } from './prompt-optimizer';
import { PromptManager } from './prompt-manager';
import { PromptIntegration } from './prompt-integration';
import * as fs from 'fs';
import * as path from 'path';

// Mocker les dépendances
vi.mock('fs');
vi.mock('path');
vi.mock('./prompt-manager');
vi.mock('./prompt-integration');

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;
  let mockManager: PromptManager;
  let mockIntegration: PromptIntegration;
  const options: PromptOptimizerOptions = {
    aggressiveOptimization: false,
    autoApply: false,
    minScoreThreshold: 70,
    maxPromptSize: 1000,
    priorityConcepts: ['test', 'validation', 'pattern']
  };

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();
    
    // Créer les mocks
    mockManager = new PromptManager() as jest.Mocked<PromptManager>;
    mockIntegration = new PromptIntegration(mockManager) as jest.Mocked<PromptIntegration>;
    
    // Simuler les méthodes
    mockManager.analyzeFilePrompts = vi.fn().mockReturnValue({
      hasPrompts: true,
      promptCount: 3,
      density: 15,
      suggestions: ['Suggestion 1', 'Suggestion 2']
    });
    
    mockManager.generateFilePrompts = vi.fn().mockReturnValue([
      '// #codebase: [CONTEXT] Test context',
      '// #codebase: [DIRECTIVE] Test directive'
    ]);
    
    // Créer l'optimiseur avec les mocks
    optimizer = new PromptOptimizer(mockManager, mockIntegration, options);
  });

  describe('optimizeFilePrompts', () => {
    it('devrait retourner null si aucun prompt n\'est trouvé', () => {
      // Configurer le mock pour ne pas trouver de prompts
      vi.spyOn(optimizer as any, 'extractPromptsFromFile').mockReturnValueOnce([]);
      
      const result = optimizer.optimizeFilePrompts('test.ts', 'contenu du fichier');
      
      expect(result).toBeNull();
      expect(optimizer['extractPromptsFromFile']).toHaveBeenCalledWith('contenu du fichier');
    });

    it('devrait optimiser les prompts existants', () => {
      // Configurer les mocks
      vi.spyOn(optimizer as any, 'extractPromptsFromFile').mockReturnValueOnce([
        '// #codebase: [CONTEXT] Ancien contexte'
      ]);
      
      vi.spyOn(optimizer as any, 'analyzePrompts').mockReturnValueOnce({
        effectivenessScore: 60,
        complianceRatio: 0.7,
        conceptCoverage: 0.6,
        clarityScore: 65,
        historicalEffectiveness: 50
      });
      
      vi.spyOn(optimizer as any, 'generateOptimizedPrompts').mockReturnValueOnce([
        '// #codebase: [CONTEXT] Nouveau contexte amélioré'
      ]);
      
      vi.spyOn(optimizer as any, 'replacePromptsInFile').mockReturnValueOnce(
        'Contenu optimisé'
      );
      
      vi.spyOn(optimizer as any, 'analyzePrompts').mockReturnValueOnce({
        effectivenessScore: 85,
        complianceRatio: 0.9,
        conceptCoverage: 0.85,
        clarityScore: 80,
        historicalEffectiveness: 70
      });
      
      vi.spyOn(optimizer as any, 'identifyImprovements').mockReturnValueOnce([
        'Score d\'efficacité amélioré de 60 à 85',
        'Clarté des prompts améliorée'
      ]);
      
      const result = optimizer.optimizeFilePrompts('test.ts', 'contenu du fichier');
      
      expect(result).not.toBeNull();
      expect(result?.beforeMetrics.effectivenessScore).toBe(60);
      expect(result?.afterMetrics.effectivenessScore).toBe(85);
      expect(result?.improvements).toHaveLength(2);
    });
    
    it('ne devrait pas optimiser si le score est déjà élevé', () => {
      // Configurer les mocks
      vi.spyOn(optimizer as any, 'extractPromptsFromFile').mockReturnValueOnce([
        '// #codebase: [CONTEXT] Contexte déjà optimisé'
      ]);
      
      vi.spyOn(optimizer as any, 'analyzePrompts').mockReturnValueOnce({
        effectivenessScore: 95,
        complianceRatio: 0.95,
        conceptCoverage: 0.9,
        clarityScore: 90,
        historicalEffectiveness: 85
      });
      
      const result = optimizer.optimizeFilePrompts('test.ts', 'contenu du fichier');
      
      expect(result).toBeNull();
      expect(optimizer['generateOptimizedPrompts']).not.toHaveBeenCalled();
    });
  });

  describe('batchOptimize', () => {
    it('devrait optimiser plusieurs fichiers', () => {
      // Configurer le mock
      vi.spyOn(optimizer, 'optimizeFilePrompts')
        .mockReturnValueOnce({
          originalPrompt: 'original1',
          optimizedPrompt: 'optimized1',
          beforeMetrics: {} as PromptMetrics,
          afterMetrics: {} as PromptMetrics,
          improvements: ['Amélioration 1']
        })
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          originalPrompt: 'original3',
          optimizedPrompt: 'optimized3',
          beforeMetrics: {} as PromptMetrics,
          afterMetrics: {} as PromptMetrics,
          improvements: ['Amélioration 3']
        });
      
      const files = [
        { path: 'file1.ts', content: 'content1' },
        { path: 'file2.ts', content: 'content2' },
        { path: 'file3.ts', content: 'content3' }
      ];
      
      const results = optimizer.batchOptimize(files);
      
      expect(results.size).toBe(3);
      expect(results.get('file1.ts')).not.toBeNull();
      expect(results.get('file2.ts')).toBeNull();
      expect(results.get('file3.ts')).not.toBeNull();
      expect(optimizer.optimizeFilePrompts).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateOptimizationReport', () => {
    it('devrait générer un rapport formaté', () => {
      // Préparer les données de test
      const results = new Map<string, OptimizationResult | null>();
      
      results.set('file1.ts', {
        originalPrompt: 'original1',
        optimizedPrompt: 'optimized1',
        beforeMetrics: {
          effectivenessScore: 60,
          complianceRatio: 0.7,
          conceptCoverage: 0.6,
          clarityScore: 65,
          historicalEffectiveness: 50
        },
        afterMetrics: {
          effectivenessScore: 80,
          complianceRatio: 0.9,
          conceptCoverage: 0.8,
          clarityScore: 85,
          historicalEffectiveness: 70
        },
        improvements: ['Amélioration 1', 'Amélioration 2']
      });
      
      results.set('file2.ts', null);
      
      const report = optimizer.generateOptimizationReport(results);
      
      expect(report).toContain('# Rapport d\'Optimisation des Prompts');
      expect(report).toContain('file1.ts');
      expect(report).toContain('60');
      expect(report).toContain('80');
      expect(report).toContain('+20');
      expect(report).toContain('Fichiers analysés: 2');
      expect(report).toContain('Fichiers optimisés: 1');
      expect(report).toContain('Amélioration 1');
      expect(report).toContain('Amélioration 2');
    });
  });
  
  describe('Méthodes privées', () => {
    describe('analyzePrompts', () => {
      it('devrait analyser correctement les prompts', () => {
        // Accéder à la méthode privée
        const analyzePrompts = (optimizer as any).analyzePrompts.bind(optimizer);
        
        vi.spyOn(optimizer as any, 'extractConcepts')
          .mockReturnValueOnce(['concept1', 'concept2']) // concepts du fichier
          .mockReturnValueOnce(['concept1']); // concepts dans les prompts
        
        vi.spyOn(optimizer as any, 'calculateConceptCoverage').mockReturnValueOnce(0.5);
        vi.spyOn(optimizer as any, 'evaluateClarity').mockReturnValueOnce(75);
        vi.spyOn(optimizer as any, 'evaluateCompliance').mockReturnValueOnce(0.8);
        vi.spyOn(optimizer as any, 'getHistoricalEffectiveness').mockReturnValueOnce(60);
        vi.spyOn(optimizer as any, 'calculateEffectivenessScore').mockReturnValueOnce(70);
        
        const prompts = ['// #codebase: [CONTEXT] Test'];
        const metrics = analyzePrompts(prompts, 'test.ts', 'content');
        
        expect(metrics.effectivenessScore).toBe(70);
        expect(metrics.conceptCoverage).toBe(0.5);
        expect(metrics.clarityScore).toBe(75);
        expect(metrics.complianceRatio).toBe(0.8);
        expect(metrics.historicalEffectiveness).toBe(60);
      });
    });
    
    describe('enhancePromptContent', () => {
      it('devrait améliorer le contenu d\'un prompt', () => {
        // Accéder à la méthode privée
        const enhancePromptContent = (optimizer as any).enhancePromptContent.bind(optimizer);
        
        vi.spyOn(optimizer as any, 'improveClarity').mockImplementation(content => content);
        
        const content = "Ce module devrait gérer les transactions";
        const concepts = ['validation', 'transaction', 'sécurité'];
        const enhanced = enhancePromptContent(content, concepts, 'ts');
        
        // Sans aggressiveOptimization = false, pas de changement majeur attendu
        expect(enhanced).toBe(content);
        
        // Configurer l'optimiseur en mode agressif
        optimizer = new PromptOptimizer(mockManager, mockIntegration, {
          ...options,
          aggressiveOptimization: true
        });
        
        // Reconfigurer le spy
        vi.spyOn(optimizer as any, 'improveClarity').mockImplementation(content => content);
        vi.spyOn(optimizer as any, 'conceptImportance').mockImplementation(() => new Map([
          ['validation', 0.9],
          ['sécurité', 0.8]
        ]));
        
        const enhancedAggressive = (optimizer as any).enhancePromptContent(content, concepts, 'ts');
        
        // Avec aggressiveOptimization = true, devrait ajouter des concepts manquants
        expect(enhancedAggressive).toContain('sécurité');
      });
    });
  });
});