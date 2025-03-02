// #codebase: [CONTEXTE] Point d'entrée principal de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Initialiser les composants principaux et démarrer l'application.

import { initializeApp } from './app';
import { Logger } from "./logger";
import { initializeDatabase, closeDatabase } from './database';
import { ConfigService } from './configService';
import { AnalyticsService } from './analyticsService';
import { NotificationService } from './notificationService';
import { UiService } from './ui';

// Initialisation des services principaux
const logger = new Logger('Main');
const configService = new ConfigService();
const analyticsService = new AnalyticsService();
const notificationService = new NotificationService();
const uiService = new UiService(notificationService);

// Fonction principale d'initialisation
async function initialize() {
  logger.initialize();
  logger.info("Démarrage de l'application Bolt2bolt...");
  
  // Initialiser les services dans l'ordre approprié
  configService.initialize();
  notificationService.initialize();
  analyticsService.initialize();
  uiService.initialize();
  
  // Initialiser l'application et la base de données
  await initializeApp();
  await startApplication();
  await initializeDatabase();

  // Enregistrer l'événement de démarrage
  analyticsService.trackEvent('app_started', { 
    timestamp: Date.now(),
    version: configService.get('app.version', '1.0.0') 
  });
  
  // Afficher une notification de bienvenue
  notificationService.success(
    'Application prête', 
    'Bolt2bolt a démarré avec succès'
  );
  
  logger.info("Application démarrée.");
}

// Initialisation
initialize().catch(error => {
  logger.error(`Erreur lors de l'initialisation: ${error}`);
  process.exit(1);
});

// Gestion d'arrêt propre (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info("Arrêt de l'application en cours...");
  
  // Enregistrer l'événement d'arrêt
  analyticsService.trackEvent('app_shutdown', { 
    timestamp: Date.now(),
    reason: 'user_interrupt' 
  });
  
  // Arrêter proprement les services
  analyticsService.flush();
  analyticsService.shutdown();
  uiService.shutdown();
  notificationService.shutdown();
  await closeDatabase();
  configService.shutdown();
  
  logger.info("Application arrêtée.");
  process.exit();
});

async function startApplication() {
  logger.info("Initialisation des composants de l'application...");
  
  try {
    await initializeDatabase();
    logger.info("Base de données initialisée");
    
    // Autres initialisations spécifiques à l'application
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors du démarrage de l'application: ${error}`);
    throw error;
  }
}