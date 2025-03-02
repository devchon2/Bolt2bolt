import { LogLevel } from '../types';

/**
 * Système de journalisation pour l'optimiseur
 */
export class Logger {
  private level: LogLevel;
  private readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  /**
   * Change le niveau de journalisation
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Journal un message de débogage
   */
  public debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Journal un message d'information
   */
  public info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Journal un avertissement
   */
  public warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Journal une erreur
   */
  public error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Journal un message si le niveau de journalisation le permet
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (this.LOG_LEVELS[level] < this.LOG_LEVELS[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(`${prefix} ${message}`, ...args);
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, ...args);
    } else {
      console.log(`${prefix} ${message}`, ...args);
    }
  }
}
