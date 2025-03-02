import { Environment } from '../../types/config';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Détecte l'environnement d'exécution actuel
 * @returns Les informations sur l'environnement détecté
 */
export async function detectEnvironment(): Promise<Environment> {
  // Détection des environnements CI communs
  if (process.env.CI === 'true' || 
      process.env.GITHUB_ACTIONS || 
      process.env.JENKINS_URL || 
      process.env.TRAVIS ||
      process.env.GITLAB_CI) {
    return 'ci';
  }
  
  // Détection de l'environnement de production
  // Les environnements de production ont généralement des variables spécifiques
  if (process.env.NODE_ENV === 'production' || 
      process.env.PRODUCTION === 'true' ||
      process.env.ENV === 'production') {
    return 'production';
  }
  
  // Par défaut, on considère qu'on est en environnement local
  return 'local';
}

/**
 * Récupère les informations sur le système
 */
export async function getSystemInfo(): Promise<{
  platform: string;
  release: string;
  memory: string;
  cpuCores: number;
  nodeVersion: string;
  isDocker: boolean;
}> {
  const isDocker = await checkIsRunningInDocker();
  
  return {
    platform: os.platform(),
    release: os.release(),
    memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    cpuCores: os.cpus().length,
    nodeVersion: process.version,
    isDocker
  };
}

/**
 * Vérifie si l'application s'exécute dans un conteneur Docker
 */
async function checkIsRunningInDocker(): Promise<boolean> {
  try {
    // La présence de /.dockerenv indique généralement une exécution dans Docker
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }
    
    // Alternative: vérifier les cgroups (Linux uniquement)
    if (os.platform() === 'linux') {
      const cgroupContent = fs.readFileSync('/proc/1/cgroup', 'utf8');
      return cgroupContent.includes('docker');
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Récupère les variables d'environnement pertinentes pour Bolt2bolt
 */
export function getBoltEnvironmentVariables(): Record<string, string | undefined> {
  const relevantVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'BOLT_LOG_LEVEL',
    'NODE_ENV',
    'BOLT_CONFIG_PATH',
    'BOLT_AUTO_OPTIMIZE',
    'BOLT_TEST_MODE'
  ];
  
  const result: Record<string, string | undefined> = {};
  
  for (const varName of relevantVars) {
    if (process.env[varName] !== undefined) {
      // Masquer les clés API pour la sécurité
      if (varName.includes('API_KEY')) {
        result[varName] = '***********';
      } else {
        result[varName] = process.env[varName];
      }
    }
  }
  
  return result;
}

/**
 * Vérifie si une fonctionnalité spécifique est disponible dans l'environnement actuel
 * @param feature Nom de la fonctionnalité à vérifier
 * @returns Si la fonctionnalité est disponible
 */
export async function hasFeature(feature: keyof Environment['capabilities']): Promise<boolean> {
  const env = await detectEnvironment();
  return env.capabilities[feature];
}

/**
 * Vérifie si l'environnement est compatible avec les exigences spécifiées
 * @param requirements Exigences d'environnement
 * @returns Si l'environnement est compatible
 */
export async function checkEnvironmentCompatibility(requirements: Partial<Environment>): Promise<{
  compatible: boolean;
  missingFeatures: string[];
}> {
  const env = await detectEnvironment();
  const missingFeatures: string[] = [];
  
  // Vérifier le type d'environnement
  if (requirements.type && requirements.type !== env.type) {
    missingFeatures.push(`type: required ${requirements.type}, found ${env.type}`);
  }
  
  // Vérifier le runtime
  if (requirements.runtime && requirements.runtime !== env.runtime) {
    missingFeatures.push(`runtime: required ${requirements.runtime}, found ${env.runtime}`);
  }
  
  // Vérifier les capacités
  if (requirements.capabilities) {
    for (const [feature, required] of Object.entries(requirements.capabilities)) {
      const featureKey = feature as keyof Environment['capabilities'];
      if (required && !env.capabilities[featureKey]) {
        missingFeatures.push(`capability: ${feature}`);
      }
    }
  }
  
  return {
    compatible: missingFeatures.length === 0,
    missingFeatures
  };
}
