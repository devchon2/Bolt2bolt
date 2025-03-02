// #codebase: [CONTEXTE] Bus d'événements de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Permettre la communication entre différents services via des événements.

import { Logger } from './logger';
import { EventEmitter } from 'events';

export interface EventData {
  [key: string]: any;
}

export interface EventSubscription {
  unsubscribe: () => void;
}

export class EventBus {
  private static instance: EventBus;
  private logger: Logger;
  private emitter: EventEmitter;
  private handlers: Map<string, Set<(data: EventData) => void>> = new Map();
  private isInitialized: boolean = false;
  
  private constructor() {
    this.logger = new Logger('EventBus');
    this.emitter = new EventEmitter();
    
    // Augmenter la limite d'écouteurs pour éviter les avertissements
    this.emitter.setMaxListeners(50);
  }
  
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('EventBus déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du bus d\'événements');
    this.isInitialized = true;
    
    // Émettre un événement interne pour signaler l'initialisation
    this.emit('eventbus:initialized', {});
  }
  
  public emit(eventName: string, data: EventData = {}): void {
    if (!this.isInitialized) {
      this.logger.warn('EventBus non initialisé');
    }
    
    this.logger.debug(`Émission de l'événement: ${eventName}`);
    
    // Ajouter un timestamp aux données de l'événement
    const eventData = {
      ...data,
      _timestamp: Date.now(),
      _eventName: eventName
    };
    
    // Émettre l'événement
    this.emitter.emit(eventName, eventData);
    
    // Émettre également un événement global pour les écouteurs génériques
    this.emitter.emit('*', { eventName, data: eventData });
  }
  
  public on(eventName: string, handler: (data: EventData) => void): EventSubscription {
    this.logger.debug(`Enregistrement d'un écouteur pour: ${eventName}`);
    
    // Ajouter à la liste des gestionnaires
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)?.add(handler);
    
    // Enregistrer l'écouteur
    this.emitter.on(eventName, handler);
    
    // Retourner un objet permettant de se désabonner
    return {
      unsubscribe: () => {
        this.emitter.off(eventName, handler);
        this.handlers.get(eventName)?.delete(handler);
      }
    };
  }
  
  public once(eventName: string, handler: (data: EventData) => void): void {
    this.logger.debug(`Enregistrement d'un écouteur unique pour: ${eventName}`);
    this.emitter.once(eventName, handler);
  }
  
  public off(eventName: string, handler: (data: EventData) => void): void {
    this.logger.debug(`Suppression d'un écouteur pour: ${eventName}`);
    this.emitter.off(eventName, handler);
    this.handlers.get(eventName)?.delete(handler);
  }
  
  public onAny(handler: (eventName: string, data: EventData) => void): EventSubscription {
    const wrappedHandler = (eventData: any) => {
      handler(eventData._eventName, eventData);
    };
    
    this.emitter.on('*', wrappedHandler);
    
    return {
      unsubscribe: () => {
        this.emitter.off('*', wrappedHandler);
      }
    };
  }
  
  public getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  public getListenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName);
  }
  
  public emitServiceStarted(serviceName: string): void {
    this.emit('service:started', { service: serviceName });
  }
  
  public emitServiceStopped(serviceName: string): void {
    this.emit('service:stopped', { service: serviceName });
  }
  
  public onServiceStarted(handler: (event: EventData) => void): EventSubscription {
    return this.on('service:started', handler);
  }
  
  public onServiceStopped(handler: (event: EventData) => void): EventSubscription {
    return this.on('service:stopped', handler);
  }
  
  public shutdown(): void {
    this.logger.info('Arrêt du bus d\'événements');
    this.emitter.removeAllListeners();
    this.handlers.clear();
    this.isInitialized = false;
  }
}

// Pour la rétrocompatibilité avec l'ancien code qui utilise EventBus
export class EventEmitterService extends EventBus {
  constructor() {
    super();
    this.logger = new Logger('EventEmitterService');
    this.logger.warn('EventEmitterService est déprécié, utilisez EventBus à la place');
  }
}

// Singleton global pour accès facile
export const EventBusService = EventBus;
