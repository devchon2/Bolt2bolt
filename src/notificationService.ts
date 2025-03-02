// #codebase: [CONTEXTE] Service de notification de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer l'envoi de notifications aux utilisateurs.

import { Logger } from './logger';
import { ConfigService } from './configService';
import { EventBus } from './eventBus';

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  data?: Record<string, any>;
}

export interface NotificationOptions {
  userId?: string;
  data?: Record<string, any>;
  persistent?: boolean;
}

export class NotificationService {
  private logger: Logger;
  private configService: ConfigService;
  private eventBus: EventBus;
  private notifications: Map<string, Notification> = new Map();
  private isInitialized: boolean = false;
  private notificationCounter: number = 0;
  
  constructor(configService: ConfigService) {
    this.logger = new Logger('NotificationService');
    this.configService = configService;
    this.eventBus = EventBus.getInstance();
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('NotificationService déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du service de notification');
    
    // S'abonner aux événements système pertinents
    this.eventBus.on('system:error', this.handleSystemError.bind(this));
    this.eventBus.on('service:initialized', this.handleServiceInitialized.bind(this));
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'NotificationService' });
  }
  
  public info(title: string, message: string, options: NotificationOptions = {}): string {
    return this.createNotification(NotificationType.INFO, title, message, options);
  }
  
  public success(title: string, message: string, options: NotificationOptions = {}): string {
    return this.createNotification(NotificationType.SUCCESS, title, message, options);
  }
  
  public warning(title: string, message: string, options: NotificationOptions = {}): string {
    return this.createNotification(NotificationType.WARNING, title, message, options);
  }
  
  public error(title: string, message: string, options: NotificationOptions = {}): string {
    return this.createNotification(NotificationType.ERROR, title, message, options);
  }
  
  private createNotification(
    type: NotificationType,
    title: string,
    message: string,
    options: NotificationOptions
  ): string {
    if (!this.isInitialized) {
      this.logger.warn('NotificationService non initialisé');
    }
    
    const id = this.generateNotificationId();
    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      userId: options.userId,
      data: options.data
    };
    
    this.notifications.set(id, notification);
    
    // Émettre un événement de notification
    this.eventBus.emit('notification:created', {
      notification,
      persistent: options.persistent || false
    });
    
    this.logger.debug(`Notification créée: [${type}] ${title}`);
    
    return id;
  }
  
  public getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }
  
  public getUserNotifications(userId: string): Notification[] {
    const userNotifications: Notification[] = [];
    
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId) {
        userNotifications.push(notification);
      }
    }
    
    return userNotifications;
  }
  
  public markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }
    
    notification.read = true;
    this.eventBus.emit('notification:read', { notificationId: id });
    
    return true;
  }
  
  public markAllAsRead(userId: string): number {
    let count = 0;
    
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        count++;
      }
    }
    
    if (count > 0) {
      this.eventBus.emit('notification:read-all', { userId, count });
    }
    
    return count;
  }
  
  public deleteNotification(id: string): boolean {
    if (!this.notifications.has(id)) {
      return false;
    }
    
    this.notifications.delete(id);
    this.eventBus.emit('notification:deleted', { notificationId: id });
    
    return true;
  }
  
  public deleteUserNotifications(userId: string): number {
    const notificationsToDelete: string[] = [];
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        notificationsToDelete.push(id);
      }
    }
    
    for (const id of notificationsToDelete) {
      this.notifications.delete(id);
    }
    
    if (notificationsToDelete.length > 0) {
      this.eventBus.emit('notification:deleted-all', { userId, count: notificationsToDelete.length });
    }
    
    return notificationsToDelete.length;
  }
  
  public getStatistics(): {
    total: number;
    byType: Record<NotificationType, number>;
    unreadCount: number;
  } {
    const result = {
      total: this.notifications.size,
      byType: {
        [NotificationType.INFO]: 0,
        [NotificationType.SUCCESS]: 0,
        [NotificationType.WARNING]: 0,
        [NotificationType.ERROR]: 0
      },
      unreadCount: 0
    };
    
    for (const notification of this.notifications.values()) {
      result.byType[notification.type]++;
      
      if (!notification.read) {
        result.unreadCount++;
      }
    }
    
    return result;
  }
  
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${this.notificationCounter++}`;
  }
  
  private handleSystemError(event: any): void {
    const { type, error } = event;
    
    this.error(
      'Erreur système',
      `Une erreur système de type "${type}" s'est produite: ${error.message}`,
      { persistent: true, data: { type, errorStack: error.stack } }
    );
  }
  
  private handleServiceInitialized(event: any): void {
    const { service } = event;
    
    if (service !== 'NotificationService') {
      this.info(
        'Service initialisé',
        `Le service "${service}" a été initialisé avec succès`,
        { data: { service } }
      );
    }
  }
  
  public cleanup(): void {
    // Supprimer les notifications anciennes
    const maxAge = this.configService.get<number>('notifications.maxAgeMillis', 24 * 60 * 60 * 1000); // 24 heures par défaut
    const now = new Date();
    
    const notificationsToDelete: string[] = [];
    
    for (const [id, notification] of this.notifications.entries()) {
      const age = now.getTime() - notification.timestamp.getTime();
      
      if (age > maxAge) {
        notificationsToDelete.push(id);
      }
    }
    
    for (const id of notificationsToDelete) {
      this.notifications.delete(id);
    }
    
    if (notificationsToDelete.length > 0) {
      this.logger.debug(`${notificationsToDelete.length} notifications anciennes supprimées`);
    }
  }
  
  public shutdown(): void {
    this.logger.info('Arrêt du service de notification');
    
    // Se désabonner des événements système
    this.eventBus.off('system:error', this.handleSystemError.bind(this));
    this.eventBus.off('service:initialized', this.handleServiceInitialized.bind(this));
  }
}
