import { OptimizerConfig } from '../config';
import { OptimizerResult, SuggestionFilter } from '../types';
import { Logger } from '../utils/logger';

/**
 * Tableau de bord d'optimisation
 * 
 * Cette classe fournit une interface utilisateur pour visualiser et gérer
 * les suggestions d'optimisation.
 */
export class Dashboard {
  private config: OptimizerConfig;
  private results: OptimizerResult | null = null;
  private logger: Logger;
  private server: any = null; // Serveur HTTP pour l'interface web

  constructor(config: OptimizerConfig) {
    this.config = config;
    this.logger = new Logger(config.logLevel);
  }

  /**
   * Met à jour les résultats affichés dans le tableau de bord
   * 
   * @param results Résultats de l'optimisation
   */
  public updateResults(results: OptimizerResult): void {
    this.results = results;
    this.logger.info(`Tableau de bord mis à jour avec ${this.getTotalIssueCount()} problèmes`);
    
    // Si le tableau de bord est actif, notifier les clients connectés
    if (this.server) {
      this.notifyClients();
    }
  }

  /**
   * Lance le serveur du tableau de bord
   */
  public async launch(): Promise<void> {
    if (this.server) {
      this.logger.warn('Le tableau de bord est déjà en cours d'exécution');
      return;
    }

    try {
      // Une implémentation réelle créerait un serveur HTTP/Express
      this.logger.info(`Lancement du tableau de bord sur le port ${this.config.dashboard.port}`);
      
      // Simulation du lancement du serveur
      this.server = {
        port: this.config.dashboard.port,
        clients: new Set(),
        isRunning: true
      };
      
      this.logger.info(`Tableau de bord disponible à l'adresse: http://localhost:${this.config.dashboard.port}`);
    } catch (error) {
      this.logger.error(`Erreur lors du lancement du tableau de bord: ${error}`);
      throw error;
    }
  }

  /**
   * Arrête le serveur du tableau de bord
   */
  public async stop(): Promise<void> {
    if (!this.server) {
      this.logger.warn('Le tableau de bord n\'est pas en cours d\'exécution');
      return;
    }

    try {
      // Fermeture du serveur
      this.server.isRunning = false;
      this.server = null;
      this.logger.info('Tableau de bord arrêté');
    } catch (error) {
      this.logger.error(`Erreur lors de l'arrêt du tableau de bord: ${error}`);
      throw error;
    }
  }

  /**
   * Obtient les suggestions filtrées
   */
  public getSuggestions(filter?: SuggestionFilter): any[] {
    if (!this.results) {
      return [];
    }

    let allIssues = [
      ...this.results.codeIssues,
      ...this.results.testIssues,
      ...this.results.docIssues,
      ...this.results.perfIssues,
      ...this.results.securityIssues,
      ...this.results.archIssues
    ];

    // Application des filtres
    if (filter) {
      if (filter.minSeverity) {
        const severityOrder = ['info', 'warning', 'error', 'critical'];
        const minIndex = severityOrder.indexOf(filter.minSeverity);
        allIssues = allIssues.filter(issue => 
          severityOrder.indexOf(issue.severity) >= minIndex
        );
      }
      
      if (filter.autoFixableOnly) {
        allIssues = allIssues.filter(issue => 
          'autoFixable' in issue && issue.autoFixable
        );
      }
      
      if (filter.files && filter.files.length > 0) {
        allIssues = allIssues.filter(issue => 
          'file' in issue && filter.files!.some(f => issue.file.includes(f))
        );
      }
      
      if (filter.types && filter.types.length > 0) {
        allIssues = allIssues.filter(issue => 
          'type' in issue && filter.types!.includes(issue.type)
        );
      }
    }

    // Trier par sévérité
    const severityOrder = { 'critical': 0, 'error': 1, 'warning': 2, 'info': 3 };
    return allIssues.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }

  /**
   * Compte le nombre total de problèmes
   */
  private getTotalIssueCount(): number {
    if (!this.results) return 0;
    
    return (
      this.results.codeIssues.length +
      this.results.testIssues.length +
      this.results.docIssues.length +
      this.results.perfIssues.length +
      this.results.securityIssues.length +
      this.results.archIssues.length
    );
  }

  /**
   * Notifie les clients connectés des changements
   */
  private notifyClients(): void {
    if (!this.server || !this.server.clients) return;
    
    this.logger.debug(`Notification de ${this.server.clients.size} clients`);
    // Dans une implémentation réelle, enverrait un événement SSE ou WebSocket
  }
}
