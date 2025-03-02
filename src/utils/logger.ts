// #codebase: [CONTEXTE] Système de journalisation centralisé pour Bolt2bolt.
// #codebase: [DIRECTIVE] Utiliser pour toute journalisation à travers l'application.
// #codebase: [ITÉRATION-ACTUELLE] Version alpha stabilisée.

import * as winston from 'winston';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/*
[COPILOT_PROMPTS]
# Logger - Directives d'Implémentation

## Responsabilité
- Fournir une interface unifiée pour la journalisation
- Gérer différents niveaux de détail (debug, info, warn, error)
- Permettre la journalisation vers différentes destinations
- Inclure des métadonnées contextuelles dans les logs

## Bonnes Pratiques
- Utiliser des niveaux de log appropriés selon l'importance
- Inclure des informations de contexte utiles au débogage
- Formater les logs de façon lisible par machine et humain
- Éviter la journalisation de données sensibles
[COPILOT_PROMPTS]
*/

/**
 * Interface du Logger utilisée par tous les composants
 */
export interface Logger {
  /**
   * Journalise une information importante
   */
  info(message: string, meta?: Record<string, any>): void;
  
  /**
   * Journalise un message de débogage
   */
  debug(message: string, meta?: Record<string, any>): void;
  
  /**
   * Journalise un avertissement
   */
  warn(message: string, meta?: Record<string, any>): void;
  
  /**
   * Journalise une erreur
   */
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Options de configuration du logger
 */
export interface LoggerOptions {
  /**
   * Niveau de détail ('debug' | 'info' | 'warn' | 'error')
   */
  level?: string;
  
  /**
   * Chemin du fichier de log
   */
  filePath?: string;
  
  /**
   * Identifiant de corrélation pour les sessions de log
   */
  correlationId?: string;
  
  /**
   * Format à utiliser ('json' | 'simple' | 'detailed')
   */
  format?: 'json' | 'simple' | 'detailed';
  
  /**
   * Métadonnées supplémentaires à inclure dans tous les logs
   */
  defaultMeta?: Record<string, any>;
  
  /**
   * Activer la journalisation dans la console
   */
  console?: boolean;
}

/**
 * Crée un logger avec la configuration spécifiée
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = process.env.LOG_LEVEL || 'info',
    filePath = process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'bolt2bolt.log'),
    correlationId = uuidv4(),
    format = 'detailed',
    defaultMeta = {},
    console = true
  } = options;
  
  // Créer le dossier de logs si nécessaire
  const logDir = path.dirname(filePath);
  try {
    require('fs').mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.warn(`Impossible de créer le dossier de logs: ${logDir}`);
  }
  
  // Configurer le format selon l'option choisie
  let formatter;
  switch (format) {
    case 'json':
      formatter = winston.format.json();
      break;
    case 'simple':
      formatter = winston.format.simple();
      break;
    case 'detailed':
    default:
      formatter = winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] [${correlationId}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      );
      break;
  }
  
  // Configurer les transports
  const transports = [];
  
  // Ajouter le transport fichier
  transports.push(
    new winston.transports.File({
      filename: filePath,
      level
    })
  );
  
  // Ajouter le transport console si demandé
  if (console) {
    transports.push(
      new winston.transports.Console({
        level,
        format: winston.format.combine(
          winston.format.colorize(),
          formatter
        )
      })
    );
  }
  
  // Créer l'instance de logger
  const winstonLogger = winston.createLogger({
    level,
    format: formatter,
    defaultMeta: {
      correlationId,
      ...defaultMeta
    },
    transports
  });
  
  // Retourner un objet implémentant l'interface Logger
  return {
    info: (message, meta) => winstonLogger.info(message, meta),
    debug: (message, meta) => winstonLogger.debug(message, meta),
    warn: (message, meta) => winstonLogger.warn(message, meta),
    error: (message, meta) => winstonLogger.error(message, meta)
  };
}

/**
 * Logger singleton par défaut pour utilisation simplifiée
 */
export const defaultLogger = createLogger();

/**
 * Fonction utilitaire pour créer un logger dérivé avec contexte
 */
export function createContextLogger(baseLogger: Logger, context: Record<string, any>): Logger {
  return {
    info: (message, meta) => baseLogger.info(message, { ...context, ...meta }),
    debug: (message, meta) => baseLogger.debug(message, { ...context, ...meta }),
    warn: (message, meta) => baseLogger.warn(message, { ...context, ...meta }),
    error: (message, meta) => baseLogger.error(message, { ...context, ...meta })
  };
}

/*
[COPILOT_PROMPTS]
# Tests pour Logger

## Structure Recommandée
describe('Logger', () => {
  describe('createLogger', () => {
    it('devrait créer un logger avec les options par défaut');
    it('devrait respecter le niveau de log spécifié');
    it('devrait utiliser le format spécifié');
    it('devrait inclure les métadonnées par défaut');
  });
  
  describe('createContextLogger', () => {
    it('devrait créer un logger dérivé avec contexte');
    it('devrait propager le contexte à tous les appels de log');
    it('devrait permettre de surcharger le contexte');
  });
});

## Points à Tester
- Création avec différentes configurations
- Propagation correcte du contexte
- Utilisation des bons niveaux de log
- Formatage des messages selon la configuration

## Approche
Utiliser des mocks pour intercepter les appels aux transports
et vérifier le contenu et format des messages
[COPILOT_PROMPTS]
*/
