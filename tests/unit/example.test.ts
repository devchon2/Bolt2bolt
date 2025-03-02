import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { loadConfigFromFile } from '../../src/lib/configLoader';
import * as fs from 'fs';
import * as path from 'path';

// Mock du module fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

describe('Example Test Suite', () => {
  it('should pass this example test', () => {
    expect(true).toBe(true);
  });
});

describe('Configuration Loader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load default configuration when no file exists', () => {
    // Mock de l'absence de fichier
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    const config = loadConfigFromFile();
    expect(config).toEqual({
      aiModels: {
        'gpt-4': {
          priority: 1,
          contextWindow: 8192,
          defaultOptions: {
            temperature: 0.7,
            maxTokens: 2048
          }
        }
      },
      threshold: {
        maxComplexity: 15,
        maxDuplication: 5,
        minTestCoverage: 80
      }
    });
    
    expect(fs.existsSync).toHaveBeenCalled();
  });
  
  it('should load and merge custom configuration from file', () => {
    // Mock de l'existence et du contenu du fichier
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      aiModels: {
        'claude-3': {
          priority: 2,
          contextWindow: 100000,
          defaultOptions: {
            temperature: 0.5
          }
        }
      },
      threshold: {
        maxComplexity: 10
      }
    }));
    
    const config = loadConfigFromFile();
    
    expect(config.aiModels).toHaveProperty('gpt-4');
    expect(config.aiModels).toHaveProperty('claude-3');
    expect(config.threshold.maxComplexity).toBe(10);
    expect(config.threshold.minTestCoverage).toBe(80); // Valeur par défaut préservée
  });
  
  it('should handle JSON parsing errors', () => {
    // Mock d'un fichier avec du JSON invalide
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const config = loadConfigFromFile();
    
    // Vérifier qu'on obtient la config par défaut
    expect(config.aiModels).toHaveProperty('gpt-4');
    
    // Vérifier que les erreurs ont été loggées
    expect(consoleSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Utilisation de la configuration par défaut.');
  });
});
