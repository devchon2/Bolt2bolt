// #codebase: [CONTEXTE] Gestionnaire de configuration pour Bolt2bolt.
// #codebase: [DIRECTIVE] Centraliser le chargement et la validation de la configuration.
// #codebase: [ITÉRATION-ACTUELLE] Version alpha stabilisée.

import * as fs from 'fs-extra';
import * as path from 'path';
import { merge, cloneDeep } from 'lodash';
import { Logger } from './logger';

/*
[COPILOT_PROMPTS]
# Gestionnaire de Configuration - Directives d'Implémentation

## Responsabilité
- Charger la configuration depuis différentes sources
- Valider la structure et les valeurs de configuration
- Fournir des valeurs par défaut pour les options manquantes
- Exposer une API unifiée pour accéder à la configuration

## Patterns Recommandés
- Singleton pour la configuration globale
- Strategy pour les différentes sources (fichier, env, etc.)
- Observer pour notifier des changements de configuration

## Principes
- Configuration immuable une fois chargée
- Validation stricte des valeurs
- Documentation claire des options disponibles
- Sensible defaults pour toutes les options
[COPILOT_PROMPTS]
*/

/**
 * Structure de configuration principale de Bolt2bolt
 */
export interface BoltConfig {
  /**
   * Version de la configuration
   */
  version: string;
  
  /**
   * Configuration des modèles d'IA
   */
  aiModels: {
    [modelName: string]: {
      priority: number;
      contextWindow: number;
      defaultOptions: {
        temperature: number;
        maxTokens: number;
      };
    };
  };
  
  /**
   * Seuils de qualité
   */
  threshold: {
    maxComplexity: number;
    maxDuplication: number;
    minTestCoverage: number;
  };
  
  /**
   * Configuration des composants
   */
  components: {
    analyzer: {
      enabled: boolean;
      maxDepth: number;
      defaultTypes: string[];
      cache: {
        enabled: boolean;
        maxAge: number;
      };
    };
    optimizer: {
      enabled: boolean;
      aggressiveness: number;
      performanceVsReadability: number;
      safeMode: boolean;
      preserveComments: boolean;
    };
    validator: {
      enabled: boolean;
      minSeverity: number;
      runTests: boolean;
      verbosity: string;
    };
    reporter: {
      formats: string[];
      outputDir: string;
      groupBy: string;
    };
  };
  
  /**
   * Configuration des chemins
   */
  paths: {
    ignore: string[];
    include: string[];
  };
  
  /**
   * Plugins externes
   */
  plugins: Array<string | {
    name: string;
    options: Record<string, any>;
  }>;
}

/**
 * Configuration par défaut de Bolt2bolt
 */
const DEFAULT_CONFIG: BoltConfig = {
  version: '0.0.1-alpha',
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
  },
  components: {
    analyzer: {
      enabled: true,
      maxDepth: 10,
      defaultTypes: ['syntax', 'security', 'performance', 'quality', 'complexity'],
      cache: {
        enabled: true,
        maxAge: 3600
      }
    },
    optimizer: {
      enabled: true,
      aggressiveness: 5,
      performanceVsReadability: 0.5,
      safeMode: true,
      preserveComments: true
    },
    validator: {
      enabled: true,
      minSeverity: 2,
      runTests: true,
      verbosity: 'normal'
    },
    reporter: {
      formats: ['console', 'html'],
      outputDir: './reports',
      groupBy: 'severity'
    }
  },
  paths: {
    ignore: ['node_modules', 'dist', 'build', 'coverage'],
    include: ['src/**/*.ts', 'src/**/*.tsx']
  },
  plugins: []
};

/**
 * Options du gestionnaire de configuration
 * 
 * Options disponibles pour ConfigManager.
 * - defaultConfigName: Nom du fichier de configuration par défaut.
 * - searchPaths: Liste de répertoires où chercher le fichier de configuration.
 * - useEnvironment: Appliquer les variables d'environnement pour surcharger la configuration.
 * - strictValidation: Si true, la configuration est validée de manière stricte.
 */
export interface ConfigManagerOptions {
  /**
   * Nom du fichier de configuration par défaut
   */
  defaultConfigName?: string;
  
  /**
   * Répertoires où chercher la configuration
   */
  searchPaths?: string[];
  
  /**
   * Variables d'environnement à utiliser
   */
  useEnvironment?: boolean;
  
  /**
   * Valider strictement la configuration
   */
  strictValidation?: boolean;
}

/**
 * Gestionnaire de configuration pour Bolt2bolt
 */
export class ConfigManager {
  private config: BoltConfig | null = null;
  private readonly options: Required<ConfigManagerOptions>;
  private readonly logger: Logger;
  
  /**
   * Crée une nouvelle instance du gestionnaire de configuration
   */
  constructor(logger: Logger, options: ConfigManagerOptions = {}) {
    this.logger = logger;
    
    // Options par défaut
    this.options = {
      defaultConfigName: 'boltConfig.json',
      searchPaths: [
        process.cwd(),
        path.join(process.cwd(), 'config'),
        path.join(__dirname, '..', '..')
      ],
      useEnvironment: true,
      strictValidation: true,
      ...options
    };
  }
  
  /**
   * Charge la configuration depuis les sources disponibles
   */
  public async loadConfig(configPath?: string): Promise<BoltConfig> {
    try {
      // Si la configuration est déjà chargée, la retourner
      if (this.config) {
        return cloneDeep(this.config);
      }
      
      // Commencer avec la configuration par défaut
      let config = cloneDeep(DEFAULT_CONFIG);
      
      // Charger depuis un fichier si spécifié
      if (configPath) {
        const fileConfig = await this.loadFromFile(configPath);
        config = merge(config, fileConfig);
        this.logger.info(`Configuration chargée depuis ${configPath}`);
      } else {
        // Chercher dans les répertoires de recherche
        const loadedConfig = await this.searchForConfig();
        if (loadedConfig) {
          config = merge(config, loadedConfig.config);
          this.logger.info(`Configuration chargée depuis ${loadedConfig.path}`);
        } else {
          this.logger.warn('Aucun fichier de configuration trouvé, utilisation des valeurs par défaut');
        }
      }
      
      // Appliquer les variables d'environnement si activé
      if (this.options.useEnvironment) {
        const envConfig = this.loadFromEnvironment();
        config = merge(config, envConfig);
        if (Object.keys(envConfig).length > 0) {
          this.logger.debug('Variables d\'environnement appliquées à la configuration');
        }
      }
      
      // Valider la configuration
      if (this.options.strictValidation) {
        this.validateConfig(config);
      }
      
      // Stocker la configuration validée
      this.config = config;
      return cloneDeep(this.config);
    } catch (error) {
      this.logger.error('Erreur lors du chargement de la configuration', { error });
      throw new Error(`Erreur de configuration: ${error.message}`);
    }
  }
  
  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): BoltConfig {
    if (!this.config) {
      throw new Error('Configuration non chargée. Appelez loadConfig() d\'abord.');
    }
    return cloneDeep(this.config);
  }
  
  /**
   * Obtient une section spécifique de la configuration
   */
  public getConfigSection<T>(path: string): T {
    if (!this.config) {
      throw new Error('Configuration non chargée. Appelez loadConfig() d\'abord.');
    }
    
    const parts = path.split('.');
    let section: any = this.config;
    
    for (const part of parts) {
      if (section[part] === undefined) {
        throw new Error(`Section de configuration non trouvée: ${path}`);
      }
      section = section[part];
    }
    
    return cloneDeep(section);
  }
  
  /**
   * Charge la configuration depuis un fichier
   */
  private async loadFromFile(filePath: string): Promise<Partial<BoltConfig>> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Impossible de charger la configuration depuis ${filePath}: ${error.message}`);
    }
  }
  
  /**
   * Recherche un fichier de configuration dans les répertoires de recherche
   */
  private async searchForConfig(): Promise<{ path: string; config: Partial<BoltConfig> } | null> {
    for (const searchPath of this.options.searchPaths) {
      const configPath = path.join(searchPath, this.options.defaultConfigName);
      
      try {
        if (await fs.pathExists(configPath)) {
          const config = await this.loadFromFile(configPath);
          return { path: configPath, config };
        }
      } catch (error) {
        this.logger.debug(`Échec de chargement depuis ${configPath}`, { error: error.message });
      }
    }
    
    return null;
  }
  
  /**
   * Charge la configuration depuis les variables d'environnement
   */
  private loadFromEnvironment(): Partial<BoltConfig> {
    const envConfig: Partial<BoltConfig> = {};
    
    // Mapping des variables d'environnement vers des chemins de configuration
    const envMapping = {
      'BOLT_MAX_COMPLEXITY': 'threshold.maxComplexity',
      'BOLT_MIN_TEST_COVERAGE': 'threshold.minTestCoverage',
      'BOLT_ANALYZER_ENABLED': 'components.analyzer.enabled',
      'BOLT_OPTIMIZER_ENABLED': 'components.optimizer.enabled',
      'BOLT_OPTIMIZER_AGGRESSIVENESS': 'components.optimizer.aggressiveness',
      'BOLT_VALIDATOR_ENABLED': 'components.validator.enabled',
      'BOLT_REPORTER_FORMATS': 'components.reporter.formats',
      'BOLT_REPORTER_OUTPUT': 'components.reporter.outputDir'
    };
    
    // Appliquer les variables d'environnement
    for (const [envVar, configPath] of Object.entries(envMapping)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setConfigValue(envConfig, configPath, this.parseEnvValue(value));
      }
    }
    
    return envConfig;
  }
  
  /**
   * Convertit les valeurs de texte en types appropriés
   */
  private parseEnvValue(value: string): any {
    // Convertir en booléen si c'est "true" ou "false"
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Convertir en nombre si possible
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') return num;
    
    // Convertir en tableau si c'est au format CSV
    if (value.includes(',')) {
      return value.split(',').map(item => this.parseEnvValue(item.trim()));
    }
    
    // Sinon, retourner la valeur telle quelle
    return value;
  }
  
  /**
   * Définit une valeur dans un objet de configuration à partir d'un chemin
   */
  private setConfigValue(config: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * Valide la configuration
   */
  private validateConfig(config: BoltConfig): void {
    // Implémenter la logique de validation ici
    // Par exemple, vérifier que les valeurs sont dans les plages attendues
    if (config.threshold.maxComplexity < 0) {
      throw new Error('maxComplexity doit être supérieur ou égal à 0');
    }
    if (config.threshold.minTestCoverage < 0 || config.threshold.minTestCoverage > 100) {
      throw new Error('minTestCoverage doit être entre 0 et 100');
    }
    // Ajouter d'autres validations selon les besoins
  }
}
