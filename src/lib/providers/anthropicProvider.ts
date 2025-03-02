import { LLMProvider, LLMOptions, LLMResponse, StreamingLLMProvider } from '../types/llm';
import { performance } from 'perf_hooks';
import axios from 'axios';

export class AnthropicProvider implements StreamingLLMProvider {
  readonly name: string;
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private defaultOptions: Partial<LLMOptions>;
  
  constructor(apiKey: string, model = 'claude-3-opus-20240229', options: Partial<LLMOptions> = {}) {
    this.name = `Anthropic-${model}`;
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 1024,
      ...options
    };
  }
  
  async generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = performance.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          top_p: mergedOptions.topP,
          stop_sequences: mergedOptions.stopSequences,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: mergedOptions.timeout || 30000
        }
      );
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      const content = response.data.content?.[0]?.text || '';
      return {
        content,
        success: true,
        usage: {
          promptTokens: response.data.usage?.input_tokens || 0,
          completionTokens: response.data.usage?.output_tokens || 0,
          totalTokens: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0,
        },
        metadata: {
          model: this.model,
          latency,
          finishReason: response.data.stop_reason || 'stop',
        }
      };
    } catch (error: any) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      return {
        content: '',
        success: false,
        error: error.response?.data?.error?.message || error.message || String(error),
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
    
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          top_p: mergedOptions.topP,
          stop_sequences: mergedOptions.stopSequences,
          stream: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          responseType: 'stream',
          timeout: mergedOptions.timeout || 30000
        }
      );
      
      const stream = response.data;
      
      return new Promise((resolve, reject) => {
        let usage = { inputTokens: 0, outputTokens: 0 };
        let finishReason: string | undefined;
        
        stream.on('data', (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              if (line.includes('[DONE]')) continue;
              
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                const token = data.delta.text;
                onToken(token);
                accumulatedContent += token;
              }
              
              if (data.type === 'message_stop') {
                finishReason = data.message_stop.stop_reason;
                if (data.message_stop.usage) {
                  usage = data.message_stop.usage;
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
            usage: {
              promptTokens: usage.inputTokens || 0,
              completionTokens: usage.outputTokens || 0,
              totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0)
            },
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
    } catch (error: any) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      return {
        content: '',
        success: false,
        error: error.response?.data?.error?.message || error.message || String(error),
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
      await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [{ role: 'user', content: "test" }],
          max_tokens: 5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      // Si pas d'erreur, le service est disponible
      return { available: true };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      
      // En cas d'erreur de quota ou de limite de taux
      if (error.response?.status === 429) {
        return {
          available: false,
          error: "Rate limit exceeded",
          quotaRemaining: 0
        };
      }
      
      return { 
        available: false, 
        error: errorMsg || String(error)
      };
    }
  }
}

export default AnthropicProvider;
