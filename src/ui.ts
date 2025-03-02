// #codebase: [CONTEXTE] Service d'interface utilisateur de l'application.
// #codebase: [DIRECTIVE] Fournir une abstraction pour l'interface utilisateur.

import { Logger } from './logger';
import { NotificationService, Notification, NotificationType } from './notificationService';

export enum UiTheme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export class UiService {
  private logger: Logger;
  private notificationService: NotificationService;
  private isInitialized: boolean = false;
  private theme: UiTheme = UiTheme.SYSTEM;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(notificationService: NotificationService) {
    this.logger = new Logger('UiService');
    this.notificationService = notificationService;
  }

  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('UiService déjà initialisé');
      return;
    }

    this.logger.info('Initialisation du service UI');
    
    // S'abonner aux notifications pour les afficher dans l'UI
    this.notificationService.on('notification', (notification) => {
      this.showNotification(notification);
    });

    this.isInitialized = true;
    
    // Émettre un événement d'initialisation
    this.emit('initialized', {});
  }

  public setTheme(theme: UiTheme): void {
    this.theme = theme;
    this.logger.debug(`Thème UI défini à ${theme}`);
    this.emit('themeChanged', { theme });
    
    // Dans une application réelle, on mettrait à jour les styles CSS
    console.log(`[UI] Thème changé en: ${theme}`);
  }

  public getTheme(): UiTheme {
    return this.theme;
  }

  public showNotification(notification: Notification): void {
    // Dans une application réelle, cela afficherait une notification dans l'UI
    console.log(`[UI] Notification: ${notification.title} - ${notification.message}`);
    
    // Émettre un événement de notification affichée
    this.emit('notificationShown', { notification });
  }

  public showDialog(title: string, message: string, options: { 
    type?: 'info' | 'warning' | 'error' | 'confirm', 
    buttons?: string[] 
  } = {}): Promise<string> {
    const type = options.type || 'info';
    const buttons = options.buttons || ['OK'];
    
    // Dans une application réelle, cela ouvrirait une boîte de dialogue
    this.logger.debug(`Affichage d'une boîte de dialogue: ${title}`);
    console.log(`[UI] Dialogue (${type}): ${title} - ${message}`);
    console.log(`[UI] Boutons: ${buttons.join(', ')}`);
    
    // Simuler une interaction utilisateur (dans une vraie app, cela attendrait le clic)
    return Promise.resolve(buttons[0]);
  }

  public showToast(message: string, type: NotificationType = NotificationType.INFO, duration: number = 3000): void {
    // Dans une application réelle, cela afficherait un toast
    this.logger.debug(`Affichage d'un toast: ${message}`);
    console.log(`[UI] Toast (${type}): ${message} (durée: ${duration}ms)`);
    
    // Émettre un événement de toast affiché
    this.emit('toastShown', { message, type, duration });
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  public off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }
  
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error(`Erreur dans un gestionnaire d'événement UI: ${error}`);
        }
      });
    }
  }

  public shutdown(): void {
    this.logger.info('Arrêt du service UI');
    this.listeners.clear();
    
    // Afficher un message d'arrêt dans l'UI
    console.log(`[UI] Application en cours de fermeture...`);
  }
}
