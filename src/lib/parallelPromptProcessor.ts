import pLimit from 'p-limit';
import { LLMProvider, LLMResponse, LLMOptions } from './types/llm';
import { performance } from 'perf_hooks';

export interface PromptTask {
  id: string;
  prompt: string;
  priority: number;
  options?: LLMOptions;
}

export interface PromptResult {
  id: string;
  response: LLMResponse;
  latency: number;
  success: boolean;
}

export class ParallelPromptProcessor {
  private llmProvider: LLMProvider;
  private concurrency: number;
  private queue: PromptTask[];
  private metrics: {
    totalProcessed: number;
    successCount: number;
    failCount: number;
    avgLatency: number;
    maxLatency: number;
  };
  
  /**
   * Crée une nouvelle instance de traitement parallèle des prompts
   * @param llmProvider Le fournisseur LLM à utiliser
   * @param concurrency Nombre maximum de requêtes concurrentes
   */
  constructor(llmProvider: LLMProvider, concurrency = 5) {
    this.llmProvider = llmProvider;
    this.concurrency = concurrency;
    this.queue = [];
    this.metrics = {
      totalProcessed: 0,
      successCount: 0,
      failCount: 0,
      avgLatency: 0,
      maxLatency: 0
    };
  }
  
  /**
   * Ajoute un ou plusieurs prompts à la file d'attente
   * @param tasks Tâches de prompt à traiter
   */
  addTasks(tasks: PromptTask | PromptTask[]): void {
    const tasksArray = Array.isArray(tasks) ? tasks : [tasks];
    this.queue.push(...tasksArray);
    
    // Trie la file d'attente par priorité (décroissante)
    this.queue.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Traite tous les prompts dans la file d'attente de manière parallèle
   * @returns Les résultats de tous les traitements de prompts
   */
  async processAll(): Promise<PromptResult[]> {
    const limit = pLimit(this.concurrency);
    const tasks = this.queue.splice(0, this.queue.length);
    
    const promises = tasks.map(task => 
      limit(() => this.processPrompt(task))
    );
    
    return await Promise.all(promises);
  }
  
  /**
   * Traite un seul prompt
   * @param task La tâche de prompt à traiter
   * @returns Le résultat du traitement
   */
  private async processPrompt(task: PromptTask): Promise<PromptResult> {
    const start = performance.now();
    let success = true;
    let response: LLMResponse;
    
    try {
      response = await this.llmProvider.generateResponse(task.prompt, task.options);
    } catch (error) {
      success = false;
      response = {
        content: '',
        error: error instanceof Error ? error.message : String(error),
        success: false
      };
    }
    
    const latency = performance.now() - start;
    
    // Mise à jour des métriques
    this.updateMetrics(latency, success);
    
    return {
      id: task.id,
      response,
      latency,
      success
    };
  }
  
  /**
   * Met à jour les métriques après le traitement d'un prompt
   * @param latency Latence du traitement
   * @param success Si le traitement a réussi
   */
  private updateMetrics(latency: number, success: boolean): void {
    this.metrics.totalProcessed++;
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failCount++;
    }
    
    // Mise à jour de la latence moyenne
    this.metrics.avgLatency = 
      (this.metrics.avgLatency * (this.metrics.totalProcessed - 1) + latency) / 
      this.metrics.totalProcessed;
      
    // Mise à jour de la latence maximale
    if (latency > this.metrics.maxLatency) {
      this.metrics.maxLatency = latency;
    }
  }
  
  /**
   * Récupère les métriques actuelles de traitement
   * @returns Les métriques de traitement
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Réinitialise les métriques de traitement
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      successCount: 0,
      failCount: 0,
      avgLatency: 0,
      maxLatency: 0
    };
  }
}

/**
 * Fonction utilitaire pour paralléliser les prompts comme mentionné dans le document
 * @param prompts Liste des prompts à traiter
 * @param concurrency Nombre maximum de requêtes concurrentes
 * @returns Les résultats des traitements de prompts
 */
export const parallelizePrompts = async (
  prompts: string[],
  provider: LLMProvider,
  concurrency = 5
): Promise<LLMResponse[]> => {
  const processor = new ParallelPromptProcessor(provider, concurrency);
  
  const tasks: PromptTask[] = prompts.map((prompt, index) => ({
    id: `prompt-${index}`,
    prompt,
    priority: 1, // Priorité par défaut
    options: {}
  }));
  
  processor.addTasks(tasks);
  const results = await processor.processAll();
  
  return results.map(result => result.response);
};

export default parallelizePrompts;
