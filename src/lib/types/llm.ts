export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  streaming?: boolean;
  timeout?: number;
  retry?: {
    attempts: number;
    backoff: 'linear' | 'exponential';
    initialDelay: number;
  };
}

export interface LLMResponse {
  text: string;
  content: string;
  success: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  metadata?: {
    model: string;
    latency: number;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'timeout' | 'error';
  };
}

export interface LLMProvider {
  generateText(metaPrompt: string, arg1: { temperature: number; maxTokens: number; }): unknown;
  /**
   * Nom du modèle ou du fournisseur LLM
   */
  readonly name: string;

  /**
   * Génère une réponse à partir d'un prompt
   * @param prompt Texte du prompt à envoyer au LLM
   * @param options Options de génération
   */
  generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Vérifie la disponibilité du modèle et les quotas d'API
   */
  checkAvailability(): Promise<{
    available: boolean;
    quotaRemaining?: number;
    error?: string;
  }>;
}

/**
 * Interface pour un LLM avec streaming
 */
export interface StreamingLLMProvider extends LLMProvider {
  /**
   * Génère une réponse en streaming
   * @param prompt Texte du prompt
   * @param onToken Callback pour chaque token généré
   * @param options Options de génération
   */
  streamResponse(
    prompt: string,
    onToken: (token: string) => void,
    options?: LLMOptions
  ): Promise<LLMResponse>;
}
