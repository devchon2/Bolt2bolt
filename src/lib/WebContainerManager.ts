import { WebContainer } from '@webcontainer/api';
import { detectEnvironment } from './utils/environment';

interface WebContainerOptions {
  rootFilesystem: Record<string, any>;
  memoryLimit?: number; // en MB
  cpuLimit?: number; // en %
  network?: boolean;
}

export class WebContainerManager {
  private container: WebContainer | null = null;
  private isReady: boolean = false;
  private options: WebContainerOptions;
  
  constructor(options: WebContainerOptions) {
    this.options = {
      memoryLimit: 512, // 512MB par défaut
      cpuLimit: 80, // 80% d'un cœur par défaut
      network: true, // Accès réseau activé par défaut
      ...options
    };
  }
  
  /**
   * Initialise et démarre le WebContainer
   */
  async initialize(): Promise<void> {
    const env = await detectEnvironment();
    
    if (env.runtime !== 'browser' && env.runtime !== 'webcontainer') {
      throw new Error("WebContainer ne peut être utilisé que dans un environnement navigateur compatible");
    }
    
    try {
      // Création du WebContainer
      this.container = await WebContainer.boot({
        files: this.options.rootFilesystem,
      });
      
      // Initialisation de base
      await this.container.fs.mkdir('/workspace');
      await this.container.spawn('node', ['-e', 'console.log("WebContainer initialized")']);
      
      // Configuration des limites de ressources
      if (this.container.setResourceLimits) {
        await this.container.setResourceLimits({
          memory: this.options.memoryLimit! * 1024 * 1024,
          cpu: this.options.cpuLimit! / 100
        });
      }
      
      // Activation du réseau si demandé
      if (this.options.network && this.container.network) {
        await this.container.network.enable();
      }
      
      this.isReady = true;
    } catch (error) {
      console.error('WebContainer initialization failed:', error);
      throw new Error(`Impossible d'initialiser le WebContainer: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!this.isReady || !this.container) {
      throw new Error("WebContainer n'est pas initialisé");
    }
    
    let stdout = '';
    let stderr = '';
    
    const process = await this.container.spawn(command, args, {
      cwd,
      env: {},
    });
    
    // Capture de la sortie standard
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          stdout += data;
        }
      })
    );
    
    // Capture des erreurs
    process.stderr.pipeTo(
      new WritableStream({
        write(data) {
          stderr += data;
        }
      })
    );
    
    // Attente de la fin du processus
    const exit = await process.exit;
    
    return {
      exit,
      stdout,
      stderr
    };
  }
  
  /**
   * Installe des packages npm
   */
  async installDependencies(packages: string[], cwd: string = '/'): Promise<boolean> {
    try {
      const { exit, stderr } = await this.runCommand('npm', ['install', ...packages], cwd);
      return exit === 0;
    } catch (error) {
      console.error('Failed to install dependencies:', error);
      return false;
    }
  }
  
  /**
   * Optimise l'utilisation de la mémoire
   */
  async optimizeMemoryUsage(): Promise<void> {
    if (!this.isReady || !this.container) {
      throw new Error("WebContainer n'est pas initialisé");
    }
    
    // Libération de la mémoire inutilisée
    try {
      // Simulation: exécuter une commande qui libère de la mémoire
      await this.runCommand('node', ['-e', `
        global.gc && global.gc();
        console.log("Memory optimized");
      `]);
      
      // Dans une implémentation réelle, pourrions:
      // 1. Surveiller l'utilisation mémoire
      // 2. Fermer les processus inutilisés
      // 3. Imposer des limites dynamiques
    } catch (error) {
      console.warn('Memory optimization failed:', error);
    }
  }
  
  /**
   * Récupère le système de fichiers virtuel
   */
  async getFileSystem(): Promise<any> {
    if (!this.isReady || !this.container) {
      throw new Error("WebContainer n'est pas initialisé");
    }
    
    return this.container.fs;
  }
  
  /**
   * Arrête proprement le WebContainer
   */
  async shutdown(): Promise<void> {
    if (!this.isReady || !this.container) {
      return;
    }
    
    try {
      // Arrêt propre des processus en cours
      await this.runCommand('pkill', ['-f', 'node']);
      
      // Réinitialisation
      this.container = null;
      this.isReady = false;
    } catch (error) {
      console.warn('WebContainer shutdown error:', error);
    }
  }
}

export default WebContainerManager;
