// #codebase: [CONTEXTE] Service de journalisation pour l'application Bolt2bolt
// #codebase: [PATTERN:SINGLETON] Fournit une interface unifiée pour la journalisation
// #codebase: [DIRECTIVE] Centraliser tous les logs pour faciliter le débogage et le monitoring

/*
[COPILOT_PROMPTS]
# Service de Journalisation - Directives d'Implémentation

## Responsabilité
- Fournir une interface unifiée pour la journalisation
- Supporter différents niveaux de logs (debug, info, warn, error)
- Permettre la configuration de différentes cibles de logs

## Points d'Extension
- Support pour des transports personnalisés (console, fichier, réseau)
- Formatage configurable des messages de logs
- Capacité de filtrage par niveau et par catégorie

## Anti-patterns
- Éviter la journalisation excessive qui impacte les performances
- Ne pas exposer d'informations sensibles dans les logs
- Éviter les dépendances circulaires avec d'autres services
[COPILOT_PROMPTS]
*/

import EventBusService from './event-bus.service';
import ConfigService from './config.service';

/**
 * Niveaux de journalisation supportés
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6
}

/**
 * Interface pour un transport de logs
 */
export interface LogTransport {
  /** Nom du transport */
  name: string;
  
  /** Niveau minimum de logs à traiter */
  level: LogLevel;
  
  /** Écrit un message de log */
  log(level: LogLevel, message: string, meta?: any, timestamp?: Date): void;
}

/**
 * Interface pour les options de configuration du logger
 */
export interface LoggerOptions {
  /** Niveau minimum de logs */
  level?: LogLevel;
  
  /** Transports à utiliser */
  transports?: LogTransport[];
  
  /** Format de date pour les timestamps */
  timestampFormat?: string;
  
  /** Inclure le niveau de log dans le message */
  includeLevel?: boolean;
  
  /** Inclure le timestamp dans le message */
  includeTimestamp?: boolean;
  
  /** Inclure le contexte dans le message */
  includeContext?: boolean;
  
  /** Inclure les métadonnées dans le message */
  includeMeta?: boolean;
  
  /** Niveau à partir duquel émettre des événements */
  eventLevel?: LogLevel;
}

/**
 * Transport de logs vers la console
 */
export class ConsoleTransport implements LogTransport {
  public readonly name: string = 'console';
  public level: LogLevel;
  
  private levelColors: Record<LogLevel, string> = {
    [LogLevel.TRACE]: '\x1b[90m', // Gris
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Vert
    [LogLevel.WARN]: '\x1b[33m',  // Jaune
    [LogLevel.ERROR]: '\x1b[31m', // Rouge
    [LogLevel.FATAL]: '\x1b[35m', // Magenta
    [LogLevel.SILENT]: ''         // Pas de couleur (ne devrait jamais être utilisé)
  };
  
  private resetColor: string = '\x1b[0m';
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  public log(level: LogLevel, message: string, meta?: any, timestamp?: Date): void {
    if (level < this.level) {
      return;
    }
    
    const color = this.levelColors[level] || '';
    const levelName = LogLevel[level] || 'UNKNOWN';
    
    // Formatter le message avec de la couleur pour la console
    const formattedMessage = `${color}[${levelName}]${this.resetColor} ${message}`;
    
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(formattedMessage, meta || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, meta || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, meta || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage, meta || '');
        break;
      default:
        console.log(formattedMessage, meta || '');
    }
  }
}

/**
 * Transport de logs vers un fichier
 */
export class FileTransport implements LogTransport {
  public readonly name: string = 'file';
  public level: LogLevel;
  private filePath: string;
  private fs: any;
  private stream: any;
  
  constructor(filePath: string, level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.filePath = filePath;
    
    // Import dynamique de fs
    try {
      this.fs = require('fs');
      this.stream = this.fs.createWriteStream(filePath, { flags: 'a' });
    } catch (e) {
      console.error('Impossible d\'initialiser le transport de logs vers fichier:', e);
      throw e;
    }
  }
  
  public log(level: LogLevel, message: string, meta?: any, timestamp?: Date): void {
    if (level < this.level || !this.stream) {
      return;
    }
    
    const levelName = LogLevel[level] || 'UNKNOWN';
    const time = timestamp ? timestamp.toISOString() : new Date().toISOString();
    
    let logEntry = `[${time}] [${levelName}] ${message}`;
    
    if (meta) {
      if (typeof meta === 'string') {
        logEntry += ` ${meta}`;
      } else if (meta instanceof Error) {
        logEntry += ` ${meta.message}\n${meta.stack || ''}`;
      } else {
        try {
          logEntry += ` ${JSON.stringify(meta)}`;
        } catch (e) {
          logEntry += ' [Métadonnées non sérialisables]';
        }
      }
    }
    
    logEntry += '\n';
    
    this.stream.write(logEntry);
  }
  
  /**
   * Ferme le stream d'écriture
   */
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.stream) {
        resolve();
        return;
      }
      
      this.stream.end(() => {
        this.stream = null;
        resolve();
      });
    });
  }
}

/**
 * Service principal de journalisation
 */
export class LoggerService {
  private static instance: LoggerService;
  private options: LoggerOptions;
  private transports: LogTransport[] = [];
  private eventBus: EventBusService;
  private configService?: ConfigService;
  
  /**
   * Constructeur privé pour le pattern Singleton
   */
  private constructor(options: LoggerOptions = {}) {
    this.options = {
      level: LogLevel.INFO,
      includeLevel: true,
      includeTimestamp: true,
      includeContext: true,
      includeMeta: true,
      eventLevel: LogLevel.WARN,
      ...options
    };
    
    this.eventBus = EventBusService.getInstance();
    
    // Ajouter le transport console par défaut
    this.addTransport(new ConsoleTransport(this.options.level));
  }
  
  /**
   * Obtenir l'instance unique du service
   */
  public static getInstance(options?: LoggerOptions): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(options);
    } else if (options) {
      LoggerService.instance.configure(options);
    }
    
    return LoggerService.instance;
  }
  
  /**
   * Configure le service de log
   */
  public configure(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Mettre à jour le niveau de log de tous les transports
    if (options.level !== undefined) {
      this.transports.forEach(transport => {
        transport.level = options.level!;
      });
    }
    
    // Remplacer les transports si fournis
    if (options.transports !== undefined) {
      this.transports = [...options.transports];
    }
  }
  
  /**
   * Initialise le logger avec le service de configuration
   */
  public initialize(configService: ConfigService): void {
    this.configService = configService;
    
    // Charger la configuration depuis le service de configuration
    const logLevel = configService.get<string>('logging.level', 'info');
    const fileEnabled = configService.get<boolean>('logging.file.enabled', false);
    const filePath = configService.get<string>('logging.file.path', './logs/application.log');
    
    // Convertir le niveau de log depuis la chaîne
    const level = this.getLevelFromString(logLevel);
    
    // Configurer avec les options chargées
    this.configure({ level });
    
    // Ajouter le transport fichier si activé
    if (fileEnabled) {
      try {
        this.addTransport(new FileTransport(filePath, level));
      } catch (error) {
        this.error('Impossible de créer le transport de logs vers fichier', error as Error);
      }
    }
    
    this.info('Service de journalisation initialisé', 'LoggerService');
  }
  
  /**
   * Ajoute un transport de logs
   */
  public addTransport(transport: LogTransport): void {
    // Vérifier si un transport avec le même nom existe déjà
    const existingIndex = this.transports.findIndex(t => t.name === transport.name);
    
    if (existingIndex !== -1) {
      // Remplacer le transport existant
      this.transports[existingIndex] = transport;
    } else {
      // Ajouter le nouveau transport
      this.transports.push(transport);
    }
  }
  
  /**
   * Supprime un transport de logs
   */
  public removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }
  
  /**
   * Écrit un message de log de niveau TRACE
   */
  public trace(message: string, context?: string): void;
  public trace(message: string, meta?: any, context?: string): void;
  public trace(message: string, metaOrContext?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.TRACE, message, metaOrContext, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log de niveau DEBUG
   */
  public debug(message: string, context?: string): void;
  public debug(message: string, meta?: any, context?: string): void;
  public debug(message: string, metaOrContext?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.DEBUG, message, metaOrContext, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log de niveau INFO
   */
  public info(message: string, context?: string): void;
  public info(message: string, meta?: any, context?: string): void;
  public info(message: string, metaOrContext?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.INFO, message, metaOrContext, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log de niveau WARN
   */
  public warn(message: string, context?: string): void;
  public warn(message: string, meta?: any, context?: string): void;
  public warn(message: string, metaOrContext?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.WARN, message, metaOrContext, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log de niveau ERROR
   */
  public error(message: string, error?: Error, context?: string): void;
  public error(message: string, meta?: any, context?: string): void;
  public error(message: string, errorOrMeta?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.ERROR, message, errorOrMeta, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log de niveau FATAL
   */
  public fatal(message: string, error?: Error, context?: string): void;
  public fatal(message: string, meta?: any, context?: string): void;
  public fatal(message: string, errorOrMeta?: any, contextOrUndefined?: string): void {
    this.log(LogLevel.FATAL, message, errorOrMeta, contextOrUndefined);
  }
  
  /**
   * Écrit un message de log au niveau spécifié
   */
  public log(level: LogLevel, message: string, metaOrContext?: any, contextOrUndefined?: string): void {
    // Déterminer les métadonnées et le contexte
    let meta: any;
    let context: string | undefined;
    
    if (typeof metaOrContext === 'string') {
      context = metaOrContext;
      meta = undefined;
    } else {
      meta = metaOrContext;
      context = contextOrUndefined;
    }
    
    // Créer le timestamp
    const timestamp = new Date();
    
    // Formatter le message
    let formattedMessage = message;
    
    if (this.options.includeContext && context) {
      formattedMessage = `[${context}] ${formattedMessage}`;
    }
    
    // Journaliser le message dans tous les transports
    this.transports.forEach(transport => {
      transport.log(level, formattedMessage, meta, timestamp);
    });
    
    // Émettre un événement si le niveau est suffisamment élevé
    if (level >= (this.options.eventLevel || LogLevel.WARN)) {
      const eventName = `log:${LogLevel[level].toLowerCase()}`;
      this.eventBus.emit(eventName, {
        message: formattedMessage,
        level,
        levelName: LogLevel[level],
        timestamp,
        meta,
      });
    }
  }
  
  /**
   * Convertit une chaîne de caractères en niveau de log
   */
  private getLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'trace':
        return LogLevel.TRACE;
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      case 'fatal':
        return LogLevel.FATAL;
      case 'silent':
        return LogLevel.SILENT;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Journalise un message dans un fichier
   * @param message Message à journaliser
   * @param filePath Chemin du fichier de log
   */
  public logToFile(message: string, filePath: string): void {
    const fs = require('fs');
    fs.appendFileSync(filePath, message + '\n', 'utf8');
  }

  /**
   * Met à jour dynamiquement le niveau de log
   * @param level Nouveau niveau de log
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

export default LoggerService;
