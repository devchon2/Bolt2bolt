import { runBoltProcess, analyzeAndOptimize } from "./bolt-core";
import { execSync } from "child_process";
import * as path from 'path';
import { autoOptimize, AutoOptimizerOptions, startContinuousOptimization } from './bolt-core/auto-optimizer';

/**
 * Configuration principale de Bolt2bolt
 */
interface Bolt2BoltConfig {
  rootDir: string;
  outputDir: string;
  includeDirs: string[];
  excludeDirs: string[];
  optimizationOptions: Omit<AutoOptimizerOptions, 'rootDir'>;
  validationThresholds: {
    performance: {
      maxCpu: number;
      maxMemory: number;
    };
    security: {
      allowedVulnerabilitySeverity: 'low' | 'medium' | 'high' | 'critical';
    };
    complexity: {
      maxCyclomatic: number;
    };
  };
}

/**
 * Configuration par défaut
 */
const defaultConfig: Bolt2BoltConfig = {
  rootDir: process.cwd(),
  outputDir: path.join(process.cwd(), 'bolt-output'),
  includeDirs: ['.'],
  excludeDirs: ['node_modules', 'dist', '.git', '.github', 'bolt-output'],
  optimizationOptions: {
    enableRollback: true,
    validateAfterOptimization: true,
    generateReport: true,
    maxConcurrentOptimizations: 5,
    optimizationTypes: ['security', 'performance', 'complexity', 'maintainability']
  },
  validationThresholds: {
    performance: {
      maxCpu: 70, // pourcentage
      maxMemory: 512, // MB
    },
    security: {
      allowedVulnerabilitySeverity: 'low',
    },
    complexity: {
      maxCyclomatic: 15,
    },
  }
};

/**
 * Charge la configuration à partir d'un fichier ou utilise les valeurs par défaut
 */
function loadConfiguration(configPath?: string): Bolt2BoltConfig {
  let config = defaultConfig;
  
  if (configPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = {
          ...defaultConfig,
          ...userConfig,
          optimizationOptions: {
            ...defaultConfig.optimizationOptions,
            ...userConfig.optimizationOptions
          },
          validationThresholds: {
            ...defaultConfig.validationThresholds,
            ...userConfig.validationThresholds,
            performance: {
              ...defaultConfig.validationThresholds.performance,
              ...(userConfig.validationThresholds?.performance || {})
            },
            security: {
              ...defaultConfig.validationThresholds.security,
              ...(userConfig.validationThresholds?.security || {})
            },
            complexity: {
              ...defaultConfig.validationThresholds.complexity,
              ...(userConfig.validationThresholds?.complexity || {})
            }
          }
        };
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement de la configuration, utilisation des valeurs par défaut:', error);
    }
  }
  
  return config;
}

/**
 * Point d'entrée principal pour Bolt2bolt
 */
async function bootstrap(configPath?: string): Promise<void> {
  console.log('🚀 Démarrage de Bolt2bolt...');
  
  // Charger la configuration
  const config = loadConfiguration(configPath);
  console.log('⚙️ Configuration chargée:');
  console.log(`   - Répertoire racine: ${config.rootDir}`);
  console.log(`   - Répertoire de sortie: ${config.outputDir}`);
  console.log(`   - Optimisation types: ${config.optimizationOptions.optimizationTypes?.join(', ')}`);
  
  // Construire les options pour l'auto-optimizer
  const optimizerOptions: AutoOptimizerOptions = {
    rootDir: config.rootDir,
    outputDir: config.outputDir,
    includeDirs: config.includeDirs,
    excludeDirs: config.excludeDirs,
    ...config.optimizationOptions
  };
  
  // Exécuter le processus d'auto-optimisation
  console.log('⚡ Démarrage du processus d\'auto-optimisation...');
  try {
    const result = await autoOptimize(optimizerOptions);
    
    if (result.success) {
      console.log('✅ Auto-optimisation terminée avec succès!');
      console.log(`   - Fichiers optimisés: ${result.optimizationResults.filter(r => r.optimized).length}`);
      console.log(`   - Changements appliqués: ${result.optimizationResults.reduce((sum, r) => sum + r.changes.length, 0)}`);
      
      if (result.report) {
        console.log('📊 Un rapport détaillé a été généré dans le répertoire de sortie.');
        console.log(`   - Chemin: ${result.reportPath}`);
      }

      // Ajouter des statistiques détaillées
      const typeStats = countOptimizationsByType(result.optimizationResults);
      console.log('📈 Répartition des optimisations:');
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} changements`);
      });
    } else {
      console.error('❌ Auto-optimisation échouée:', result.error);
      if (config.optimizationOptions.enableRollback) {
        console.log('⏪ Les changements ont été annulés pour maintenir la stabilité du système.');
      }
    }
  } catch (error) {
    console.error('❌ Erreur critique lors de l\'auto-optimisation:', error);
  }

  // Fonction pour compter les optimisations par type
  function countOptimizationsByType(results: any[]) {
    const typeCount: Record<string, number> = {
      security: 0,
      performance: 0,
      complexity: 0,
      maintainability: 0
    };

    results.forEach(result => {
      if (result.changes) {
        result.changes.forEach((change: any) => {
          if (typeCount[change.type] !== undefined) {
            typeCount[change.type]++;
          }
        });
      }
    });

    return typeCount;
  }
}

// Exécuter le bootstrap lorsque le fichier est exécuté directement
if (require.main === module) {
  const configPath = process.argv[2] || 'bolt.config.json';
  bootstrap(configPath).catch(console.error);
}

export { bootstrap, loadConfiguration };

console.log("🔄 Bolt2bolt est en train de s'analyser lui-même...");

try {
  analyzeAndOptimize();
  console.log("✅ Analyse et optimisation terminées.");
} catch (error) {
  console.error("❌ Erreur durant l'analyse : ", error);
}

// Remplacer la boucle simple par une optimisation continue plus robuste
const stopOptimization = startContinuousOptimization(
  process.cwd(),
  15,  // Vérifier toutes les 15 minutes
  96   // Maximum de 96 cycles (24 heures)
);

// Écouter les signaux pour arrêter proprement
process.on('SIGINT', () => {
  console.log('🛑 Signal d\'interruption reçu. Arrêt propre...');
  stopOptimization();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Signal de terminaison reçu. Arrêt propre...');
  stopOptimization();
  process.exit(0);
});
