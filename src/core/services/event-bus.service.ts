// #codebase: [CONTEXTE] Service de gestion des événements de l'application Bolt2bolt.
// #codebase: [PATTERN:OBSERVER] Implémentation du pattern Observer pour la communication inter-modules.
// #codebase: [DIRECTIVE] Centraliser les évènements de l'application pour faciliter le débogage et les tests.

/*
[COPILOT_PROMPTS]
# Service de Bus d'Événements - Directives d'Implémentation

## Responsabilité
- Gestion centrale des événements de l'application
- Faciliter la communication entre composants découplés
- Fournir des mécanismes de traçabilité des événements

## Points d'Extension
- Support pour différents types d'événements (synchrones, asynchrones)
- Ajout de middleware pour transformer/filtrer les événements
- Capacité d'enregistrement des événements pour audit et débogage

## Anti-patterns
- Éviter la surcharge du bus d'événements pour des opérations fréquentes
- Ne pas utiliser pour des transferts de données volumineux
- Éviter les dépendances circulaires via les événements
[COPILOT_PROMPTS]
*/

import { EventEmitter } from 'events';

/**
 * Interface pour les données d'événement
 */
export interface EventData {
  [key: string]: any;
}

/**
 * Type pour les gestionnaires d'événements
 */
export type EventHandler = (data: EventData) => void | Promise<void>;

/**
 * Service de gestion des événements pour Bolt2bolt
 */
export class EventBusService {
  private static instance: EventBusService;
  private eventEmitter: EventEmitter;
  private eventLog: Array<{ event: string; data: EventData; timestamp: Date }> = [];
  private readonly maxLogSize: number = 100;
  private middlewares: Array<(eventName: string, data: EventData) => EventData> = [];
  
  /**
   * Constructeur privé pour le pattern Singleton
   */
  private constructor() {
    this.eventEmitter = new EventEmitter();
    // Augmenter la limite d'auditeurs par défaut
    this.eventEmitter.setMaxListeners(50);
  }
  
  /**
   * Obtenir l'instance unique du service
   */
  public static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }
  
  /**
   * Émet un événement avec les données associées
   * @param eventName Nom de l'événement
   * @param data Données associées à l'événement
   */
  public emit(eventName: string, data: EventData = {}): void {
    // Appliquer les middlewares
    let processedData = this.applyMiddlewares(eventName, data);
    
    // Enregistrer l'événement
    this.logEvent(eventName, processedData);
    
    // Émettre l'événement
    this.eventEmitter.emit(eventName, processedData);
  }
  
  /**
   * Émet un événement asynchrone avec les données associées
   * @param eventName Nom de l'événement
   * @param data Données associées à l'événement
   */
  public async emitAsync(eventName: string, data: EventData = {}): Promise<void> {
    // Appliquer les middlewares
    let processedData = this.applyMiddlewares(eventName, data);
    
    // Enregistrer l'événement
    this.logEvent(eventName, processedData);
    
    // Récupérer tous les gestionnaires pour cet événement
    const handlers = this.eventEmitter.listeners(eventName) as EventHandler[];
    
    // Exécuter tous les gestionnaires de manière asynchrone
    await Promise.all(
      handlers.map(handler => {
        try {
          const result = handler(processedData);
          return result instanceof Promise ? result : Promise.resolve();
        } catch (error) {
          return Promise.reject(error);
        }
      })
    );
  }
  
  /**
   * Enregistre un gestionnaire d'événement
   * @param eventName Nom de l'événement
   * @param handler Fonction de traitement
   */
  public on(eventName: string, handler: EventHandler): void {
    this.eventEmitter.on(eventName, handler);
  }
  
  /**
   * Enregistre un gestionnaire d'événement qui ne s'exécutera qu'une seule fois
   * @param eventName Nom de l'événement
   * @param handler Fonction de traitement
   */
  public once(eventName: string, handler: EventHandler): void {
    this.eventEmitter.once(eventName, handler);
  }
  
  /**
   * Supprime un gestionnaire d'événement
   * @param eventName Nom de l'événement
   * @param handler Fonction de traitement à supprimer
   */
  public off(eventName: string, handler: EventHandler): void {
    this.eventEmitter.off(eventName, handler);
  }
  
  /**
   * Supprime tous les gestionnaires pour un événement donné
   * @param eventName Nom de l'événement
   */
  public removeAllListeners(eventName?: string): void {
    this.eventEmitter.removeAllListeners(eventName);
  }
  
  /**
   * Ajoute un middleware pour transformer les données d'événement
   * @param middleware Fonction de middleware
   */
  public addMiddleware(middleware: (eventName: string, data: EventData) => EventData): void {
    this.middlewares.push(middleware);
  }
  
  /**
   * Supprime un middleware spécifique
   * @param middleware Middleware à supprimer
   */
  public removeMiddleware(middleware: (eventName: string, data: EventData) => EventData): void {
    this.middlewares = this.middlewares.filter(mw => mw !== middleware);
  }
  
  /**
   * Récupère les derniers événements enregistrés
   * @param limit Nombre maximal d'événements à récupérer
   */
  public getEventLog(limit: number = this.maxLogSize): Array<{ event: string; data: EventData; timestamp: Date }> {
    return this.eventLog.slice(-limit);
  }
  
  /**
   * Filtre les événements du log par type
   * @param eventName Nom de l'événement à filtrer
   * @param limit Nombre maximal d'événements à récupérer
   */
  public filterEventLog(eventName: string, limit: number = this.maxLogSize): Array<{ event: string; data: EventData; timestamp: Date }> {
    return this.eventLog
      .filter(entry => entry.event === eventName)
      .slice(-limit);
  }
  
  /**
   * Efface le journal d'événements
   */
  public clearEventLog(): void {
    this.eventLog = [];
  }
  
  /**
   * Enregistre un événement dans le journal
   * @param eventName Nom de l'événement
   * @param data Données associées
   */
  private logEvent(eventName: string, data: EventData): void {
    this.eventLog.push({
      event: eventName,
      data,
      timestamp: new Date()
    });
    
    // Maintenir la taille du journal
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }
  
  /**
   * Applique tous les middlewares aux données d'événement
   * @param eventName Nom de l'événement
   * @param data Données initiales
   * @returns Données transformées
   */
  private applyMiddlewares(eventName: string, data: EventData): EventData {
    return this.middlewares.reduce(
      (processedData, middleware) => middleware(eventName, processedData),
      { ...data } // Clone pour éviter la mutation des données d'origine
    );
  }
  
  // Méthodes spécifiques pour les événements de système
  
  /**
   * Émet un événement de démarrage de service
   * @param serviceName Nom du service
   */
  public emitServiceStarted(serviceName: string): void {
    this.emit('service:started', { service: serviceName });
  }
  
  /**
   * Émet un événement d'arrêt de service
   * @param serviceName Nom du service
   */
  public emitServiceStopped(serviceName: string): void {
    this.emit('service:stopped', { service: serviceName });
  }
  
  /**
   * Émet un événement d'erreur système
   * @param error Erreur survenue
   * @param source Source de l'erreur
   */
  public emitError(error: Error, source: string): void {
    this.emit('system:error', { 
      error: error.message,
      stack: error.stack,
      source 
    });
  }
  
  /**
   * Enregistre un gestionnaire pour les événements de démarrage de service
   * @param handler Fonction de traitement
   */
  public onServiceStarted(handler: EventHandler): void {
    this.on('service:started', handler);
  }
  
  /**
   * Enregistre un gestionnaire pour les événements d'arrêt de service
   * @param handler Fonction de traitement
   */
  public onServiceStopped(handler: EventHandler): void {
    this.on('service:stopped', handler);
  }
  
  /**
   * Enregistre un gestionnaire pour les événements d'erreur système
   * @param handler Fonction de traitement
   */
  public onError(handler: EventHandler): void {
    this.on('system:error', handler);
  }
}

export default EventBusService;
