import { Optimizer } from '../../../src/core/optimizer/optimizer';
import { AnalysisResult } from '../../../src/core/analyzer/types';
import { describe, it, expect, vi } from 'vitest';
import { optimizeCode } from '../../../src/optimizer';

describe('Optimizer', () => {
  let optimizer: Optimizer;
  
  beforeEach(() => {
    optimizer = new Optimizer({
      projectOptions: { 
        tsConfigFilePath: 'tsconfig.json'
      }
    });
  });

  describe('optimizeProject', () => {
    it('should optimize a project based on analysis results', async () => {
      // Arrange
      const sourcePath = './test-fixtures/sample-project';
      const mockAnalysisResult: AnalysisResult = {
        metrics: {},
        patterns: { issues: [] },
        security: { vulnerabilities: [], securityScore: 100 },
        timestamp: new Date().toISOString(),
        summary: {
          totalIssues: 0,
          complexityScore: 0,
          maintainabilityIndex: 100,
          securityScore: 100
        }
      };
      
      // Act
      const result = await optimizer.optimizeProject(sourcePath, mockAnalysisResult);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.optimized).toBe(true);
    });

    it('should handle optimization errors gracefully', async () => {
      // Arrange
      const invalidPath = './non-existent-path';
      const mockAnalysisResult: AnalysisResult = {
        metrics: {},
        patterns: { issues: [] },
        security: { vulnerabilities: [], securityScore: 100 },
        timestamp: new Date().toISOString(),
        summary: {
          totalIssues: 0,
          complexityScore: 0,
          maintainabilityIndex: 100,
          securityScore: 100
        }
      };
      
      // Act & Assert
      await expect(optimizer.optimizeProject(invalidPath, mockAnalysisResult))
        .rejects
        .toThrow('Project path not found');
    });
  });

  it('should optimize code correctly', async () => {
    const result = await optimizeCode('path/to/source');
    expect(result).toBeDefined();
    expect(result.optimizationId).toBeDefined();
  });

  it('should handle circular dependencies in the AST', async () => {
    const problematicCode = `
      const a = {};
      const b = { a };
      a.b = b;
      export default a;
    `;
    const result = await optimizeCode(problematicCode);
    expect(result.warnings).toContain('CIRCULAR_REF');
  });
});
