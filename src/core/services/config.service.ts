// #codebase: [CONTEXTE] Service de configuration pour l'application Bolt2bolt
// #codebase: [PATTERN:SINGLETON] Fournit une source unique de configuration
// #codebase: [DIRECTIVE] Centraliser toutes les configurations avec support pour multiples environnements

/*
[COPILOT_PROMPTS]
# Service de Configuration - Directives d'Implémentation

## Responsabilité
- Gérer les configurations de l'application de manière centralisée
- Supporter différentes sources de configuration (fichiers, environnement, base de données)
- Fournir des valeurs par défaut et validation de schéma

## Points d'Extension
- Support pour des fournisseurs de configuration personnalisés
- Chargement dynamique et rechargement de configuration
- Chiffrement des valeurs sensibles

## Anti-patterns
- Éviter les configurations en dur dans le code
- Ne pas exposer de données sensibles dans les logs
- Éviter les dépendances circulaires avec d'autres services
[COPILOT_PROMPTS]
*/

import * as fs from 'fs';
import * as path from 'path';
import EventBusService from './event-bus.service';

/**
 * Interface pour les fournisseurs de configuration
 */
export interface ConfigProvider {
  /**
   * Nom du fournisseur
   */
  name: string;
  
  /**
   * Priorité du fournisseur (plus la valeur est élevée, plus la priorité est haute)
   */
  priority: number;
  
  /**
   * Charge la configuration depuis la source
   */
  load(): Promise<Record<string, any>>;
  
  /**
   * Vérifie si le fournisseur peut être rechargé
   */
  canReload(): boolean;
  
  /**
   * Recharge la configuration
   */
  reload?(): Promise<Record<string, any>>;
}

/**
 * Fournisseur de configuration basé sur un fichier JSON
 */
export class FileConfigProvider implements ConfigProvider {
  readonly name: string = 'FileConfig';
  readonly priority: number = 10;
  private filePath: string;
  
  constructor(filePath: string) {
    this.filePath = filePath;
  }
  
  async load(): Promise<Record<string, any>> {
    try {
      const content = await fs.promises.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Impossible de charger la configuration depuis ${this.filePath}:`, error);
      return {};
    }
  }
  
  canReload(): boolean {
    return fs.existsSync(this.filePath);
  }
  
  async reload(): Promise<Record<string, any>> {
    return this.load();
  }
}

/**
 * Fournisseur de configuration basé sur les variables d'environnement
 */
export class EnvConfigProvider implements ConfigProvider {
  readonly name: string = 'EnvConfig';
  readonly priority: number = 20;
  private prefix: string;
  
  constructor(prefix: string = 'BOLT_') {
    this.prefix = prefix;
  }
  
  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    
    // Parcourir toutes les variables d'environnement avec le préfixe
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix)) {
        // Convertir BOLT_DATABASE_HOST en database.host
        const configKey = key
          .substring(this.prefix.length)
          .toLowerCase()
          .split('_')
          .join('.');
        
        // Essayer de convertir les valeurs numériques et booléennes
        config[configKey] = this.parseValue(value || '');
      }
    }
    
    return config;
  }
  
  canReload(): boolean {
    return true;
  }
  
  async reload(): Promise<Record<string, any>> {
    return this.load();
  }
  
  private parseValue(value: string): any {
    // Convertir "true" et "false" en booléens
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Convertir les nombres
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // Essayer de parser comme JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // Retourner comme string si ce n'est pas un JSON valide
      return value;
    }
  }
}

/**
 * Fournisseur de configuration en mémoire pour les tests et valeurs par défaut
 */
export class MemoryConfigProvider implements ConfigProvider {
  readonly name: string = 'MemoryConfig';
  readonly priority: number = 5;
  private config: Record<string, any>;
  
  constructor(config: Record<string, any> = {}) {
    this.config = { ...config };
  }
  
  async load(): Promise<Record<string, any>> {
    return { ...this.config };
  }
  
  canReload(): boolean {
    return true;
  }
  
  async reload(): Promise<Record<string, any>> {
    return this.load();
  }
  
  /**
   * Met à jour la configuration en mémoire
   * @param config Nouvelles valeurs de configuration
   */
  updateConfig(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Service principal de configuration de l'application
 */
export class ConfigService {
  private static instance: ConfigService;
  private providers: ConfigProvider[] = [];
  private config: Record<string, any> = {};
  private eventBus: EventBusService;
  
  /**
   * Constructeur privé pour le pattern Singleton
   */
  private constructor() {
    this.eventBus = EventBusService.getInstance();
  }
  
  /**
   * Obtenir l'instance unique du service
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  /**
   * Enregistre un fournisseur de configuration
   * @param provider Fournisseur de configuration
   */
  public registerProvider(provider: ConfigProvider): void {
    this.providers.push(provider);
    
    // Trier les fournisseurs par priorité (décroissante)
    this.providers.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Initialise la configuration depuis tous les fournisseurs
   */
  public async initialize(): Promise<void> {
    this.config = await this.loadFromProviders();
    this.eventBus.emit('config:loaded', { providers: this.providers.map(p => p.name) });
  }
  
  /**
   * Recharge la configuration depuis tous les fournisseurs qui le supportent
   */
  public async reload(): Promise<void> {
    this.config = await this.loadFromProviders();
    this.eventBus.emit('config:reloaded', { providers: this.providers.map(p => p.name) });
  }
  
  /**
   * Charge la configuration depuis tous les fournisseurs
   */
  private async loadFromProviders(): Promise<Record<string, any>> {
    const mergedConfig: Record<string, any> = {};
    
    // Charger la configuration depuis chaque fournisseur
    for (const provider of this.providers) {
      try {
        const config = await provider.load();
        this.mergeConfigs(mergedConfig, config);
      } catch (error) {
        console.error(`Error loading configuration from ${provider.name}:`, error);
        this.eventBus.emit('config:error', { 
          provider: provider.name, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    return mergedConfig;
  }
  
  /**
   * Fusionne deux objets de configuration
   * @param target Objet cible
   * @param source Objet source
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): void {
    for (const [key, value] of Object.entries(source)) {
      // Si la clé contient un point, la traiter comme un chemin imbriqué
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = target;
        
        // Naviguer/créer l'arbre d'objets jusqu'au dernier niveau
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          current[part] = current[part] || {};
          current = current[part];
        }
        
        // Définir la valeur au dernier niveau
        current[parts[parts.length - 1]] = value;
      } else {
        // Si la valeur est un objet et que la cible a déjà une valeur pour cette clé, fusionner récursivement
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && 
            typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
          this.mergeConfigs(target[key], value);
        } else {
          // Sinon, simplement écraser la valeur
          target[key] = value;
        }
      }
    }
  }
  
  /**
   * Obtient une valeur de configuration
   * @param key Clé de configuration (notation par points supportée)
   * @param defaultValue Valeur par défaut si la clé n'existe pas
   */
  public get<T>(key: string, defaultValue?: T): T {
    // Gérer les clés avec notation par points
    if (key.includes('.')) {
      const parts = key.split('.');
      let current: any = this.config;
      
      // Naviguer dans l'arbre d'objets
      for (const part of parts) {
        if (current === undefined || current === null) {
          return defaultValue as T;
        }
        current = current[part];
      }
      
      return current !== undefined ? current as T : (defaultValue as T);
    }
    
    return this.config[key] !== undefined ? this.config[key] as T : (defaultValue as T);
  }
  
  /**
   * Définit une valeur de configuration
   * @param key Clé de configuration (notation par points supportée)
   * @param value Valeur à définir
   */
  public set<T>(key: string, value: T): void {
    // Gérer les clés avec notation par points
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = this.config;
      
      // Naviguer/créer l'arbre d'objets jusqu'au dernier niveau
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        current[part] = current[part] || {};
        current = current[part];
      }
      
      // Définir la valeur au dernier niveau
      current[parts[parts.length - 1]] = value;
    } else {
      this.config[key] = value;
    }
    
    this.eventBus.emit('config:changed', { key, value });
  }
  
  /**
   * Vérifie si une clé de configuration existe
   * @param key Clé de configuration
   */
  public has(key: string): boolean {
    return this.get(key, undefined) !== undefined;
  }
  
  /**
   * Retourne toute la configuration
   * @param obfuscateSensitive Si vrai, obfusque les valeurs sensibles
   */
  public getAll(obfuscateSensitive: boolean = false): Record<string, any> {
    if (!obfuscateSensitive) {
      return { ...this.config };
    }
    
    // Copier la configuration en obfusquant les valeurs sensibles
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth'];
    const result = { ...this.config };
    
    const obfuscateRecursively = (obj: Record<string, any>) => {
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(k => lowerKey.includes(k)) && typeof value === 'string') {
          obj[key] = '********';
        } else if (typeof value === 'object' && value !== null) {
          obfuscateRecursively(value);
        }
      }
    };
    
    obfuscateRecursively(result);
    return result;
  }

  /**
   * Sauvegarde la configuration actuelle dans un fichier JSON
   * @param filePath Chemin du fichier de sortie
   */
  public saveConfigToFile(filePath: string): void {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
  }
}

export default ConfigService;