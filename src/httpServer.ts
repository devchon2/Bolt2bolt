// #codebase: [CONTEXTE] Serveur HTTP de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Fournir un serveur HTTP pour les API REST de l'application.

import * as http from 'http';
import * as url from 'url';
import { Logger } from './logger';
import { ConfigService } from './configService';
import { EventBus } from './eventBus';

export type HttpRequestHandler = (req: http.IncomingMessage, res: http.ServerResponse, next?: () => void) => void | Promise<void>;
export type HttpMiddleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void | Promise<void>;

export interface Route {
  path: string;
  method: string;
  handler: HttpRequestHandler;
  middlewares: HttpMiddleware[];
}

export class HttpServer {
  private logger: Logger;
  private configService: ConfigService;
  private eventBus: EventBus;
  private server: http.Server | null = null;
  private routes: Route[] = [];
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private port: number = 3000;
  private host: string = 'localhost';
  
  constructor(configService: ConfigService) {
    this.logger = new Logger('HttpServer');
    this.configService = configService;
    this.eventBus = EventBus.getInstance();
  }
  
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('HttpServer déjà initialisé');
      return;
    }
    
    this.logger.info('Initialisation du serveur HTTP');
    
    // Charger la configuration
    this.port = this.configService.get<number>('server.port', 3000);
    this.host = this.configService.get<string>('server.host', 'localhost');
    
    // Créer le serveur
    this.server = http.createServer(this.handleRequest.bind(this));
    
    this.isInitialized = true;
    this.eventBus.emit('service:initialized', { service: 'HttpServer' });
  }
  
  public start(): void {
    if (!this.isInitialized) {
      throw new Error('HttpServer not initialized');
    }
    
    if (this.isRunning) {
      this.logger.warn('HttpServer déjà démarré');
      return;
    }
    
    // Démarrer le serveur
    this.server!.listen(this.port, this.host, () => {
      this.isRunning = true;
      this.logger.info(`Serveur HTTP démarré sur http://${this.host}:${this.port}`);
      this.eventBus.emit('server:started', { host: this.host, port: this.port });
    });
    
    // Gérer les erreurs du serveur
    this.server!.on('error', (error) => {
      this.logger.error('Erreur du serveur HTTP:', error);
      this.eventBus.emit('server:error', { error });
    });
  }
  
  public stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isRunning || !this.server) {
        this.isRunning = false;
        resolve();
        return;
      }
      
      this.server.close((error) => {
        if (error) {
          this.logger.error('Erreur lors de l\'arrêt du serveur HTTP:', error);
          reject(error);
          return;
        }
        
        this.isRunning = false;
        this.logger.info('Serveur HTTP arrêté');
        this.eventBus.emit('server:stopped', {});
        resolve();
      });
    });
  }
  
  public get(path: string, handler: HttpRequestHandler, middlewares: HttpMiddleware[] = []): void {
    this.addRoute('GET', path, handler, middlewares);
  }
  
  public post(path: string, handler: HttpRequestHandler, middlewares: HttpMiddleware[] = []): void {
    this.addRoute('POST', path, handler, middlewares);
  }
  
  public put(path: string, handler: HttpRequestHandler, middlewares: HttpMiddleware[] = []): void {
    this.addRoute('PUT', path, handler, middlewares);
  }
  
  public delete(path: string, handler: HttpRequestHandler, middlewares: HttpMiddleware[] = []): void {
    this.addRoute('DELETE', path, handler, middlewares);
  }
  
  private addRoute(method: string, path: string, handler: HttpRequestHandler, middlewares: HttpMiddleware[]): void {
    this.routes.push({
      path,
      method,
      handler,
      middlewares
    });
    
    this.logger.debug(`Route ajoutée: ${method} ${path}`);
  }
  
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const parsedUrl = url.parse(req.url || '/', true);
      const path = parsedUrl.pathname || '/';
      const method = req.method || 'GET';
      
      // Trouver la route correspondante
      const route = this.findRoute(path, method);
      
      if (!route) {
        // Route non trouvée
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Route non trouvée' }));
        return;
      }
      
      // Ajouter les paramètres de requête
      (req as any).query = parsedUrl.query;
      
      // Appliquer les middlewares
      await this.applyMiddlewares(req, res, route.middlewares, async () => {
        // Appeler le gestionnaire de route
        await route.handler(req, res);
      });
    } catch (error) {
      this.logger.error('Erreur lors du traitement de la requête:', error);
      
      // Envoyer une réponse d'erreur
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Erreur interne du serveur' }));
      
      // Émettre un événement d'erreur
      this.eventBus.emit('server:request-error', { error });
    }
  }
  
  private findRoute(path: string, method: string): Route | null {
    // Recherche exacte d'abord
    let route = this.routes.find(r => r.path === path && r.method === method);
    if (route) return route;
    
    // Recherche de routes avec paramètres
    for (const r of this.routes) {
      if (r.method !== method) continue;
      
      const routeParts = r.path.split('/');
      const pathParts = path.split('/');
      
      if (routeParts.length !== pathParts.length) continue;
      
      let match = true;
      const params: Record<string, string> = {};
      
      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        const pathPart = pathParts[i];
        
        if (routePart.startsWith(':')) {
          // Paramètre de route
          const paramName = routePart.substring(1);
          params[paramName] = decodeURIComponent(pathPart);
        } else if (routePart !== pathPart) {
          match = false;
          break;
        }
      }
      
      if (match) {
        route = r;
        break;
      }
    }
    
    return route;
  }
  
  private async applyMiddlewares(
    req: http.IncomingMessage, 
    res: http.ServerResponse, 
    middlewares: HttpMiddleware[], 
    finalHandler: () => Promise<void>
  ): Promise<void> {
    const runMiddleware = async (index: number): Promise<void> => {
      if (index >= middlewares.length) {
        // Tous les middlewares ont été exécutés, appeler le gestionnaire final
        await finalHandler();
        return;
      }
      
      // Appeler le middleware courant
      await middlewares[index](req, res, async () => {
        // Passer au middleware suivant lorsque next() est appelé
        await runMiddleware(index + 1);
      });
    };
    
    // Démarrer l'exécution des middlewares
    await runMiddleware(0);
  }
  
  public shutdown(): Promise<void> {
    this.logger.info('Arrêt du serveur HTTP');
    return this.stop();
  }
  
  public isServerRunning(): boolean {
    return this.isRunning;
  }
  
  public getHost(): string {
    return this.host;
  }
  
  public getPort(): number {
    return this.port;
  }
  
  public getBaseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }
}