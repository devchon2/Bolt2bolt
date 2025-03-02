// #codebase: [CONTEXTE] Service de collecte et d'analyse des métriques de performance.
// #codebase: [DIRECTIVE] Implémenter un service de suivi des métriques de l'application.

import { Logger } from './logger';

export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  data: Record<string, any>;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private logger: Logger;
  private isInitialized: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;

  constructor() {
    this.logger = new Logger('AnalyticsService');
  }

  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('AnalyticsService déjà initialisé');
      return;
    }

    this.logger.info('Initialisation du service d\'analyse');
    this.isInitialized = true;
    
    // Configuration du flush automatique
    this.flushInterval = setInterval(() => this.flush(), 60000); // flush toutes les minutes
    
    // Enregistrement de l'événement d'initialisation
    this.trackEvent('analytics_initialized', {});
  }

  public pause(): void {
    this.isPaused = true;
    this.logger.info('Collecte des événements d\'analyse mise en pause');
  }

  public resume(): void {
    this.isPaused = false;
    this.logger.info('Collecte des événements d\'analyse reprise');
  }

  public trackEvent(name: string, data: Record<string, any>): void {
    if (this.isPaused) {
      this.logger.warn('Collecte des événements en pause, événement ignoré');
      return;
    }

    if (!this.isInitialized) {
      this.logger.warn('AnalyticsService non initialisé');
      return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      data
    };

    this.events.push(event);
    this.logger.debug(`Événement enregistré: ${name}`);
  }

  public trackPageView(page: string, data: Record<string, any> = {}): void {
    this.trackEvent('page_view', { page, ...data });
  }

  public flush(): void {
    if (this.events.length === 0) {
      return;
    }

    this.logger.info(`Envoi de ${this.events.length} événements d'analyse`);
    
    // Simuler l'envoi des événements à un service distant
    this.sendEventsToBackend(this.events);
    
    // Vider la liste d'événements
    this.events = [];
  }

  public getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  private sendEventsToBackend(events: AnalyticsEvent[]): void {
    // Simulation d'envoi au backend
    this.logger.debug('Envoi des données d\'analyse au backend');
    // Dans une implémentation réelle, on ferait un appel API ici
    console.log(`[ANALYTICS] Envoi de ${events.length} événements`);
  }

  public shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    this.logger.info('Arrêt du service d\'analyse');
    
    // Nettoyer l'intervalle de flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush final avant la fermeture
    this.flush();
    
    this.isInitialized = false;
  }
}
