// #codebase: [CONTEXTE] Service de configuration de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer les paramètres de configuration de l'application.

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { EventBus } from './eventBus';

export interface ConfigOptions {
  configPath?: string;
  autoSave?: boolean;
  watchChanges?: boolean;
  defaultConfig?: Record<string, any>;
}

export class ConfigService {
  private logger: Logger;
  private eventBus: EventBus;
  private config: Record<string, any> = {};
  private configPath: string;
  private autoSave: boolean;
  private watchChanges: boolean;
  private watcher: fs.FSWatcher | null = null;
  private isInitialized: boolean = false;
  
  constructor(options: ConfigOptions = {}) {
    this.logger = new Logger('ConfigService');
    this.eventBus = EventBus.getInstance();
    
    // Options par défaut
    this.configPath = options.configPath || path.join(process.cwd(), 'config.json');
    this.autoSave = options.autoSave !== undefined ? options.autoSave : true;
    this.watchChanges = options.watchChanges !== undefined ? options.watchChanges : false;
    
    // Charger la configuration par défaut
    if (options.defaultConfig) {
      this.config = { ...options.defaultConfig };
    }
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('ConfigService déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du service de configuration');
    
    try {
      // Charger la configuration depuis le fichier
      this.loadConfig();
      
      // Activer la surveillance des changements si nécessaire
      if (this.watchChanges) {
        this.watchConfigChanges();
      }
      
      this.isInitialized = true;
      this.eventBus.emit('service:initialized', { service: 'ConfigService' });
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation du service de configuration:', error);
      throw error;
    }
  }
  
  private loadConfig(): void {
    try {
      // Vérifier si le fichier de configuration existe
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(fileContent);
        
        // Fusionner avec la configuration existante
        this.config = {
          ...this.config,
          ...loadedConfig
        };
        
        this.logger.info(`Configuration chargée depuis ${this.configPath}`);
      } else {
        this.logger.warn(`Fichier de configuration non trouvé: ${this.configPath}`);
        
        // Créer le fichier avec la configuration par défaut
        if (this.autoSave) {
          this.saveConfig();
          this.logger.info(`Fichier de configuration créé: ${this.configPath}`);
        }
      }
    } catch (error) {
      this.logger.error('Erreur lors du chargement de la configuration:', error);
    }
  }
  
  private saveConfig(): void {
    try {
      // Créer le répertoire si nécessaire
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      this.logger.debug('Configuration sauvegardée');
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde de la configuration: ${error}`);
    }
  }

  private watchConfigChanges(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = fs.watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        this.logger.info('Changements détectés dans la configuration, rechargement...');
        this.loadConfig();
      }
    });

    this.logger.info('Surveillance des changements de configuration activée');
  }

  public get<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value === undefined || value === null) {
        return defaultValue as T;
      }
      value = value[k];
    }

    return (value !== undefined && value !== null) ? value : defaultValue as T;
  }

  public set(key: string, value: any): void {
    const keys = key.split('.');
    let current = this.config;

    // Naviguer jusqu'au parent de la clé finale
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    // Définir la valeur sur la clé finale
    current[keys[keys.length - 1]] = value;
    if (this.autoSave) {
      this.saveConfig();
    }
  }

  public delete(key: string): void {
    const keys = key.split('.');
    let current = this.config;

    // Naviguer jusqu'au parent de la clé finale
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        return;
      }
      current = current[k];
    }

    // Supprimer la clé finale
    delete current[keys[keys.length - 1]];
    if (this.autoSave) {
      this.saveConfig();
    }
  }

  public reloadConfig(): void {
    this.logger.info('Rechargement manuel de la configuration');
    this.loadConfig();
  }

  public backupConfig(): void {
    try {
      const backupPath = `${this.configPath}.backup`;
      fs.copyFileSync(this.configPath, backupPath);
      this.logger.info('Configuration sauvegardée');
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde de la configuration: ${error}`);
    }
  }

  public restoreConfig(): void {
    try {
      const backupPath = `${this.configPath}.backup`;
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, this.configPath);
        this.loadConfig();
        this.logger.info('Configuration restaurée');
      } else {
        this.logger.warn('Aucune sauvegarde de configuration trouvée');
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la restauration de la configuration: ${error}`);
    }
  }

  public shutdown(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.logger.info('Service de configuration arrêté');
  }
}
