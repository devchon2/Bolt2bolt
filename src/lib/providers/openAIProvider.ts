import { LLMProvider, LLMOptions, LLMResponse, StreamingLLMProvider } from '../types/llm';
import { Configuration, OpenAIApi } from 'openai';
import { performance } from 'perf_hooks';

export class OpenAIProvider implements StreamingLLMProvider {
  readonly name: string;
  private api: OpenAIApi;
  private model: string;
  private defaultOptions: Partial<LLMOptions>;
  
  constructor(apiKey: string, model = 'gpt-4', options: Partial<LLMOptions> = {}) {
    this.name = `OpenAI-${model}`;
    this.model = model;
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 1024,
      ...options
    };
    
    const configuration = new Configuration({ apiKey });
    this.api = new OpenAIApi(configuration);
  }
  
  async generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = performance.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      const response = await this.api.createCompletion({
        model: this.model,
        prompt,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        top_p: mergedOptions.topP,
        frequency_penalty: mergedOptions.frequencyPenalty,
        presence_penalty: mergedOptions.presencePenalty,
        stop: mergedOptions.stopSequences,
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // En cas de succès, retourner la réponse formatée
      return {
        content: response.data.choices[0]?.text || '',
        success: true,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
        metadata: {
          model: this.model,
          latency,
          finishReason: response.data.choices[0]?.finish_reason as any,
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // En cas d'erreur, retourner une réponse formatée avec l'erreur
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          model: this.model,
          latency,
          finishReason: 'error'
        }
      };
    }
  }
  
  async streamResponse(
    prompt: string,
    onToken: (token: string) => void,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const startTime = performance.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    let accumulatedContent = '';
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    
    try {
      const response = await this.api.createCompletion({
        model: this.model,
        prompt,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        top_p: mergedOptions.topP,
        frequency_penalty: mergedOptions.frequencyPenalty,
        presence_penalty: mergedOptions.presencePenalty,
        stop: mergedOptions.stopSequences,
        stream: true,
      }, { responseType: 'stream' });
      
      // Traiter le stream de réponses
      const stream = response.data as any;
      
      return new Promise((resolve, reject) => {
        let finishReason: string | undefined;
        
        stream.on('data', (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
              if (line.includes('[DONE]')) {
                return;
              }
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.choices && data.choices[0]) {
                  const token = data.choices[0].text || '';
                  finishReason = data.choices[0].finish_reason;
                  onToken(token);
                  accumulatedContent += token;
                }
              }
            }
          } catch (error) {
            console.error("Error parsing stream chunk:", error);
          }
        });
        
        stream.on('end', () => {
          const endTime = performance.now();
          const latency = endTime - startTime;
          
          resolve({
            content: accumulatedContent,
            success: true,
            usage,
            metadata: {
              model: this.model,
              latency,
              finishReason: finishReason as any
            }
          });
        });
        
        stream.on('error', (error: Error) => {
          const endTime = performance.now();
          const latency = endTime - startTime;
          
          reject({
            content: accumulatedContent,
            success: false,
            error: error.message,
            metadata: {
              model: this.model,
              latency,
              finishReason: 'error'
            }
          });
        });
      });
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          model: this.model,
          latency,
          finishReason: 'error'
        }
      };
    }
  }
  
  async checkAvailability(): Promise<{ available: boolean; quotaRemaining?: number; error?: string; }> {
    try {
      // Simple check avec une requête minimale
      await this.api.createCompletion({
        model: this.model,
        prompt: "test",
        max_tokens: 5
      });
      
      // Si pas d'erreur, le service est disponible
      return { available: true };
    } catch (error: any) {
      // Si l'erreur est liée au quota, essayer d'extraire l'information
      if (error.response?.status === 429) {
        return {
          available: false,
          error: "Rate limit exceeded",
          quotaRemaining: 0
        };
      }
      
      return { 
        available: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default OpenAIProvider;
