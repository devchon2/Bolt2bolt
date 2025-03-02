import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import { PatternsAnalyzer } from '../patterns-analyzer';
import * as path from 'path';
import { analyzeIntegration } from '../../../../core/analyzer/static/patterns/integration'; // Update the path as needed

describe('PatternsAnalyzer Integration Tests', () => {
  let analyzer: PatternsAnalyzer;
  let project: Project;

  beforeAll(() => {
    project = new Project();
    const testFile1 = project.createSourceFile(
      'test1.ts', 
      `
      // Anti-pattern 1: Eval usage
      function badFunction() {
        eval("console.log('security risk')");
      }

      // Anti-pattern 2: Nested callbacks
      function nestedCallbacks() {
        setTimeout(() => {
          getData((result) => {
            processData(result, (processed) => {
              saveData(processed, () => {
                console.log('Callback hell');
              });
            });
          });
        }, 1000);
      }

      // Anti-pattern 3: Long method
      function veryLongMethod() {
        let counter = 0;
        // 50+ lines of code
        for (let i = 0; i < 100; i++) {
          counter += i;
          // More code...
        }
        return counter;
      }
      
      // Anti-pattern 4: Empty catch block
      function silentCatch() {
        try {
          riskyOperation();
        } catch (error) {
          // Rien ici
        }
      }
      `
    );

    analyzer = new PatternsAnalyzer(project);
  });

  it('should detect multiple pattern types in project files', async () => {
    // Arrange
    const filePath = 'test1.ts';
    
    // Act
    const result = await analyzer.analyzeFile(filePath);
    
    // Assert - we expect multiple issues of different types
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    
    // Check different issue types were found
    const patterns = result.issues.map(issue => issue.patternId);
    expect(patterns).toContain('eval-usage');
    expect(patterns).toContain('callback-hell');
    expect(patterns).toContain('empty-catch-block');
  });
});
