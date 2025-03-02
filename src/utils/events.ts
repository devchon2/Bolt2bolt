/**
 * Système d'événements pour la communication entre composants
 */

type EventHandler = (...args: any[]) => void;

// Liste des événements disponibles dans l'application
export enum Events {
  // Événements d'analyse
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_COMPLETED = 'analysis:completed',
  
  // Événements d'optimisation
  OPTIMIZATION_STARTED = 'optimization:started',
  OPTIMIZATION_COMPLETED = 'optimization:completed',
  
  // Événements de validation
  VALIDATION_STARTED = 'validation:started',
  VALIDATION_COMPLETED = 'validation:completed',
  
  // Événements de rapport
  REPORT_GENERATED = 'report:generated',
  
  // Événements de processus global
  PROCESS_STARTED = 'process:started',
  PROCESS_COMPLETED = 'process:completed',
  PROCESS_ERROR = 'process:error',
  
  // Événements de fichier
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  FILE_ERROR = 'file:error'
}

// Implémentation simple d'un bus d'événements
class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  
  /**
   * Enregistre un gestionnaire pour un type d'événement
   * @param eventType Type d'événement
   * @param handler Fonction de gestion
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    const handlers = this.handlers.get(eventType)!;
    handlers.push(handler);
  }
  
  /**
   * Supprime un gestionnaire pour un type d'événement
   * @param eventType Type d'événement
   * @param handler Fonction de gestion à supprimer
   */
  off(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      return;
    }
    
    const handlers = this.handlers.get(eventType)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Émet un événement avec des données
   * @param eventType Type d'événement
   * @param data Données à transmettre
   */
  emit(eventType: string, data?: any): void {
    if (!this.handlers.has(eventType)) {
      return;
    }
    
    const handlers = this.handlers.get(eventType)!;
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  }
  
  /**
   * Émet un événement une seule fois pour le premier gestionnaire
   * @param eventType Type d'événement
   * @param data Données à transmettre
   */
  emitOnce(eventType: string, data?: any): void {
    if (!this.handlers.has(eventType) || this.handlers.get(eventType)!.length === 0) {
      return;
    }
    
    const handlers = this.handlers.get(eventType)!;
    const handler = handlers[0];
    
    try {
      handler(data);
    } catch (error) {
      console.error(`Error in event handler for ${eventType}:`, error);
    }
  }
  
  /**
   * Réinitialise tous les gestionnaires d'événements
   */
  reset(): void {
    this.handlers.clear();
  }
}

// Exporte une instance singleton du bus d'événements
export const eventBus = new EventBus();
