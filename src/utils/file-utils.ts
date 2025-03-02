/**
 * Utilitaires pour la manipulation de fichiers
 */
import fs from 'fs/promises';
import path from 'path';
import { eventBus, Events } from './events';

/**
 * Vérifie si un fichier existe
 * @param filePath Chemin du fichier
 * @returns true si le fichier existe, false sinon
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lit le contenu d'un fichier
 * @param filePath Chemin du fichier
 * @returns Contenu du fichier sous forme de texte
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    eventBus.emit(Events.FILE_READ, { filePath, success: true });
    return content;
  } catch (error) {
    eventBus.emit(Events.FILE_ERROR, { 
      filePath, 
      operation: 'read', 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Erreur lors de la lecture du fichier ${filePath}: ${error}`);
  }
}

/**
 * Écrit du contenu dans un fichier
 * @param filePath Chemin du fichier
 * @param content Contenu à écrire
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    // S'assurer que le répertoire existe
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
    
    // Écrire le contenu
    await fs.writeFile(filePath, content, 'utf-8');
    eventBus.emit(Events.FILE_WRITE, { filePath, success: true });
  } catch (error) {
    eventBus.emit(Events.FILE_ERROR, { 
      filePath, 
      operation: 'write', 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Erreur lors de l'écriture du fichier ${filePath}: ${error}`);
  }
}

/**
 * Crée un backup d'un fichier avant modification
 * @param filePath Chemin du fichier
 */
export async function createFileBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.bak`;
  
  try {
    if (await fileExists(filePath)) {
      const content = await readFileContent(filePath);
      await writeFileContent(backupPath, content);
      return backupPath;
    }
    return '';
  } catch (error) {
    eventBus.emit(Events.FILE_ERROR, { 
      filePath, 
      operation: 'backup', 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Erreur lors de la création du backup pour ${filePath}: ${error}`);
  }
}

/**
 * Liste les fichiers dans un répertoire, éventuellement de façon récursive
 * @param directory Chemin du répertoire
 * @param recursive Recherche récursive
 * @param filter Filtre pour les fichiers (extensions)
 */
export async function listFiles(
  directory: string, 
  recursive: boolean = false, 
  filter: string[] = []
): Promise<string[]> {
  const results: string[] = [];
  
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory() && recursive) {
        const subFiles = await listFiles(fullPath, recursive, filter);
        results.push(...subFiles);
      } 
      else if (entry.isFile()) {
        if (filter.length === 0 || filter.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    }
    
    return results;
  } catch (error) {
    eventBus.emit(Events.FILE_ERROR, { 
      directory, 
      operation: 'list', 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Erreur lors de la lecture du répertoire ${directory}: ${error}`);
  }
}
