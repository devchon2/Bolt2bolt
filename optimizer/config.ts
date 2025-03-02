import { LogLevel } from './types';

/**
 * Configuration du système d'optimisation
 */
export class OptimizerConfig {
  // Chemin racine du projet
  public projectRoot: string = process.cwd();
  
  // Niveau de journalisation
  public logLevel: LogLevel = 'info';
  
  // Extensions de fichiers à analyser
  public fileExtensions: string[] = ['.js', '.ts', '.jsx', '.tsx'];
  
  // Répertoires à ignorer
  public ignoreDirs: string[] = ['node_modules', 'dist', 'build', '.git'];
  
  // Seuils de complexité pour signaler des problèmes
  public complexityThreshold: number = 10;
  
  // Seuil de couverture de test minimum
  public testCoverageThreshold: number = 80;
  
  // Configuration d'analyse de performance
  public performance = {
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    cpuThreshold: 80, // 80% CPU
    responseTimeThreshold: 200 // 200ms
  };

  // Configuration d'analyse de sécurité
  public security = {
    enableDependencyScan: true,
    enableCodeScan: true,
    severityLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  };

  // Configuration du tableau de bord
  public dashboard = {
    port: 3000,
    enableAutoRefresh: true,
    refreshInterval: 5000
  };

  constructor(config?: Partial<OptimizerConfig>) {
    if (config) {
      Object.assign(this, config);
    }
  }
}
