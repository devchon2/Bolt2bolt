import * as fs from 'fs';
import * as path from 'path';
import { PromptOptimizer, OptimizationResult } from './utils/prompt-optimizer';
import { PromptManager } from './utils/prompt-manager';
import { PromptIntegration } from './utils/prompt-integration';
import chalk from 'chalk';

/**
 * Configuration du tableau de bord d'optimisation
 */
export interface DashboardConfig {
  /**
   * Chemin du répertoire racine du projet
   */
  rootDir: string;
  
  /**
   * Patterns de fichiers à analyser
   */
  includePatterns: string[];
  
  /**
   * Patterns de fichiers à exclure
   */
  excludePatterns: string[];
  
  /**
   * Seuil d'efficacité minimal pour signaler un problème
   */
  minEffectivenessThreshold: number;
  
  /**
   * Si true, applique automatiquement les optimisations
   */
  autoApplyOptimizations: boolean;
  
  /**
   * Chemin où enregistrer les rapports
   */
  reportsDir: string;
}

/**
 * Tableau de bord pour visualiser et appliquer des optimisations de prompts
 */
export class OptimizationDashboard {
  private config: DashboardConfig;
  private optimizer: PromptOptimizer;
  private results: Map<string, OptimizationResult | null>;
  
  /**
   * Crée un nouveau tableau de bord d'optimisation
   */
  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      rootDir: process.cwd(),
      includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      minEffectivenessThreshold: 70,
      autoApplyOptimizations: false,
      reportsDir: './reports',
      ...config
    };
    
    // Initialiser les composants
    const manager = new PromptManager();
    const integration = new PromptIntegration(manager);
    
    this.optimizer = new PromptOptimizer(manager, integration, {
      aggressiveOptimization: false,
      autoApply: this.config.autoApplyOptimizations,
      minScoreThreshold: this.config.minEffectivenessThreshold
    });
    
    this.results = new Map();
  }
  
  /**
   * Exécute une analyse complète du projet
   */
  public async runAnalysis(): Promise<void> {
    console.log(chalk.blue('🔍 Démarrage de l\'analyse d\'optimisation des prompts...'));
    
    const files = this.findFiles();
    console.log(chalk.gray(`Trouvé ${files.length} fichiers à analyser.`));
    
    const fileContents = files.map(filePath => ({
      path: filePath,
      content: fs.readFileSync(filePath, 'utf-8')
    }));
    
    console.log(chalk.yellow('⚡ Optimisation des prompts en cours...'));
    this.results = this.optimizer.batchOptimize(fileContents);
    
    this.displayResults();
    
    if (this.config.reportsDir) {
      this.saveReport();
    }
  }
  
  /**
   * Applique les optimisations aux fichiers
   */
  public applyOptimizations(): void {
    if (this.results.size === 0) {
      console.log(chalk.yellow('⚠️ Aucun résultat d\'analyse disponible. Exécutez runAnalysis() d\'abord.'));
      return;
    }
    
    console.log(chalk.blue('🔧 Application des optimisations...'));
    let appliedCount = 0;
    
    this.results.forEach((result, filePath) => {
      if (result && result.optimizedPrompt !== result.originalPrompt) {
        fs.writeFileSync(filePath, result.optimizedPrompt);
        appliedCount++;
      }
    });
    
    console.log(chalk.green(`✅ Optimisations appliquées à ${appliedCount} fichiers.`));
  }
  
  /**
   * Affiche les résultats dans la console
   */
  private displayResults(): void {
    console.log('\n' + chalk.bold('📊 Résultats d\'optimisation:'));
    console.log('─'.repeat(80));
    
    let totalFiles = 0;
    let optimizedFiles = 0;
    let totalImprovement = 0;
    
    this.results.forEach((result, filePath) => {
      totalFiles++;
      
      const relativePath = path.relative(this.config.rootDir, filePath);
      
      if (!result) {
        console.log(`${chalk.dim(relativePath)} ${chalk.gray('(Aucun prompt trouvé ou déjà optimal)')}`);
        return;
      }
      
      optimizedFiles++;
      const before = Math.round(result.beforeMetrics.effectivenessScore);
      const after = Math.round(result.afterMetrics.effectivenessScore);
      const improvement = after - before;
      totalImprovement += improvement;
      
      const scoreColor = improvement > 15 ? chalk.green : 
                         improvement > 5 ? chalk.yellow : 
                         chalk.white;
                         
      console.log(
        `${chalk.cyan(relativePath)} ${chalk.white(`${before} → ${after}`)} ` +
        `${scoreColor(`(${improvement > 0 ? '+' + improvement : improvement})`)}`
      );
      
      if (result.improvements.length > 0) {
        console.log(`  ${chalk.gray('Améliorations:')} ${chalk.gray(result.improvements.join(', '))}`);
      }
    });
    
    console.log('─'.repeat(80));
    console.log(`${chalk.bold('Total:')} ${totalFiles} fichiers analysés, ${optimizedFiles} optimisables`);
    
    if (optimizedFiles > 0) {
      const avgImprovement = Math.round(totalImprovement / optimizedFiles);
      console.log(`${chalk.bold('Amélioration moyenne:')} ${avgImprovement > 0 ? '+' : ''}${avgImprovement} points`);
    }
  }
  
  /**
   * Enregistre un rapport détaillé au format Markdown
   */
  private saveReport(): void {
    if (!fs.existsSync(this.config.reportsDir)) {
      fs.mkdirSync(this.config.reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.config.reportsDir, `prompt-optimization-${timestamp}.md`);
    
    const report = this.optimizer.generateOptimizationReport(this.results);
    fs.writeFileSync(reportPath, report);
    
    console.log(chalk.green(`📝 Rapport détaillé enregistré: ${reportPath}`));
  }
  
  /**
   * Trouve les fichiers correspondant aux patterns d'inclusion/exclusion
   */
  private findFiles(): string[] {
    // Cette implémentation est simplifiée
    // Dans un cas réel, utiliser un package comme glob
    
    const files: string[] = [];
    this.findFilesRecursive(this.config.rootDir, files);
    return files;
  }
  
  /**
   * Recherche récursive de fichiers dans un répertoire
   */
  private findFilesRecursive(dir: string, results: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Vérifier si le chemin doit être exclu
      if (this.matchesAnyPattern(fullPath, this.config.excludePatterns)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        this.findFilesRecursive(fullPath, results);
      } else if (this.matchesAnyPattern(fullPath, this.config.includePatterns)) {
        results.push(fullPath);
      }
    }
  }
  
  /**
   * Vérifie si un chemin correspond à l'un des patterns
   */
  private matchesAnyPattern(filePath: string, patterns: string[]): boolean {
    const relativePath = path.relative(this.config.rootDir, filePath);
    
    for (const pattern of patterns) {
      // Implémentation simplifiée, utiliser minimatch dans un cas réel
      if (relativePath.includes(pattern.replace(/\*/g, ''))) {
        return true;
      }
    }
    
    return false;
  }
}

/**
 * Fonction utilitaire pour exécuter rapidement une analyse
 */
export async function runOptimizationAnalysis(
  rootDir: string,
  options: Partial<DashboardConfig> = {}
): Promise<void> {
  const dashboard = new OptimizationDashboard({
    rootDir,
    ...options
  });
  
  await dashboard.runAnalysis();
}
