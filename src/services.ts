// #codebase: [CONTEXTE] Configuration et initialisation des services de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Point central pour initialiser tous les services requis.

import { Logger, LogLevel } from './logger';
import { ConfigService } from './configService';
import { DatabaseService } from './database';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';
import { EventBus } from './eventBus';
import { UserService } from './userService';
import { ProjectService } from './projectService';
import { AuthService } from './authService';
import { ApiService } from './apiService';

export interface ServiceRegistry {
  logger: Logger;
  configService: ConfigService;
  eventBus: EventBus;
  databaseService: DatabaseService;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
  userService: UserService;
  projectService: ProjectService;
  authService: AuthService;
  apiService: ApiService;
  [key: string]: any;
}

// Singleton des services
let serviceRegistry: ServiceRegistry | null = null;

/**
 * Initialise tous les services requis par l'application
 * @returns ServiceRegistry contenant toutes les instances de services
 */
export function initializeServices(): ServiceRegistry {
  if (serviceRegistry) {
    console.warn('Services déjà initialisés');
    return serviceRegistry;
  }

  const logger = new Logger('Services', { level: LogLevel.DEBUG });
  logger.initialize();
  logger.info('Initialisation des services...');

  // Configuration
  const configService = new ConfigService();
  configService.initialize();
  
  // Charger le niveau de log depuis la configuration
  const logLevel = configService.get<string>('logging.level', 'info').toUpperCase();
  if (logLevel in LogLevel) {
    logger.setLevel(LogLevel[logLevel as keyof typeof LogLevel]);
  }

  // Bus d'événements
  const eventBus = EventBus.getInstance();
  eventBus.initialize();
  
  // Services de base
  const databaseService = new DatabaseService();
  databaseService.initialize();
  
  const notificationService = new NotificationService();
  notificationService.initialize();
  
  const analyticsService = new AnalyticsService();
  analyticsService.initialize();
  
  const apiService = new ApiService(configService);
  apiService.initialize();
  
  // Services métier
  const userService = new UserService(notificationService);
  userService.initialize();
  
  const projectService = new ProjectService(notificationService, userService);
  projectService.initialize();
  
  const authService = new AuthService(userService, notificationService, configService);
  authService.initialize();

  // Enregistrer tous les services
  serviceRegistry = {
    logger,
    configService,
    eventBus,
    databaseService,
    notificationService,
    analyticsService,
    userService,
    projectService,
    authService,
    apiService
  };

  logger.info('Tous les services ont été initialisés avec succès');
  eventBus.emit('system:services:initialized', {});

  return serviceRegistry;
}

/**
 * Récupère le registre des services déjà initialisés
 * @throws Error si les services n'ont pas été initialisés
 */
export function getServices(): ServiceRegistry {
  if (!serviceRegistry) {
    throw new Error('Les services n\'ont pas été initialisés. Appelez initializeServices() d\'abord.');
  }
  return serviceRegistry;
}

/**
 * Récupère un service spécifique par son nom
 * @param serviceName Nom du service à récupérer
 * @throws Error si les services n'ont pas été initialisés ou si le service n'existe pas
 */
export function getService<T = any>(serviceName: string): T {
  const services = getServices();
  if (!(serviceName in services)) {
    throw new Error(`Service inconnu: ${serviceName}`);
  }
  return services[serviceName] as T;
}

/**
 * Arrête proprement tous les services
 */
export async function shutdownServices(): Promise<void> {
  if (!serviceRegistry) {
    console.warn('Aucun service à arrêter');
    return;
  }

  const logger = serviceRegistry.logger;
  logger.info('Arrêt des services...');

  // Arrêter les services dans l'ordre inverse de leur démarrage
  if (serviceRegistry.authService) serviceRegistry.authService.shutdown();
  if (serviceRegistry.projectService) serviceRegistry.projectService.shutdown();
  if (serviceRegistry.userService) serviceRegistry.userService.shutdown();
  if (serviceRegistry.apiService) serviceRegistry.apiService.shutdown();
  if (serviceRegistry.analyticsService) serviceRegistry.analyticsService.shutdown();
  if (serviceRegistry.notificationService) serviceRegistry.notificationService.shutdown();
  if (serviceRegistry.databaseService) {
    if (typeof serviceRegistry.databaseService.close === 'function') {
      serviceRegistry.databaseService.close();
    }
  }
  
  // Arrêter les services de base en dernier
  if (serviceRegistry.eventBus) serviceRegistry.eventBus.shutdown();
  if (serviceRegistry.configService) serviceRegistry.configService.shutdown();

  logger.info('Tous les services ont été arrêtés avec succès');
  
  // Fermer le logger en dernier
  if (serviceRegistry.logger) {
    // Pas besoin d'appeler shutdown car le logger n'a pas cette méthode
  }

  serviceRegistry = null;
}
