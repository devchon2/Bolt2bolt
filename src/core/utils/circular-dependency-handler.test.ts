import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircularDependencyHandler, CircularDependencyOptions } from './circular-dependency-handler';
import { Project, SourceFile } from 'ts-morph';

// Mocks
vi.mock('ts-morph', () => {
  const createMockSourceFile = (filePath: string, imports: string[] = []) => {
    const importDeclarations = imports.map(imp => ({
      getModuleSpecifier: () => ({
        getText: () => `'${imp}'`
      })
    }));
    
    return {
      getFilePath: () => filePath,
      forEachDescendant: (callback: any) => {
        importDeclarations.forEach(imp => callback(Object.assign(imp, { kind: 271 })));
      }
    };
  };
  
  const mockProject = {
    getSourceFile: (path: string) => {
      // Simuler une recherche de fichiers par chemin
      const sourceFiles = mockSourceFiles;
      return sourceFiles.find(f => f.getFilePath() === path);
    }
  };
  
  // Pour référencer ces mock files depuis le test
  const mockSourceFiles: any[] = [];
  
  return {
    __mockSourceFiles: mockSourceFiles,
    Project: vi.fn(() => mockProject),
    SyntaxKind: {
      ImportDeclaration: 271,
      ExportDeclaration: 272
    },
    Node: {
      isImportDeclaration: (node: any) => node.kind === 271,
      isExportDeclaration: (node: any) => node.kind === 272
    }
  };
});

describe('CircularDependencyHandler', () => {
  let handler: CircularDependencyHandler;
  let mockProject: Project;
  let mockSourceFiles: any[];
  
  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();
    
    // Accéder aux mockSourceFiles depuis le mock de ts-morph
    mockSourceFiles = (vi.mocked(require('ts-morph')) as any).__mockSourceFiles;
    mockSourceFiles.length = 0;
    
    // Créer une nouvelle instance du handler
    const options: CircularDependencyOptions = {
      maxDepth: 10,
      verbose: false
    };
    handler = new CircularDependencyHandler(options);
    mockProject = new Project();
  });
  
  describe('detectCircularDependencies', () => {
    it('devrait détecter une dépendance circulaire simple', () => {
      // Arrange - Créer des fichiers sources avec un cycle simple A -> B -> A
      const fileA = {
        getFilePath: () => '/root/a.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./b.ts'"
            })
          });
        }
      };
      
      const fileB = {
        getFilePath: () => '/root/b.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./a.ts'"
            })
          });
        }
      };
      
      mockSourceFiles.push(fileA, fileB);
      
      // Act
      const result = handler.detectCircularDependencies(fileA as unknown as SourceFile, mockProject);
      
      // Assert
      expect(result.hasCircularDependencies).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain('/root/a.ts');
      expect(result.cycles[0]).toContain('/root/b.ts');
      expect(result.suggestions).toHaveLength(4); // 3 génériques + 1 spécifique
    });
    
    it('ne devrait pas détecter de dépendances circulaires si aucune n\'existe', () => {
      // Arrange - Créer des fichiers sources sans cycle A -> B -> C
      const fileA = {
        getFilePath: () => '/root/a.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./b.ts'"
            })
          });
        }
      };
      
      const fileB = {
        getFilePath: () => '/root/b.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./c.ts'"
            })
          });
        }
      };
      
      const fileC = {
        getFilePath: () => '/root/c.ts',
        forEachDescendant: (callback: any) => {
          // Aucun import
        }
      };
      
      mockSourceFiles.push(fileA, fileB, fileC);
      
      // Act
      const result = handler.detectCircularDependencies(fileA as unknown as SourceFile, mockProject);
      
      // Assert
      expect(result.hasCircularDependencies).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.affectedFiles).toHaveLength(0);
    });
    
    it('devrait détecter des dépendances circulaires complexes', () => {
      // Arrange - Créer des fichiers sources avec un cycle complexe A -> B -> C -> A
      const fileA = {
        getFilePath: () => '/root/a.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./b.ts'"
            })
          });
        }
      };
      
      const fileB = {
        getFilePath: () => '/root/b.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./c.ts'"
            })
          });
        }
      };
      
      const fileC = {
        getFilePath: () => '/root/c.ts',
        forEachDescendant: (callback: any) => {
          callback({
            kind: 271,
            getModuleSpecifier: () => ({
              getText: () => "'./a.ts'"
            })
          });
        }
      };
      
      mockSourceFiles.push(fileA, fileB, fileC);
      
      // Act
      const result = handler.detectCircularDependencies(fileA as unknown as SourceFile, mockProject);
      
      // Assert
      expect(result.hasCircularDependencies).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain('/root/a.ts');
      expect(result.cycles[0]).toContain('/root/b.ts');
      expect(result.cycles[0]).toContain('/root/c.ts');
    });
    
    it('devrait ignorer les imports de bibliothèques externes', () => {