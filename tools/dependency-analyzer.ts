import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { FileMetadata } from './file-system-scanner';

/*
[COPILOT_PROMPTS]
# Contexte DependencyAnalyzer
- Ce module analyse les dépendances entre fichiers et modules dans un projet TypeScript
- Il construit un graphe de dépendances pour comprendre les relations entre les fichiers
- Il calcule des métriques comme la cohésion, le couplage et la modularité
- Il identifie les dépendances circulaires et autres problèmes structurels

# Points d'extension prioritaires:
- Visualisation du graphe de dépendances
- Détection de modules orphelins ou peu utilisés
- Suggestions de refactoring pour améliorer la modularité
- Analyse de l'impact des modifications (quels fichiers seront affectés?)
- Métriques avancées de qualité architecturale

# Directives pour les mises à jour:
- Documenter les algorithmes d'analyse des dépendances dans /docs/architecture.md
- Ajouter des tests pour vérifier la précision de la détection des dépendances
- Optimiser les performances pour l'analyse de grands projets
- Actualiser la documentation des métriques et leur interprétation

# Intégration avec d'autres modules:
- Fournir des données au rapport-generator pour visualiser les dépendances
- Travailler avec l'analyzer pour identifier les opportunités d'amélioration architecturale
- Supporter l'optimizer pour suggérer des refactorings structurels
[COPILOT_PROMPTS]
*/

export interface DependencyNode {
  id: string;
  path: string;
  relativePath: string;
  incoming: DependencyLink[];
  outgoing: DependencyLink[];
  metrics: {
    fanIn: number;       // Nombre de dépendances entrantes
    fanOut: number;      // Nombre de dépendances sortantes
    instability: number; // fanOut / (fanIn + fanOut) - entre 0 et 1
    centrality: number;  // Importance du fichier dans le graphe
  };
}

export interface DependencyLink {
  source: string;
  target: string;
  type: 'import' | 'extends' | 'implements' | 'uses';
  weight: number;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  links: DependencyLink[];
  metrics: {
    modularity: number;       // Qualité des divisions en modules
    avgPathLength: number;    // Longueur moyenne des chemins entre fichiers
    maxPathLength: number;    // Diamètre du graphe
    cyclicDependencies: {     // Dépendances circulaires
      count: number;
      paths: string[][];
    };
  };
}

export interface AnalysisOptions {
  resolveNodeModules?: boolean;
  detectCircular?: boolean;
  calculateMetrics?: boolean;
  includeTests?: boolean;
}

/**
 * Analyseur de dépendances entre fichiers et modules
 * Intégration avec d'autres modules (rapport-generator, analyzer, optimizer)
 */
export class DependencyAnalyzer {
  private files: FileMetadata[];
  private options: AnalysisOptions;
  private projectRoot: string;
  
  constructor(files: FileMetadata[], projectRoot: string, options: AnalysisOptions = {}) {
    this.files = files;
    this.projectRoot = projectRoot;
    this.options = {
      resolveNodeModules: options.resolveNodeModules || false,
      detectCircular: options.detectCircular !== undefined ? options.detectCircular : true,
      calculateMetrics: options.calculateMetrics !== undefined ? options.calculateMetrics : true,
      includeTests: options.includeTests !== undefined ? options.includeTests : false
    };
  }
  
  /**
   * Analyse les dépendances et construit le graphe
   */
  public analyze(): DependencyGraph {
    console.log('📊 Analyzing project dependencies...');
    
    // Filtrer les fichiers si nécessaire
    const filteredFiles = this.options.includeTests ? 
      this.files : 
      this.files.filter(file => !file.isTest);
    
    // Construire les nœuds initiaux du graphe
    const nodes = new Map<string, DependencyNode>();
    for (const file of filteredFiles) {
      nodes.set(file.path, {
        id: file.path,
        path: file.path,
        relativePath: file.relativePath,
        incoming: [],
        outgoing: [],
        metrics: {
          fanIn: 0,
          fanOut: 0,
          instability: 0,
          centrality: 0
        }
      });
    }
    
    // Construire les liens entre les nœuds
    const links: DependencyLink[] = [];
    for (const file of filteredFiles) {
      const sourceNode = nodes.get(file.path)!;
      
      for (const importPath of file.imports) {
        // Résoudre le chemin d'importation en chemin absolu
        const resolvedPath = this.resolveImportPath(file.path, importPath);
        
        if (resolvedPath && nodes.has(resolvedPath)) {
          const targetNode = nodes.get(resolvedPath)!;
          
          // Créer un lien
          const link: DependencyLink = {
            source: file.path,
            target: resolvedPath,
            type: 'import',
            weight: 1
          };
          
          links.push(link);
          sourceNode.outgoing.push(link);
          targetNode.incoming.push(link);
        }
      }
    }
    
    // Calculer les métriques de base pour chaque nœud
    for (const node of nodes.values()) {
      node.metrics.fanIn = node.incoming.length;
      node.metrics.fanOut = node.outgoing.length;
      node.metrics.instability = node.metrics.fanIn + node.metrics.fanOut === 0 ? 
        0 : 
        node.metrics.fanOut / (node.metrics.fanIn + node.metrics.fanOut);
    }
    
    // Construire le graphe
    const graph: DependencyGraph = {
      nodes,
      links,
      metrics: {
        modularity: 0,
        avgPathLength: 0,
        maxPathLength: 0,
        cyclicDependencies: {
          count: 0,
          paths: []
        }
      }
    };
    
    // Calculer les métriques avancées si demandé
    if (this.options.calculateMetrics) {
      this.calculateAdvancedMetrics(graph);
    }
    
    // Détecter les dépendances circulaires si demandé
    if (this.options.detectCircular) {
      this.detectCircularDependencies(graph);
    }
    
    return graph;
  }
  
  /**
   * Résout un chemin d'importation relatif en chemin absolu
   */
  private resolveImportPath(sourcePath: string, importPath: string): string | null {
    // Ignorer les imports de bibliothèques externes sauf si resolveNodeModules est true
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !this.options.resolveNodeModules) {
      return null;
    }
    
    // Calculer le chemin absolu
    const sourceDir = path.dirname(sourcePath);
    let absolutePath: string;
    
    if (importPath.startsWith('.')) {
      // Chemin relatif
      absolutePath = path.resolve(sourceDir, importPath);
    } else if (importPath.startsWith('/')) {
      // Chemin absolu depuis la racine du projet
      absolutePath = path.join(this.projectRoot, importPath);
    } else {
      // Module externe - non résolu pour l'instant
      return null;
    }
    
    // Trouver le fichier correspondant
    const matchingFile = this.files.find(file => {
      const filePath = file.path;
      return filePath === absolutePath ||
             filePath === absolutePath + '.ts' ||
             filePath === absolutePath + '.tsx' ||
             filePath === absolutePath + '.js' ||
             filePath === absolutePath + '.jsx' ||
             filePath === path.join(absolutePath, 'index.ts') ||
             filePath === path.join(absolutePath, 'index.tsx') ||
             filePath === path.join(absolutePath, 'index.js') ||
             filePath === path.join(absolutePath, 'index.jsx');
    });
    
    return matchingFile ? matchingFile.path : null;
  }
  
  /**
   * Calcule des métriques avancées pour le graphe
   */
  private calculateAdvancedMetrics(graph: DependencyGraph): void {
    // Implémenter des algorithmes d'analyse de graphe pour calculer:
    // - Modularité (détection de communautés)
    // - Longueur moyenne des chemins
    // - Centralité
    
    // Calcul simplifié du diamètre et de la longueur moyenne des chemins
    // Pour une implémentation complète, il faudrait utiliser des algorithmes comme Floyd-Warshall
    let totalPathLength = 0;
    let pathCount = 0;
    let maxPathLength = 0;
    
    // Calcul simplifié pour un petit exemple
    // Une vraie implémentation utiliserait des algorithmes plus sophistiqués
    graph.metrics.modularity = this.calculateSimpleModularity(graph);
    graph.metrics.avgPathLength = 0;
    graph.metrics.maxPathLength = 0;
  }
  
  /**
   * Calcul simplifié de la modularité
   */
  private calculateSimpleModularity(graph: DependencyGraph): number {
    // Version simplifiée - dans une implémentation réelle,
    // on utiliserait l'algorithme de Louvain ou Newman-Girvan
    
    // Pour l'instant, retournons une valeur factice basée sur le rapport
    // entre les liens internes aux modules potentiels et les liens entre modules
    // Heuristique: regrouper les fichiers par répertoire
    
    const moduleMap = new Map<string, string[]>();
    
    // Regrouper les fichiers par répertoire
    for (const [filePath, node] of graph.nodes.entries()) {
      const dir = path.dirname(filePath);
      if (!moduleMap.has(dir)) {
        moduleMap.set(dir, []);
      }
      moduleMap.get(dir)!.push(filePath);
    }
    
    let intraModuleLinks = 0;
    let interModuleLinks = 0;
    
    for (const link of graph.links) {
      const sourceDir = path.dirname(link.source);
      const targetDir = path.dirname(link.target);
      
      if (sourceDir === targetDir) {
        intraModuleLinks++;
      } else {
        interModuleLinks++;
      }
    }
    
    const totalLinks = intraModuleLinks + interModuleLinks;
    return totalLinks === 0 ? 0 : intraModuleLinks / totalLinks;
  }
  
  /**
   * Analyse récursive du graphe pour détecter les cycles
   */
  private detectCircularDependencies(graph: DependencyGraph): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[][] = [];
    
    // Fonction DFS pour détecter les cycles
    const detectCycles = (node: DependencyNode, path: string[] = []): void => {
      const nodeId = node.id;
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      for (const link of node.outgoing) {
        const targetId = link.target;
        
        if (!visited.has(targetId)) {
          detectCycles(graph.nodes.get(targetId)!, [...path]);
        } else if (recursionStack.has(targetId)) {
          // Cycle détecté
          const cycleStart = path.findIndex(id => id === targetId);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart).concat(targetId);
            circularPaths.push(cyclePath);
          }
        }
      }
      
      // Retirer du stack de récursion
      recursionStack.delete(nodeId);
    };
    
    // Parcourir tous les nœuds non visités
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.id)) {
        detectCycles(node);
      }
    }
    
    // Éliminer les doublons et mettre à jour les métriques
    const uniquePaths = this.deduplicateCircularPaths(circularPaths);
    
    graph.metrics.cyclicDependencies = {
      count: uniquePaths.length,
      paths: uniquePaths
    };
  }
  
  /**
   * Déduplique les chemins circulaires détectés
   */
  private deduplicateCircularPaths(paths: string[][]): string[][] {
    // Normaliser chaque chemin pour comparer facilement
    const normalized = paths.map(path => {
      const minIndex = path.indexOf(Math.min(...path.map(p => p.length)));
      return path.slice(minIndex).concat(path.slice(0, minIndex));
    });
    
    // Éliminer les doublons
    const uniquePaths: string[][] = [];
    const seen = new Set<string>();
    
    for (const path of normalized) {
      const key = path.join('->');
      if (!seen.has(key)) {
        seen.add(key);
        uniquePaths.push(path);
      }
    }
    
    return uniquePaths;
  }
  
  /**
   * Génère une représentation JSON du graphe pour la visualisation
   */
  public generateVisualizationData(): any {
    const nodes = Array.from(this.analyze().nodes.values()).map(node => ({
      id: node.id,
      path: node.relativePath,
      fanIn: node.metrics.fanIn,
      fanOut: node.metrics.fanOut,
      instability: node.metrics.instability,
      centrality: node.metrics.centrality
    }));
    
    const links = this.analyze().links.map(link => ({
      source: link.source,
      target: link.target,
      type: link.type,
      weight: link.weight
    }));
    
    return { nodes, links };
  }
}

/*
  Mise à jour de la documentation des métriques :
  - fanIn, fanOut, instability et centrality doivent être interprétés comme suit :
    • fanIn : nombre d’importations entrantes, indicateur d’importance.
    • fanOut : nombre d’importations sortantes, critère de décentralisation.
    • instability : ratio (fanOut/(fanIn+fanOut)) indiquant la vulnérabilité aux changements.
    • centrality : indice de centralité pour détecter les nœuds critiques.
  Référez-vous à /docs/architecture.md pour de plus amples détails.
*/

export default DependencyAnalyzer;
