// #codebase: [CONTEXTE] Registre central des services de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer le cycle de vie des services et leurs dépendances.

import { Logger } from './logger';
import { EventBus } from './eventBus';
import { ConfigService } from './configService';
import { DatabaseService } from './databaseService';
import { AuthService } from './authService';
import { UserService } from './userService';
import { NotificationService } from './notificationService';
import { ApiService } from './apiService';
import { AnalyticsService } from './analyticsService';
import { HttpServer } from './httpServer';

export interface ServiceDefinition {
  name: string;
  instance: any;
  dependencies: string[];
  initialized: boolean;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private logger: Logger;
  private eventBus: EventBus;
  private services: Map<string, ServiceDefinition> = new Map();
  private isInitialized: boolean = false;
  
  private constructor() {
    this.logger = new Logger('ServiceRegistry');
    this.eventBus = EventBus.getInstance();
  }
  
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('ServiceRegistry déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du registre de services');
    
    // Enregistrer les services fondamentaux
    this.registerCoreServices();
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'ServiceRegistry' });
  }
  
  private registerCoreServices(): void {
    // Initialiser les services fondamentaux
    const configService = new ConfigService();
    const eventBusService = this.eventBus;
    const notificationService = new NotificationService(configService);
    const databaseService = new DatabaseService(configService);
    const userService = new UserService(notificationService);
    const authService = new AuthService(userService, notificationService, configService);
    const analyticsService = new AnalyticsService();
    const httpServer = new HttpServer(configService);
    const apiService = new ApiService(configService);
    
    // Enregistrer les services avec leurs dépendances
    this.registerService('config', configService, []);
    this.registerService('events', eventBusService, []);
    this.registerService('notifications', notificationService, ['config']);
    this.registerService('database', databaseService, ['config']);
    this.registerService('users', userService, ['notifications', 'database']);
    this.registerService('auth', authService, ['users', 'notifications', 'config']);
    this.registerService('analytics', analyticsService, []);
    this.registerService('http', httpServer, ['config']);
    this.registerService('api', apiService, ['config', 'http', 'auth', 'users']);
    
    // Configuration des dépendances entre services
    apiService.setHttpServer(httpServer);
    apiService.setAuthService(authService);
    apiService.setUserService(userService);
  }
  
  public registerService(name: string, instance: any, dependencies: string[]): void {
    if (this.services.has(name)) {
      this.logger.warn(`Service déjà enregistré: ${name}`);
      return;
    }
    
    this.services.set(name, {
      name,
      instance,
      dependencies,
      initialized: false
    });
    
    this.logger.debug(`Service enregistré: ${name}`);
  }
  
  public getService(name: string): any {
    const service = this.services.get(name);
    if (!service) {
      this.logger.warn(`Service non trouvé: ${name}`);
      return null;
    }
    
    return service.instance;
  }

  public getServiceInstance<T>(name: string): T | null {
    const service = this.services.get(name);
    return service ? (service.instance as T) : null;
  }
  
  public initializeService(name: string): boolean {
    const service = this.services.get(name);
    if (!service) {
      this.logger.warn(`Impossible d'initialiser le service non trouvé: ${name}`);
      return false;
    }
    
    if (service.initialized) {
      return true;
    }
    
    // Vérifier et initialiser les dépendances d'abord
    for (const dependency of service.dependencies) {
      const isInitialized = this.initializeService(dependency);
      if (!isInitialized) {
        this.logger.error(`Échec de l'initialisation de la dépendance ${dependency} pour ${name}`);
        return false;
      }
    }
    
    try {
      // Initialiser le service
      if (typeof service.instance.initialize === 'function') {
        service.instance.initialize();
      }
      
      service.initialized = true;
      this.eventBus.emit('service:initialized', { service: name });
      this.logger.info(`Service initialisé: ${name}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'initialisation du service ${name}:`, error);
      return false;
    }
  }
  
  public initializeAllServices(): boolean {
    let success = true;
    
    // Créer une liste des services à initialiser
    const servicesToInitialize = Array.from(this.services.keys());
    
    // Initialiser tous les services
    for (const serviceName of servicesToInitialize) {
      const serviceSuccess = this.initializeService(serviceName);
      success = success && serviceSuccess;
      
      if (!serviceSuccess) {
        this.logger.error(`Échec de l'initialisation du service: ${serviceName}`);
      }
    }
    
    this.logger.info(`Initialisation de tous les services ${success ? 'réussie' : 'échouée'}`);
    return success;
  }
  
  public async shutdownService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service || !service.initialized) {
      return true;
    }
    
    // Trouver les services qui dépendent de celui-ci
    const dependents = this.findDependents(name);
    
    // Arrêter d'abord les services dépendants
    for (const dependent of dependents) {
      const success = await this.shutdownService(dependent);
      if (!success) {
        this.logger.error(`Échec de l'arrêt du service dépendant ${dependent} pour ${name}`);
        return false;
      }
    }
    
    try {
      // Arrêter le service
      if (typeof service.instance.shutdown === 'function') {
        await service.instance.shutdown();
      }
      
      service.initialized = false;
      this.eventBus.emit('service:shutdown', { service: name });
      this.logger.info(`Service arrêté: ${name}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'arrêt du service ${name}:`, error);
      return false;
    }
  }
  
  public async shutdownAllServices(): Promise<boolean> {
    let success = true;
    
    // Créer une liste triée des services dans l'ordre inverse de leurs dépendances
    const sortedServices = this.getSortedServicesForShutdown();
    
    // Arrêter tous les services dans l'ordre inverse
    for (const serviceName of sortedServices) {
      const serviceSuccess = await this.shutdownService(serviceName);
      success = success && serviceSuccess;
      
      if (!serviceSuccess) {
        this.logger.error(`Échec de l'arrêt du service: ${serviceName}`);
      }
    }
    
    this.logger.info(`Arrêt de tous les services ${success ? 'réussi' : 'échoué'}`);
    return success;
  }
  
  private findDependents(serviceName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, service] of this.services.entries()) {
      if (service.dependencies.includes(serviceName)) {
        dependents.push(name);
      }
    }
    
    return dependents;
  }
  
  private getSortedServicesForShutdown(): string[] {
    // Utiliser une topologie inversée pour l'arrêt
    const visited = new Set<string>();
    const sorted: string[] = [];
    
    const visit = (name: string) => {
      if (visited.has(name)) return;
      
      visited.add(name);
      
      const dependents = this.findDependents(name);
      for (const dependent of dependents) {
        visit(dependent);
      }
      
      sorted.push(name);
    };
    
    // Visiter tous les services
    for (const name of this.services.keys()) {
      visit(name);
    }
    
    return sorted;
  }
}