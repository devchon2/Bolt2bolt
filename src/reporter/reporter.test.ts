import { describe, expect, it } from 'vitest';
import { generateReport } from './reporter';

describe('Reporter', () => {
  it('should generate a report', () => {
    const analysisResults = {
      metrics: {
        complexity: 5,
        duplication: 10,
      },
      securityIssues: [],
    };
    const report = generateReport(analysisResults);
    expect(report).toBeDefined();
    expect(report.complexity).toBe(5);
    expect(report.duplication).toBe(10);
  });

  it('should handle empty analysis results gracefully', () => {
    const analysisResults = {};
    const report = generateReport(analysisResults);
    expect(report).toBeDefined();
  });

  it('should include security issues in the report', () => {
    const analysisResults = {
      metrics: {
        complexity: 5,
        duplication: 10,
      },
      securityIssues: ['Potential XSS vulnerability'],
    };
    const report = generateReport(analysisResults);
    expect(report.securityIssues).toBeDefined();
    expect(report.securityIssues.length).toBeGreaterThan(0);
  });
});
