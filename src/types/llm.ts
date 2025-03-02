/**
 * Types pour l'interaction avec les modèles de langage
 */

// [COPILOT_PROMPT]: Lorsque vous ajoutez un nouveau modèle LLM, assurez-vous de mettre à jour l'interface LLMOptions.

/**
 * Options communes pour les appels LLM
 */
export interface LLMOptions {
  /** Température pour la génération (0-1) */
  temperature?: number;
  /** Nombre maximum de tokens à générer */
  maxTokens?: number;
  /** Modèles à éviter dans les réponses */
  stopSequences?: string[];
  /** Nombre de résultats à générer */
  n?: number;
  /** Pénalité de présence */
  presencePenalty?: number;
  /** Pénalité de fréquence */
  frequencyPenalty?: number;
  /** Identifiants des utilisateurs pour le suivi */
  user?: string;
}

/**
 * Options spécifiques à OpenAI
 */
export interface OpenAIOptions extends LLMOptions {
  /** Stream la génération de réponses */
  stream?: boolean;
  /** Contrôle le niveau de biais du modèle */
  logitBias?: Record<string, number>;
}

/**
 * Options spécifiques à Anthropic
 */
export interface AnthropicOptions extends LLMOptions {
  /** Format de réponse souhaité */
  responseFormat?: 'text' | 'json';
}

/**
 * Réponse d'un modèle LLM
 */
export interface LLMResponse {
  /** Texte de la réponse */
  text: string;
  /** Nombre de tokens utilisés */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Métadonnées de la réponse */
  metadata?: Record<string, any>;
}

/**
 * Interface pour les fournisseurs de LLM
 */
export interface LLMProvider {
  /**
   * Envoie une requête au modèle LLM
   * @param prompt Le prompt à envoyer
   * @param options Options de génération
   */
  generateText(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  
  /**
   * Vérifie si le provider est prêt à être utilisé
   */
  isReady(): Promise<boolean>;
}
