import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject } from './analyzer';
import { optimizeCodebase, OptimizationResult } from './optimizations';
import { validateProject, ValidationResult } from './validate';
import { AnalysisResult } from './modules/analysis';
import { injectPrompt } from './prompt-injector';

/**
 * Options pour l'auto-optimiseur
 */
export interface AutoOptimizerOptions {
  rootDir: string;
  outputDir?: string;
  includeDirs?: string[];
  excludeDirs?: string[];
  enableRollback?: boolean;
  validateAfterOptimization?: boolean;
  generateReport?: boolean;
  maxConcurrentOptimizations?: number;
  optimizationTypes?: Array<'security' | 'performance' | 'complexity' | 'maintainability'>;
}

/**
 * Résultat du processus d'auto-optimisation
 */
export interface AutoOptimizeResult {
  success: boolean;
  error?: string;
  optimizationResults: OptimizationResult[];
  validationResults?: ValidationResult;
  report?: string;
  reportPath?: string;
}

/**
 * Exécute le processus d'auto-optimisation complet
 * @param options Options pour l'auto-optimiseur
 */
export async function autoOptimize(options: AutoOptimizerOptions): Promise<AutoOptimizeResult> {
  injectPrompt('AUTO_OPTIMIZE_START', 'Consider optimizing the autoOptimize function for better performance.');
  // Options par défaut
  const {
    rootDir,
    outputDir = path.join(rootDir, 'bolt-output'),
    includeDirs = ['.'],
    excludeDirs = ['node_modules', 'dist', '.git'],
    enableRollback = true,
    validateAfterOptimization = true,
    generateReport = true,
    maxConcurrentOptimizations = 5,
    optimizationTypes = ['security', 'performance', 'complexity', 'maintainability']
  } = options;

  try {
    // Créer le répertoire de sortie s'il n'existe pas
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Créer un répertoire pour les sauvegardes si nécessaire
    const backupDir = path.join(outputDir, 'backups', new Date().toISOString().replace(/:/g, '-'));
    if (enableRollback) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Étape 1: Analyse du projet
    console.log('🔍 Analyse du projet...');
    injectPrompt('ANALYZE_PROJECT_START', 'Evaluate different analysis strategies to improve accuracy and speed.');
    const { report: analyzerReport, analysisResults } = await analyzeProject(rootDir, {
      includeDirs,
      excludeDirs,
      analysisDepth: 'standard'
    });

    // Filtrer les types d'optimisations à appliquer
    if (optimizationTypes && optimizationTypes.length > 0) {
      console.log(`🔧 Types d'optimisations activés: ${optimizationTypes.join(', ')}`);
      injectPrompt('OPTIMIZATION_TYPES_FILTER', 'Dynamically adjust optimization types based on project characteristics.');
    }

    // Étape 2: Créer des sauvegardes si l'option est activée
    if (enableRollback) {
      console.log('💾 Création de sauvegardes avant optimisation...');
      injectPrompt('BACKUP_STRATEGY', 'Implement a more efficient backup strategy to reduce disk usage and time.');
      const filesToBackup = analyzerReport.filesRequiringOptimization > 0
        ? Object.keys(analyzerReport.fileReports).filter(file => 
            analyzerReport.fileReports[file].requiresOptimization)
        : [];

      for (const relativePath of filesToBackup) {
        const filePath = path.join(rootDir, relativePath);
        const backupPath = path.join(backupDir, relativePath);
        
        // Créer les répertoires pour la sauvegarde
        const backupDirPath = path.dirname(backupPath);
        if (!fs.existsSync(backupDirPath)) {
          fs.mkdirSync(backupDirPath, { recursive: true });
        }
        
        // Copier le fichier
        if (fs.existsSync(filePath)) {
          fs.copyFileSync(filePath, backupPath);
        }
      }
      console.log(`✅ ${filesToBackup.length} fichiers sauvegardés dans ${backupDir}`);
    }

    // Étape 3: Optimiser le codebase
    console.log('🚀 Optimisation du codebase...');
    injectPrompt('OPTIMIZE_CODEBASE_START', 'Explore different optimization algorithms to improve code quality.');
    const optimizationResults = await optimizeCodebase(
      rootDir,
      Object.entries(analysisResults).reduce((acc, [key, value]) => {
        acc[key] = value as unknown as AnalysisResult;
        return acc;
      }, {} as Record<string, AnalysisResult>),
      analyzerReport
    );

    // Étape 4: Valider les optimisations si l'option est activée
    let validationResults: ValidationResult | undefined;
    if (validateAfterOptimization && optimizationResults.some(result => result.optimized)) {
      console.log('🧪 Validation des optimisations...');
      injectPrompt('VALIDATE_OPTIMIZATIONS_START', 'Enhance validation process to catch more edge cases and improve reliability.');
      validationResults = await validateProject(rootDir);

      if (!validationResults.success) {
        console.error('❌ Les optimisations ont échoué à la validation!');
        
        if (enableRollback) {
          console.log('⏪ Restauration des fichiers à partir des sauvegardes...');
          injectPrompt('ROLLBACK_STRATEGY', 'Improve rollback mechanism to ensure complete and reliable restoration.');
          
          for (const result of optimizationResults.filter(r => r.optimized)) {
            const relativePath = path.relative(rootDir, result.filePath);
            const backupPath = path.join(backupDir, relativePath);
            
            if (fs.existsSync(backupPath)) {
              fs.copyFileSync(backupPath, result.filePath);
              console.log(`✅ Restauré: ${relativePath}`);
            } else {
              console.warn(`⚠️ Aucune sauvegarde trouvée pour: ${relativePath}`);
            }
          }
          
          // Vérifier à nouveau les fichiers restaurés
          console.log('🧪 Vérification des fichiers restaurés...');
          injectPrompt('POST_ROLLBACK_VALIDATION', 'Add more comprehensive checks after rollback to ensure system integrity.');
          const postRollbackValidation = await validateProject(rootDir);
          
          if (postRollbackValidation.success) {
            console.log('✅ Restauration réussie, le codebase est dans un état valide');
          } else {
            console.error('❌ La restauration n\'a pas résolu tous les problèmes!');
          }
          
          return {
            success: false,
            error: 'Les optimisations ont échoué à la validation et ont été annulées.',
            optimizationResults: [],
            validationResults
          };
        }
      }
    }

    // Étape 5: Générer un rapport si l'option est activée
    let report: string | undefined;
    let reportPath: string | undefined;
    
    if (generateReport && optimizationResults.length > 0) {
      console.log('📊 Génération du rapport d\'optimisation...');
      injectPrompt('GENERATE_REPORT_START', 'Improve report generation to provide more actionable insights.');
      report = generateOptimizationReport(optimizationResults);
      
      reportPath = path.join(outputDir, `bolt-optimization-report-${new Date().toISOString().replace(/:/g, '-')}.md`);
      fs.writeFileSync(reportPath, report);
      console.log(`📝 Rapport enregistré dans: ${reportPath}`);
    }

    return {
      success: true,
      optimizationResults,
      validationResults,
      report,
      reportPath
    };
  } catch (error) {
    console.error('❌ Erreur critique lors du processus d\'auto-optimisation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      optimizationResults: []
    };
  }
}

/**
 * Exécute un cycle d'optimisation sur le projet cible
 * avec des paramètres par défaut
 */
export async function runOptimizationCycle(targetDir: string): Promise<AutoOptimizeResult> {
  console.log(`🔄 Démarrage d'un cycle d'optimisation pour ${targetDir}...`);
  
  const result = await autoOptimize({
    rootDir: targetDir,
    outputDir: path.join(targetDir, 'bolt-output'),
    enableRollback: true,
    validateAfterOptimization: true,
    generateReport: true
  });

  if (result.success) {
    console.log('✅ Cycle d\'optimisation terminé avec succès!');
  } else {
    console.error('❌ Échec du cycle d\'optimisation:', result.error);
  }

  return result;
}

/**
 * Exécute un cycle d'optimisation continue avec des intervalles spécifiés
 */
export function startContinuousOptimization(
  targetDir: string, 
  intervalMinutes: number = 60, 
  maxCycles: number = Infinity
): () => void {
  console.log(`🔄 Démarrage de l'optimisation continue pour ${targetDir} toutes les ${intervalMinutes} minutes...`);
  
  let cycleCount = 0;
  const intervalId = setInterval(async () => {
    cycleCount++;
    console.log(`⏱️ Cycle d'optimisation #${cycleCount} démarré...`);
    
    try {
      await runOptimizationCycle(targetDir);
    } catch (error) {
      console.error(`❌ Erreur dans le cycle d'optimisation #${cycleCount}:`, error);
    }
    
    if (cycleCount >= maxCycles) {
      console.log(`🛑 Nombre maximum de cycles atteint (${maxCycles}). Arrêt de l'optimisation continue.`);
      clearInterval(intervalId);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Retourner une fonction pour arrêter l'optimisation continue
  return () => {
    console.log('🛑 Arrêt de l\'optimisation continue.');
    clearInterval(intervalId);
  };
}
