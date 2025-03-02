import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';

/**
 * Options pour le gestionnaire de dépendances circulaires
 */
export interface CircularDependencyHandlerOptions {
  /** Niveau de verbosité des logs */
  verbose?: boolean;
  /** Profondeur maximale d'analyse des dépendances */
  maxDepth?: number;
}

/**
 * Structure représentant un cycle de dépendances
 * Un tableau de chemins de fichiers formant un cycle
 */
export type DependencyCycle = string[];

/**
 * Résultat de l'analyse des dépendances circulaires
 */
export interface CircularDependencyResult {
  /** Indique si des dépendances circulaires ont été détectées */
  hasCircularDependencies: boolean;
  /** Liste des cycles de dépendances détectés */
  cycles: DependencyCycle[];
  /** Chemins des fichiers affectés par des dépendances circulaires */
  affectedFiles: string[];
  /** Suggestions pour résoudre les dépendances circulaires */
  suggestions: string[];
}

/**
 * Gestionnaire de dépendances circulaires
 * 
 * Cette classe fournit des outils pour détecter et gérer les dépendances
 * circulaires dans un projet TypeScript.
 */
export class CircularDependencyHandler {
  private options: CircularDependencyHandlerOptions;
  
  constructor(options: CircularDependencyHandlerOptions = {}) {
    this.options = {
      verbose: false,
      maxDepth: 20,
      ...options
    };
  }
  
  /**
   * Détecte les dépendances circulaires à partir d'un fichier source
   * 
   * @param sourceFile Fichier source à partir duquel commencer l'analyse
   * @param project Projet contenant tous les fichiers sources
   * @returns Résultat de l'analyse des dépendances circulaires
   */
  public detectCircularDependencies(sourceFile: SourceFile, project: Project): CircularDependencyResult {
    if (this.options.verbose) {
      console.log(`Analyzing circular dependencies for: ${sourceFile.getFilePath()}`);
    }
    
    const result: CircularDependencyResult = {
      hasCircularDependencies: false,
      cycles: [],
      affectedFiles: [],
      suggestions: []
    };
    
    // Carte des dépendances entre fichiers (chemin du fichier -> chemins des dépendances)
    const dependencyMap: Map<string, string[]> = new Map();
    
    // Fichiers visités pour éviter les doublons
    const visitedFiles = new Set<string>();
    
    // Construire la carte des dépendances à partir du fichier source
    this.buildDependencyMap(sourceFile, project, dependencyMap, visitedFiles);
    
    // Détecter les cycles dans la carte des dépendances
    const cycles = this.findCycles(dependencyMap, sourceFile.getFilePath());
    
    if (cycles.length > 0) {
      result.hasCircularDependencies = true;
      result.cycles = cycles;
      
      // Collecter tous les fichiers affectés par les dépendances circulaires
      const affectedFiles = new Set<string>();
      for (const cycle of cycles) {
        for (const filePath of cycle) {
          affectedFiles.add(filePath);
        }
      }
      result.affectedFiles = Array.from(affectedFiles);
      
      // Générer des suggestions pour résoudre les dépendances circulaires
      result.suggestions = this.generateSuggestions(cycles);
    }
    
    return result;
  }
  
  /**
   * Construit récursivement une carte des dépendances pour un fichier source
   * 
   * @param sourceFile Fichier source à analyser
   * @param project Projet contenant tous les fichiers sources
   * @param dependencyMap Carte des dépendances à remplir
   * @param visitedFiles Ensemble des fichiers déjà visités
   * @param depth Profondeur de récursion actuelle
   */
  private buildDependencyMap(
    sourceFile: SourceFile, 
    project: Project, 
    dependencyMap: Map<string, string[]>,
    visitedFiles: Set<string>,
    depth: number = 0
  ): void {
    const filePath = sourceFile.getFilePath();
    
    // Éviter les boucles infinies et respecter la profondeur maximale
    if (visitedFiles.has(filePath) || depth > (this.options.maxDepth || 20)) {
      return;
    }
    
    visitedFiles.add(filePath);
    
    // Obtenir les imports du fichier
    const importDeclarations = sourceFile.getImportDeclarations();
    const dependencies: string[] = [];
    
    // Traiter chaque déclaration d'import
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Ignorer les imports de bibliothèques externes (ne commence pas par '.' ou '..')
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }
      
      // Résoudre le chemin complet du module importé
      const importedFilePath = this.resolveImportPath(filePath, moduleSpecifier);
      
      // Ajouter à la liste des dépendances
      dependencies.push(importedFilePath);
      
      // Récursivement analyser le fichier importé
      try {
        const importedFile = project.getSourceFile(importedFilePath);
        if (importedFile) {
          this.buildDependencyMap(importedFile, project, dependencyMap, visitedFiles, depth + 1);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`Couldn't analyze import ${moduleSpecifier} from ${filePath}: ${error}`);
        }
      }
    }
    
    // Stocker les dépendances du fichier actuel
    dependencyMap.set(filePath, dependencies);
  }
  
  /**
   * Résout le chemin complet d'un module importé
   * 
   * @param currentFilePath Chemin du fichier contenant l'import
   * @param moduleSpecifier Spécificateur du module importé
   * @returns Chemin complet du module importé
   */
  private resolveImportPath(currentFilePath: string, moduleSpecifier: string): string {
    // Chemin du répertoire contenant le fichier actuel
    const dir = path.dirname(currentFilePath);
    
    // Chemin relatif du module
    let relativePath = moduleSpecifier;
    
    // Ajouter l'extension .ts si elle n'est pas présente
    if (!relativePath.endsWith('.ts') && !relativePath.endsWith('.tsx')) {
      relativePath += '.ts';
    }
    
    // Résoudre le chemin complet
    return path.resolve(dir, relativePath);
  }
  
  /**
   * Trouve les cycles dans la carte des dépendances
   * 
   * @param dependencyMap Carte des dépendances entre fichiers
   * @param startFilePath Fichier à partir duquel commencer la recherche
   * @returns Liste des cycles détectés
   */
  private findCycles(dependencyMap: Map<string, string[]>, startFilePath: string): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    
    // Pour chaque fichier dans la carte des dépendances
    for (const [filePath, dependencies] of dependencyMap.entries()) {
      // Rechercher les cycles à partir de ce fichier
      const visited = new Set<string>();
      const pathStack: string[] = [];
      
      this.dfs(filePath, dependencyMap, visited, pathStack, cycles);
    }
    
    return cycles;
  }
  
  /**
   * Parcours en profondeur (DFS) pour trouver les cycles dans la carte des dépendances
   * 
   * @param currentFile Fichier actuel
   * @param dependencyMap Carte des dépendances
   * @param visited Ensemble des fichiers visités dans le parcours actuel
   * @param pathStack Pile des fichiers dans le chemin actuel
   * @param cycles Liste des cycles détectés
   */
  private dfs(
    currentFile: string,
    dependencyMap: Map<string, string[]>,
    visited: Set<string>,
    pathStack: string[],
    cycles: DependencyCycle[]
  ): void {
    // Marquer comme visité et ajouter à la pile du chemin
    visited.add(currentFile);
    pathStack.push(currentFile);
    
    // Obtenir les dépendances du fichier actuel
    const dependencies = dependencyMap.get(currentFile) || [];
    
    // Explorer chaque dépendance
    for (const dependency of dependencies) {
      // Si la dépendance est déjà dans le chemin actuel, c'est un cycle
      const cycleStart = pathStack.indexOf(dependency);
      if (cycleStart !== -1) {
        // Extraire le cycle
        const cycle = pathStack.slice(cycleStart).concat([dependency]);
        
        // Vérifier si ce cycle n'a pas déjà été détecté
        const cycleKey = [...cycle].sort().join('|');
        const isDuplicate = cycles.some(existingCycle => 
          [...existingCycle].sort().join('|') === cycleKey
        );
        
        if (!isDuplicate) {
          cycles.push(cycle);
        }
      }
      // Si la dépendance n'a pas encore été visitée, l'explorer
      else if (!visited.has(dependency) && dependencyMap.has(dependency)) {
        this.dfs(dependency, dependencyMap, visited, pathStack, cycles);
      }
    }
    
    // Retirer le fichier actuel de la pile du chemin
    pathStack.pop();
  }
  
  /**
   * Génère des suggestions pour résoudre les dépendances circulaires
   * 
   * @param cycles Liste des cycles de dépendances
   * @returns Liste de suggestions pour résoudre les dépendances circulaires
   */
  private generateSuggestions(cycles: DependencyCycle[]): string[] {
    const suggestions: string[] = [
      "Utilisez un pattern d'injection de dépendances pour briser les dépendances circulaires",
      "Extrayez les fonctionnalités partagées dans un module commun",
      "Utilisez des interfaces pour définir des contrats entre modules"
    ];
    
    // Ajouter des suggestions spécifiques pour chaque cycle
    for (let i = 0; i < Math.min(cycles.length, 3); i++) {
      const cycle = cycles[i];
      const fileNames = cycle.map(path => this.getFileName(path));
      
      suggestions.push(
        `Pour le cycle ${fileNames.join(' -> ')}, considérez l'extraction d'une interface commune`
      );
    }
    
    return suggestions;
  }
  
  /**
   * Extrait le nom du fichier à partir d'un chemin complet
   * 
   * @param filePath Chemin complet du fichier
   * @returns Nom du fichier
   */
  private getFileName(filePath: string): string {
    return path.basename(filePath);
  }
}
