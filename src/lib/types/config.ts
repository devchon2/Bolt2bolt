export interface BoltConfig {
  /**
   * Modèles AI à utiliser et leurs configurations
   */
  aiModels: {
    [key: string]: {
      apiKey?: string;
      baseUrl?: string;
      priority: number;
      contextWindow: number;
      defaultOptions?: {
        temperature: number;
        maxTokens: number;
        [key: string]: any;
      };
    };
  };

  /**
   * Seuils de qualité pour l'optimisation
   */
  threshold: {
    maxComplexity?: number;
    maxDuplication?: number;
    minTestCoverage?: number;
    maxResponseTime?: number;
    maxMemoryUsage?: number;
  };

  /**
   * Configuration des environnements
   */
  environments?: {
    isolated?: {
      timeout: number;
      memoryLimit: number;
    };
    native?: {
      concurrency: number;
      gitOptions: {
        sshKeyPath?: string;
        tokenEnvVar?: string;
      };
    };
  };
  
  /**
   * Stratégies de rollback
   */
  rollback?: {
    strategy: 'smart' | 'immediate' | 'manual';
    checkpoints: {
      interval: number;
      maxHistory: number;
    };
  };
}

export interface OptimizationLog {
  /**
   * Patterns de succès pour l'apprentissage
   */
  successPatterns: Array<{
    pattern: string;
    context: string;
    impact: {
      before: number;
      after: number;
      metric: string;
    };
    timestamp: number;
  }>;

  /**
   * Patterns d'échec pour l'apprentissage
   */
  failurePatterns: Array<{
    pattern: string;
    context: string;
    error: string;
    timestamp: number;
  }>;
}

export interface Environment {
  type: 'isolated' | 'native';
  runtime: 'node' | 'browser' | 'webcontainer';
  capabilities: {
    filesystem: boolean;
    network: boolean;
    processExecution: boolean;
    domManipulation: boolean;
  };
}
