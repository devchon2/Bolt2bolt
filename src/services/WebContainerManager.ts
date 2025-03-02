import { WebContainer } from '@webcontainer/api';
import type { WebContainerOptions } from '../types/webcontainer';
import { detectEnvironment } from '../utils/environment';
import { 
  WebContainerError, 
  WebContainerInitializationError,
  WebContainerResourceError,
  WebContainerCommandError
} from '../utils/errors';
import { createLogger } from '../utils/logger';

export class WebContainerManager {
  private container: WebContainer | null = null;
  private isReady: boolean = false;
  private options: WebContainerOptions;
  private readonly logger = createLogger('WebContainerManager');
  
  constructor(options: WebContainerOptions) {
    this.options = {
      rootFilesystem: {},
      memoryLimit: 512, // 512 MB par défaut
      cpuLimit: 80, // 80% par défaut
      network: false,
      ...options
    };
    
    this.logger.info('Instance créée', { 
      memoryLimit: this.options.memoryLimit,
      cpuLimit: this.options.cpuLimit,
      network: this.options.network
    });
  }
  
  /**
   * Initialise et démarre le WebContainer
   */
  async initialize(): Promise<void> {
    this.logger.info('Initialisation du WebContainer');
    
    try {
      const env = await detectEnvironment();
      
      if (env.runtime !== 'browser' && env.runtime !== 'webcontainer') {
        throw new WebContainerInitializationError(
          'WebContainer nécessite un environnement navigateur compatible'
        );
      }
      
      try {
        // Création du WebContainer
        this.container = await WebContainer.boot({
          files: this.options.rootFilesystem,
        });
        
        this.logger.info('WebContainer démarré avec succès');
        
        // Initialisation de base
        await this.container.fs.mkdir('/workspace');
        await this.container.spawn('node', ['-e', 'console.log("WebContainer initialized")']);
        
        // Configuration des limites de ressources
        if (this.container.setResourceLimits) {
          await this.container.setResourceLimits({
            memory: this.options.memoryLimit! * 1024 * 1024,
            cpu: this.options.cpuLimit! / 100
          });
          this.logger.info('Limites de ressources définies', { 
            memory: `${this.options.memoryLimit}MB`, 
            cpu: `${this.options.cpuLimit}%`
          });
        }
        
        // Activation du réseau si demandé
        if (this.options.network && this.container.network) {
          await this.container.network.enable();
          this.logger.info('Réseau activé');
        }
        
        this.isReady = true;
        this.logger.info('WebContainer initialisé avec succès');
      } catch (error) {
        throw new WebContainerInitializationError(
          'Échec du processus de démarrage',
          error
        );
      }
    } catch (error) {
      this.logger.error("Échec de l'initialisation", error instanceof Error ? error : new Error(String(error)));
      
      // Réinitialisation de l'état en cas d'échec
      this.container = null;
      this.isReady = false;
      
      // Propagation de l'erreur avec contexte
      if (error instanceof WebContainerError) {
        throw error;
      } else {
        throw new WebContainerInitializationError(
          error instanceof Error ? error.message : String(error),
          error
        );
      }
    }
  }
  
  /**
   * Exécute une commande dans le WebContainer
   */
  async runCommand(command: string, args: string[] = [], cwd: string = '/'): Promise<{
    exit: number;
    stdout: string;
    stderr: string;
  }> {
    this.logger.info('Exécution de commande', { command, args, cwd });
    
    if (!this.isReady || !this.container) {
      throw new WebContainerError("WebContainer n'est pas initialisé");
    }
    
    try {
      const process = await this.container.spawn(command, args, {
        cwd,
        env: {},
      });
      
      const exit = await process.exit;
      const stdout = await process.output;
      const stderr = await process.stderr;
      
      if (exit !== 0) {
        this.logger.warn('La commande a retourné un code non-zéro', { 
          command, args, exit, stderr 
        });
        
        throw new WebContainerCommandError(
          `Terminé avec le code ${exit}`,
          `${command} ${args.join(' ')}`,
          exit,
          stderr
        );
      }
      
      this.logger.info('Commande exécutée avec succès', { command, args });
      return { exit, stdout, stderr };
    } catch (error) {
      this.logger.error("Échec de l'exécution de la commande", error instanceof Error ? error : new Error(String(error)), {
        command,
        args
      });
      
      if (error instanceof WebContainerCommandError) {
        throw error;
      } else {
        throw new WebContainerCommandError(
          error instanceof Error ? error.message : String(error),
          `${command} ${args.join(' ')}`,
          undefined,
          undefined,
          error
        );
      }
    }
  }
  
  /**
   * Optimise l'utilisation de la mémoire
   */
  async optimizeMemoryUsage(): Promise<void> {
    this.logger.info("Optimisation de l'utilisation de la mémoire");
    
    if (!this.isReady || !this.container) {
      throw new WebContainerError("WebContainer n'est pas initialisé");
    }
    
    try {
      // Simulation: exécuter une commande qui libère de la mémoire
      await this.runCommand('node', ['-e', `
        global.gc && global.gc();
        console.log("Memory optimized");
      `]);
      
      this.logger.info("Optimisation de la mémoire terminée");
    } catch (error) {
      this.logger.warn("Échec de l'optimisation de la mémoire", error instanceof Error ? error : new Error(String(error)));
      
      // On ne lance pas d'exception ici car c'est une opération non critique
      // mais on notifie l'échec via le logger
    }
  }
  
  /**
   * Récupère le système de fichiers virtuel
   */
  async getFileSystem(): Promise<any> {
    if (!this.isReady || !this.container) {
      throw new WebContainerResourceError("WebContainer n'est pas initialisé");
    }
    
    return this.container.fs;
  }
  
  /**
   * Arrête proprement le WebContainer
   */
  async shutdown(): Promise<void> {
    this.logger.info('Arrêt du WebContainer');
    
    if (!this.isReady || !this.container) {
      this.logger.info('WebContainer déjà inactif, rien à arrêter');
      return;
    }
    
    try {
      // Arrêt propre des processus en cours
      await this.runCommand('pkill', ['-f', 'node'])
        .catch(error => {
          // On capture l'erreur mais on continue le processus d'arrêt
          this.logger.warn('Échec de terminaison des processus Node', error instanceof Error ? error : new Error(String(error)));
        });
      
      // Réinitialisation
      this.container = null;
      this.isReady = false;
      this.logger.info('Arrêt du WebContainer terminé avec succès');
    } catch (error) {
      this.logger.error("L'arrêt du WebContainer a rencontré des erreurs", error instanceof Error ? error : new Error(String(error)));
      
      // Forcer la réinitialisation même en cas d'erreur
      this.container = null;
      this.isReady = false;
      
      // Ici, on ne relance pas l'erreur car on veut que le shutdown soit toujours "best effort"
    }
  }
}
