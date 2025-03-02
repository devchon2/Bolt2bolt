import { 
  AnalyzerOptions, 
  OptimizerOptions, 
  ValidatorOptions, 
  ReporterOptions 
} from '../types/common';

/**
 * Configuration globale pour Bolt2bolt
 */
interface Config {
  environment: 'development' | 'production' | 'test';
  analyzer: AnalyzerOptions;
  optimizer: OptimizerOptions;
  validator: ValidatorOptions;
  reporter: ReporterOptions;
  paths: {
    temp: string;
    output: string;
    backup: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}

// Configuration par défaut
export const config: Config = {
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  
  // Configuration de l'analyseur
  analyzer: {
    includeMetrics: ['complexity', 'security', 'maintainability'],
    maxComplexity: 20,
    securityLevel: 'high',
    rulesets: ['typescript-recommended', 'security-essential']
  },
  
  // Configuration de l'optimiseur
  optimizer: {
    preserveFormat: true,
    aggressiveness: 'moderate',
    strategies: ['security', 'performance', 'maintainability']
  },
  
  // Configuration du validateur
  validator: {
    generateTests: true,
    validateTypes: true,
    checkBehavior: true
  },
  
  // Configuration du générateur de rapports
  reporter: {
    formats: ['json', 'html', 'markdown'],
    detailLevel: 'detailed',
    outputDir: './reports'
  },
  
  // Chemins d'accès
  paths: {
    temp: './tmp',
    output: './output',
    backup: './backups'
  },
  
  // Configuration des logs
  logging: {
    level: 'info',
    file: './logs/bolt2bolt.log'
  }
};

/**
 * Charge la configuration depuis un fichier externe (si disponible)
 * @param configPath Chemin du fichier de configuration
 */
export async function loadConfig(configPath: string): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const configData = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(configData);
    
    // Fusion récursive des configurations
    mergeConfig(config, userConfig);
  }
  catch (error) {
    console.warn(`Impossible de charger la configuration depuis ${configPath}:`, error);
    console.info('Utilisation de la configuration par défaut.');
  }
}

/**
 * Fusionne récursivement les configurations
 */
function mergeConfig(target: any, source: any): void {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      mergeConfig(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
