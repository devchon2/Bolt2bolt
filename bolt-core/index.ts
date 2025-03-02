import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { analyzeProject } from './analyzer';
import { optimizeCodebase } from './optimizations';
import { validateProject } from './validate';
import { autoOptimize } from './auto-optimizer';

export { autoOptimize } from './auto-optimizer';
export { analyzeProject } from './analyzer';
export { optimizeCodebase, validateOptimizations } from './optimizations';
export { validateProject } from './validate';

/**
 * Bolt2bolt Core
 * Module principal exportant toutes les fonctionnalités du système d'auto-optimisation
 */

// Exporter les fonctionnalités d'auto-optimisation
export * from './auto-optimizer';

// Exporter les fonctionnalités d'analyse
export { analyzeProject, AnalyzerOptions, AnalyzerReport } from './analyzer';

// Exporter les fonctionnalités d'optimisation
export { 
  optimizeCodebase, 
  OptimizationResult,
  createOptimizationPlan,
  generateOptimizationReport
} from './optimizations';

// Exporter les fonctionnalités de validation
export { validateProject, validateOptimizations, ValidationResult } from './validate';

// Exporter les types d'analyse
export { 
  AnalysisResult, 
  SecurityAnalysisResult,
  PerformanceAnalysisResult,
  ComplexityAnalysisResult,
  MaintainabilityAnalysisResult
} from './modules/analysis';

/**
 * Point d'entrée principal pour une analyse et optimisation simple
 */
export function analyzeAndOptimize(targetDir: string = process.cwd()): Promise<void> {
  const { autoOptimize } = require('./auto-optimizer');
  
  return autoOptimize({
    rootDir: targetDir
  }).then((result: any) => {
    if (!result.success) {
      throw new Error(`Échec de l'auto-optimisation: ${result.error}`);
    }
    return result;
  });
}

/**
 * Exécute le processus principal de Bolt
 */
export function runBoltProcess(): void {
  console.log('🔄 Exécution du processus Bolt...');
  
  try {
    analyzeAndOptimize()
      .then(() => console.log('✅ Processus Bolt exécuté avec succès'))
      .catch(err => console.error('❌ Erreur lors de l\'exécution du processus Bolt:', err));
  } catch (err) {
    console.error('❌ Erreur critique dans runBoltProcess:', err);
  }
}

/**
 * Récupère les informations sur la version actuelle de Bolt
 */
export function getBoltVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version || '0.1.0';
  } catch (error) {
    console.warn('⚠️ Impossible de déterminer la version de Bolt:', error);
    return '0.1.0';
  }
}

/**
 * Initialise l'environnement Bolt
 */
export function initBoltEnvironment(): void {
  console.log('⚙️ Initialisation de l\'environnement Bolt...');
  
  // Vérifier si le répertoire de sortie existe, sinon le créer
  const outputDir = path.join(process.cwd(), 'bolt-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Répertoire de sortie créé: ${outputDir}`);
  }
  
  // Vérifier les dépendances nécessaires
  try {
    // Ici, on pourrait vérifier que toutes les dépendances requises sont installées
    console.log('✅ Environnement Bolt initialisé avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de l\'environnement Bolt:', error);
    throw error;
  }
}
