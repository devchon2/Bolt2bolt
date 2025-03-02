// #codebase: [CONTEXTE] Module de journalisation pour Bolt2bolt
// #codebase: [PATTERN:SINGLETON] Utilise un pattern singleton configurable
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration de la couverture

/*
[COPILOT_PROMPTS]
# Logger - Utilitaire Partagé

## Responsabilités
- Journalisation unifiée pour tous les composants de Bolt2bolt
- Support de différents niveaux de log
- Formatage configurable des messages
- Possibilité d'envoyer les logs vers différentes destinations

## Architecture
- Pattern singleton avec configuration globale
- Support de contextes nommés pour chaque module
- Intégration avec les systèmes de journalisation standards
[COPILOT_PROMPTS]
*/

/**
 * Niveaux de log supportés par le Logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  SILENT = 5
}

/**
 * Options de configuration pour le Logger
 */
export interface LoggerOptions {
  /**
   * Niveau de log minimum à afficher
   */
  level?: LogLevel;
  
  /**
   * Si vrai, affiche la date et l'heure avec chaque message
   */
  showTimestamp?: boolean;
  
  /**
   * Si vrai, affiche le nom du contexte avec chaque message
   */
  showContext?: boolean;
  
  /**
   * Si vrai, affiche les logs dans la console
   */
  console?: boolean;
  
  /**
   * Si défini, écrit les logs dans un fichier
   */
  filePath?: string;
  
  /**
   * Format personnalisé pour les messages de log
   */
  format?: (level: LogLevel, context: string, message: string, timestamp: Date) => string;
}

/**
 * Classe utilitaire pour la journalisation
 */
// #codebase: [RESPONSABILITÉ] Fournit une interface de journalisation unifiée pour tout le projet
export class Logger {
  private static globalOptions: LoggerOptions = {
    level: LogLevel.INFO,
    showTimestamp: true,
    showContext: true,
    console: true
  };
  
  private context: string;
  private options: LoggerOptions;
  
  /**
   * Crée une nouvelle instance de Logger
   * @param context Nom du contexte (généralement le nom de la classe/module)
   * @param options Options spécifiques à ce logger
   */
  constructor(context: string, options: LoggerOptions = {}) {
    this.context = context;
    this.options = { ...Logger.globalOptions, ...options };
  }
  
  /**
   * Configure les options globales pour tous les loggers
   */
  public static configure(options: LoggerOptions): void {
    Logger.globalOptions = { ...Logger.globalOptions, ...options };
  }
  
  /**
   * Log un message de niveau debug
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }
  
  /**
   * Log un message de niveau info
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, args);
  }
  
  /**
   * Log un message de niveau warning
   */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, args);
  }
  
  /**
   * Log un message de niveau error
   */
  public error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error ? [error] : []);
  }
  
  /**
   * Log un message de niveau fatal
   */
  public fatal(message: string, error?: any): void {
    this.log(LogLevel.FATAL, message, error ? [error] : []);
  }
  
  /**
   * Fonction interne pour traiter les messages de log
   */
  private log(level: LogLevel, message: string, args: any[]): void {
    // Vérifier si le niveau est suffisant pour être affiché
    if (level < (this.options.level || Logger.globalOptions.level)) {
      return;
    }
    
    const timestamp = new Date();
    let formattedMessage = this.formatMessage(level, message, timestamp);
    
    // Ajouter les arguments si présents
    if (args && args.length > 0) {
      if (typeof args[0] === 'object' && args[0] instanceof Error) {
        formattedMessage += ` ${args[0].message}`;
        if (args[0].stack) {
          formattedMessage += `\n${args[0].stack}`;
        }
      } else {
        formattedMessage += ` ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`;
      }
    }
    
    // Envoyer le message aux destinations configurées
    this.writeToDestinations(level, formattedMessage);
  }
  
  /**
   * Formate un message de log selon les options configurées
   */
  private formatMessage(level: LogLevel, message: string, timestamp: Date): string {
    // Utiliser le format personnalisé s'il est défini
    if (this.options.format || Logger.globalOptions.format) {
      const formatFn = this.options.format || Logger.globalOptions.format;
      return formatFn(level, this.context, message, timestamp);
    }
    
    // Format par défaut
    let formattedMessage = '';
    
    // Ajouter le timestamp si demandé
    if (this.options.showTimestamp) {
      formattedMessage += `[${timestamp.toISOString()}] `;
    }
    
    // Ajouter le niveau de log
    formattedMessage += `${LogLevel[level]} `;
    
    // Ajouter le contexte si demandé
    if (this.options.showContext) {
      formattedMessage += `[${this.context}] `;
    }
    
    // Ajouter le message
    formattedMessage += message;
    
    return formattedMessage;
  }
  
  /**
   * Envoie le message formaté aux destinations configurées
   */
  private writeToDestinations(level: LogLevel, message: string): void {
    // Écrire dans la console si configuré
    if (this.options.console) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(message);
          break;
      }
    }
    
    // Écrire dans un fichier si configuré
    if (this.options.filePath) {
      // Dans une implémentation réelle, on utiliserait fs.appendFile
      // de manière asynchrone, mais c'est simplifié ici pour l'exemple
      const fs = require('fs');
      try {
        fs.appendFileSync(this.options.filePath, message + '\n');
      } catch (error) {
        // Fallback vers la console en cas d'erreur
        console.error(`Erreur d'écriture du log dans le fichier: ${error.message}`);
        console.error(message);
      }
    }
    
    // D'autres destinations pourraient être ajoutées ici (base de données, sentry, etc.)
  }
}

export default Logger;
