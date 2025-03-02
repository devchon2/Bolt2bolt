// #codebase: [CONTEXTE] Utilitaire d'analyse des performances pour Bolt2bolt
// #codebase: [PATTERN:UTILITY] Fournit des fonctionnalités de mesure et d'analyse de performance
// #codebase: [DIRECTIVE] Utiliser pour identifier et optimiser les goulots d'étranglement

/*
[COPILOT_PROMPTS]
# Analyseur de Performance - Directives d'Implémentation

## Responsabilité
- Mesurer le temps d'exécution des opérations critiques
- Fournir des statistiques sur l'utilisation des ressources
- Aider à identifier les goulots d'étranglement dans l'application

## Points d'Extension
- Support pour différentes métriques (temps CPU, mémoire)
- Intégration avec des outils de monitoring externes
- Capacité d'export des métriques dans différents formats

## Anti-patterns
- Éviter d'introduire une surcharge significative avec les mesures
- Ne pas laisser le code de mesure de performance en production sans contrôle
- Éviter les mesures qui altèrent le comportement normal de l'application
[COPILOT_PROMPTS]
*/

import EventBusService from '../core/services/event-bus.service';

/**
 * Interface pour les options de l'analyseur de performance
 */
export interface PerformanceOptions {
  /** Activer l'analyse de performance */
  enabled?: boolean;
  /** Niveau de détail des logs (1-5) */
  verbosity?: number;
  /** Seuil en ms au-delà duquel une opération est considérée comme lente */
  slowThreshold?: number;
  /** Émettre des événements pour les opérations lentes */
  emitEvents?: boolean;
  /** Stocker l'historique des mesures */
  keepHistory?: boolean;
  /** Nombre maximal de mesures à conserver dans l'historique */
  historySize?: number;
}

/**
 * Interface pour les métriques de performance
 */
export interface PerformanceMetric {
  /** Nom de l'opération mesurée */
  operation: string;
  /** Temps d'exécution en millisecondes */
  duration: number;
  /** Horodatage de début */
  startTime: number;
  /** Horodatage de fin */
  endTime: number;
  /** Tags associés à la mesure */
  tags: Record<string, string>;
  /** Utilisation mémoire avant l'opération (si activé) */
  memoryBefore?: number;
  /** Utilisation mémoire après l'opération (si activé) */
  memoryAfter?: number;
  /** Différence d'utilisation mémoire */
  memoryDelta?: number;
}

/**
 * Interface pour les statistiques de performance
 */
export interface PerformanceStats {
  /** Nom de l'opération */
  operation: string;
  /** Nombre d'appels */
  calls: number;
  /** Temps total d'exécution */
  totalTime: number;
  /** Temps moyen d'exécution */
  averageTime: number;
  /** Temps minimum d'exécution */
  minTime: number;
  /** Temps maximum d'exécution */
  maxTime: number;
  /** Écart type */
  stdDev: number;
  /** Percentile 95 */
  p95: number;
  /** Percentile 99 */
  p99: number;
}

/**
 * Classe pour analyser les performances des opérations
 */
export class PerformanceAnalyzer {
  private static instance: PerformanceAnalyzer;
  private options: PerformanceOptions;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMarkers: Map<string, { startTime: number; memoryBefore?: number; tags: Record<string, string> }> = new Map();
  private eventBus: EventBusService;
  
  /**
   * Constructeur privé pour pattern Singleton
   */
  private constructor(options: PerformanceOptions = {}) {
    this.options = {
      enabled: true,
      verbosity: 3,
      slowThreshold: 100,
      emitEvents: true,
      keepHistory: true,
      historySize: 1000,
      ...options
    };
    
    this.eventBus = EventBusService.getInstance();
  }
  
  /**
   * Obtenir l'instance unique de l'analyseur
   */
  public static getInstance(options?: PerformanceOptions): PerformanceAnalyzer {
    if (!PerformanceAnalyzer.instance) {
      PerformanceAnalyzer.instance = new PerformanceAnalyzer(options);
    } else if (options) {
      PerformanceAnalyzer.instance.setOptions(options);
    }
    
    return PerformanceAnalyzer.instance;
  }
  
  /**
   * Met à jour les options de configuration
   */
  public setOptions(options: Partial<PerformanceOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Démarre la mesure d'une opération
   * @param operation Nom de l'opération à mesurer
   * @param tags Tags associés à l'opération
   * @returns Identifiant unique de la mesure
   */
  public start(operation: string, tags: Record<string, string> = {}): string {
    if (!this.options.enabled) return operation;
    
    const markerId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const markerData = { startTime, tags };
    
    // Mesurer l'utilisation mémoire si disponible
    if (global.gc && typeof process !== 'undefined' && process.memoryUsage) {
      global.gc(); // Force garbage collection
      markerData['memoryBefore'] = process.memoryUsage().heapUsed;
    }
    
    this.activeMarkers.set(markerId, markerData);
    
    return markerId;
  }
  
  /**
   * Termine la mesure d'une opération et enregistre les métriques
   * @param markerId Identifiant de la mesure
   * @returns Métrique de performance ou undefined si la mesure n'est pas trouvée
   */
  public end(markerId: string): PerformanceMetric | undefined {
    if (!this.options.enabled) return undefined;
    
    const marker = this.activeMarkers.get(markerId);
    if (!marker) {
      console.warn(`Performance marker not found: ${markerId}`);
      return undefined;
    }
    
    const endTime = performance.now();
    const duration = endTime - marker.startTime;
    const operationName = markerId.split('-')[0];
    
    let memoryAfter: number | undefined;
    let memoryDelta: number | undefined;
    
    // Mesurer l'utilisation mémoire si disponible
    if (global.gc && typeof process !== 'undefined' && process.memoryUsage && marker.memoryBefore) {
      global.gc(); // Force garbage collection
      memoryAfter = process.memoryUsage().heapUsed;
      memoryDelta = memoryAfter - marker.memoryBefore;
    }
    
    const metric: PerformanceMetric = {
      operation: operationName,
      duration,
      startTime: marker.startTime,
      endTime,
      tags: marker.tags,
      memoryBefore: marker.memoryBefore,
      memoryAfter,
      memoryDelta
    };
    
    // Stocker la métrique si l'historique est activé
    if (this.options.keepHistory) {
      if (!this.metrics.has(operationName)) {
        this.metrics.set(operationName, []);
      }
      
      const operationMetrics = this.metrics.get(operationName)!;
      operationMetrics.push(metric);
      
      // Limiter la taille de l'historique
      if (operationMetrics.length > (this.options.historySize || 1000)) {
        operationMetrics.shift();
      }
    }
    
    // Émettre un événement si l'opération est lente
    if (this.options.emitEvents && duration > (this.options.slowThreshold || 100)) {
      this.eventBus.emit('performance:slow-operation', {
        operation: operationName,
        duration,
        threshold: this.options.slowThreshold,
        tags: marker.tags
      });
    }
    
    // Supprimer le marqueur actif
    this.activeMarkers.delete(markerId);
    
    // Logger la métrique selon le niveau de verbosité
    this.logMetric(metric);
    
    return metric;
  }
  
  /**
   * Mesure le temps d'exécution d'une fonction
   * @param operation Nom de l'opération
   * @param fn Fonction à mesurer
   * @param tags Tags associés à l'opération
   * @returns Résultat de la fonction et métrique de performance
   */
  public async measure<T>(
    operation: string, 
    fn: () => T | Promise<T>, 
    tags: Record<string, string> = {}
  ): Promise<{ result: T; metric: PerformanceMetric | undefined }> {
    const markerId = this.start(operation, tags);
    
    try {
      const result = await fn();
      const metric = this.end(markerId);
      return { result, metric };
    } catch (error) {
      this.end(markerId);
      throw error;
    }
  }
  
  /**
   * Crée un décorateur de méthode pour mesurer les performances
   * @param operation Nom de l'opération ou fonction pour générer un nom
   * @param tags Tags associés à l'opération
   */
  public createDecorator(
    operation?: string | ((target: any, propertyKey: string) => string),
    tags: Record<string, string> = {}
  ): MethodDecorator {
    return (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const analyzer = this;
      
      descriptor.value = async function(...args: any[]) {
        const operationName = typeof operation === 'function'
          ? operation(target, propertyKey.toString())
          : operation || `${target.constructor.name}.${propertyKey.toString()}`;
        
        // Ajouter des tags dynamiques si nécessaire
        const mergedTags = {
          ...tags,
          class: target.constructor.name,
          method: propertyKey.toString()
        };
        
        const { result } = await analyzer.measure(operationName, () => originalMethod.apply(this, args), mergedTags);
        return result;
      };
      
      return descriptor;
    };
  }
  
  /**
   * Obtient toutes les métriques pour une opération donnée
   * @param operation Nom de l'opération
   * @returns Liste des métriques ou tableau vide si non trouvée
   */
  public getMetrics(operation: string): PerformanceMetric[] {
    return this.metrics.get(operation) || [];
  }
  
  /**
   * Obtient toutes les opérations mesurées
   * @returns Liste des noms d'opérations
   */
  public getOperations(): string[] {
    return Array.from(this.metrics.keys());
  }
  
  /**
   * Calcule des statistiques pour une opération donnée
   * @param operation Nom de l'opération
   * @returns Statistiques de performance ou undefined si non trouvée
   */
  public getStats(operation: string): PerformanceStats | undefined {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return undefined;
    }
    
    const durations = metrics.map(m => m.duration);
    const calls = durations.length;
    const totalTime = durations.reduce((sum, duration) => sum + duration, 0);
    const averageTime = totalTime / calls;
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);
    
    // Calcul de l'écart type
    const squaredDiffs = durations.map(d => Math.pow(d - averageTime, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / calls;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calcul des percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(calls * 0.95);
    const p99Index = Math.floor(calls * 0.99);
    const p95 = sortedDurations[p95Index];
    const p99 = sortedDurations[p99Index];
    
    return {
      operation,
      calls,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      stdDev,
      p95,
      p99
    };
  }
  
  /**
   * Génère un rapport de performance complet
   */
  public generateReport(): Record<string, PerformanceStats> {
    const report: Record<string, PerformanceStats> = {};
    
    this.getOperations().forEach(operation => {
      const stats = this.getStats(operation);
      if (stats) {
        report[operation] = stats;
      }
    });
    
    return report;
  }
  
  /**
   * Efface l'historique des métriques
   * @param operation Nom de l'opération à effacer (toutes si non spécifié)
   */
  public clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }
  
  /**
   * Journalise une métrique selon le niveau de verbosité
   * @param metric Métrique à journaliser
   */
  private logMetric(metric: PerformanceMetric): void {
    const { operation, duration, tags } = metric;
    const isSlowOperation = duration > (this.options.slowThreshold || 100);
    
    // Niveau 1: Seulement les opérations lentes
    if (this.options.verbosity === 1 && !isSlowOperation) {
      return;
    }
    
    // Formatage des tags
    const tagsStr = Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    
    // Message de log selon le niveau de verbosité
    let logMessage = '';
    
    switch (this.options.verbosity) {
      case 1:
      case 2:
        logMessage = `[PERF] ${operation}: ${duration.toFixed(2)}ms`;
        break;
      case 3:
        logMessage = `[PERF] ${operation}: ${duration.toFixed(2)}ms${tagsStr ? ' [' + tagsStr + ']' : ''}`;
        break;
      case 4:
      case 5:
        const memoryInfo = metric.memoryDelta 
          ? ` | Memory: +${(metric.memoryDelta / 1024 / 1024).toFixed(2)}MB` 
          : '';
        logMessage = `[PERF] ${operation}: ${duration.toFixed(2)}ms${memoryInfo}${tagsStr ? ' [' + tagsStr + ']' : ''}`;
        break;
    }
    
    // Logger avec le niveau approprié
    if (isSlowOperation) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Exporte les métriques de performance au format JSON
   * @returns Chaîne JSON des métriques de performance
   */
  public exportMetricsToJson(): string {
    return JSON.stringify(Array.from(this.metrics.entries()), null, 2);
  }
}

/**
 * Décorateur pour mesurer les performances d'une méthode
 * @param operation Nom optionnel de l'opération
 * @param tags Tags optionnels pour l'opération
 */
export function measure(operation?: string, tags: Record<string, string> = {}) {
  return PerformanceAnalyzer.getInstance().createDecorator(operation, tags);
}

export default PerformanceAnalyzer;
