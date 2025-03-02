// #codebase: [CONTEXTE] Service d'authentification de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer l'authentification, les autorisations et les sessions des utilisateurs.

import * as crypto from 'crypto';
import { Logger } from './logger';
import { UserService } from './userService';
import { NotificationService } from './notificationService';
import { ConfigService } from './configService';
import { EventBus } from './eventBus';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Durée en secondes
}

export interface AuthResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
  userId?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

export class AuthService {
  private logger: Logger;
  private userService: UserService;
  private notificationService: NotificationService;
  private configService: ConfigService;
  private eventBus: EventBus;
  private isInitialized: boolean = false;
  
  // Stockage en mémoire des tokens d'authentification
  private sessions: Map<string, { userId: string, expiresAt: Date }> = new Map();
  private refreshTokens: Map<string, { userId: string, expiresAt: Date }> = new Map();
  
  // Configuration
  private accessTokenExpiry: number = 3600; // 1 heure par défaut
  private refreshTokenExpiry: number = 2592000; // 30 jours par défaut
  private tokenSecret: string = 'default-secret-key-change-in-production';
  
  constructor(
    userService: UserService, 
    notificationService: NotificationService,
    configService: ConfigService
  ) {
    this.logger = new Logger('AuthService');
    this.userService = userService;
    this.notificationService = notificationService;
    this.configService = configService;
    this.eventBus = EventBus.getInstance();
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('AuthService déjà initialisé');
      return;
    }

    this.logger.info('Initialisation du service d\'authentification');
    
    // Charger la configuration
    this.accessTokenExpiry = this.configService.get<number>('auth.accessTokenExpiry', 3600);
    this.refreshTokenExpiry = this.configService.get<number>('auth.refreshTokenExpiry', 2592000);
    this.tokenSecret = this.configService.get<string>('auth.tokenSecret', this.tokenSecret);
    
    // S'assurer que nous n'utilisons pas la clé par défaut en production
    const environment = this.configService.get<string>('environment', 'development');
    if (environment === 'production' && this.tokenSecret === 'default-secret-key-change-in-production') {
      this.logger.error('Clé secrète par défaut utilisée en production. Changez-la immédiatement !');
    }
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'AuthService' });
  }
  
  public async login(username: string, password: string): Promise<AuthResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    try {
      // Récupérer l'utilisateur par nom d'utilisateur ou email
      const user = await this.userService.getUserByUsername(username) || 
                   await this.userService.getUserByEmail(username);
      
      if (!user) {
        this.logger.debug(`Tentative de connexion avec un utilisateur inconnu: ${username}`);
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      if (!user.isActive) {
        this.logger.debug(`Tentative de connexion avec un compte désactivé: ${username}`);
        return { success: false, error: 'Compte désactivé' };
      }
      
      // Dans un système réel, nous vérifierions le hash du mot de passe
      // Pour cet exemple, on considère que la connexion est réussie si l'utilisateur existe
      // REMARQUE: Ceci est une SIMPLIFICATION pour l'exemple, ne jamais faire cela en production !
      
      // Mise à jour de la date de dernière connexion
      await this.userService.updateUser(user.id, { lastLogin: new Date() });
      
      // Définir l'utilisateur courant
      this.userService.setCurrentUser(user);
      
      // Générer des tokens d'authentification
      const tokens = this.generateTokens(user.id);
      
      this.logger.info(`Connexion réussie pour l'utilisateur: ${username}`);
      this.eventBus.emit('user:login', { userId: user.id, username: user.username });
      
      return {
        success: true,
        tokens,
        userId: user.id
      };
    } catch (error) {
      this.logger.error('Erreur lors de la connexion:', error);
      return { success: false, error: 'Erreur interne du serveur' };
    }
  }
  
  public async logout(accessToken: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    const session = this.sessions.get(accessToken);
    if (!session) {
      return false;
    }
    
    // Supprimer les tokens
    this.sessions.delete(accessToken);
    
    // Rechercher et supprimer tous les refresh tokens associés à cet utilisateur
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === session.userId) {
        this.refreshTokens.delete(token);
      }
    }
    
    this.logger.info(`Déconnexion de l'utilisateur: ${session.userId}`);
    this.eventBus.emit('user:logout', { userId: session.userId });
    
    // Réinitialiser l'utilisateur courant
    this.userService.setCurrentUser(null);
    
    return true;
  }
  
  public async logoutAll(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    // Supprimer toutes les sessions de cet utilisateur
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
    
    // Supprimer tous les refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
    
    this.logger.info(`Déconnexion de toutes les sessions pour l'utilisateur: ${userId}`);
    this.eventBus.emit('user:logout-all', { userId });
    
    return true;
  }
  
  public async refreshSession(refreshToken: string): Promise<AuthResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    const refreshData = this.refreshTokens.get(refreshToken);
    if (!refreshData || refreshData.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      return { success: false, error: 'Refresh token invalide ou expiré' };
    }
    
    // Générer de nouveaux tokens
    const tokens = this.generateTokens(refreshData.userId);
    
    // Supprimer l'ancien refresh token
    this.refreshTokens.delete(refreshToken);
    
    this.logger.debug(`Session rafraîchie pour l'utilisateur: ${refreshData.userId}`);
    
    return {
      success: true,
      tokens,
      userId: refreshData.userId
    };
  }
  
  public verifyToken(token: string): string | null {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    
    return session.userId;
  }
  
  private generateTokens(userId: string): AuthTokens {
    // Générer un access token
    const accessToken = crypto.randomBytes(32).toString('hex');
    
    // Générer un refresh token
    const refreshToken = crypto.randomBytes(48).toString('hex');
    
    // Définir les dates d'expiration
    const accessExpiry = new Date(Date.now() + this.accessTokenExpiry * 1000);
    const refreshExpiry = new Date(Date.now() + this.refreshTokenExpiry * 1000);
    
    // Enregistrer les tokens
    this.sessions.set(accessToken, {
      userId,
      expiresAt: accessExpiry
    });
    
    this.refreshTokens.set(refreshToken, {
      userId,
      expiresAt: refreshExpiry
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry
    };
  }
  
  public async checkPermission(userId: string, permission: string): Promise<boolean> {
    // Récupérer les rôles de l'utilisateur
    const roles = await this.userService.getUserRoles(userId);
    
    // Vérifier si l'un des rôles possède la permission demandée
    return roles.some(role => role.permissions.includes(permission));
  }
  
  public async checkRolePermission(role: string, permission: string): Promise<boolean> {
    // Cette fonction devrait vérifier si un rôle possède une permission spécifique
    // Dans une implémentation réelle, cela impliquerait une recherche dans la base de données
    
    // Pour cet exemple, nous définissons simplement quelques rôles et permissions
    const rolePermissions: Record<string, string[]> = {
      'admin': [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
      'user': [Permission.READ, Permission.WRITE],
      'readonly': [Permission.READ]
    };
    
    if (!rolePermissions[role]) {
      return false;
    }
    
    return rolePermissions[role].includes(permission);
  }
  
  public getActiveSessions(): number {
    return this.sessions.size;
  }
  
  public async getUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        count++;
      }
    }
    return count;
  }
  
  public cleanup(): void {
    const now = new Date();
    
    // Nettoyer les sessions expirées
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
    
    // Nettoyer les refresh tokens expirés
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
    
    this.logger.debug('Nettoyage des sessions expirées effectué');
  }
  
  public shutdown(): void {
    this.logger.info('Arrêt du service d\'authentification');
    
    // Sauvegarder les sessions si nécessaire
    // Dans une implémentation réelle, on pourrait vouloir persister les sessions
  }
}
