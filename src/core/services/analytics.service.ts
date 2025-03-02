// #codebase: [CONTEXTE] Service de collecte et d'analyse des métriques d'utilisation
// #codebase: [PATTERN:SINGLETON] Fournit une source unique pour l'enregistrement des métriques
// #codebase: [DIRECTIVE] Suivre les événements utilisateur et les performances du système

/*
[COPILOT_PROMPTS]
# Service d'Analytics - Directives d'Implémentation

## Responsabilité
- Collecter les métriques d'utilisation et de performance de l'application
- Fournir des méthodes pour suivre les événements utilisateur et système
- Agréger et exposer les données pour analyse et reporting

## Points d'Extension
- Support pour différents backends d'analyse (local, service externe)
- Enrichissement automatique des événements avec des métadonnées contextuelles
- Système de filtrage et d'échantillonnage configurable

## Anti-patterns
- Éviter la collecte excessive de données qui pourrait impacter les performances
- Ne pas collecter de données personnelles sans consentement explicite
- Éviter les dépendances circulaires avec d'autres services
[COPILOT_PROMPTS]
*/

import EventBusService from './event-bus.service';
import LoggerService from './logger.service';
import ConfigService from './config.service';

/**
 * Types d'événements analytics supportés
 */
export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  FEATURE_USAGE = 'feature_usage',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  CUSTOM = 'custom'
}

/**
 * Interface pour un événement analytics
 */
export interface AnalyticsEvent {
  /** Type d'événement */
  type: AnalyticsEventType;
  /** Nom de l'événement */
  name: string;
  /** Horodatage */
  timestamp: number;
  /** Identifiant de session */
  sessionId?: string;
  /** Identifiant utilisateur (anonymisé si nécessaire) */
  userId?: string;
  /** Données additionnelles */
  data?: Record<string, any>;
  /** Métadonnées automatiques */
  metadata?: {
    /** Plateforme (web, desktop, mobile) */
    platform?: string;
    /** Version de l'application */
    appVersion?: string;
    /** Contexte d'exécution */
    context?: string;
    /** ID de corrélation pour lier des événements connexes */
    correlationId?: string;
  };
}

/**
 * Options pour le service Analytics
 */
export interface AnalyticsOptions {
  /** Activer/désactiver la collecte */
  enabled?: boolean;
  /** Identifiant du projet/application */
  projectId?: string;
  /** URL du backend pour l'envoi des données */
  endpoint?: string;
  /** Intervalle d'envoi par lots (ms) */
  batchInterval?: number;
  /** Taille maximale d'un lot */
  batchSize?: number;
  /** Niveau d'échantillonnage (0-1) */
  samplingRate?: number;
  /** Conserver les métriques en mémoire */
  storeInMemory?: boolean;
  /** Taille maximale du stockage en mémoire */
  maxInMemoryEvents?: number;
}

/**
 * Interface pour un backend Analytics
 */
export interface AnalyticsBackend {
  /** Envoyer un événement unique */
  sendEvent(event: AnalyticsEvent): Promise<void>;
  /** Envoyer un lot d'événements */
  sendBatch(events: AnalyticsEvent[]): Promise<void>;
  /** Vérifier la connexion au backend */
  checkConnection(): Promise<boolean>;
}

/**
 * Backend Analytics utilisant des requêtes HTTP
 */
export class HttpAnalyticsBackend implements AnalyticsBackend {
  private endpoint: string;
  private headers: Record<string, string>;
  
  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    };
  }
  
  async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      throw error;
    }
  }
  
  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      await fetch(this.endpoint + '/batch', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      throw error;
    }
  }
  
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint + '/status', {
        method: 'GET',
        headers: this.headers
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Backend Analytics qui stocke les données en mémoire
 */
export class InMemoryAnalyticsBackend implements AnalyticsBackend {
  private events: AnalyticsEvent[] = [];
  private maxEvents: number;
  
  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }
  
  async sendEvent(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
    
    // Maintenir la taille maximale
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }
  
  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      await this.sendEvent(event);
    }
  }
  
  async checkConnection(): Promise<boolean> {
    return true;
  }
  
  /**
   * Récupère tous les événements stockés
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
  
  /**
   * Efface tous les événements stockés
   */
  clearEvents(): void {
    this.events = [];
  }
  
  /**
   * Filtre les événements selon des critères
   * @param filter Fonction de filtrage
   */
  filterEvents(filter: (event: AnalyticsEvent) => boolean): AnalyticsEvent[] {
    return this.events.filter(filter);
  }
}

/**
 * Service principal d'Analytics
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private options: AnalyticsOptions;
  private backend: AnalyticsBackend;
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  private sessionId: string;
  private logger: LoggerService;
  private eventBus: EventBusService;
  private configService: ConfigService;
  
  /**
   * Constructeur privé pour le pattern Singleton
   */
  private constructor(options: AnalyticsOptions = {}) {
    this.options = {
      enabled: true,
      batchInterval: 10000, // 10 secondes
      batchSize: 20,
      samplingRate: 1, // 100%
      storeInMemory: true,
      maxInMemoryEvents: 1000,
      ...options
    };
    
    this.sessionId = this.generateSessionId();
    this.logger = LoggerService.getInstance().createContextLogger('Analytics');
    this.eventBus = EventBusService.getInstance();
    this.configService = ConfigService.getInstance();
    
    // Créer le backend approprié
    if (this.options.endpoint) {
      this.backend = new HttpAnalyticsBackend(this.options.endpoint);
    } else if (this.options.storeInMemory) {
      this.backend = new InMemoryAnalyticsBackend(this.options.maxInMemoryEvents);
    } else {
      // Backend par défaut qui ne fait rien
      this.backend = {
        sendEvent: async () => {},
        sendBatch: async () => {},
        checkConnection: async () => true
      };
    }
  }
  
  /**
   * Obtenir l'instance unique du service
   */
  public static getInstance(options?: AnalyticsOptions): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(options);
    } else if (options) {
      AnalyticsService.instance.updateOptions(options);
    }
    
    return AnalyticsService.instance;
  }
  
  /**
   * Initialise le service Analytics
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing Analytics service');
    
    // Charger la configuration depuis le service de configuration
    const configEnabled = this.configService.get<boolean>('analytics.enabled');
    if (configEnabled !== undefined) {
      this.options.enabled = configEnabled;
    }
    
    const endpoint = this.configService.get<string>('analytics.endpoint');
    if (endpoint && endpoint !== this.options.endpoint) {
      this.options.endpoint = endpoint;
      this.backend = new HttpAnalyticsBackend(endpoint);
    }
    
    // Tester la connexion au backend
    try {
      const isConnected = await this.backend.checkConnection();
      if (isConnected) {
        this.logger.info('Successfully connected to analytics backend');
      } else {
        this.logger.warn('Could not connect to analytics backend');
      }
    } catch (error) {
      this.logger.error('Error connecting to analytics backend', error as Error);
    }
    
    // Configurer le timer pour l'envoi par lots
    this.setupBatchProcessing();
    
    // S'abonner aux événements système pour le suivi automatique
    this.setupEventListeners();
    
    this.eventBus.emit('analytics:initialized', {});
  }
  
  /**
   * Met à jour les options du service
   * @param options Nouvelles options
   */
  public updateOptions(options: Partial<AnalyticsOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Recréer le backend si l'endpoint a changé
    if (options.endpoint && options.endpoint !== this.options.endpoint) {
      this.backend = new HttpAnalyticsBackend(options.endpoint);
    } else if (options.storeInMemory !== undefined && options.storeInMemory !== this.options.storeInMemory) {
      if (options.storeInMemory) {
        this.backend = new InMemoryAnalyticsBackend(this.options.maxInMemoryEvents);
      }
    }
    
    // Reconfigurer le traitement par lots si les paramètres ont changé
    if (options.batchInterval !== undefined || options.batchSize !== undefined) {
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      this.setupBatchProcessing();
    }
  }
  
  /**
   * Suit une vue de page
   * @param pageName Nom de la page
   * @param data Données additionnelles
   */
  public trackPageView(pageName: string, data: Record<string, any> = {}): void {
    this.trackEvent(AnalyticsEventType.PAGE_VIEW, pageName, {
      page: pageName,
      ...data
    });
  }
  
  /**
   * Suit une action utilisateur
   * @param action Nom de l'action
   * @param data Données additionnelles
   */
  public trackUserAction(action: string, data: Record<string, any> = {}): void {
    this.trackEvent(AnalyticsEventType.USER_ACTION, action, data);
  }
  
  /**
   * Suit l'utilisation d'une fonctionnalité
   * @param feature Nom de la fonctionnalité
   * @param data Données additionnelles
   */
  public trackFeatureUsage(feature: string, data: Record<string, any> = {}): void {
    this.trackEvent(AnalyticsEventType.FEATURE_USAGE, feature, data);
  }
  
  /**
   * Suit une métrique de performance
   * @param name Nom de la métrique
   * @param durationMs Durée en millisecondes
   * @param data Données additionnelles
   */
  public trackPerformance(name: string, durationMs: number, data: Record<string, any> = {}): void {
    this.trackEvent(AnalyticsEventType.PERFORMANCE, name, {
      duration_ms: durationMs,
      ...data
    });
  }
  
  /**
   * Suit une erreur
   * @param error Erreur ou message d'erreur
   * @param data Données additionnelles
   */
  public trackError(error: Error | string, data: Record<string, any> = {}): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.trackEvent(AnalyticsEventType.ERROR, 'error', {
      message: errorMessage,
      stack: errorStack,
      ...data
    });
  }
  
  /**
   * Suit un événement personnalisé
   * @param name Nom de l'événement
   * @param data Données de l'événement
   */
  public trackCustomEvent(name: string, data: Record<string, any> = {}): void {
    this.trackEvent(AnalyticsEventType.CUSTOM, name, data);
  }
  
  /**
   * Méthode générique pour suivre un événement
   * @param type Type d'événement
   * @param name Nom de l'événement
   * @param data Données de l'événement
   */
  public trackEvent(type: AnalyticsEventType, name: string, data: Record<string, any> = {}): void {
    if (!this.options.enabled) {
      return;
    }
    
    // Appliquer l'échantillonnage
    if (this.options.samplingRate! < 1 && Math.random() > this.options.samplingRate!) {
      return;
    }
    
    const event: AnalyticsEvent = {
      type,
      name,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.configService.get<string>('user.id'),
      data,
      metadata: {
        platform: this.detectPlatform(),
        appVersion: this.configService.get<string>('app.version', '1.0.0'),
        context: this.configService.get<string>('app.context', 'production')
      }
    };
    
    // Ajouter à la file d'attente
    this.eventQueue.push(event);
    
    // Émettre un événement local
    this.eventBus.emit('analytics:event', { 
      type: event.type,
      name: event.name
    });
    
    // Si la taille du lot est atteinte, envoyer immédiatement
    if (this.eventQueue.length >= this.options.batchSize!) {
      this.processBatch();
    }
    
    this.logger.debug(`Tracked ${type} event: ${name}`);
  }
  
  /**
   * Traite et envoie un lot d'événements
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    // Extraire les événements de la file d'attente
    const batch = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await this.backend.sendBatch(batch);
      this.logger.debug(`Sent batch of ${batch.length} analytics events`);
      
      // Émettre un événement de succès
      this.eventBus.emit('analytics:batch-sent', { count: batch.length });
    } catch (error) {
      this.logger.error('Failed to send analytics batch', error as Error);
      
      // Remettre les événements dans la file d'attente pour réessayer
      this.eventQueue = [...batch, ...this.eventQueue];
      
      // Limiter la taille de la file d'attente pour éviter une consommation excessive de mémoire
      if (this.eventQueue.length > this.options.maxInMemoryEvents!) {
        this.eventQueue = this.eventQueue.slice(-this.options.maxInMemoryEvents!);
        this.logger.warn(`Analytics queue truncated to ${this.options.maxInMemoryEvents} events`);
      }
      
      // Émettre un événement d'échec
      this.eventBus.emit('analytics:batch-failed', { error });
    }
  }
  
  /**
   * Configure le traitement par lots
   */
  private setupBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.options.batchInterval);
  }
  
  /**
   * Configure les écouteurs d'événements pour le suivi automatique
   */
  private setupEventListeners(): void {
    // Suivre les erreurs système
    this.eventBus.on('system:error', (data) => {
      this.trackError(data.error || 'Unknown system error', {
        source: data.source,
        stack: data.stack
      });
    });
    
    // Suivre les démarrages de service
    this.eventBus.on('service:started', (data) => {
      this.trackEvent(AnalyticsEventType.CUSTOM, 'service_started', {
        service: data.service
      });
    });
    
    // Suivre les performances lentes
    this.eventBus.on('performance:slow-operation', (data) => {
      this.trackPerformance(data.operation, data.duration, {
        threshold: data.threshold,
        ...data.tags
      });
    });
  }
  
  /**
   * Détecte la plateforme d'exécution
   */
  private detectPlatform(): string {
    if (typeof window !== 'undefined') {
      return 'web';
    } else if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      return 'desktop';
    } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return 'node';
    }
    return 'unknown';
  }
  
  /**
   * Génère un identifiant de session unique
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
  }
  
  /**
   * Récupère les événements stockés (si le backend est InMemoryAnalyticsBackend)
   */
  public getStoredEvents(): AnalyticsEvent[] | undefined {
    if (this.backend instanceof InMemoryAnalyticsBackend) {
      return this.backend.getEvents();
    }
    return undefined;
  }
  
  /**
   * Efface les événements stockés (si le backend est InMemoryAnalyticsBackend)
   */
  public clearStoredEvents(): boolean {
    if (this.backend instanceof InMemoryAnalyticsBackend) {
      this.backend.clearEvents();
      return true;
    }
    return false;
  }
}

export default AnalyticsService;
