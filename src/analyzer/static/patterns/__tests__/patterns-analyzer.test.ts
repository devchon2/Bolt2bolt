import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternsAnalyzer } from '../patterns-analyzer';
import { Project } from 'ts-morph';
import { SeverityLevel } from '../../../types';
import * as path from 'path';
import { analyzePatterns } from '../../../../core/analyzer/static/patterns/patterns-analyzer'; // Update the path as needed

// Déclaration du type SeverityLevel si non importé
export enum SeverityLevelFallback {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

describe('PatternsAnalyzer', () => {
  let analyzer: PatternsAnalyzer;
  let project: Project;

  beforeEach(() => {
    project = new Project();
    analyzer = new PatternsAnalyzer(project);
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      const analyzer = new PatternsAnalyzer();
      expect(analyzer.id).toBe('patterns-analyzer');
      expect(analyzer.name).toBe('Analyseur de Patterns');
      expect(analyzer.metricType).toBe('maintainability');
      expect(Array.isArray(analyzer['metricsToAnalyze'])).toBe(true);
    });

    it('should initialize with custom metrics', () => {
      const customAnalyzer = new PatternsAnalyzer(undefined, ['performance']);
      expect(Array.isArray(customAnalyzer['metricsToAnalyze'])).toBe(true);
      expect(customAnalyzer['metricsToAnalyze']).toContain('performance');
    });

    it('should handle single metric input', () => {
      const singleMetricAnalyzer = new PatternsAnalyzer(project, 'performance');
      expect(Array.isArray(singleMetricAnalyzer['metricsToAnalyze'])).toBe(true);
      expect(singleMetricAnalyzer['metricsToAnalyze']).toContain('performance');
    });
  });
});
