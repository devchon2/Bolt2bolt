import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from './configService';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

export interface LoggerOptions {
  context?: string;
  level?: LogLevel;
  useConsole?: boolean;
  useFile?: boolean;
  filePath?: string;
  colorize?: boolean;
  includeTimestamp?: boolean;
}

export class Logger {
  private static configService: ConfigService | null = null;
  private static globalOptions: LoggerOptions = {
    level: LogLevel.INFO,
    useConsole: true,
    useFile: false,
    colorize: true,
    includeTimestamp: true,
  };
  
  private static logEntries: LogEntry[] = [];
  private static maxLogEntries: number = 1000;
  private static fileStream: fs.WriteStream | null = null;
  private static listeners: ((entry: LogEntry) => void)[] = [];

  private context: string;
  private options: LoggerOptions;

  constructor(context: string = 'App', options: Partial<LoggerOptions> = {}) {
    this.context = context;
    this.options = { ...Logger.globalOptions, ...options };
  }

  public static setConfigService(configService: ConfigService): void {
    Logger.configService = configService;
    
    // Charger les options depuis la configuration
    if (configService) {
      const level = configService.get<string>('logging.level', 'info');
      const useConsole = configService.get<boolean>('logging.console', true);
      const useFile = configService.get<boolean>('logging.file', false);
      const filePath = configService.get<string>('logging.filePath', './logs/app.log');
      const maxLogEntries = configService.get<number>('logging.maxEntries', 1000);
      
      Logger.globalOptions = {
        ...Logger.globalOptions,
        level: Logger.getLevelFromString(level),
        useConsole,
        useFile,
        filePath,
      };
      
      Logger.maxLogEntries = maxLogEntries;
      
      // Initialiser le flux de fichier si nécessaire
      if (useFile) {
        Logger.initFileStream(filePath);
      }
    }
  }

  private static getLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'none': return LogLevel.NONE;
      default: return LogLevel.INFO;
    }
  }

  private static initFileStream(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      Logger.fileStream = fs.createWriteStream(filePath, { flags: 'a' });
      Logger.fileStream.on('error', (err) => {
        console.error(`Erreur d'écriture dans le fichier de log: ${err.message}`);
      });
    } catch (error) {
      console.error(`Impossible d'initialiser le fichier de log: ${error}`);
    }
  }

  public static addListener(listener: (entry: LogEntry) => void): void {
    Logger.listeners.push(listener);
  }

  public static removeListener(listener: (entry: LogEntry) => void): void {
    const index = Logger.listeners.indexOf(listener);
    if (index !== -1) {
      Logger.listeners.splice(index, 1);
    }
  }

  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public log(level: LogLevel, message: string, data?: any): void {
    if (level < this.options.level!) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context: this.context,
      message,
      data,
    };
    
    // Ajouter à l'historique
    Logger.logEntries.push(entry);
    if (Logger.logEntries.length > Logger.maxLogEntries) {
      Logger.logEntries.shift();
    }
    
    // Notifier les écouteurs
    Logger.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Erreur dans un écouteur de log:', error);
      }
    });
    
    // Logger dans la console
    if (this.options.useConsole) {
      this.logToConsole(entry);
    }
    
    // Logger dans un fichier
    if (this.options.useFile && Logger.fileStream) {
      this.logToFile(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, context, message, data } = entry;
    
    let formattedMessage = '';
    
    if (this.options.includeTimestamp) {
      formattedMessage += `[${timestamp.toISOString()}] `;
    }
    
    formattedMessage += `[${Logger.getLevelName(level)}] `;
    formattedMessage += `[${context}] `;
    formattedMessage += message;
    
    if (data) {
      formattedMessage += ` ${Logger.formatData(data)}`;
    }
    
    if (this.options.colorize) {
      this.logColorized(level, formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  private logColorized(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug('\x1b[36m%s\x1b[0m', message); // Cyan
        break;
      case LogLevel.INFO:
        console.info('\x1b[32m%s\x1b[0m', message); // Green
        break;
      case LogLevel.WARN:
        console.warn('\x1b[33m%s\x1b[0m', message); // Yellow
        break;
      case LogLevel.ERROR:
        console.error('\x1b[31m%s\x1b[0m', message); // Red
        break;
      default:
        console.log(message);
    }
  }

  private logToFile(entry: LogEntry): void {
    if (!Logger.fileStream) {
      return;
    }
    
    const { timestamp, level, context, message, data } = entry;
    
    let formattedMessage = `[${timestamp.toISOString()}] [${Logger.getLevelName(level)}] [${context}] ${message}`;
    
    if (data) {
      formattedMessage += ` ${Logger.formatData(data)}`;
    }
    
    formattedMessage += '\n';
    
    Logger.fileStream.write(formattedMessage);
  }

  private static getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }

  private static formatData(data: any): string {
    if (data instanceof Error) {
      return data.stack || data.message;
    }
    
    try {
      return JSON.stringify(data);
    } catch (error) {
      return `[Non-serializable: ${typeof data}]`;
    }
  }

  public static getLogEntries(count: number = 100, level?: LogLevel): LogEntry[] {
    let entries = [...Logger.logEntries];
    
    if (level !== undefined) {
      entries = entries.filter(entry => entry.level >= level);
    }
    
    return entries.slice(-count);
  }

  public static shutdown(): void {
    if (Logger.fileStream) {
      Logger.fileStream.end();
      Logger.fileStream = null;
    }
    Logger.listeners = [];
  }
  
  public setLevel(level: LogLevel): void {
    this.options.level = level;
  }
  
  public setContext(context: string): void {
    this.context = context;
  }
}
