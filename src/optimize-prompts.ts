#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { OptimizationDashboard } from './optimization-dashboard';
import chalk from 'chalk';

// Configurer le CLI
const program = new Command();

program
  .name('optimize-prompts')
  .description('Outil d\'optimisation des prompts Copilot pour Bolt2bolt')
  .version('1.0.0');

program
  .option('-d, --dir <directory>', 'Répertoire racine du projet', process.cwd())
  .option('-i, --include <patterns>', 'Patterns de fichiers à inclure (séparés par des virgules)', '**/*.ts,**/*.js')
  .option('-e, --exclude <patterns>', 'Patterns de fichiers à exclure (séparés par des virgules)', 'node_modules,dist,build')
  .option('-t, --threshold <number>', 'Seuil d\'efficacité minimal', '70')
  .option('-a, --apply', 'Appliquer automatiquement les optimisations', false)
  .option('-r, --report-dir <directory>', 'Répertoire pour les rapports', './reports')
  .option('--aggressive', 'Utiliser une optimisation agressive', false);

program.parse();

const options = program.opts();

// Exécuter l'optimisation
async function run() {
  console.log(chalk.blue.bold('🚀 Bolt2bolt - Optimiseur de Prompts'));
  console.log(chalk.dim('Optimisation des prompts Copilot pour améliorer la génération de code\n'));
  
  const rootDir = path.resolve(options.dir);
  console.log(chalk.white(`📂 Répertoire: ${chalk.cyan(rootDir)}`));
  
  const includePatterns = options.include.split(',');
  const excludePatterns = options.exclude.split(',');
  
  console.log(chalk.white(`🔍 Inclure: ${chalk.cyan(includePatterns.join(', '))}`));
  console.log(chalk.white(`🚫 Exclure: ${chalk.cyan(excludePatterns.join(', '))}`));
  console.log(chalk.white(`🎚️  Seuil: ${chalk.cyan(options.threshold)}`));
  console.log(chalk.white(`🔄 Mode: ${options.aggressive ? chalk.yellow('Agressif') : chalk.green('Standard')}`));
  
  if (options.apply) {
    console.log(chalk.yellow('⚠️  Les optimisations seront appliquées automatiquement!\n'));
  } else {
    console.log(chalk.dim('Les optimisations seront suggérées mais non appliquées.\n'));
  }
  
  try {
    const dashboard = new OptimizationDashboard({
      rootDir,
      includePatterns,
      excludePatterns,
      minEffectivenessThreshold: parseInt(options.threshold),
      autoApplyOptimizations: options.apply,
      reportsDir: options.reportDir
    });
    
    await dashboard.runAnalysis();
    
    if (options.apply) {
      dashboard.applyOptimizations();
    } else {
      console.log(chalk.yellow('\nPour appliquer les optimisations, exécutez avec l\'option --apply'));
    }
    
    console.log(chalk.green.bold('\n✨ Analyse terminée!'));
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de l\'analyse:'));
    console.error(error);
    process.exit(1);
  }
}

run().catch(console.error);
