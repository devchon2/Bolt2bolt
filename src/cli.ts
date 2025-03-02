// #codebase: [CONTEXT] Interface CLI pour le système Bolt2bolt.
// #codebase: [RESPONSIBILITY] Fournir des commandes en ligne de commande pour optimiser les prompts.
// #codebase: [CURRENT-ITERATION] Phase 5: Optimisation des prompts et chaînage intelligent.

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import glob from 'glob';
import { 
  PromptManager, 
  PromptOptimizer, 
  PromptIntegration,
  config, 
  initializeConfig
} from './index';

// Initialiser la configuration
initializeConfig();

// Créer les instances des composants principaux
const manager = new PromptManager(config.promptManager);
const integration = new PromptIntegration(manager, config.promptIntegration);
const optimizer = new PromptOptimizer(manager, integration, config.promptOptimizer);

/**
 * Recherche les fichiers correspondant au pattern spécifié
 */
function findFiles(pattern: string): string[] {
  return glob.sync(pattern, { absolute: true });
}

/**
 * Optimise les prompts dans les fichiers spécifiés
 */
async function optimizeFiles(
  filePatterns: string[],
  options: {
    report?: boolean,
    outputPath?: string,
    apply?: boolean
  } = {}
): Promise<void> {
  try {
    // Trouver tous les fichiers correspondant aux patterns
    const allFiles: string[] = [];
    filePatterns.forEach(pattern => {
      const files = findFiles(pattern);
      allFiles.push(...files);
    });

    if (allFiles.length === 0) {
      console.log('Aucun fichier trouvé à optimiser.');
      return;
    }

    console.log(`Optimisation de ${allFiles.length} fichiers...`);
    
    // Préparer les fichiers avec leur contenu
    const filesToOptimize = allFiles.map(filepath => ({
      path: filepath,
      content: fs.readFileSync(filepath, 'utf-8')
    }));
    
    // Temporairement activer l'auto-application si demandé
    const originalAutoApply = config.promptOptimizer.autoApply;
    if (options.apply) {
      config.promptOptimizer.autoApply = true;
    }
    
    // Optimiser les fichiers
    const results = optimizer.batchOptimize(filesToOptimize);
    
    // Restaurer la configuration
    config.promptOptimizer.autoApply = originalAutoApply;
    
    // Compter les résultats
    let optimizedCount = 0;
    let skippedCount = 0;
    
    results.forEach((result, filePath) => {
      if (result) {
        optimizedCount++;
      } else {
        skippedCount++;
      }
    });
    
    console.log(`Terminé. ${optimizedCount} fichiers optimisés, ${skippedCount} fichiers ignorés.`);
    
    // Générer et sauvegarder le rapport si demandé
    if (options.report) {
      const report = optimizer.generateOptimizationReport(results);
      const reportPath = options.outputPath || 'prompt-optimization-report.md';
      
      fs.writeFileSync(reportPath, report, 'utf-8');
      console.log(`Rapport d'optimisation généré: ${reportPath}`);
    }
  } catch (error) {
    console.error('Erreur pendant l\'optimisation des fichiers:', error);
  }
}

/**
 * Analyse les prompts dans les fichiers spécifiés
 */
async function analyzeFiles(
  filePatterns: string[],
  options: {
    report?: boolean,
    outputPath?: string
  } = {}
): Promise<void> {
  try {
    // Trouver tous les fichiers correspondant aux patterns
    const allFiles: string[] = [];
    filePatterns.forEach(pattern => {
      const files = findFiles(pattern);
      allFiles.push(...files);
    });
    
    if (allFiles.length === 0) {
      console.log('Aucun fichier trouvé à analyser.');
      return;
    }
    
    console.log(`Analyse de ${allFiles.length} fichiers...`);
    
    // Analyser chaque fichier
    let totalPrompts = 0;
    let filesWithPrompts = 0;
    let suggestions: { file: string, suggestion: string }[] = [];
    
    for (const filepath of allFiles) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const analysis = manager.analyzeFilePrompts(filepath, content);
      
      if (analysis.hasPrompts) {
        filesWithPrompts++;
        totalPrompts += analysis.promptCount;
      }
      
      analysis.suggestions.forEach(suggestion => {
        suggestions.push({
          file: path.basename(filepath),
          suggestion
        });
      });
    }
    
    // Afficher les résultats
    console.log(`\nRésultats d'analyse:`);
    console.log(`- Fichiers analysés: ${allFiles.length}`);
    console.log(`- Fichiers avec prompts: ${filesWithPrompts} (${Math.round((filesWithPrompts / allFiles.length) * 100)}%)`);
    console.log(`- Nombre total de prompts: ${totalPrompts}`);
    console.log(`- Suggestions d'amélioration: ${suggestions.length}`);
    
    // Générer et sauvegarder le rapport si demandé
    if (options.report) {
      let report = "# Rapport d'Analyse des Prompts\n\n";
      
      report += "## Résumé\n\n";
      report += `- Fichiers analysés: ${allFiles.length}\n`;
      report += `- Fichiers avec prompts: ${filesWithPrompts} (${Math.round((filesWithPrompts / allFiles.length) * 100)}%)\n`;
      report += `- Nombre total de prompts: ${totalPrompts}\n`;
      report += `- Suggestions d'amélioration: ${suggestions.length}\n\n`;
      
      if (suggestions.length > 0) {
        report += "## Suggestions d'amélioration\n\n";
        
        // Grouper les suggestions par fichier
        const suggestionsByFile = suggestions.reduce((acc, { file, suggestion }) => {
          if (!acc[file]) {
            acc[file] = [];
          }
          acc[file].push(suggestion);
          return acc;
        }, {} as Record<string, string[]>);
        
        // Ajouter les suggestions groupées au rapport
        Object.entries(suggestionsByFile).forEach(([file, fileSuggestions]) => {
          report += `### ${file}\n\n`;
          fileSuggestions.forEach((suggestion, i) => {
            report += `${i + 1}. ${suggestion}\n`;
          });
          report += "\n";
        });
      }
      
      const reportPath = options.outputPath || 'prompt-analysis-report.md';
      fs.writeFileSync(reportPath, report, 'utf-8');
      console.log(`Rapport d'analyse généré: ${reportPath}`);
    }
  } catch (error) {
    console.error('Erreur pendant l\'analyse des fichiers:', error);
  }
}

// Configuration du CLI
program
  .name('bolt2bolt')
  .description('Système d\'optimisation des prompts pour GitHub Copilot')
  .version(config.version);

// Commande d'optimisation
program
  .command('optimize')
  .description('Optimise les prompts dans les fichiers spécifiés')
  .argument('<files...>', 'Patterns de fichiers à optimiser (ex: src/**/*.ts)')
  .option('-r, --report', 'Générer un rapport d\'optimisation')
  .option('-o, --output <path>', 'Chemin de sortie pour le rapport')
  .option('-a, --apply', 'Appliquer automatiquement les optimisations')
  .option('-c, --config <path>', 'Chemin vers un fichier de configuration')
  .action(async (files, options) => {
    if (options.config) {
      initializeConfig(options.config);
    }
    await optimizeFiles(files, {
      report: options.report,
      outputPath: options.output,
      apply: options.apply
    });
  });

// Commande d'analyse
program
  .command('analyze')
  .description('Analyse les prompts dans les fichiers spécifiés')
  .argument('<files...>', 'Patterns de fichiers à analyser (ex: src/**/*.ts)')
  .option('-r, --report', 'Générer un rapport d\'analyse')
  .option('-o, --output <path>', 'Chemin de sortie pour le rapport')
  .option('-c, --config <path>', 'Chemin vers un fichier de configuration')
  .action(async (files, options) => {
    if (options.config) {
      initializeConfig(options.config);
    }
    await analyzeFiles(files, {
      report: options.report,
      outputPath: options.output
    });
  });

// Commande d'initialisation de configuration
program
  .command('init')
  .description('Initialise un fichier de configuration')
  .option('-o, --output <path>', 'Chemin de sortie pour le fichier de configuration')
  .action((options) => {
    const success = saveConfig(options.output);
    if (success) {
      console.log('Configuration initialisée avec succès.');
    } else {
      console.error('Échec de l\'initialisation de la configuration.');
    }
  });

// Point d'entrée principal
export async function run(): Promise<void> {
  await program.parseAsync(process.argv);
}

// Si exécuté directement
if (require.main === module) {
  run().catch(console.error);
}
