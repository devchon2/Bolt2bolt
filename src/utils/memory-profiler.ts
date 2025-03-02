// #codebase: [CONTEXTE] Utilitaire de profilage mémoire pour Bolt2bolt
// #codebase: [PATTERN:UTILITY] Fournit des fonctionnalités de surveillance et d'analyse de la consommation mémoire
// #codebase: [DIRECTIVE] Utiliser pour détecter les fuites mémoire et optimiser la consommation de ressources

/*
[COPILOT_PROMPTS]
# Profileur de Mémoire - Directives d'Implémentation

## Responsabilité
- Surveiller la consommation de mémoire de l'application
- Identifier les fuites potentielles et les points de consommation excessive
- Fournir des outils d'analyse pour optimiser l'utilisation des ressources

## Points d'Extension
- Support pour différents environnements d'exécution (Node.js, navigateur)
- Intégration avec des outils de visualisation externes
- Capacité d'export des données de profilage

## Anti-patterns
- Éviter d'introduire une surcharge significative avec le profilage
- Ne pas stocker un historique trop volumineux qui consommerait lui-même beaucoup de mémoire
- Éviter les mesures qui interfèrent avec le garbage collector
[COPILOT_PROMPTS]
*/

import LoggerService from '../core/services/logger.service';
import EventBusService from '../core/services/event-bus.service';
import { PerformanceAnalyzer } from './performance-analyzer';

/**
 * Interface pour les options du profileur de mémoire
 */
export interface MemoryProfilerOptions {
  /** Activer le profilage mémoire */
  enabled?: boolean;
  /** Intervalle en ms entre les mesures */
  sampleInterval?: number;
  /** Seuil (en octets) pour considérer une augmentation comme significative */
  growthThreshold?: number;
  /** Nombre maximum d'échantillons à conserver */
  maxSamples?: number;
  /** Émettre des événements lors des augmentations significatives */
  emitEvents?: boolean;
  /** Journaliser les informations de profilage */
  logging?: boolean;
  /** Suivre les allocations détaillées (peut affecter les performances) */
  trackDetailedAllocations?: boolean;
  /** Tracer automatiquement la pile d'appels pour les allocations importantes */
  autoStackTrace?: boolean;
}

/**
 * Interface pour un échantillon de mémoire
 */
export interface MemorySample {
  /** Horodatage de l'échantillon */
  timestamp: number;
  /** Utilisation totale de la mémoire (heap) en octets */
  totalHeapSize: number;
  /** Mémoire utilisée en octets */
  usedHeapSize: number;
  /** Mémoire externe en octets (hors du tas JS) */
  externalMemory?: number;
  /** Limite de mémoire en octets */
  heapSizeLimit?: number;
  /** Nombre d'objets alloués */
  totalObjects?: number;
  /** Trace de la pile si une allocation importante est détectée */
  stackTrace?: string;
  /** Tag pour identifier le contexte de l'échantillon */
  tag?: string;
  /** Informations sur les objets qui ont causé d'importantes allocations */
  significantAllocations?: Array<{
    type: string;
    size: number;
    count: number;
  }>;
}

/**
 * Interface pour les statistiques de mémoire
 */
export interface MemoryStats {
  /** Moyenne d'utilisation de la mémoire */
  averageUsage: number;
  /** Utilisation maximale de la mémoire */
  peakUsage: number;
  /** Croissance moyenne entre les échantillons */
  averageGrowth: number;
  /** Taux de croissance (octets/seconde) */
  growthRate: number;
  /** Nombre de pics d'allocation détectés */
  allocationSpikes: number;
  /** Estimation des fuites potentielles (octets/minute) */
  potentialLeakRate?: number;
}

/**
 * Interface pour les snapshots de mémoire
 */
export interface MemorySnapshot {
  /** Horodatage du snapshot */
  timestamp: number;
  /** Taille totale du heap en octets */
  totalSize: number;
  /** Détail des objets par type */
  objectStats: Record<string, { count: number; size: number }>;
  /** Différences par rapport au snapshot précédent */
  diff?: {
    totalDiff: number;
    objectDiffs: Record<string, { countDiff: number; sizeDiff: number }>;
  };
}

/**
 * Classe pour profiler la mémoire de l'application
 */
export class MemoryProfiler {
  private static instance: MemoryProfiler;
  private options: MemoryProfilerOptions;
  private samples: MemorySample[] = [];
  private snapshots: MemorySnapshot[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private logger: LoggerService;
  private eventBus: EventBusService;
  private lastGCTime: number = 0;
  private performanceAnalyzer: PerformanceAnalyzer;
  private isNodeEnvironment: boolean;
  private heapStatsSupported: boolean;
  
  /**
   * Constructeur privé pour le pattern Singleton
   */
  private constructor(options: MemoryProfilerOptions = {}) {
    this.options = {
      enabled: true,
      sampleInterval: 10000, // 10 secondes par défaut
      growthThreshold: 5 * 1024 * 1024, // 5 MB par défaut
      maxSamples: 100,
      emitEvents: true,
      logging: true,
      trackDetailedAllocations: false,
      autoStackTrace: false,
      ...options
    };
    
    this.logger = LoggerService.getInstance();
    this.eventBus = EventBusService.getInstance();
    // Initialiser l'analyseur de performance - peut être utilisé dans de futures extensions
    this.performanceAnalyzer = PerformanceAnalyzer.getInstance();
    
    // Détecter l'environnement
    this.isNodeEnvironment = typeof process !== 'undefined' && 
      typeof process.memoryUsage === 'function';
    
    // Vérifier si les statistiques heap détaillées sont supportées
    this.heapStatsSupported = this.isNodeEnvironment && 
      typeof global.gc === 'function' && 
      typeof (global as any).v8 !== 'undefined';
    
    if (this.isNodeEnvironment) {
      if (!this.heapStatsSupported && this.options.trackDetailedAllocations) {
        this.logger.warn(
          'Les statistiques détaillées du heap ne sont pas supportées. ' +
          'Exécutez Node.js avec --expose-gc pour activer cette fonctionnalité.',
          'MemoryProfiler'
        );
      }
    } else {
      this.logger.info(
        'Exécution dans un environnement navigateur. ' + 
        'Certaines fonctionnalités de profilage mémoire seront limitées.',
        'MemoryProfiler'
      );
    }
  }
  
  /**
   * Obtenir l'instance unique du profileur
   */
  public static getInstance(options?: MemoryProfilerOptions): MemoryProfiler {
    if (!MemoryProfiler.instance) {
      MemoryProfiler.instance = new MemoryProfiler(options);
    } else if (options) {
      MemoryProfiler.instance.setOptions(options);
    }
    
    return MemoryProfiler.instance;
  }
  
  /**
   * Met à jour les options de configuration
   */
  public setOptions(options: Partial<MemoryProfilerOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Si l'intervalle change et que le profilage est actif, redémarrer
    if (this.intervalId && 'sampleInterval' in options) {
      this.stop();
      this.start();
    }
  }
  
  /**
   * Démarre le profilage mémoire
   * @param tag Tag optionnel pour identifier cette session de profilage
   */
  public start(tag?: string): void {
    if (!this.options.enabled) {
      return;
    }
    
    if (this.intervalId) {
      this.logger.warn('Le profileur mémoire est déjà démarré', 'MemoryProfiler');
      return;
    }
    
    this.logger.info('Démarrage du profileur mémoire', 'MemoryProfiler');
    
    // Prendre un échantillon initial
    this.takeSample(tag);
    
    // Configurer l'échantillonnage périodique
    this.intervalId = setInterval(() => {
      this.takeSample(tag);
    }, this.options.sampleInterval);
    
    // S'assurer que l'intervalle ne bloque pas la fermeture du processus
    if (this.intervalId && typeof this.intervalId === 'object' && 'unref' in this.intervalId) {
      (this.intervalId as any).unref();
    }
    
    this.eventBus.emit('memory:profiling-started', { tag });
  }
  
  /**
   * Arrête le profilage mémoire
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      
      this.logger.info('Arrêt du profileur mémoire', 'MemoryProfiler');
      this.eventBus.emit('memory:profiling-stopped', {
        sampleCount: this.samples.length,
        stats: this.calculateStats()
      });
    }
  }
  
  /**
   * Prend un échantillon de mémoire ponctuel
   * @param tag Tag optionnel pour identifier cet échantillon
   */
  public takeSample(tag?: string): MemorySample {
    // Encourager le garbage collector si possible
    if (typeof global.gc === 'function' && 
        (!this.lastGCTime || Date.now() - this.lastGCTime > 30000)) {
      global.gc();
      this.lastGCTime = Date.now();
    }
    
    const sample = this.collectMemoryInfo(tag);
    this.processSample(sample);
    
    return sample;
  }
  
  /**
   * Collecte les informations de mémoire actuelles
   */
  private collectMemoryInfo(tag?: string): MemorySample {
    const timestamp = Date.now();
    let memoryInfo: MemorySample = {
      timestamp,
      totalHeapSize: 0,
      usedHeapSize: 0,
      tag
    };
    
    if (this.isNodeEnvironment) {
      try {
        const memUsage = process.memoryUsage();
        memoryInfo.totalHeapSize = memUsage.heapTotal;
        memoryInfo.usedHeapSize = memUsage.heapUsed;
        memoryInfo.externalMemory = memUsage.external;
        
        // Collecter des informations détaillées si disponibles et activées
        if (this.heapStatsSupported && this.options.trackDetailedAllocations) {
          memoryInfo.totalObjects = this.getObjectCount();
          
          // Capturer une trace de la pile pour les allocations importantes
          if (this.options.autoStackTrace && 
              this.samples.length > 0 && 
              (memoryInfo.usedHeapSize - this.samples[this.samples.length - 1].usedHeapSize) > this.options.growthThreshold!) {
            memoryInfo.stackTrace = new Error().stack;
            
            // Collecter des informations sur les allocations significatives
            memoryInfo.significantAllocations = this.getSignificantAllocations();
          }
        }
      } catch (error) {
        this.logger.error('Erreur lors de la collecte des informations mémoire', error as Error, 'MemoryProfiler');
      }
    } else {
      // Environnement navigateur
      // @ts-ignore - performance.memory est non standard mais disponible dans Chrome
      if (typeof performance !== 'undefined' && performance.memory) {
        // @ts-ignore
        const memoryInfo = performance.memory;
        memoryInfo.totalHeapSize = memoryInfo.totalJSHeapSize;
        memoryInfo.usedHeapSize = memoryInfo.usedJSHeapSize;
        memoryInfo.heapSizeLimit = memoryInfo.jsHeapSizeLimit;
      }
    }
    
    return memoryInfo;
  }
  
  /**
   * Traite un échantillon de mémoire
   */
  private processSample(sample: MemorySample): void {
    // Ajouter l'échantillon à l'historique
    this.samples.push(sample);
    
    // Limiter la taille de l'historique
    if (this.samples.length > this.options.maxSamples!) {
      this.samples.shift();
    }
    
    // Vérifier si l'augmentation est significative par rapport à l'échantillon précédent
    if (this.samples.length > 1) {
      const lastSample = this.samples[this.samples.length - 2];
      const growth = sample.usedHeapSize - lastSample.usedHeapSize;
      
      if (growth > this.options.growthThreshold!) {
        if (this.options.emitEvents) {
          this.eventBus.emit('memory:significant-growth', {
            growth,
            current: sample.usedHeapSize,
            previous: lastSample.usedHeapSize,
            timestamp: sample.timestamp,
            tag: sample.tag
          });
        }
        
        if (this.options.logging) {
          this.logger.warn(
            `Croissance mémoire significative détectée: ${this.formatBytes(growth)} (${this.formatBytes(lastSample.usedHeapSize)} → ${this.formatBytes(sample.usedHeapSize)})`,
            'MemoryProfiler'
          );
          
          if (sample.stackTrace) {
            this.logger.debug(`Trace de la pile pour l'allocation: ${sample.stackTrace}`, 'MemoryProfiler');
          }
        }
      }
    }
  }
  
  /**
   * Crée un snapshot détaillé de la mémoire
   * @param label Étiquette pour identifier ce snapshot
   */
  public takeSnapshot(label: string = 'snapshot'): MemorySnapshot | null {
    if (!this.isNodeEnvironment || !this.heapStatsSupported) {
      this.logger.warn(
        'La création de snapshots mémoire nécessite Node.js avec --expose-gc',
        'MemoryProfiler'
      );
      return null;
    }
    
    // Forcer le garbage collector avant de prendre un snapshot
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    try {
      // Note: Cette implémentation est simplifiée
      // Une implémentation réelle utiliserait v8.getHeapSnapshot() ou un module comme heapdump
      const timestamp = Date.now();
      const memUsage = process.memoryUsage();
      
      const snapshot: MemorySnapshot = {
        timestamp,
        totalSize: memUsage.heapUsed,
        objectStats: this.getObjectStatistics()
      };
      
      // Calculer la différence avec le snapshot précédent
      if (this.snapshots.length > 0) {
        const prevSnapshot = this.snapshots[this.snapshots.length - 1];
        snapshot.diff = {
          totalDiff: snapshot.totalSize - prevSnapshot.totalSize,
          objectDiffs: {}
        };
        
        // Calculer les différences par type d'objet
        for (const [type, stats] of Object.entries(snapshot.objectStats)) {
          const prevStats = prevSnapshot.objectStats[type];
          if (prevStats) {
            snapshot.diff.objectDiffs[type] = {
              countDiff: stats.count - prevStats.count,
              sizeDiff: stats.size - prevStats.size
            };
          } else {
            snapshot.diff.objectDiffs[type] = {
              countDiff: stats.count,
              sizeDiff: stats.size
            };
          }
        }
      }
      
      this.snapshots.push(snapshot);
      
      if (this.options.logging) {
        this.logger.info(
          `Snapshot mémoire créé: ${label}, Taille: ${this.formatBytes(snapshot.totalSize)}`,
          'MemoryProfiler'
        );
      }
      
      if (this.options.emitEvents) {
        this.eventBus.emit('memory:snapshot-created', {
          label,
          timestamp,
          totalSize: snapshot.totalSize
        });
      }
      
      return snapshot;
    } catch (error) {
      this.logger.error('Erreur lors de la création du snapshot mémoire', error as Error, 'MemoryProfiler');
      return null;
    }
  }
  
  /**
   * Compare deux snapshots pour identifier les fuites potentielles
   * @param snapshotId1 Index ou étiquette du premier snapshot
   * @param snapshotId2 Index ou étiquette du second snapshot
   */
  public compareSnapshots(snapshotId1: number | string, snapshotId2: number | string): Record<string, any> {
    const snapshot1 = typeof snapshotId1 === 'number' 
      ? this.snapshots[snapshotId1] 
      : this.snapshots.find(s => s.timestamp.toString() === snapshotId1);
    
    const snapshot2 = typeof snapshotId2 === 'number'
      ? this.snapshots[snapshotId2]
      : this.snapshots.find(s => s.timestamp.toString() === snapshotId2);
    
    if (!snapshot1 || !snapshot2) {
      throw new Error('Snapshots introuvables');
    }
    
    const timeDiff = (snapshot2.timestamp - snapshot1.timestamp) / 1000; // en secondes
    const sizeDiff = snapshot2.totalSize - snapshot1.totalSize;
    
    const result: {
      timeBetweenSnapshots: number;
      totalGrowth: number;
      growthRate: number;
      objectGrowth: Record<string, {
        countDiff: number;
        sizeDiff: number;
        growthRate: number;
      }>;
    } = {
      timeBetweenSnapshots: timeDiff,
      totalGrowth: sizeDiff,
      growthRate: sizeDiff / timeDiff,
      objectGrowth: {}
    };
    
    // Comparer les objets par type
    for (const type of Object.keys(snapshot2.objectStats)) {
      const stat2 = snapshot2.objectStats[type];
      const stat1 = snapshot1.objectStats[type] || { count: 0, size: 0 };
      
      result.objectGrowth[type] = {
        countDiff: stat2.count - stat1.count,
        sizeDiff: stat2.size - stat1.size,
        growthRate: (stat2.size - stat1.size) / timeDiff
      };
    }
    
    return result;
  }
  
  /**
   * Calcule des statistiques sur l'utilisation de la mémoire
   */
  public calculateStats(): MemoryStats {
    if (this.samples.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        averageGrowth: 0,
        growthRate: 0,
        allocationSpikes: 0
      };
    }
    
    let totalUsage = 0;
    let peakUsage = 0;
    let totalGrowth = 0;
    let allocationSpikes = 0;
    
    // Analyser les échantillons pour calculer les statistiques
    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i];
      totalUsage += sample.usedHeapSize;
      
      if (sample.usedHeapSize > peakUsage) {
        peakUsage = sample.usedHeapSize;
      }
      
      if (i > 0) {
        const growth = sample.usedHeapSize - this.samples[i - 1].usedHeapSize;
        totalGrowth += growth;
        
        if (growth > this.options.growthThreshold!) {
          allocationSpikes++;
        }
      }
    }
    
    const averageUsage = totalUsage / this.samples.length;
    const averageGrowth = this.samples.length > 1 
      ? totalGrowth / (this.samples.length - 1) 
      : 0;
    
    // Calculer le taux de croissance (octets/seconde)
    let growthRate = 0;
    if (this.samples.length > 1) {
      const firstSample = this.samples[0];
      const lastSample = this.samples[this.samples.length - 1];
      const timeDiff = (lastSample.timestamp - firstSample.timestamp) / 1000; // en secondes
      
      if (timeDiff > 0) {
        growthRate = (lastSample.usedHeapSize - firstSample.usedHeapSize) / timeDiff;
      }
    }
    
    // Estimer le taux de fuite potentiel
    let potentialLeakRate;
    if (this.samples.length > 10 && growthRate > 0) {
      // Si la croissance est constante sur une longue période, c'est un indicateur de fuite
      potentialLeakRate = growthRate * 60; // octets/minute
    }
    
    return {
      averageUsage,
      peakUsage,
      averageGrowth,
      growthRate,
      allocationSpikes,
      potentialLeakRate
    };
  }
  
  /**
   * Génère un rapport complet sur l'utilisation de la mémoire
   */
  public generateReport(): Record<string, any> {
    const stats = this.calculateStats();
    const currentSample = this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
    
    const report = {
      timestamp: Date.now(),
      currentUsage: currentSample ? currentSample.usedHeapSize : 0,
      stats,
      samples: this.samples.length,
      isActive: this.intervalId !== null,
      environment: this.isNodeEnvironment ? 'Node.js' : 'Browser',
      detailedStatsSupported: this.heapStatsSupported,
      recentTrend: this.detectTrend(),
      potentialIssues: this.detectPotentialIssues()
    };
    
    // Journaliser le rapport si la journalisation est activée
    if (this.options.logging) {
      this.logger.info(
        `Rapport mémoire généré: Utilisation actuelle ${this.formatBytes(report.currentUsage)}, ` +
        `Pic ${this.formatBytes(stats.peakUsage)}, ` + 
        `Taux de croissance ${stats.growthRate > 0 ? '+' : ''}${this.formatBytes(stats.growthRate)}/s`,
        'MemoryProfiler'
      );
      
      if (report.potentialIssues.length > 0) {
        this.logger.warn(
          `Problèmes potentiels détectés: ${report.potentialIssues.join(', ')}`,
          'MemoryProfiler'
        );
      }
    }
    
    return report;
  }
  
  /**
   * Génère des suggestions pour optimiser l'utilisation de la mémoire
   */
  public generateOptimizationSuggestions(): string[] {
    const stats = this.calculateStats();
    const suggestions: string[] = [];
    
    // Analyser les tendances et proposer des suggestions
    if (stats.growthRate > 1024 * 10) { // Plus de 10KB/s
      suggestions.push('Croissance mémoire élevée détectée. Vérifier les allocations fréquentes et les caches.');
    }
    
    if (stats.allocationSpikes > 3 && this.samples.length > 10) {
      suggestions.push('Pics d\'allocation fréquents détectés. Vérifier les opérations par lots ou traitements périodiques.');
    }
    
    if (stats.potentialLeakRate && stats.potentialLeakRate > 1024 * 1024) { // Plus de 1MB/minute
      suggestions.push('Fuite mémoire potentielle détectée. Vérifier les écouteurs d\'événements non supprimés et les références circulaires.');
    }
    
    if (stats.peakUsage > 500 * 1024 * 1024) { // Plus de 500MB
      suggestions.push('Utilisation maximale de mémoire élevée. Envisager l\'implémentation de pagination ou de chargement différé.');
    }
    
    // Suggestions générales
    suggestions.push('Implémenter des techniques de mise en cache avec TTL pour limiter la croissance mémoire.');
    suggestions.push('Utiliser des structures de données efficaces comme Map et Set plutôt que des objets pour les collections.');
    suggestions.push('Éviter les closures qui capturent de grandes variables ou des références DOM.');
    
    return suggestions;
  }
  
  /**
   * Efface les données de profiling
   */
  public clearData(): void {
    this.samples = [];
    this.snapshots = [];
    this.logger.info('Données de profilage mémoire effacées', 'MemoryProfiler');
  }
  
  /**
   * Récupère l'historique des échantillons
   * @param limit Nombre maximum d'échantillons à récupérer
   */
  public getSamples(limit?: number): MemorySample[] {
    if (limit && limit < this.samples.length) {
      return this.samples.slice(this.samples.length - limit);
    }
    return [...this.samples];
  }
  
  /**
   * Récupère les snapshots
   */
  public getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }
  
  /**
   * Détecte la tendance récente de l'utilisation mémoire
   */
  private detectTrend(): 'stable' | 'growing' | 'shrinking' | 'fluctuating' | 'unknown' {
    if (this.samples.length < 5) {
      return 'unknown';
    }
    
    const recentSamples = this.samples.slice(-5);
    let growingCount = 0;
    let shrinkingCount = 0;
    
    for (let i = 1; i < recentSamples.length; i++) {
      const diff = recentSamples[i].usedHeapSize - recentSamples[i - 1].usedHeapSize;
      if (diff > 1024) { // Plus de 1KB
        growingCount++;
      } else if (diff < -1024) { // Moins de -1KB
        shrinkingCount++;
      }
    }
    
    if (growingCount >= 3) {
      return 'growing';
    } else if (shrinkingCount >= 3) {
      return 'shrinking';
    } else if (growingCount + shrinkingCount >= 3) {
      return 'fluctuating';
    } else {
      return 'stable';
    }
  }
  
  /**
   * Détecte les problèmes potentiels d'utilisation mémoire
   */
  private detectPotentialIssues(): string[] {
    const issues: string[] = [];
    const stats = this.calculateStats();
    
    if (stats.growthRate > 1024 * 100) { // Plus de 100KB/s
      issues.push('Croissance mémoire anormalement élevée');
    }
    
    if (stats.potentialLeakRate && stats.potentialLeakRate > 1024 * 1024) { // Plus de 1MB/minute
      issues.push('Fuite mémoire potentielle');
    }
    
    if (stats.allocationSpikes > 5 && this.samples.length > 15) {
      issues.push('Motif d\'allocation irrégulier');
    }
    
    return issues;
  }
  
  /**
   * Retourne le compte d'objets dans le heap
   */
  private getObjectCount(): number {
    // Cette fonction est une simplification
    // Une implémentation réelle utiliserait v8.getHeapStatistics()
    if (this.isNodeEnvironment && typeof (global as any).v8 !== 'undefined') {
      try {
        // @ts-ignore
        const stats = (global as any).v8.getHeapStatistics();
        return stats.number_of_native_contexts + stats.number_of_detached_contexts;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }
  
  /**
   * Récupère les statistiques d'objets par type
   */
  private getObjectStatistics(): Record<string, { count: number; size: number }> {
    // Cette fonction est une simplification
    // Une implémentation réelle nécessiterait des outils comme v8-profiler ou heapdump
    return {
      'Object': { count: 1000, size: 100000 },
      'Array': { count: 500, size: 50000 },
      'String': { count: 5000, size: 250000 },
      'Function': { count: 200, size: 20000 },
    };
  }
  
  /**
   * Obtient les allocations significatives
   */
  private getSignificantAllocations(): Array<{ type: string; size: number; count: number }> {
    // Cette fonction est une simplification
    // Une implémentation réelle nécessiterait une API de profilage mémoire plus avancée
    return [
      { type: 'Object', size: 10000, count: 100 },
      { type: 'Array', size: 5000, count: 50 },
      { type: 'String', size: 2500, count: 250 },
    ];
  }
  
  /**
   * Formate une taille en octets en chaîne lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
  }
  
  /**
   * Enregistre une zone de code pour surveiller son utilisation mémoire
   * @param label Étiquette identifiant la zone de code
   */
  public markMemoryCheckpoint(label: string): void {
    const sample = this.takeSample(label);
    
    if (this.options.logging) {
      this.logger.info(
        `Checkpoint mémoire "${label}": ${this.formatBytes(sample.usedHeapSize)}`,
        'MemoryProfiler'
      );
    }
    
    this.eventBus.emit('memory:checkpoint', {
      label,
      timestamp: sample.timestamp,
      usedHeapSize: sample.usedHeapSize,
      totalHeapSize: sample.totalHeapSize
    });
  }
  
  /**
   * Mesure la consommation mémoire d'une fonction
   * @param fn Fonction à mesurer
   * @param label Étiquette pour identifier cette mesure
   * @returns Résultat de la fonction et informations sur l'utilisation mémoire
   */
  public async measureMemoryUsage<T>(
    fn: () => T | Promise<T>,
    label: string = 'anonymous-function'
  ): Promise<{ result: T; memoryUsage: { before: number; after: number; diff: number } }> {
    // Encourager le garbage collector si disponible
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    // Prendre une mesure avant
    const beforeSample = this.takeSample(`${label}-before`);
    
    try {
      // Exécuter la fonction
      const result = await fn();
      
      // Encourager le garbage collector si disponible
      if (typeof global.gc === 'function') {
        global.gc();
      }
      
      // Prendre une mesure après
      const afterSample = this.takeSample(`${label}-after`);
      
      const memoryUsage = {
        before: beforeSample.usedHeapSize,
        after: afterSample.usedHeapSize,
        diff: afterSample.usedHeapSize - beforeSample.usedHeapSize
      };
      
      if (this.options.logging) {
        this.logger.info(
          `Mesure mémoire "${label}": ${this.formatBytes(memoryUsage.diff)} ` +
          `(${this.formatBytes(memoryUsage.before)} → ${this.formatBytes(memoryUsage.after)})`,
          'MemoryProfiler'
        );
      }
      
      if (this.options.emitEvents) {
        this.eventBus.emit('memory:function-measured', {
          label,
          memoryUsage
        });
      }
      
      return { result, memoryUsage };
    } catch (error) {
      // Prendre une mesure en cas d'erreur également
      const errorSample = this.takeSample(`${label}-error`);
      
      this.logger.error(
        `Erreur pendant la mesure mémoire "${label}"`,
        error as Error,
        'MemoryProfiler'
      );
      
      throw error;
    }
  }
  
  /**
   * Crée un décorateur pour mesurer l'utilisation mémoire d'une méthode
   * @param label Étiquette ou fonction pour générer une étiquette
   */
  public createMemoryProfileDecorator(
    label?: string | ((target: any, propertyKey: string) => string)
  ): MethodDecorator {
    return (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const profiler = this;
      
      descriptor.value = async function(...args: any[]) {
        const methodLabel = typeof label === 'function'
          ? label(target, propertyKey.toString())
          : label || `${target.constructor.name}.${propertyKey.toString()}`;
        
        return profiler.measureMemoryUsage(
          () => originalMethod.apply(this, args),
          methodLabel
        ).then(result => result.result);
      };
      
      return descriptor;
    };
  }
  
  /**
   * Exporte les données de profilage au format JSON
   * @param path Chemin du fichier où exporter les données
   */
  public exportData(path: string): void {
    if (!this.isNodeEnvironment) {
      throw new Error('L\'export de données n\'est disponible que dans l\'environnement Node.js');
    }
    
    const fs = require('fs');
    
    const data = {
      timestamp: Date.now(),
      samples: this.samples,
      snapshots: this.snapshots,
      stats: this.calculateStats(),
      options: this.options,
      environment: {
        isNodeEnvironment: this.isNodeEnvironment,
        heapStatsSupported: this.heapStatsSupported,
        nodeVersion: process.version
      }
    };
    
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    
    if (this.options.logging) {
      this.logger.info(`Données de profilage exportées vers ${path}`, 'MemoryProfiler');
    }
  }
  
  /**
   * Génère une visualisation des données de profilage mémoire
   * @param format Format de visualisation ('text' | 'html')
   */
  public visualize(format: 'text' | 'html' = 'text'): string {
    if (this.samples.length === 0) {
      return format === 'text'
        ? 'Aucune donnée de profilage disponible.'
        : '<div>Aucune donnée de profilage disponible.</div>';
    }
    
    const stats = this.calculateStats();
    
    if (format === 'text') {
      let output = '=== RAPPORT DE PROFILAGE MÉMOIRE ===\n\n';
      
      output += `Échantillons: ${this.samples.length}\n`;
      output += `Utilisation moyenne: ${this.formatBytes(stats.averageUsage)}\n`;
      output += `Utilisation maximale: ${this.formatBytes(stats.peakUsage)}\n`;
      output += `Taux de croissance: ${this.formatBytes(stats.growthRate)}/s\n`;
      output += `Pics d'allocation: ${stats.allocationSpikes}\n`;
      
      if (stats.potentialLeakRate) {
        output += `Taux de fuite potentiel: ${this.formatBytes(stats.potentialLeakRate)}/minute\n`;
      }
      
      output += '\n=== TENDANCE RÉCENTE ===\n\n';
      output += `Tendance: ${this.detectTrend()}\n`;
      
      const issues = this.detectPotentialIssues();
      if (issues.length > 0) {
        output += '\n=== PROBLÈMES POTENTIELS ===\n\n';
        issues.forEach(issue => {
          output += `- ${issue}\n`;
        });
      }
      
      const suggestions = this.generateOptimizationSuggestions();
      if (suggestions.length > 0) {
        output += '\n=== SUGGESTIONS D\'OPTIMISATION ===\n\n';
        suggestions.forEach(suggestion => {
          output += `- ${suggestion}\n`;
        });
      }
      
      return output;
    } else {
      // HTML output
      let html = '<div class="memory-profiler-report" style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">';
      html += '<h2>Rapport de Profilage Mémoire</h2>';
      
      // Statistiques générales
      html += '<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px;">';
      html += `<p><strong>Échantillons:</strong> ${this.samples.length}</p>`;
      html += `<p><strong>Utilisation moyenne:</strong> ${this.formatBytes(stats.averageUsage)}</p>`;
      html += `<p><strong>Utilisation maximale:</strong> ${this.formatBytes(stats.peakUsage)}</p>`;
      html += `<p><strong>Taux de croissance:</strong> ${this.formatBytes(stats.growthRate)}/s</p>`;
      html += `<p><strong>Pics d'allocation:</strong> ${stats.allocationSpikes}</p>`;
      
      if (stats.potentialLeakRate) {
        html += `<p><strong>Taux de fuite potentiel:</strong> ${this.formatBytes(stats.potentialLeakRate)}/minute</p>`;
      }
      
      html += '</div>';
      
      // Tendance
      const trend = this.detectTrend();
      let trendColor = '';
      switch (trend) {
        case 'growing':
          trendColor = '#ff7f7f';
          break;
        case 'shrinking':
          trendColor = '#7fff7f';
          break;
        case 'fluctuating':
          trendColor = '#ffff7f';
          break;
        case 'stable':
          trendColor = '#7f7fff';
          break;
        default:
          trendColor = '#cccccc';
      }
      
      html += `<div style="background-color: ${trendColor}; padding: 15px; border-radius: 5px; margin-bottom: 15px;">`;
      html += `<h3>Tendance Récente: ${trend}</h3>`;
      html += '</div>';
      
      // Problèmes potentiels
      const issues = this.detectPotentialIssues();
      if (issues.length > 0) {
        html += '<div style="background-color: #ffeeee; padding: 15px; border-radius: 5px; margin-bottom: 15px;">';
        html += '<h3>Problèmes Potentiels</h3>';
        html += '<ul>';
        issues.forEach(issue => {
          html += `<li>${issue}</li>`;
        });
        html += '</ul>';
        html += '</div>';
      }
      
      // Suggestions
      const suggestions = this.generateOptimizationSuggestions();
      if (suggestions.length > 0) {
        html += '<div style="background-color: #eeffee; padding: 15px; border-radius: 5px; margin-bottom: 15px;">';
        html += '<h3>Suggestions d\'Optimisation</h3>';
        html += '<ul>';
        suggestions.forEach(suggestion => {
          html += `<li>${suggestion}</li>`;
        });
        html += '</ul>';
        html += '</div>';
      }
      
      html += '</div>';
      return html;
    }
  }

  /**
   * Journalise l'utilisation de la mémoire actuelle
   */
  public logMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    console.log('Memory Usage:', memoryUsage);
  }
}

export function profileMemory(label?: string) {
  return MemoryProfiler.getInstance().createMemoryProfileDecorator(label);
}

export default MemoryProfiler;