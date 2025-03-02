// #codebase: [CONTEXTE] Module principal de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Configurer et initialiser les services de l'application.

import { ServiceRegistry } from './serviceRegistry';
import { Logger } from './logger';
import { EventBusService } from './eventBusService';

const logger = new Logger('App');

// Nouvelle fonction pour configurer la gestion globale des erreurs
function initializeErrorHandling() {
  // #codebase: [DIRECTIVE] Gérer globalement les erreurs non interceptées.
  process.on('uncaughtException', (err) => {
    logger.error("Erreur non interceptée : ", err);
    EventBusService.getInstance().emit('system:error', {
      type: 'uncaughtException',
      error: err
    });
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error("Rejet non géré : ", reason);
    EventBusService.getInstance().emit('system:error', {
      type: 'unhandledRejection',
      error: reason
    });
  });
  
  logger.info('Gestionnaire d\'erreurs globales initialisé');
}

export async function initializeApp() {
  // #codebase: [POINT-EXTENSION] Initialiser les services et la gestion d'erreurs.
  try {
    logger.info('Démarrage de l\'application Bolt2bolt');
    
    // Initialiser la gestion d'erreurs
    initializeErrorHandling();
    
    // Initialiser le registre de services
    const registry = ServiceRegistry.getInstance();
    registry.initialize();
    
    // Initialiser les services fondamentaux en premier
    registry.initializeService('config');
    registry.initializeService('events');
    registry.initializeService('notifications');
    
    // Initialiser tous les autres services
    registry.initializeAllServices();
    
    // Démarrer le serveur HTTP
    const httpServer = registry.getService('http');
    httpServer.start();
    
    logger.info('Application Bolt2bolt démarrée avec succès');
    return true;
  } catch (error) {
    logger.error("Erreur lors de l'initialisation de l'application", error);
    return false;
  }
}

export async function shutdownApp(signal?: string) {
  try {
    logger.info(`Arrêt de l'application Bolt2bolt${signal ? ` (signal: ${signal})` : ''}`);
    
    // Arrêter tous les services via le registre
    const registry = ServiceRegistry.getInstance();
    await registry.shutdownAllServices();
    
    logger.info('Application Bolt2bolt arrêtée avec succès');
    return true;
  } catch (error) {
    logger.error("Erreur lors de l'arrêt de l'application", error);
    return false;
  }
}

// Gestion des signaux d'arrêt
process.on('SIGINT', () => shutdownApp('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => shutdownApp('SIGTERM').then(() => process.exit(0)));
