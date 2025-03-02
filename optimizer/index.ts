import { OptimizerConfig } from './config';
import { CodeAnalyzer } from './analyzers/codeAnalyzer';
import { TestAnalyzer } from './analyzers/testAnalyzer';
import { DocAnalyzer } from './analyzers/docAnalyzer';
import { PerformanceAnalyzer } from './analyzers/performanceAnalyzer';
import { SecurityAnalyzer } from './analyzers/securityAnalyzer';
import { ArchitectureAnalyzer } from './analyzers/architectureAnalyzer';
import { Dashboard } from './ui/dashboard';
import { Logger } from './utils/logger';
import { OptimizerResult } from './types';
import { processPrompt } from './utils/promptProcessor';

/**
 * Bolt2BoltOptimizer - Système principal d'optimisation
 * 
 * Cette classe orchestre toutes les fonctionnalités d'optimisation
 * et génère un rapport complet des améliorations suggérées.
 */
export class Bolt2BoltOptimizer {
  private config: OptimizerConfig;
  private codeAnalyzer: CodeAnalyzer;
  private testAnalyzer: TestAnalyzer;
  private docAnalyzer: DocAnalyzer;
  private perfAnalyzer: PerformanceAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private archAnalyzer: ArchitectureAnalyzer;
  private dashboard: Dashboard;
  private logger: Logger;

  constructor(config?: Partial<OptimizerConfig>) {
    this.config = new OptimizerConfig(config);
    this.logger = new Logger(this.config.logLevel);
    
    this.codeAnalyzer = new CodeAnalyzer(this.config);
    this.testAnalyzer = new TestAnalyzer(this.config);
    this.docAnalyzer = new DocAnalyzer(this.config);
    this.perfAnalyzer = new PerformanceAnalyzer(this.config);
    this.securityAnalyzer = new SecurityAnalyzer(this.config);
    this.archAnalyzer = new ArchitectureAnalyzer(this.config);
    
    this.dashboard = new Dashboard(this.config);
    
    this.logger.info('Bolt2BoltOptimizer initialisé avec succès');
  }

  /**
   * Lance une analyse complète du code
   * @param targetPath Chemin du code à analyser
   * @returns Résultat de l'optimisation
   */
  public async runFullOptimization(targetPath: string): Promise<OptimizerResult> {
    this.logger.info(`Lancement de l'optimisation complète sur ${targetPath}`);
    
    // Analyse du code
    const codeIssues = await this.codeAnalyzer.analyze(targetPath);
    
    // Analyse des tests
    const testIssues = await this.testAnalyzer.analyze(targetPath);
    
    // Analyse de la documentation
    const docIssues = await this.docAnalyzer.analyze(targetPath);
    
    // Analyse des performances
    const perfIssues = await this.perfAnalyzer.analyze(targetPath);
    
    // Analyse de sécurité
    const securityIssues = await this.securityAnalyzer.analyze(targetPath);
    
    // Analyse de l'architecture
    const archIssues = await this.archAnalyzer.analyze(targetPath);
    
    // Compilation des résultats
    const result: OptimizerResult = {
      codeIssues,
      testIssues,
      docIssues,
      perfIssues,
      securityIssues,
      archIssues,
      timestamp: new Date(),
      targetPath
    };
    
    // Mise à jour du tableau de bord
    this.dashboard.updateResults(result);
    
    this.logger.info('Optimisation complète terminée');
    return result;
  }

  /**
   * Applique un prompt d'optimisation pour améliorer l'analyse et le traitement.
   * @param prompt Texte des directives d'optimisation
   * @returns Message de confirmation
   */
  public applyOptimizationPrompt(prompt: string): string {
    try {
      const result = processPrompt(prompt);
      this.logger.info(result);
      return result;
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du prompt: ${error}`);
      throw error;
    }
  }

  /**
   * Lance le tableau de bord d'optimisation
   */
  public async launchDashboard(): Promise<void> {
    this.logger.info('Lancement du tableau de bord');
    return this.dashboard.launch();
  }
}

// Export de l'instance par défaut pour une utilisation facile
export default new Bolt2BoltOptimizer();
