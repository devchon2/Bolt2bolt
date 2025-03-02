// #codebase: [CONTEXTE] Service de gestion des utilisateurs de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer les opérations liées aux utilisateurs.

import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger';
import { NotificationService } from './notificationService';
import { EventBus } from './eventBus';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  preferences?: Record<string, any>;
  roles: string[];
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export class UserService {
  private logger: Logger;
  private notificationService: NotificationService;
  private eventBus: EventBus;
  private users: Map<string, User> = new Map();
  private roles: Map<string, UserRole> = new Map();
  private isInitialized: boolean = false;
  private currentUser: User | null = null;
  
  constructor(notificationService: NotificationService) {
    this.logger = new Logger('UserService');
    this.notificationService = notificationService;
    this.eventBus = EventBus.getInstance();
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('UserService déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du service utilisateur');
    
    // Initialiser les rôles par défaut
    this.initDefaultRoles();
    
    // Créer un utilisateur admin par défaut
    this.createDefaultAdminUser();
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'UserService' });
  }
  
  private initDefaultRoles(): void {
    // Rôle admin
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrateur',
      permissions: ['read', 'write', 'delete', 'admin']
    });
    
    // Rôle utilisateur standard
    this.roles.set('user', {
      id: 'user',
      name: 'Utilisateur',
      permissions: ['read', 'write']
    });
    
    // Rôle lecture seule
    this.roles.set('readonly', {
      id: 'readonly',
      name: 'Lecture seule',
      permissions: ['read']
    });
  }
  
  private createDefaultAdminUser(): void {
    const adminUser: User = {
      id: 'admin',
      username: 'admin',
      email: 'admin@bolt2bolt.com',
      firstName: 'Admin',
      lastName: 'Système',
      isActive: true,
      createdAt: new Date(),
      roles: ['admin']
    };
    
    this.users.set(adminUser.id, adminUser);
  }
  
  public async getUserById(userId: string): Promise<User | null> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    return this.users.get(userId) || null;
  }
  
  public async getUserByEmail(email: string): Promise<User | null> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    const user = Array.from(this.users.values()).find(user => user.email === email);
    return user || null;
  }
  
  public async getUserByUsername(username: string): Promise<User | null> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    const user = Array.from(this.users.values()).find(user => user.username === username);
    return user || null;
  }

  public async getUserByUsernameOrEmail(identifier: string): Promise<User | null> {
    const user = await this.getUserByUsername(identifier) || await this.getUserByEmail(identifier);
    return user || null;
  }
  
  public async createUser(userData: {
    username: string;
    email: string;
    password: string; // Dans un système réel, ce serait haché avant stockage
    firstName: string;
    lastName: string;
  }): Promise<User> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    if (Array.from(this.users.values()).some(user => user.email === userData.email)) {
      throw new Error('Email already exists');
    }
    
    if (Array.from(this.users.values()).some(user => user.username === userData.username)) {
      throw new Error('Username already exists');
    }
    
    // Créer un nouvel utilisateur
    const newUser: User = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: true,
      createdAt: new Date(),
      roles: ['user']
    };
    
    // Stocker l'utilisateur (dans un système réel, on stockerait aussi le mot de passe haché)
    this.users.set(newUser.id, newUser);
    
    this.logger.info(`Nouvel utilisateur créé: ${newUser.username} (${newUser.id})`);
    this.eventBus.emit('user:created', { userId: newUser.id, username: newUser.username });
    
    return newUser;
  }
  
  public async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    
    // Mettre à jour les champs
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
    if (updateData.lastLogin !== undefined) user.lastLogin = updateData.lastLogin;
    if (updateData.preferences !== undefined) user.preferences = updateData.preferences;
    if (updateData.roles !== undefined) user.roles = updateData.roles;
    
    this.logger.info(`Utilisateur mis à jour: ${user.username} (${user.id})`);
    this.eventBus.emit('user:updated', { userId: user.id, username: user.username });
    
    return user;
  }
  
  public async deleteUser(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }
    
    // Supprimer l'utilisateur
    this.users.delete(userId);
    
    this.logger.info(`Utilisateur supprimé: ${user.username} (${user.id})`);
    this.eventBus.emit('user:deleted', { userId: user.id, username: user.username });
    
    return true;
  }
  
  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    
    if (user) {
      this.eventBus.emit('user:login', { userId: user.id, username: user.username });
    } else {
      this.eventBus.emit('user:logout', {});
    }
  }
  
  public getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  public isLoggedIn(): boolean {
    return this.currentUser !== null;
  }
  
  public async updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<User | null> {
    return this.updateUser(userId, { preferences });
  }
  
  public async getUserRoles(userId: string): Promise<UserRole[]> {
    const user = this.users.get(userId);
    if (!user) {
      return [];
    }
    
    return user.roles.map(roleId => this.roles.get(roleId)).filter(role => role !== undefined) as UserRole[];
  }
  
  public async getAllUsers(options: { active?: boolean } = {}): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (options.active !== undefined) {
      users = users.filter(user => user.isActive === options.active);
    }
    
    return users;
  }
  
  public shutdown(): void {
    this.logger.info('Arrêt du service utilisateur');
  }

  public async updateProfilePicture(userId: string, imageUrl: string): Promise<User | null> {
    if (!this.isInitialized) {
      throw new Error('UserService not initialized');
    }
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    // Ajouter ou mettre à jour la propriété picture dans les préférences
    user.preferences = {
      ...user.preferences,
      picture: imageUrl
    };
    this.logger.info(`Photo de profil mise à jour pour ${user.username} (${user.id})`);
    this.eventBus.emit('user:profilePictureUpdated', { userId: user.id, picture: imageUrl });
    return user;
  }
}
