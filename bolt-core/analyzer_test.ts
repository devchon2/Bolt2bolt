import { describe, it, expect } from 'vitest';
import { analyzeProject, AnalyzerOptions } from './analyzer';
import * as fs from 'fs';
import * as path from 'path';

describe('Analyzer', () => {
  const testDir = path.join(__dirname, 'test_project');

  beforeEach(() => {
    // Create a test project directory with some files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
      fs.writeFileSync(path.join(testDir, 'test.ts'), 'function add(a: number, b: number) { return a + b; }');
      fs.writeFileSync(path.join(testDir, 'test.js'), 'function subtract(a, b) { return a - b; }');
    }
  });

  afterEach(() => {
    // Clean up the test project directory
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  it('should analyze a project and return a report', async () => {
    const { report } = await analyzeProject(testDir);
    expect(report).toBeDefined();
    expect(report.analyzedFiles).toBeGreaterThan(0);
  });

  it('should include only specified directories', async () => {
    const options: AnalyzerOptions = { includeDirs: ['test_project'] };
    const { report } = await analyzeProject(__dirname, options);
    expect(report.analyzedFiles).toBeGreaterThan(0);
  });

  it('should exclude specified directories', async () => {
    const options: AnalyzerOptions = { excludeDirs: ['test_project'] };
    const { report } = await analyzeProject(__dirname, options);
    expect(report.analyzedFiles).toBeGreaterThan(0);
  });

  it('should handle empty directories gracefully', async () => {
    const emptyDir = path.join(__dirname, 'empty_dir');
    fs.mkdirSync(emptyDir);
    const { report } = await analyzeProject(emptyDir);
    fs.rmdirSync(emptyDir);
    expect(report.analyzedFiles).toBe(0);
  });

  it('should respect minFileSizeKb and maxFileSizeKb options', async () => {
    // Create a large file
    const largeFile = path.join(testDir, 'large.txt');
    fs.writeFileSync(largeFile, 'This is a large file'.repeat(1000));

    const options: AnalyzerOptions = {
      minFileSizeKb: 10,
      maxFileSizeKb: 20
    };
    const { report } = await analyzeProject(testDir, options);
    fs.unlinkSync(largeFile);
    expect(report.analyzedFiles).toBe(0);
  });

  it('should analyze only specified files', async () => {
    const options: AnalyzerOptions = { includeFiles: ['test.ts'] };
    const { report } = await analyzeProject(testDir, options);
    expect(report.analyzedFiles).toBe(1);
  });

  it('should exclude specified files', async () => {
    const options: AnalyzerOptions = { excludeFiles: ['test.ts'] };
    const { report } = await analyzeProject(testDir, options);
    expect(report.analyzedFiles).toBe(1);
  });

  it('should handle errors during file analysis gracefully', async () => {
    // Create a file that will cause an error during analysis
    const errorFile = path.join(testDir, 'error.ts');
    fs.writeFileSync(errorFile, 'This is not valid TypeScript code.');

    const { report } = await analyzeProject(testDir);
    fs.unlinkSync(errorFile);
    expect(report).toBeDefined();
  });
});
