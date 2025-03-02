// #codebase: [CONTEXTE] Utilitaire pour détecter et gérer les dépendances circulaires
// #codebase: [PATTERN:UTILITY] Outil pour analyser les imports et déterminer les cycles
// #codebase: [DIRECTIVE] Utiliser pour prévenir les problèmes de compilation et exécution liés aux dépendances circulaires

/*
[COPILOT_PROMPTS]
# Gestionnaire de Dépendances Circulaires - Directives d'Implémentation

## Responsabilité
- Détecter les dépendances circulaires dans un projet TypeScript
- Fournir des solutions pour les résoudre ou les gérer
- Générer des rapports de dépendances

## Points d'Extension
- Support pour différents types de résolution (interfaces, lazy loading)
- Visualisation des graphes de dépendances
- Intégration avec l'analyseur de code

## Anti-patterns
- Éviter les analyses récursives trop profondes qui peuvent conduire à des problèmes de performance
- Ne pas modifier automatiquement le code sans validation
- Éviter de créer des dépendances circulaires dans l'implémentation elle-même
[COPILOT_PROMPTS]
*/

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile } from 'ts-morph';
import LoggerService from '../core/services/logger.service';

/**
 * Interface pour les options de détection
 */
export interface CircularDependencyOptions {
  /** Profondeur maximale pour la recherche de dépendances */
  maxDepth?: number;
  /** Fichiers à exclure de l'analyse */
  exclude?: string[];
  /** Génération de rapport détaillé */
  detailedReport?: boolean;
  /** Message de log personnalisé */
  logMessage?: string;
  /** Logger personnalisé */
  logger?: LoggerService;
}

/**
 * Interface pour une dépendance circulaire détectée
 */
export interface CircularDependency {
  /** Fichiers impliqués dans le cycle */
  files: string[];
  /** Chemin complet du cycle */
  cycle: string[];
  /** Sévérité du problème */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Interface pour un rapport de dépendances
 */
export interface DependencyReport {
  /** Statistiques globales */
  stats: {
    totalFiles: number;
    totalDependencies: number;
    maxDependenciesPerFile: number;
    averageDependenciesPerFile: number;
  };
  /** Dépendances circulaires trouvées */
  circularDependencies: CircularDependency[];
  /** Graphe des dépendances */
  dependencyGraph: Record<string, string[]>;
}

/**
 * Classe pour détecter et gérer les dépendances circulaires
 */
export class CircularDependencyHandler {
  private options: CircularDependencyOptions;
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private visited: Set<string> = new Set();
  private currentPath: string[] = [];
  private circularDependencies: CircularDependency[] = [];
  private logger: LoggerService;

  /**
   * Constructeur
   * @param options Options de configuration
   */
  constructor(options: CircularDependencyOptions = {}) {
    this.options = {
      maxDepth: 10,
      exclude: [],
      detailedReport: false,
      logMessage: 'Dépendance circulaire détectée',
      ...options
    };
    
    this.logger = options.logger || LoggerService.getInstance();
  }

  /**
   * Détecte les dépendances circulaires dans une liste de fichiers
   * @param filePaths Chemins des fichiers à analyser
   */
  public detectCircularDependencies(filePaths: string[]): CircularDependency[] {
    this.logger.debug('Démarrage de la détection des dépendances circulaires', 'CircularDependencyHandler');
    
    // Réinitialiser les états
    this.dependencyGraph.clear();
    this.circularDependencies = [];
    
    // Construire le graphe de dépendances
    this.buildDependencyGraph(filePaths);
    
    // Rechercher des cycles dans le graphe
    for (const filePath of this.dependencyGraph.keys()) {
      this.visited.clear();
      this.currentPath = [];
      this.detectCycle(filePath, 0);
    }
    
    // Log des résultats
    if (this.circularDependencies.length > 0) {
      this.logger.warn(
        `${this.circularDependencies.length} dépendances circulaires détectées`,
        'CircularDependencyHandler'
      );
      
      if (this.options.detailedReport) {
        this.circularDependencies.forEach(dep => {
          this.logger.debug(`Cycle: ${dep.cycle.join(' -> ')}`, 'CircularDependencyHandler');
        });
      }
    } else {
      this.logger.info('Aucune dépendance circulaire détectée', 'CircularDependencyHandler');
    }
    
    return this.circularDependencies;
  }

  /**
   * Construit le graphe de dépendances à partir des fichiers
   * @param filePaths Chemins des fichiers à analyser
   */
  private buildDependencyGraph(filePaths: string[]): void {
    const project = new Project();
    
    // Filtrer les fichiers exclus
    const filteredFilePaths = filePaths.filter(filePath => {
      return !this.options.exclude?.some(pattern => this.matchesPattern(filePath, pattern));
    });
    
    // Ajouter les fichiers au projet
    project.addSourceFilesAtPaths(filteredFilePaths);
    
    const sourceFiles = project.getSourceFiles();
    this.logger.debug(`Analyse des dépendances pour ${sourceFiles.length} fichiers`, 'CircularDependencyHandler');
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const dependencies = this.extractDependencies(sourceFile);
      
      // Filtrer les dépendances pour exclure les fichiers exclus
      const filteredDependencies = dependencies.filter(dep => {
        return !this.options.exclude?.some(pattern => this.matchesPattern(dep, pattern));
      });
      
      this.dependencyGraph.set(filePath, new Set(filteredDependencies));
    }
  }

  /**
   * Extrait les dépendances d'un fichier source
   * @param sourceFile Fichier source
   */
  private extractDependencies(sourceFile: SourceFile): string[] {
    const filePath = sourceFile.getFilePath();
    const directoryPath = path.dirname(filePath);
    const dependencies: Set<string> = new Set();
    
    // Récupérer les déclarations d'import
    const importDeclarations = sourceFile.getImportDeclarations();
    
    for (const importDeclaration of importDeclarations) {
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      
      // Ignorer les modules de node_modules
      if (moduleSpecifier.startsWith('.')) {
        try {
          // Résoudre le chemin absolu du module importé
          let resolvedPath = path.resolve(directoryPath, moduleSpecifier);
          
          // Si le chemin ne pointe pas directement vers un fichier, essayer d'ajouter une extension
          if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
            for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
              const pathWithExt = `${resolvedPath}${ext}`;
              if (fs.existsSync(pathWithExt)) {
                resolvedPath = pathWithExt;
                break;
              }
              
              const indexPath = path.join(resolvedPath, `index${ext}`);
              if (fs.existsSync(indexPath)) {
                resolvedPath = indexPath;
                break;
              }
            }
          }
          
          // Normaliser le chemin
          resolvedPath = path.normalize(resolvedPath);
          
          // Ajouter à la liste des dépendances
          dependencies.add(resolvedPath);
        } catch (error) {
          this.logger.error(`Erreur lors de la résolution du chemin d'import "${moduleSpecifier}" dans "${filePath}"`, 
            error as Error, 'CircularDependencyHandler');
        }
      }
    }
    
    return Array.from(dependencies);
  }

  /**
   * Détecte un cycle dans le graphe de dépendances
   * @param filePath Fichier de départ
   * @param depth Profondeur actuelle dans la recherche
   * @returns Vrai si un cycle est détecté
   */
  private detectCycle(filePath: string, depth: number): boolean {
    // Arrêter si on atteint la profondeur maximale
    if (depth > (this.options.maxDepth || 10)) {
      return false;
    }
    
    // Vérifier si ce fichier fait déjà partie du chemin actuel
    const cycleIndex = this.currentPath.indexOf(filePath);
    if (cycleIndex !== -1) {
      // On a trouvé un cycle
      const cycle = this.currentPath.slice(cycleIndex).concat(filePath);
      
      // Calculer la sévérité en fonction de la taille du cycle
      let severity: 'low' | 'medium' | 'high';
      if (cycle.length <= 3) {
        severity = 'high';
      } else if (cycle.length <= 5) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
      
      // Enregistrer la dépendance circulaire
      this.circularDependencies.push({
        files: [...new Set(cycle)],
        cycle,
        severity
      });
      
      return true;
    }
    
    // Marquer ce fichier comme visité dans le chemin actuel
    this.currentPath.push(filePath);
    this.visited.add(filePath);
    
    // Parcourir les dépendances
    const dependencies = this.dependencyGraph.get(filePath);
    if (dependencies) {
      for (const dependency of dependencies) {
        if (this.detectCycle(dependency, depth + 1)) {
          return true;
        }
      }
    }
    
    // Retirer ce fichier du chemin actuel
    this.currentPath.pop();
    
    return false;
  }

  /**
   * Génère un rapport complet des dépendances
   */
  public generateReport(): DependencyReport {
    let totalDependencies = 0;
    let maxDependenciesPerFile = 0;
    
    // Convertir le graphe de dépendances en objet simple
    const dependencyGraph: Record<string, string[]> = {};
    for (const [filePath, dependencies] of this.dependencyGraph.entries()) {
      const deps = Array.from(dependencies);
      dependencyGraph[filePath] = deps;
      
      totalDependencies += deps.length;
      maxDependenciesPerFile = Math.max(maxDependenciesPerFile, deps.length);
    }
    
    const totalFiles = this.dependencyGraph.size;
    const averageDependenciesPerFile = totalFiles > 0 ? totalDependencies / totalFiles : 0;
    
    return {
      stats: {
        totalFiles,
        totalDependencies,
        maxDependenciesPerFile,
        averageDependenciesPerFile
      },
      circularDependencies: this.circularDependencies,
      dependencyGraph
    };
  }

  /**
   * Suggère des corrections pour les dépendances circulaires
   * @param circularDep Dépendance circulaire à corriger
   */
  public suggestFix(circularDep: CircularDependency): string[] {
    const suggestions: string[] = [];
    
    // Suggérer de briser le cycle en extrayant des interfaces
    suggestions.push(
      `Extraire une interface commune des fichiers ${circularDep.files[0]} et ${circularDep.files[1]}`
    );
    
    // Suggérer l'utilisation de l'import dynamique
    if (circularDep.files.length > 2) {
      suggestions.push(
        `Utiliser l'import dynamique dans ${circularDep.files[0]} pour ${circularDep.files[circularDep.files.length - 1]}`
      );
    }
    
    // Suggérer une refactorisation
    suggestions.push(
      `Refactoriser pour éviter la dépendance mutuelle entre ${circularDep.files.join(', ')}`
    );
    
    return suggestions;
  }

  /**
   * Vérifie si un fichier correspond à un pattern
   * @param filePath Chemin du fichier
   * @param pattern Pattern à vérifier
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convertir le pattern en regex
    const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
    return regex.test(filePath);
  }

  /**
   * Exporte le graphe de dépendances au format DOT pour visualisation
   * @param outputPath Chemin du fichier de sortie
   */
  public exportDependencyGraph(outputPath: string): void {
    let dotContent = 'digraph DependencyGraph {\n';
    dotContent += '  rankdir="LR";\n';
    
    // Ajouter les nœuds
    for (const filePath of this.dependencyGraph.keys()) {
      const fileName = path.basename(filePath);
      dotContent += `  "${fileName}" [label="${fileName}"];\n`;
    }
    
    // Ajouter les arêtes
    for (const [filePath, dependencies] of this.dependencyGraph.entries()) {
      const fileName = path.basename(filePath);
      for (const dependency of dependencies) {
        const depFileName = path.basename(dependency);
        
        // Vérifier si cette arête fait partie d'un cycle
        const isPartOfCycle = this.circularDependencies.some(
          dep => dep.cycle.includes(filePath) && dep.cycle.includes(dependency)
        );
        
        if (isPartOfCycle) {
          dotContent += `  "${fileName}" -> "${depFileName}" [color=red,penwidth=2.0];\n`;
        } else {
          dotContent += `  "${fileName}" -> "${depFileName}";\n`;
        }
      }
    }
    
    dotContent += '}\n';
    
    // Écrire dans le fichier
    fs.writeFileSync(outputPath, dotContent);
    
    this.logger.info(`Graphe de dépendances exporté dans ${outputPath}`, 'CircularDependencyHandler');
  }
}

/**
 * Fonction utilitaire pour vérifier si un AST contient des dépendances circulaires
 * @param ast AST du fichier à analyser
 */
export function handleCircularDependencies(ast: ts.SourceFile): boolean {
  let hasCircularDependency = false;
  
  // Fonction simplifiée pour détecter les signes potentiels de dépendance circulaire
  const detectCircularDependencySign = (node: ts.Node): void => {
    // Détecter les imports
    if (ts.isImportDeclaration(node)) {
      // Analyse des commentaires précédant l'import
      const leadingComments = ts.getLeadingCommentRanges(ast.text, node.pos);
      if (leadingComments) {
        for (const comment of leadingComments) {
          const commentText = ast.text.substring(comment.pos, comment.end);
          // Rechercher des indices de dépendances circulaires dans les commentaires
          if (commentText.includes('circular') || 
              commentText.includes('cycle') || 
              commentText.includes('cyclique') ||
              commentText.includes('circulaire')) {
            hasCircularDependency = true;
            return;
          }
        }
      }
    }
    
    ts.forEachChild(node, detectCircularDependencySign);
  };
  
  detectCircularDependencySign(ast);
  return hasCircularDependency;
}

export default CircularDependencyHandler;
