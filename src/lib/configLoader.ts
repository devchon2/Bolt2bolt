import { BoltConfig } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';

// [COPILOT_PROMPT]: Assurez-vous que la fonction loadConfigFromFile gère correctement les erreurs de lecture de fichier.
// [COPILOT_PROMPT]: Ajoutez des commentaires pour expliquer la structure de la configuration retournée.

/**
 * Charge la configuration depuis un fichier ou utilise la configuration par défaut
 * @param configPath Chemin vers le fichier de configuration (optionnel)
 * @returns Configuration chargée ou par défaut
 */
export function loadConfigFromFile(configPath?: string): BoltConfig {
  // Configuration par défaut
  const defaultConfig: BoltConfig = {
    aiModels: {
      'gpt-4': {
        priority: 1,
        contextWindow: 8192,
        defaultOptions: {
          temperature: 0.7,
          maxTokens: 2048
        }
      }
    },
    threshold: {
      maxComplexity: 15,
      maxDuplication: 5,
      minTestCoverage: 80
    }
  };

  // Si aucun chemin n'est fourni, utiliser le chemin par défaut
  const filePath = configPath || path.join(process.cwd(), 'boltConfig.json');
  
  try {
    // Vérification de l'existence du fichier
    if (!fs.existsSync(filePath)) {
      console.warn(`Fichier de configuration non trouvé: ${filePath}. Utilisation de la configuration par défaut.`);
      return defaultConfig;
    }
    
    // Lecture et parsing du fichier
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent) as Partial<BoltConfig>;
    
    // Fusion avec les valeurs par défaut pour les propriétés manquantes
    return {
      aiModels: { ...defaultConfig.aiModels, ...config.aiModels },
      threshold: { ...defaultConfig.threshold, ...config.threshold },
      paths: { ...defaultConfig.paths, ...config.paths },
      behavior: { ...defaultConfig.behavior, ...config.behavior }
    };
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('Utilisation de la configuration par défaut.');
    return defaultConfig;
  }
}
