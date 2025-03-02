// ...existing code...

/**
 * Erreur de base pour les problèmes liés au WebContainer
 */
export class WebContainerError extends Bolt2boltError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`WebContainer error: ${message}`);
    this.name = 'WebContainerError';
  }
}

/**
 * Erreur spécifique à l'initialisation du WebContainer
 */
export class WebContainerInitializationError extends WebContainerError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`Initialization failed: ${message}`, cause);
    this.name = 'WebContainerInitializationError';
  }
}

/**
 * Erreur liée aux opérations sur les ressources du WebContainer
 */
export class WebContainerResourceError extends WebContainerError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`Resource operation failed: ${message}`, cause);
    this.name = 'WebContainerResourceError';
  }
}

/**
 * Erreur spécifique à l'exécution de commandes dans le WebContainer
 */
export class WebContainerCommandError extends WebContainerError {
  constructor(
    message: string, 
    public readonly command: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
    public readonly cause?: unknown
  ) {
    super(`Command '${command}' failed: ${message}`, cause);
    this.name = 'WebContainerCommandError';
  }
}

// ...existing code...
