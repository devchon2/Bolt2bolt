import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';
import { execSync } from 'child_process';

/*
[COPILOT_PROMPTS]
# Contexte FileSystemScanner
- Ce module est responsable de l'analyse du système de fichiers pour le projet Bolt2bolt
- Il identifie la structure du projet, les fichiers à analyser et extrait des métadonnées importantes
- Il doit être performant même avec de grands projets et éviter de scanner des dossiers non pertinents
- Les résultats sont utilisés par le code-scanner et d'autres modules d'analyse

# Points d'extension prioritaires:
- Support pour différents types de projets (React, Angular, Vue, Node.js)
- Détection intelligente des fichiers de test et génération de statistiques
- Analyse des dépendances entre fichiers et modules
- Génération de graphes de dépendances et métriques de cohésion/couplage
- Support de l'exclusion configurable de dossiers/fichiers

# Directives pour les mises à jour:
- Mettre à jour régulièrement la documentation dans /docs/file-system.md
- Ajouter des commentaires explicatifs pour les algorithmes complexes
- Optimiser les performances pour de grands projets
- Maintenir la compatibilité avec Windows, Mac et Linux
[COPILOT_PROMPTS]
*/

/**
 * Métadonnées d'un fichier analysé
 */
export interface FileMetadata {
  path: string;            // Chemin absolu du fichier
  relativePath: string;    // Chemin relatif depuis la racine du projet
  imports: string[];       // Chemins d'importation dans le fichier
  exports: string[];       // Éléments exportés par le fichier
  isTest: boolean;         // Indique si le fichier est un test
  size: number;            // Taille du fichier en octets
  lastModified: Date;      // Date de dernière modification
  content?: string;        // Contenu optionnel du fichier (pour analyse supplémentaire)
  dependencies?: {         // Analyse des dépendances
    direct: string[];      // Dépendances directes (importées)
    indirect: string[];    // Dépendances indirectes (importées par les dépendances)
  };
}

/**
 * Options pour le scanner de fichiers
 */
export interface ScanOptions {
  include: string[];            // Patterns d'inclusion (glob)
  exclude: string[];            // Patterns d'exclusion (glob)
  includeContent?: boolean;     // Inclure le contenu des fichiers
  resolveDependencies?: boolean;// Résoudre les dépendances
  maxDepth?: number;            // Profondeur maximale de l'analyse
  cacheDuration?: number;       // Durée de validité du cache en ms
  skipBinaryFiles?: boolean;    // Ignorer les fichiers binaires
  generateGraph?: boolean;      // Générer un graphe de dépendances
}

/**
 * Représentation d'un graphe de dépendances
 */
export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    metadata: FileMetadata;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'direct' | 'indirect';
  }>;
}

/**
 * Scanner de système de fichiers pour l'analyse de code
 */
export class FileSystemScanner {
  private projectRoot: string;
  private options: ScanOptions;
  private cache: Map<string, {metadata: FileMetadata, timestamp: number}> = new Map();
  private dependencyGraph: DependencyGraph | null = null;

  constructor(projectRoot: string, options: ScanOptions) {
    this.projectRoot = path.resolve(projectRoot);
    this.options = {
      include: options.include || ['**/*.{ts,tsx,js,jsx}'],
      exclude: options.exclude || ['**/node_modules/**', '**/dist/**', '**/build/**'],
      includeContent: options.includeContent || false,
      resolveDependencies: options.resolveDependencies || false,
      maxDepth: options.maxDepth || 5,
      cacheDuration: options.cacheDuration || 300000, // 5 minutes par défaut
      skipBinaryFiles: options.skipBinaryFiles !== undefined ? options.skipBinaryFiles : true,
      generateGraph: options.generateGraph || false
    };
  }

  /**
   * Analyse la structure des fichiers dans le projet
   */
  public async scan(): Promise<FileMetadata[]> {
    try {
      console.log('📂 Scan du système de fichiers...');
      const startTime = Date.now();
      
      // Trouver les fichiers qui correspondent aux patterns
      const filePaths = await this.findFiles();
      console.log(`✅ ${filePaths.length} fichiers trouvés`);
      
      // Analyser chaque fichier
      const files: FileMetadata[] = await Promise.all(
        filePaths.map(filePath => this.analyzeFile(filePath))
      );
      
      // Résoudre les dépendances si demandé
      if (this.options.resolveDependencies) {
        console.log('📊 Résolution des dépendances...');
        await this.resolveDependencies(files);
      }
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ Scan terminé en ${duration} ms`);
      
      return files;
    } catch (error) {
      console.error('Erreur critique lors du scan du système de fichiers:', error);
      throw error;
    }
  }

  /**
   * Trouve les fichiers qui correspondent aux patterns d'inclusion/exclusion
   */
  private async findFiles(): Promise<string[]> {
    const options = { cwd: this.projectRoot, ignore: this.options.exclude, absolute: true };
    const patternPromises = this.options.include.map(pattern => glob(pattern, options));
    const allMatches: string[][] = await Promise.all(patternPromises);
    const filePaths = allMatches.flat();
    return [...new Set(filePaths)]; // Éliminer les doublons
  }

  /**
   * Analyse un fichier pour extraire ses métadonnées
   */
  private async analyzeFile(filePath: string): Promise<FileMetadata> {
    // Vérifier si le fichier est déjà dans le cache et si le cache est encore valide
    const now = Date.now();
    const cachedItem = this.cache.get(filePath);
    if (cachedItem && (now - cachedItem.timestamp < this.options.cacheDuration!)) {
      return cachedItem.metadata;
    }
    
    const stats = fs.statSync(filePath);
    
    // Ignorer les fichiers binaires si l'option est activée
    if (this.options.skipBinaryFiles && this.isBinaryFile(filePath, stats.size)) {
      return {
        path: filePath,
        relativePath: path.relative(this.projectRoot, filePath),
        imports: [],
        exports: [],
        isTest: false,
        size: stats.size,
        lastModified: stats.mtime,
        dependencies: {
          direct: [],
          indirect: []
        }
      };
    }
    
    const relativePath = path.relative(this.projectRoot, filePath);
    const isTest = /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(path.basename(filePath));
    
    // Créer les métadonnées de base
    const metadata: FileMetadata = {
      path: filePath,
      relativePath,
      imports: [],
      exports: [],
      isTest,
      size: stats.size,
      lastModified: stats.mtime,
      dependencies: {
        direct: [],
        indirect: []
      }
    };
    
    // Analyse du contenu si c'est un fichier supporté
    if (/\.(ts|tsx|js|jsx)$/i.test(path.extname(filePath))) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (this.options.includeContent) {
          metadata.content = content;
        }
        
        // Analyser les imports et exports
        if (/\.(ts|tsx)$/i.test(path.extname(filePath))) {
          this.analyzeTypeScriptFile(metadata, content);
        } else {
          this.analyzeJavaScriptFile(metadata, content);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur lors de l'analyse de ${filePath}:`, error);
      }
    }
    
    // Ajouter au cache avec timestamp
    this.cache.set(filePath, {
      metadata,
      timestamp: now
    });
    
    return metadata;
  }

  /**
   * Détermine si un fichier est probablement binaire en examinant son en-tête
   */
  private isBinaryFile(filePath: string, size: number): boolean {
    if (size === 0) return false;
    
    try {
      // Examiner les premiers octets pour détecter les fichiers binaires
      const buffer = Buffer.alloc(Math.min(size, 512));
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      
      // Si le buffer contient un octet nul, c'est probablement un fichier binaire
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) return true;
      }
      
      // Extensions typiquement binaires
      const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.obj'];
      if (binaryExtensions.includes(path.extname(filePath).toLowerCase())) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`Impossible de déterminer si ${filePath} est binaire:`, error);
      return false;
    }
  }

  /**
   * Analyse un fichier TypeScript pour extraire les imports et exports
   */
  private analyzeTypeScriptFile(metadata: FileMetadata, content: string): void {
    try {
      const sourceFile = ts.createSourceFile(
        metadata.path,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Parcourir l'AST pour trouver les imports et exports
      const visit = (node: ts.Node) => {
        // Analyser les déclarations d'importation
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            metadata.imports.push(moduleSpecifier.text);
          }
        }
        
        // Analyser les déclarations d'exportation
        if (ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            // export * from 'module';
            metadata.imports.push(node.moduleSpecifier.text);
          }
          
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            node.exportClause.elements.forEach(element => {
              metadata.exports.push(element.name.text);
            });
          }
        }
        
        // Analyser les déclarations exportées directement (export class, export function, etc.)
        if (
          (ts.isClassDeclaration(node) || 
           ts.isFunctionDeclaration(node) || 
           ts.isInterfaceDeclaration(node) ||
           ts.isTypeAliasDeclaration(node) ||
           ts.isVariableStatement(node)) &&
          node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach(declaration => {
              if (declaration.name && ts.isIdentifier(declaration.name)) {
                metadata.exports.push(declaration.name.text);
              }
            });
          } else if (node.name) {
            metadata.exports.push(node.name.text);
          }
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
    } catch (error) {
      console.warn(`⚠️ Erreur lors de l'analyse TypeScript de ${metadata.path}:`, error);
    }
  }

  /**
   * Analyse un fichier JavaScript pour extraire les imports et exports
   * Utilise une approche régulière simplifié pour les fichiers JS
   */
  private analyzeJavaScriptFile(metadata: FileMetadata, content: string): void {
    // Analyser les importations
    const importRegex = /import\s+(?:{\s*([^}]+)\s*}|\*\s+as\s+([^,\s]+)|([^,\s{}]+))?(?:\s*,\s*(?:{\s*([^}]+)\s*}|\*\s+as\s+([^,\s]+))?)?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[6];
      metadata.imports.push(importPath);
    }
    
    // Analyser les exportations
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+([^=\s{(]+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      const exportName = match[1];
      metadata.exports.push(exportName);
    }
    
    // Analyser les exportations nommées
    const namedExportRegex = /export\s+{\s*([^}]+)\s*}/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const exports = match[1].split(',').map(exp => exp.trim().split(/\s+as\s+/)[0].trim());
      metadata.exports.push(...exports);
    }
  }

  /**
   * Résout les dépendances entre fichiers
   */
  private async resolveDependencies(files: FileMetadata[]): Promise<void> {
    // Créer une carte des fichiers par chemin pour une recherche efficace
    const fileMap = new Map<string, FileMetadata>();
    files.forEach(file => {
      fileMap.set(file.path, file);
      
      // Ajouter des entrées supplémentaires pour les chemins sans extension
      const basePathWithoutExt = file.path.replace(/\.[^/.]+$/, '');
      fileMap.set(basePathWithoutExt, file);
      
      // Ajouter des entrées pour les répertoires avec des index
      if (path.basename(file.path).startsWith('index.')) {
        const dirPath = path.dirname(file.path);
        fileMap.set(dirPath, file);
      }
    });
    
    // Résoudre les dépendances directes
    for (const file of files) {
      await this.resolveFileDependencies(file, fileMap, 0);
    }
    
    // Résoudre les dépendances indirectes
    for (const file of files) {
      const seen = new Set<string>();
      file.dependencies!.direct.forEach(dep => {
        seen.add(dep);
      });
      
      const resolveDependenciesDeep = (depPath: string, depth: number) => {
        if (depth > (this.options.maxDepth || 3)) return;
        
        const depFile = fileMap.get(depPath);
        if (depFile && depFile.dependencies?.direct) {
          depFile.dependencies.direct.forEach(nestedDep => {
            if (!seen.has(nestedDep)) {
              seen.add(nestedDep);
              file.dependencies!.indirect.push(nestedDep);
              resolveDependenciesDeep(nestedDep, depth + 1);
            }
          });
        }
      };
      
      file.dependencies!.direct.forEach(dep => {
        resolveDependenciesDeep(dep, 1);
      });
    }
  }

  /**
   * Résout les dépendances d'un fichier
   */
  private async resolveFileDependencies(file: FileMetadata, fileMap: Map<string, FileMetadata>, depth: number): Promise<void> {
    if (depth > (this.options.maxDepth || 3)) return;
    
    for (const importPath of file.imports) {
      const resolvedPath = this.resolveImportPath(importPath, file.path);
      const depFile = fileMap.get(resolvedPath);
      
      if (depFile) {
        file.dependencies!.direct.push(depFile.path);
        await this.resolveFileDependencies(depFile, fileMap, depth + 1);
      }
    }
  }

  /**
   * Résout le chemin d'importation d'un module
   */
  private resolveImportPath(importPath: string, fromPath: string): string {
    if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(fromPath), importPath);
    }
    
    return importPath;
  }

  /**
   * Génère un graphe de dépendances pour visualisation
   */
  public generateDependencyGraph(): DependencyGraph {
    if (this.dependencyGraph) {
      return this.dependencyGraph;
    }
    
    const graph: DependencyGraph = {
      nodes: [],
      edges: []
    };
    
    // Convertir le cache en tableau de métadonnées
    const files = Array.from(this.cache.values()).map(item => item.metadata);
    
    // Créer les nœuds
    files.forEach(file => {
      graph.nodes.push({
        id: file.path,
        label: path.basename(file.path),
        metadata: file
      });
    });
    
    // Créer les arêtes pour les dépendances directes
    files.forEach(file => {
      if (file.dependencies?.direct) {
        file.dependencies.direct.forEach(depPath => {
          graph.edges.push({
            source: file.path,
            target: depPath,
            type: 'direct'
          });
        });
      }
      
      if (file.dependencies?.indirect) {
        file.dependencies.indirect.forEach(depPath => {
          graph.edges.push({
            source: file.path,
            target: depPath,
            type: 'indirect'
          });
        });
      }
    });
    
    this.dependencyGraph = graph;
    return graph;
  }

  /**
   * Purge le cache des entrées qui sont plus anciennes que la durée de cache spécifiée
   */
  public purgeCache(): number {
    const now = Date.now();
    let purgedCount = 0;
    
    for (const [filePath, cacheItem] of this.cache.entries()) {
      if (now - cacheItem.timestamp > this.options.cacheDuration!) {
        this.cache.delete(filePath);
        purgedCount++;
      }
    }
    
    this.dependencyGraph = null; // Invalider le graphe de dépendances
    return purgedCount;
  }
}

// Reminder: Mettre à jour régulièrement la documentation dans /docs/file-system.md

export default FileSystemScanner;
