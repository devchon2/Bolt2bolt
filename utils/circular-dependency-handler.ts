// #codebase: [CONTEXTE] Utilitaire pour la détection et gestion des dépendances circulaires
// #codebase: [PATTERN:UTILITY] Fournit des fonctionnalités de détection et résolution de dépendances circulaires
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Tests et amélioration de la couverture

/*
[COPILOT_PROMPTS]
# Gestionnaire de Dépendances Circulaires - Directives d'Implémentation

## Responsabilité
- Détecter les dépendances circulaires dans le code source
- Proposer des solutions pour résoudre ou gérer ces dépendances
- Fournir des outils d'analyse de dépendances entre modules

## Points d'Extension
- Ajouter des stratégies de résolution automatique
- Développer une visualisation graphique des dépendances
- Intégrer avec les outils d'analyse statique existants

## Anti-patterns
- Éviter de créer des solutions trop intrusives
- Ne pas modifier le code source automatiquement sans validation
- Éviter d'ajouter de nouvelles dépendances circulaires
[COPILOT_PROMPTS]
*/

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { Project, SourceFile } from 'ts-morph';

/**
 * Interface pour une dépendance circulaire détectée
 */
export interface CircularDependency {
  /** Chemins des fichiers impliqués dans la dépendance circulaire */
  files: string[];
  /** La longueur du cycle de dépendances */
  cycleLength: number;
  /** Le niveau de sévérité de la dépendance circulaire */
  severity: 'critical' | 'major' | 'minor';
  /** Suggestions pour résoudre le problème */
  suggestions: string[];
}

/**
 * Options pour la détection de dépendances circulaires
 */
export interface CircularDependencyOptions {
  /** Répertoires à ignorer */
  ignoreDirs?: string[];
  /** Extensions de fichiers à analyser */
  fileExtensions?: string[];
  /** Ignorer les dépendances via des importations de types uniquement */
  ignoreTypeImports?: boolean;
  /** Profondeur maximale de recherche */
  maxDepth?: number;
}

/**
 * Classe pour gérer les dépendances circulaires
 */
export class CircularDependencyHandler {
  private project: Project;
  private options: CircularDependencyOptions;

  constructor(options: CircularDependencyOptions = {}) {
    this.project = new Project();
    this.options = {
      ignoreDirs: ['node_modules', 'dist', 'build'],
      fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      ignoreTypeImports: false,
      maxDepth: 10,
      ...options
    };
  }

  /**
   * Détecte les dépendances circulaires dans un fichier source
   * @param sourceFile Fichier source à analyser
   * @returns Liste des dépendances circulaires détectées
   */
  public detect(sourceFile: SourceFile): string[] {
    const filePath = sourceFile.getFilePath();
    const dependencies: string[] = [];
    
    // Obtenir tous les imports du fichier
    const importDeclarations = sourceFile.getImportDeclarations();
    
    // Pour chaque import, vérifier s'il crée une dépendance circulaire
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Ignorer les imports de librairies externes (non relatifs)
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }
      
      // Ignorer les imports de types si configuré
      if (this.options.ignoreTypeImports && importDecl.isTypeOnly()) {
        continue;
      }
      
      // Résoudre le chemin complet du module importé
      const importedFilePath = this.resolveImportPath(
        moduleSpecifier,
        path.dirname(filePath)
      );
      
      if (importedFilePath) {
        // Vérifier si le fichier importé importe à son tour le fichier courant
        const isCircular = this.checkCircularImport(importedFilePath, filePath, new Set<string>(), 1);
        
        if (isCircular) {
          dependencies.push(importedFilePath);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Vérifie récursivement si un fichier importé crée une dépendance circulaire
   * @param currentFile Fichier à vérifier
   * @param targetFile Fichier cible qui a initié la vérification
   * @param visited Ensemble des fichiers déjà visités
   * @param depth Profondeur actuelle de recherche
   * @returns Boolean indiquant si une dépendance circulaire a été détectée
   */
  private checkCircularImport(
    currentFile: string,
    targetFile: string,
    visited: Set<string>,
    depth: number
  ): boolean {
    // Éviter la récursion infinie et respecter la profondeur maximale
    if (visited.has(currentFile) || depth > (this.options.maxDepth || 10)) {
      return false;
    }
    
    // Marquer le fichier courant comme visité
    visited.add(currentFile);
    
    try {
      // Lire le contenu du fichier
      if (!fs.existsSync(currentFile)) {
        return false;
      }
      
      const content = fs.readFileSync(currentFile, 'utf-8');
      const sourceFile = ts.createSourceFile(
        currentFile,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Analyser les imports
      let foundCircular = false;
      
      function visit(node: ts.Node) {
        if (ts.isImportDeclaration(node)) {
          const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
          
          // Ignorer les imports de bibliothèques externes
          if (!importPath.startsWith('.')) {
            return;
          }
          
          // Résoudre le chemin complet
          const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
          let fullPath = resolvedPath;
          
          // Essayer d'ajouter des extensions si nécessaire
          if (!fs.existsSync(fullPath)) {
            for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
              if (fs.existsSync(`${resolvedPath}${ext}`)) {
                fullPath = `${resolvedPath}${ext}`;
                break;
              }
            }
            
            // Vérifier s'il s'agit d'un import de répertoire avec un index
            if (!fs.existsSync(fullPath)) {
              for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                if (fs.existsSync(path.join(resolvedPath, `index${ext}`))) {
                  fullPath = path.join(resolvedPath, `index${ext}`);
                  break;
                }
              }
            }
          }
          
          // Si le chemin résolu correspond au fichier cible, une dépendance circulaire est détectée
          if (path.normalize(fullPath) === path.normalize(targetFile)) {
            foundCircular = true;
            return;
          }
          
          // Sinon, continuer la recherche récursivement
          if (fs.existsSync(fullPath)) {
            foundCircular = foundCircular || 
              this.checkCircularImport(fullPath, targetFile, new Set(visited), depth + 1);
          }
        }
        
        ts.forEachChild(node, visit);
      }
      
      visit(sourceFile);
      return foundCircular;
    } catch (error) {
      console.error(`Erreur lors de l'analyse du fichier ${currentFile}:`, error);
      return false;
    }
  }

  /**
   * Détecte les dépendances circulaires dans un ensemble de fichiers
   * @param filePaths Chemins des fichiers à analyser
   * @returns Liste des cycles de dépendances circulaires détectés
   */
  public detectCircularDependencies(filePaths: string[]): Array<{ files: string[], severity: string }> {
    const circularDependencies: Array<{ files: string[], severity: string }> = [];
    const graph = this.buildDependencyGraph(filePaths);
    
    // Pour chaque nœud dans le graphe, rechercher des cycles
    Object.keys(graph).forEach(file => {
      const cycles = this.findCycles(file, graph);
      
      cycles.forEach(cycle => {
        // Éviter les doublons en comparant les cycles
        const cycleKey = [...cycle].sort().join('|');
        const isDuplicate = circularDependencies.some(dep =>
          [...dep.files].sort().join('|') === cycleKey
        );
        
        if (!isDuplicate) {
          // Déterminer la sévérité selon la longueur du cycle
          let severity = 'minor';
          if (cycle.length <= 2) {
            severity = 'critical';
          } else if (cycle.length <= 4) {
            severity = 'major';
          }
          
          circularDependencies.push({
            files: cycle,
            severity
          });
        }
      });
    });
    
    return circularDependencies;
  }

  /**
   * Construit un graphe de dépendances à partir des fichiers
   * @param files Liste des fichiers à analyser
   * @returns Graphe de dépendances sous forme d'objet
   */
  private buildDependencyGraph(files: string[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    files.forEach(file => {
      if (!this.shouldAnalyzeFile(file)) {
        return;
      }

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const dependencies: string[] = [];

        // Parcourir l'AST pour trouver les importations
        function visit(node: ts.Node) {
          if (ts.isImportDeclaration(node)) {
            const importPath = (node.moduleSpecifier as ts.StringLiteral).text;

            // Ignorer les importations de types si configuré
            if (
              this.options.ignoreTypeImports &&
              node.importClause?.isTypeOnly
            ) {
              return;
            }

            // Essayer de résoudre le chemin relatif
            if (importPath.startsWith('.')) {
              const basedir = path.dirname(file);
              const resolvedPath = this.resolveImportPath(importPath, basedir);
              if (resolvedPath) {
                dependencies.push(resolvedPath);
              }
            }
          }

          ts.forEachChild(node, visit);
        }

        visit(sourceFile);

        graph[file] = dependencies;
      } catch (error) {
        console.error(`Erreur lors de l'analyse du fichier ${file}:`, error);
        graph[file] = [];
      }
    });

    return graph;
  }

  /**
   * Cherche des cycles dans le graphe de dépendances
   * @param startNode Nœud de départ
   * @param graph Graphe de dépendances
   * @returns Liste des cycles trouvés
   */
  private findCycles(
    startNode: string,
    graph: Record<string, string[]>
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      // Vérifier si le nœud est déjà dans le chemin actuel (cycle détecté)
      if (path.includes(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }

      // Vérifier si le nœud a déjà été complètement visité
      if (visited.has(node)) {
        return;
      }

      // Marquer le nœud comme étant dans le chemin actuel
      path.push(node);

      // Visiter tous les voisins
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }

      // Retirer le nœud du chemin actuel
      path.pop();

      // Marquer le nœud comme complètement visité
      visited.add(node);
    };

    dfs(startNode);

    return cycles;
  }

  /**
   * Calcule la sévérité d'une dépendance circulaire
   * @param cycle Cycle de dépendances
   * @returns Niveau de sévérité
   */
  private calculateSeverity(cycle: string[]): 'critical' | 'major' | 'minor' {
    // Plus le cycle est court, plus il est problématique
    if (cycle.length <= 2) {
      return 'critical';
    } else if (cycle.length <= 4) {
      return 'major';
    } else {
      return 'minor';
    }
  }

  /**
   * Génère des suggestions pour résoudre une dépendance circulaire
   * @param cycle Cycle de dépendances
   * @param graph Graphe complet de dépendances
   * @returns Liste de suggestions
   */
  private generateSuggestions(
    cycle: string[],
    graph: Record<string, string[]>
  ): string[] {
    const suggestions: string[] = [];

    suggestions.push('Créer un module intermédiaire pour partager les fonctionnalités communes');
    suggestions.push('Utiliser l\'injection de dépendances pour inverser le flux de dépendances');
    suggestions.push('Extraire les interfaces dans un fichier séparé pour éviter les dépendances d\'implémentation');

    // Trouver le fichier le plus connecté dans le cycle
    let maxConnections = 0;
    let mostConnectedFile = '';

    cycle.forEach(file => {
      const connections = (graph[file] || []).length;
      if (connections > maxConnections) {
        maxConnections = connections;
        mostConnectedFile = file;
      }
    });

    if (mostConnectedFile) {
      const basename = path.basename(mostConnectedFile);
      suggestions.push(`Considérer la refactorisation de ${basename} qui a ${maxConnections} dépendances`);
    }

    return suggestions;
  }

  /**
   * Détermine si un fichier doit être analysé
   * @param filePath Chemin du fichier
   * @returns Boolean indiquant si le fichier doit être analysé
   */
  private shouldAnalyzeFile(filePath: string): boolean {
    // Vérifier les extensions
    const ext = path.extname(filePath);
    if (!this.options.fileExtensions?.includes(ext)) {
      return false;
    }

    // Vérifier les répertoires à ignorer
    return !this.options.ignoreDirs?.some(dir =>
      filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)
    );
  }

  /**
   * Résout le chemin d'importation relatif
   * @param importPath Chemin d'importation
   * @param basedir Répertoire de base
   * @returns Chemin résolu ou undefined
   */
  private resolveImportPath(importPath: string, basedir: string): string | undefined {
    // Essayer différentes extensions
    for (const ext of this.options.fileExtensions || []) {
      const candidatePath = path.resolve(basedir, `${importPath}${ext}`);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }

      const indexPath = path.resolve(basedir, importPath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    return undefined;
  }

  /**
   * Détecte les dépendances circulaires dans l'AST
   * @param ast L'AST du code source
   * @returns Si des dépendances circulaires ont été détectées
   */
  public handleCircularDependencies(ast: ts.SourceFile): boolean {
    const imports: string[] = [];
    const exports: string[] = [];

    // Parcourir l'AST pour trouver les importations et exportations
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        imports.push(importPath);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const exportPath = (node.moduleSpecifier as ts.StringLiteral).text;
        exports.push(exportPath);
      }

      ts.forEachChild(node, visit);
    }

    visit(ast);

    // Détecter les imports/exports croisés (indicateur simple de circularité)
    for (const importPath of imports) {
      if (exports.includes(importPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Résout les dépendances circulaires détectées
   * @param circularDependencies Liste des dépendances circulaires détectées
   */
  public resolveCircularDependencies(circularDependencies: CircularDependency[]): void {
    // TODO: Implémenter la résolution des dépendances circulaires
    // Logique temporairement commentée - à implémenter dans une version future
    // ...logique de résolution...
  }

  /**
   * Génère une visualisation des dépendances circulaires
   * @returns Chaîne JSON des dépendances circulaires
   */
  public visualizeCircularDependencies(): string {
    const circularDependencies = this.detectCircularDependencies([]);
    return JSON.stringify(circularDependencies, null, 2);
  }
}

export default CircularDependencyHandler;

/**
 * Fonction utilitaire pour détecter les dépendances circulaires
 * @param ast AST TypeScript
 * @returns Boolean indiquant si des dépendances circulaires sont détectées
 */
export function handleCircularDependencies(ast: ts.SourceFile): boolean {
  const handler = new CircularDependencyHandler();
  return handler.handleCircularDependencies(ast);
}
