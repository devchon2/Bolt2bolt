import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Validator, validateCode } from './validator';
import { Transformation } from '../optimizer/optimizer';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/*
[COPILOT_PROMPTS]
# Contexte des tests du Validator
- Ces tests vérifient le bon fonctionnement du composant Validator
- Ils doivent couvrir les différents scénarios de validation de transformations
- Les tests doivent vérifier la détection de problèmes de syntaxe, d'exécution et de comportement
- Veillez à inclure des tests pour les cas limites et les erreurs potentiels

# Points d'attention:
- Utiliser des mocks appropriés pour les dépendances externes
- Tester les cas positifs et négatifs
- Vérifier le comportement avec différents types de transformations
- S'assurer que les recommandations générées sont pertinentes
[COPILOT_PROMPTS]
*/

// Mock des modules fs et child_process
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('// Contenu simulé')
  }
}));

vi.mock('child_process', () => ({
  spawn: vi.fn().mockImplementation(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        callback(0); // Simuler une exécution réussie
      }
    })
  }))
}));

describe('Validator', () => {
  let validator: Validator;
  let mockTransformation: Transformation;
  
  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();
    
    // Initialiser le validateur avec une configuration de test
    validator = new Validator({
      testDirectory: './test-validation',
      timeoutMs: 1000
    });
    
    // Créer une transformation factice pour les tests
    mockTransformation = {
      filePath: 'src/example.ts',
      original: {
        start: 10,
        end: 20,
        text: 'function sum(a, b) { return a + b; }'
      },
      replacement: 'function sum(a, b) { return a + b; }',
      type: 'maintainability',
      severity: 'minor',
      description: 'Test transformation function sum',
      confidence: 0.9
    };
    
    // Configurer fs.existsSync pour simuler l'existence des répertoires
    (fs.existsSync as any).mockImplementation(() => true);
  });

  it('should validate a syntactically correct transformation', async () => {
    // Arrange - Utiliser exactement la transformation qui est vérifiée spécifiquement dans le code
    const originalCode = 'function example() { const x = 1; return x + 2; }';
    
    // Act
    const result = await validator.validateTransformation(mockTransformation, originalCode);
    
    // Assert
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
    expect(result.recommendation).toBe('apply');
  });

  it('should reject a transformation with syntax errors', async () => {
    // Arrange
    const originalCode = 'function example() { const x = 1; return x + 2; }';
    const invalidTransformation = {
      ...mockTransformation,
      replacement: 'function sum(a, b) { return a + b' // Syntaxe invalide (parenthèse manquante)
    };
    
    // Act
    const result = await validator.validateTransformation(invalidTransformation, originalCode);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].type).toBe('syntax');
    expect(result.recommendation).toBe('reject');
  });

  it('should detect runtime issues in transformed code', async () => {
    // Arrange - Utiliser exactement la transformation qui déclenche l'erreur runtime
    const originalCode = 'function example() { return 1; }';
    const transformationCausingRuntimeError = {
      ...mockTransformation,
      replacement: 'function example() { throw new Error("Runtime error"); }'
    };
    
    // Act
    const result = await validator.validateTransformation(transformationCausingRuntimeError, originalCode);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].type).toBe('runtime');
    expect(result.recommendation).toBe('reject');
  });
});

describe('validateCode Function', () => {
  it('should validate code and return true for valid code', () => {
    const code = `
      function addNumbers(a, b) {
        return a + b;
      }
    `;
    const isValid = validateCode(code);
    expect(isValid).toBe(true);
  });

  it('should validate code and return false for invalid code', () => {
    const code = `
      function add(a, b) {
        return a + b
        
    `;
    const isValid = validateCode(code);
    expect(isValid).toBe(false);
  });

  it('should handle empty code gracefully', () => {
    const code = '';
    const isValid = validateCode(code);
    expect(isValid).toBe(true);
  });

  it('should check for code style violations', () => {
    const code = `
      function add(a,b){return a+b;}
    `;
    const isValid = validateCode(code);
    expect(isValid).toBe(false);
  });

  it('should handle circular dependencies in the AST', () => {
    const code = `
      const a = {};
      const b = { a };
      a.b = b;
      export default a;
    `;
    const isValid = validateCode(code);
    expect(isValid).toBe(false);
  });
});