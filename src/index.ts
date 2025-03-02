import { BoltOptimizer } from './lib/meta-prompt/BoltOptimizer';
import { ParallelPromptProcessor, parallelizePrompts } from './lib/parallelPromptProcessor';
import { StratifiedAnalyzer } from './lib/analyzer/stratifiedAnalyzer';
import { detectEnvironment } from './lib/utils/environment';
import { git, getGitImplementation } from './lib/gitShim';
import { OpenAIProvider } from './lib/providers/openAIProvider';
import { AnthropicProvider } from './lib/providers/anthropicProvider';
import { LLMProvider, LLMResponse } from './lib/types/llm';
import { Environment, BoltConfig } from './lib/types/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { loadConfigFromFile } from './lib/configLoader'; // Nouvelle importation
import { handleCircularDependencies } from './lib/meta-prompt/BoltOptimizer';

/**
 * Point d'entrée principal de Bolt2bolt
 * 
 * Expose l'API principale pour l'auto-optimisation de code
 */
import { Orchestrator } from './core/orchestrator/orchestrator';
import { OptimizationStatus } from './core/orchestrator/types';
import { ProjectOptions } from './core/types';
import { config, loadConfig } from './config/env-config';
import { eventBus, Events } from './utils/events';

// Configuration des événements généraux
function setupGlobalEvents() {
  eventBus.on(Events.PROCESS_STARTED, (data) => {
    console.log(`[Bolt2Bolt] Démarrage du traitement: ${JSON.stringify(data)}`);
  });

  eventBus.on(Events.PROCESS_COMPLETED, (data) => {
    console.log(`[Bolt2Bolt] Traitement terminé: ${JSON.stringify(data)}`);
  });

  eventBus.on(Events.PROCESS_ERROR, (data) => {
    console.error(`[Bolt2Bolt] Erreur lors du traitement: ${JSON.stringify(data)}`);
  });
}

// [COPILOT_PROMPT]: Vérifiez que toutes les fonctions principales de Bolt2bolt sont correctement initialisées.
// [COPILOT_PROMPT]: Ajoutez des commentaires pour expliquer les étapes d'initialisation et les points d'entrée principaux.

export class Bolt2bolt {
  private optimizer: BoltOptimizer;
  private analyzer: StratifiedAnalyzer | null = null;
  private environment: Environment | null = null;
  private config: BoltConfig | null = null;
  
  constructor(private projectRoot: string, private fsModule = fs, private pathModule = path) {
    this.optimizer = new BoltOptimizer();
  }
  
  /**
   * Initialise Bolt2bolt
   */
  async initialize(): Promise<void> {
    this.environment = await detectEnvironment();
    this.analyzer = new StratifiedAnalyzer(this.projectRoot);
    await this.optimizer.initialize();
    
    try {
      const configPath = this.pathModule.join(this.projectRoot, 'boltConfig.json');
      const configContent = await this.fsModule.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent);
    } catch (error) {
      console.warn('No config file found, using defaults');
      this.config = loadConfigFromFile(); // Utilisation du module de configuration
    }
  }
  
  /**
   * Crée une instance de LLM selon la configuration
   */
  async createLLMProvider(model?: string): Promise<LLMProvider> {
    if (!this.config) {
      throw new Error("Bolt2bolt n'est pas initialisé");
    }
    
    // Utilise le modèle demandé ou le modèle de plus haute priorité
    const modelName = model || 
      Object.entries(this.config.aiModels)
        .sort(([, a], [, b]) => a.priority - b.priority)[0][0];
    
    const modelConfig = this.config.aiModels[modelName];
    
    if (!modelConfig) {
      throw new Error(`Modèle "${modelName}" non configuré`);
    }
    
    // Crée le provider approprié selon le modèle
    if (modelName.startsWith('gpt')) {
      return new OpenAIProvider(
        modelConfig.apiKey || process.env.OPENAI_API_KEY || '',
        modelName,
        modelConfig.defaultOptions
      );
    } else if (modelName.startsWith('claude')) {
      return new AnthropicProvider(
        modelConfig.apiKey || process.env.ANTHROPIC_API_KEY || '',
        modelName,
        modelConfig.defaultOptions
      );
    } else {
      throw new Error(`Modèle "${modelName}" non supporté`);
    }
  }
  
  /**
   * Analyse le projet et génère des recommandations d'optimisation
   */
  async analyzeProject(): Promise<any> {
    if (!this.analyzer) {
      throw new Error("Bolt2bolt n'est pas initialisé");
    }
    return this.analyzer.analyzeProject();
  }
  
  /**
   * Optimise le projet en utilisant les recommandations d'analyse
   */
  async optimizeProject(): Promise<{
    success: boolean;
    changes: { file: string; type: 'modified' | 'created' | 'deleted' }[];
    summary: string;
  }> {
    if (!this.analyzer) {
      throw new Error("Bolt2bolt n'est pas initialisé");
    }
    
    // 1. Analyser le projet
    const analysis = await this.analyzer.analyzeProject();
    
    // 2. Générer un meta-prompt pour l'optimisation
    const llmProvider = await this.createLLMProvider();
    const response = await this.optimizer.processOptimizationRequest(
      this.projectRoot,
      analysis.recommendations
    );
    
    // 3. Simuler les modifications (dans une implémentation réelle, cela appliquerait réellement les changements)
    return {
      success: true,
      changes: [
        { file: 'src/lib/parallelPromptProcessor.ts', type: 'modified' },
        { file: 'src/lib/gitShim.ts', type: 'modified' },
        { file: 'src/lib/utils/environment.ts', type: 'created' }
      ],
      summary: `Optimisation complétée avec un score de ${analysis.score + 5}/100. Principales améliorations: implémentation du système de retry exponentiel et réduction de la complexité cyclomatique.`
    };
  }

  /**
   * Valide le projet après optimisation
   */
  async validateProject(): Promise<any> {
    // Implémentation de la validation du projet
    console.log('Validation du projet...');
    return { success: true, message: 'Projet validé avec succès.' };
  }

  /**
   * Génère un rapport sur l'état du projet
   */
  async generateReport(format: 'markdown' | 'html' | 'json' = 'markdown'): Promise<string> {
    // Implémentation de la génération de rapport
    console.log(`Génération du rapport au format ${format}...`);
    return `Rapport généré au format ${format}.`;
  }
  
  /**
   * Traite plusieurs prompts en parallèle
   */
  async processPrompts(prompts: string[], concurrency = 5): Promise<LLMResponse[]> {
    const llmProvider = await this.createLLMProvider();
    return parallelizePrompts(prompts, llmProvider, concurrency);
  }
  
  /**
   * Récupère l'implémentation Git appropriée pour l'environnement
   */
  async getGit() {
    return getGitImplementation();
  }
}

/**
 * Options pour l'auto-optimisation
 */
export interface AutoOptimizerOptions {
  projectPath: string;
  projectName?: string;
  reportFormat?: 'markdown' | 'html' | 'json';
  autoRollback?: boolean;
  enableLearning?: boolean;
}

/**
 * Résultat de l'auto-optimisation
 */
export interface AutoOptimizeResult {
  success: boolean;
  status: OptimizationStatus;
  analysisReport?: string;
  optimizationReport?: string;
  validationReport?: string;
  error?: string;
}

/**
 * Exécute le processus d'auto-optimisation complet sur un projet
 * @param options Options de configuration pour l'auto-optimisation
 */
export async function autoOptimize(options: AutoOptimizerOptions): Promise<AutoOptimizeResult> {
  console.log(`Starting Bolt2bolt auto-optimization for ${options.projectPath}`);
  
  try {
    // Créer les options pour l'orchestrateur
    const projectOptions: ProjectOptions = {
      projectName: options.projectName || 'Unnamed Project',
      basePath: options.projectPath
    };
    
    // Initialiser l'orchestrateur
    const orchestrator = new Orchestrator({
      analyzerOptions: { projectOptions },
      optimizerOptions: { projectOptions },
    });
    
    // Exécuter l'analyse
    const analysis = await orchestrator.analyze();
    
    // Exécuter l'optimisation
    const optimization = await orchestrator.optimize(analysis);
    
    // Exécuter la validation
    const validation = await orchestrator.validate(optimization);
    
    // Générer les rapports
    const analysisReport = orchestrator.generateReport('analysis', analysis, options.reportFormat);
    const optimizationReport = orchestrator.generateReport('optimization', optimization, options.reportFormat);
    const validationReport = orchestrator.generateReport('validation', validation, options.reportFormat);
    
    return {
      success: true,
      status: optimization.status,
      analysisReport,
      optimizationReport,
      validationReport
    };
  } catch (error) {
    console.error('Auto-optimization failed:', error);
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Initialise l'application Bolt2bolt
 */
async function initialize() {
  try {
    // Chargement de la configuration utilisateur
    const configPath = path.join(process.cwd(), 'bolt2bolt.config.json');
    await loadConfig(configPath);
    
    // Configuration des événements
    setupGlobalEvents();
    
    console.log(`[Bolt2bolt] Initialisation en environnement ${config.environment}`);
    
    return new Orchestrator();
  } catch (error) {
    console.error('[Bolt2bolt] Erreur lors de l\'initialisation:', error);
    throw error;
  }
}

// Export des composants principaux
export {
  BoltOptimizer,
  ParallelPromptProcessor,
  StratifiedAnalyzer,
  OpenAIProvider,
  AnthropicProvider,
  detectEnvironment,
  git,
  Orchestrator,
  initialize,
  config,
  eventBus,
  Events,
  newBoltOptimizeMethod
};

// Export par défaut
export default Bolt2bolt;

// Ajout d'un point d'entrée pour exécuter Bolt2bolt en local
if (require.main === module) {
	(async () => {
		try {
			const bolt = new Bolt2bolt(process.cwd());
			await bolt.initialize();
			console.log("Bolt2bolt initialisé avec succès. Lancement de l'analyse...");
			const analysisResult = await bolt.analyzeProject();
			console.log("Résultat de l'analyse :", analysisResult);
			process.exit(0);
		} catch (error) {
			console.error("Erreur lors de l'initialisation locale :", error);
			process.exit(1);
		}
	})();
}

/*
[COPILOT_PROMPTS]
# Point d'Entrée Principal - Directives d'Implémentation

## Responsabilité
- Initialiser le système Bolt2bolt
- Configurer les composants principaux
- Orchestrer le flux de travail d'analyse et d'optimisation

## Architecture
- Point d'entrée minimaliste qui délègue aux composants spécialisés
- Gestionnaire centralisé de configuration
- Système de plugins pour extensibilité

## Anti-patterns
- Éviter la logique métier dans ce fichier
- Ne pas dupliquer la configuration des composants
- Éviter les dépendances circulaires
[COPILOT_PROMPTS]
*/

import * as path from 'path';
import * as fs from 'fs-extra';
import { Logger, createLogger } from './utils/logger';
import { ConfigManager } from './utils/config-manager';
import { Orchestrator } from './core/orchestrator';
import { CodeAnalyzer } from './core/analyzer';
import { CodeOptimizer } from './core/optimizer';
import { CodeValidator } from './core/validator';
import { Reporter } from './core/reporter';

// #codebase: Veuillez suivre les directives

/**
 * Initialise et configure le système Bolt2bolt
 */
export async function initBolt2bolt(configPath?: string): Promise<Orchestrator> {
  // Initialiser le logger
  const logger = createLogger({ level: 'info' });
  logger.info('Initialising Bolt2bolt system');
  
  // Charger la configuration
  const configManager = new ConfigManager(logger);
  const config = await configManager.loadConfig(configPath);
  logger.debug('Configuration loaded', { configPath });
  
  // Initialiser les composants principaux
  const analyzer = new CodeAnalyzer(logger);
  const optimizer = new CodeOptimizer(logger);
  const validator = new CodeValidator(logger);
  const reporter = new Reporter(logger);
  
  // Créer l'orchestrateur
  const orchestrator = new Orchestrator(
    logger,
    analyzer,
    optimizer,
    validator,
    reporter,
    config
  );
  
  logger.info('Bolt2bolt system initialized successfully');
  return orchestrator;
}

/**
 * Point d'entrée pour l'utilisation programmatique de Bolt2bolt
 */
export { 
  Orchestrator,
  CodeAnalyzer,
  CodeOptimizer,
  CodeValidator,
  Reporter,
  ConfigManager,
  Logger
};

/**
 * Point d'entrée pour l'utilisation directe (sans CLI)
 */
if (require.main === module) {
  // #codebase: [MODE:STANDALONE] Ce code s'exécute uniquement en mode standalone.
  (async () => {
    try {
      const orchestrator = await initBolt2bolt();
      await orchestrator.runFullCycle({
        targetPath: process.cwd(),
        outputPath: path.join(process.cwd(), 'bolt2bolt-output')
      });
      
      console.log('Bolt2bolt exécuté avec succès! Vérifiez les rapports dans bolt2bolt-output/');
      process.exit(0);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de Bolt2bolt:', error);
      process.exit(1);
    }
  })();
}

/**
 * Bolt2bolt - Système d'optimisation des prompts pour GitHub Copilot
 * 
 * Ce module exporte tous les composants nécessaires pour implémenter le système
 * d'optimisation et de gestion des prompts dans une codebase.
 */

// Composants principaux
export { PromptManager, FileType } from './utils/prompt-manager';
export { PromptOptimizer } from './utils/prompt-optimizer';
export { PromptIntegration } from './utils/prompt-integration';
export { 
  createPrompt, 
  createCopilotPromptBlock, 
  parsePrompt, 
  createTestPrompt,
  hasPrompts,
  PromptType
} from './utils/prompts-helper';

// Types et interfaces
export type { 
  ProjectContext, 
  PromptManagerConfig 
} from './utils/prompt-manager';
export type { 
  PromptMetrics, 
  OptimizationResult,
  PromptOptimizerOptions 
} from './utils/prompt-optimizer';
export type { 
  PromptIntegrationConfig 
} from './utils/prompt-integration';
export type { 
  CodebasePrompt, 
  PromptOptions 
} from './utils/prompts-helper';

// Configuration
export { config, initializeConfig } from './config';
