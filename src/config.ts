// #codebase: [CONTEXT] Configuration centralisée pour le système Bolt2bolt.
// #codebase: [RESPONSIBILITY] Gérer les paramètres de configuration pour tous les composants.
// #codebase: [CURRENT-ITERATION] Phase 5: Optimisation des prompts et chaînage intelligent.

import * as path from 'path';
import * as fs from 'fs';
import { PromptManagerConfig } from './utils/prompt-manager';
import { PromptOptimizerOptions } from './utils/prompt-optimizer';
import { PromptIntegrationConfig } from './utils/prompt-integration';

/**
 * Configuration globale du système Bolt2bolt
 */
export interface Bolt2boltConfig {
  /**
   * Version actuelle du système
   */
  version: string;
  
  /**
   * Répertoire de travail du projet
   */
  workDir: string;
  
  /**
   * Configuration du gestionnaire de prompts
   */
  promptManager: PromptManagerConfig;
  
  /**
   * Configuration de l'optimiseur de prompts
   */
  promptOptimizer: PromptOptimizerOptions;
  
  /**
   * Configuration de l'intégration des prompts
   */
  promptIntegration: PromptIntegrationConfig;
  
  /**
   * Mode de débogage activé
   */
  debug: boolean;
  
  /**
   * Chemin vers le fichier de configuration
   */
  configPath?: string;
}

/**
 * Configuration par défaut
 */
export const DEFAULT_CONFIG: Bolt2boltConfig = {
  version: '1.4.2',
  workDir: process.cwd(),
  promptManager: {
    enabled: true,
    inlinePrefix: '#codebase:',
    blockTags: {
      open: '[COPILOT_PROMPTS]',
      close: '[COPILOT_PROMPTS]'
    },
    promptDensity: 20,
    templatesPath: './templates/prompts',
    collectMetrics: true
  },
  promptOptimizer: {
    aggressiveOptimization: false,
    autoApply: false,
    minScoreThreshold: 70,
    maxPromptSize: 3000,
    priorityConcepts: ['pattern', 'architecture', 'validation', 'security', 'performance']
  },
  promptIntegration: {
    includeSystemDirectives: true,
    maxPromptLength: 8000
  },
  debug: false
};

// Instance unique de la configuration globale
export let config: Bolt2boltConfig = { ...DEFAULT_CONFIG };

/**
 * Initialise la configuration à partir d'un fichier ou d'options
 * 
 * @param configPathOrOptions Chemin vers le fichier de configuration ou objet de configuration
 * @returns Configuration initialisée
 */
export function initializeConfig(
  configPathOrOptions?: string | Partial<Bolt2boltConfig>
): Bolt2boltConfig {
  try {
    if (typeof configPathOrOptions === 'string') {
      // Charger depuis un fichier
      const configPath = configPathOrOptions;
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      
      config = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        configPath
      };
      
      if (config.debug) {
        console.log(`Configuration chargée depuis ${configPath}`);
      }
    } else if (configPathOrOptions) {
      // Charger depuis un objet
      config = {
        ...DEFAULT_CONFIG,
        ...configPathOrOptions
      };
      
      if (config.debug) {
        console.log('Configuration initialisée à partir des options fournies');
      }
    } else {
      // Chercher un fichier de configuration par défaut
      const defaultPaths = [
        path.join(process.cwd(), 'bolt2bolt.config.json'),
        path.join(process.cwd(), '.bolt2boltrc')
      ];
      
      for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
          return initializeConfig(defaultPath);
        }
      }
      
      // Utiliser la configuration par défaut
      config = { ...DEFAULT_CONFIG };
      
      if (config.debug) {
        console.log('Configuration par défaut utilisée');
      }
    }
    
    // S'assurer que le répertoire de travail est correctement défini
    if (!config.workDir) {
      config.workDir = process.cwd();
    }
    
    return config;
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    config = { ...DEFAULT_CONFIG, debug: true };
    return config;
  }
}

/**
 * Sauvegarde la configuration actuelle dans un fichier
 * 
 * @param outputPath Chemin du fichier de sortie (optionnel)
 * @returns true si la sauvegarde a réussi
 */
export function saveConfig(outputPath?: string): boolean {
  try {
    const savePath = outputPath || config.configPath || path.join(process.cwd(), 'bolt2bolt.config.json');
    
    // Exclure certaines propriétés de la sauvegarde
    const { configPath, ...configToSave } = config;
    
    fs.writeFileSync(
      savePath,
      JSON.stringify(configToSave, null, 2),
      'utf-8'
    );
    
    if (config.debug) {
      console.log(`Configuration sauvegardée dans ${savePath}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error);
    return false;
  }
}
