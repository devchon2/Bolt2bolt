// #codebase: [CONTEXTE] Service API de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Fournir des points d'entrée REST pour l'application.

import { Logger } from './logger';
import { HttpServer, HttpRequestHandler } from './httpServer';
import { ConfigService } from './configService';
import { AuthService } from './authService';
import { UserService } from './userService';
import { EventBus } from './eventBus';

export interface ApiEndpoint {
  path: string;
  method: string;
  handler: HttpRequestHandler;
  requiresAuth: boolean;
  permissions?: string[];
}

export class ApiService {
  private logger: Logger;
  private configService: ConfigService;
  private eventBus: EventBus;
  private httpServer: HttpServer | null = null;
  private authService: AuthService | null = null;
  private userService: UserService | null = null;
  private isInitialized: boolean = false;
  private endpoints: ApiEndpoint[] = [];
  private apiBasePath: string = '/api';
  private apiVersion: string = 'v1';
  
  constructor(configService: ConfigService) {
    this.logger = new Logger('ApiService');
    this.configService = configService;
    this.eventBus = EventBus.getInstance();
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('ApiService déjà initialisé');
      return;
    }

    this.logger.info('Initialisation du service API');
    
    // Charger la configuration
    this.apiBasePath = this.configService.get<string>('api.basePath', '/api');
    this.apiVersion = this.configService.get<string>('api.version', 'v1');
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'ApiService' });
  }
  
  public setHttpServer(httpServer: HttpServer): void {
    this.httpServer = httpServer;
  }
  
  public setAuthService(authService: AuthService): void {
    this.authService = authService;
  }
  
  public setUserService(userService: UserService): void {
    this.userService = userService;
  }
  
  public registerEndpoints(): void {
    if (!this.httpServer) {
      this.logger.error('HttpServer non défini, impossible d\'enregistrer les endpoints');
      return;
    }
    
    for (const endpoint of this.endpoints) {
      const path = `${this.apiBasePath}/${this.apiVersion}${endpoint.path}`;
      
      // Ajouter un middleware d'authentification si nécessaire
      const middlewares = [];
      if (endpoint.requiresAuth) {
        middlewares.push(this.authMiddleware.bind(this));
      }
      
      // Ajouter un middleware de vérification des permissions si nécessaire
      if (endpoint.permissions && endpoint.permissions.length > 0) {
        middlewares.push(this.permissionsMiddleware(endpoint.permissions));
      }
      
      // Enregistrer la route
      switch (endpoint.method.toUpperCase()) {
        case 'GET':
          this.httpServer.get(path, endpoint.handler, middlewares);
          break;
        case 'POST':
          this.httpServer.post(path, endpoint.handler, middlewares);
          break;
        case 'PUT':
          this.httpServer.put(path, endpoint.handler, middlewares);
          break;
        case 'DELETE':
          this.httpServer.delete(path, endpoint.handler, middlewares);
          break;
        default:
          this.logger.warn(`Méthode HTTP non supportée: ${endpoint.method}`);
      }
      
      this.logger.debug(`Endpoint enregistré: ${endpoint.method} ${path}`);
    }
  }
  
  public registerEndpoint(endpoint: ApiEndpoint): void {
    this.endpoints.push(endpoint);
  }
  
  public registerDefaultEndpoints(): void {
    // Enregistrer les endpoints par défaut
    this.registerEndpoint({
      path: '/health',
      method: 'GET',
      handler: this.healthCheckHandler.bind(this),
      requiresAuth: false
    });
    
    this.registerEndpoint({
      path: '/status',
      method: 'GET',
      handler: this.statusHandler.bind(this),
      requiresAuth: true,
      permissions: ['admin']
    });
    
    this.registerEndpoint({
      path: '/users',
      method: 'GET',
      handler: this.getUsersHandler.bind(this),
      requiresAuth: true,
      permissions: ['admin']
    });
    
    this.registerEndpoint({
      path: '/users/:id',
      method: 'GET',
      handler: this.getUserHandler.bind(this),
      requiresAuth: true
    });
    
    this.registerEndpoint({
      path: '/auth/login',
      method: 'POST',
      handler: this.loginHandler.bind(this),
      requiresAuth: false
    });
    
    this.registerEndpoint({
      path: '/auth/logout',
      method: 'POST',
      handler: this.logoutHandler.bind(this),
      requiresAuth: true
    });
    
    this.registerEndpoint({
      path: '/auth/refresh',
      method: 'POST',
      handler: this.refreshTokenHandler.bind(this),
      requiresAuth: false
    });

    this.registerEndpoint({
      path: '/users/:id/picture',
      method: 'PUT',
      handler: this.updateProfilePictureHandler.bind(this),
      requiresAuth: true
    });
  }
  
  // Middleware d'authentification
  private async authMiddleware(req: any, res: any, next: () => void): Promise<void> {
    if (!this.authService) {
      res.status(500).json({ error: 'Service d\'authentification non disponible' });
      return;
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentification requise' });
      return;
    }
    
    const token = authHeader.substring(7);
    const userId = this.authService.verifyToken(token);
    
    if (!userId) {
      res.status(401).json({ error: 'Token invalide ou expiré' });
      return;
    }
    
    // Ajouter l'ID d'utilisateur à la requête pour un accès facile
    req.userId = userId;
    
    // Continuer le traitement
    next();
  }
  
  // Middleware de vérification des permissions
  private permissionsMiddleware(requiredPermissions: string[]): HttpRequestHandler {
    return async (req: any, res: any, next: () => void) => {
      if (!this.authService) {
        res.status(500).json({ error: 'Service d\'authentification non disponible' });
        return;
      }
      
      if (!req.userId) {
        res.status(401).json({ error: 'Utilisateur non authentifié' });
        return;
      }
      
      // Vérifier les permissions
      for (const permission of requiredPermissions) {
        const hasPermission = await this.authService.checkPermission(req.userId, permission);
        if (!hasPermission) {
          res.status(403).json({ error: 'Permissions insuffisantes' });
          return;
        }
      }
      
      // Continuer le traitement
      next();
    };
  }
  
  // Gestionnaires d'API par défaut
  private async healthCheckHandler(req: any, res: any): Promise<void> {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('app.version', '1.0.0')
    });
  }
  
  private async statusHandler(req: any, res: any): Promise<void> {
    if (!this.authService) {
      res.status(500).json({ error: 'Service d\'authentification non disponible' });
      return;
    }
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('app.version', '1.0.0'),
      activeSessions: this.authService.getActiveSessions()
    });
  }
  
  private async getUsersHandler(req: any, res: any): Promise<void> {
    if (!this.userService) {
      res.status(500).json({ error: 'Service utilisateur non disponible' });
      return;
    }
    
    const users = await this.userService.getAllUsers();
    res.json({ users });
  }
  
  private async getUserHandler(req: any, res: any): Promise<void> {
    if (!this.userService) {
      res.status(500).json({ error: 'Service utilisateur non disponible' });
      return;
    }
    
    // Extraire l'ID de l'URL
    const userId = req.url.split('/').pop();
    
    // Vérifier si l'utilisateur demande ses propres informations ou a des permissions admin
    const isOwnProfile = userId === req.userId;
    const isAdmin = this.authService ? await this.authService.checkPermission(req.userId, 'admin') : false;
    
    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({ error: 'Permissions insuffisantes' });
      return;
    }
    
    const user = await this.userService.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    
    res.json({ user });
  }
  
  private async loginHandler(req: any, res: any): Promise<void> {
    if (!this.authService) {
      res.status(500).json({ error: 'Service d\'authentification non disponible' });
      return;
    }
    
    // Analyser le corps de la requête
    let body: any;
    try {
      body = await this.parseRequestBody(req);
    } catch (error) {
      res.status(400).json({ error: 'Format de requête invalide' });
      return;
    }
    
    // Valider les données de connexion
    const { username, password } = body;
    if (!username || !password) {
      res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
      return;
    }
    
    // Tentative de connexion
    const result = await this.authService.login(username, password);
    
    if (result.success) {
      res.json({
        success: true,
        tokens: result.tokens,
        userId: result.userId
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Échec de l\'authentification'
      });
    }
  }
  
  private async logoutHandler(req: any, res: any): Promise<void> {
    if (!this.authService) {
      res.status(500).json({ error: 'Service d\'authentification non disponible' });
      return;
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token d\'authentification manquant' });
      return;
    }
    
    const token = authHeader.substring(7);
    const success = await this.authService.logout(token);
    
    if (success) {
      res.json({ success: true, message: 'Déconnexion réussie' });
    } else {
      res.status(400).json({ success: false, error: 'Échec de la déconnexion' });
    }
  }
  
  private async refreshTokenHandler(req: any, res: any): Promise<void> {
    if (!this.authService) {
      res.status(500).json({ error: 'Service d\'authentification non disponible' });
      return;
    }
    
    // Analyser le corps de la requête
    let body: any;
    try {
      body = await this.parseRequestBody(req);
    } catch (error) {
      res.status(400).json({ error: 'Format de requête invalide' });
      return;
    }
    
    const { refreshToken } = body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token manquant' });
      return;
    }
    
    const result = await this.authService.refreshSession(refreshToken);
    
    if (result.success) {
      res.json({
        success: true,
        tokens: result.tokens,
        userId: result.userId
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Échec du rafraîchissement de session'
      });
    }
  }
  
  private async updateProfilePictureHandler(req: any, res: any): Promise<void> {
    if (!this.userService) {
      res.status(500).json({ error: 'Service utilisateur non disponible' });
      return;
    }
    // Extraire l'ID de l'utilisateur à partir de l'URL
    const userId = req.url.split('/').slice(-2)[0];
    let body: any;
    try {
      body = await this.parseRequestBody(req);
    } catch (error) {
      res.status(400).json({ error: 'Données de requête invalides' });
      return;
    }
    const { imageUrl } = body;
    if (!imageUrl) {
      res.status(400).json({ error: "Le champ 'imageUrl' est requis" });
      return;
    }
    
    const updatedUser = await this.userService.updateProfilePicture(userId, imageUrl);
    if (!updatedUser) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    
    res.json({ success: true, user: updatedUser });
  }

  private parseRequestBody(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      
      req.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve(body);
        } catch (error) {
          reject(error);
        }
      });
      
      req.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
  
  public shutdown(): void {
    this.logger.info('Arrêt du service API');
  }
}
