// #codebase: [CONTEXTE] Service de gestion des projets de l'application Bolt2bolt.
// #codebase: [DIRECTIVE] Gérer le cycle de vie des projets et leurs ressources.

import { Logger } from './logger';
import { NotificationService } from './notificationService';
import { UserService, UserProfile } from './userService';
import { EventEmitter } from 'events';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  members: ProjectMember[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
}

export class ProjectService {
  private logger: Logger;
  private notificationService: NotificationService;
  private userService: UserService;
  private emitter: EventEmitter;
  private isInitialized: boolean = false;
  private projects: Map<string, Project> = new Map();

  constructor(
    notificationService: NotificationService,
    userService: UserService
  ) {
    this.logger = new Logger('ProjectService');
    this.notificationService = notificationService;
    this.userService = userService;
    this.emitter = new EventEmitter();
  }

  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('ProjectService déjà initialisé');
      return;
    }

    this.logger.info('Initialisation du service de projets');
    this.loadMockProjects(); // En production, charger depuis la base de données
    this.isInitialized = true;
    this.emitter.emit('initialized');
  }

  private loadMockProjects(): void {
    // Données factices pour le développement
    const project1: Project = {
      id: 'proj_001',
      name: 'Projet Demo',
      description: 'Un projet de démonstration pour Bolt2bolt',
      status: ProjectStatus.ACTIVE,
      members: [
        { 
          userId: '1', // Admin user
          role: 'owner',
          joinedAt: new Date('2023-01-01')
        },
        { 
          userId: '2', // Regular user
          role: 'editor',
          joinedAt: new Date('2023-01-02')
        }
      ],
      tags: ['demo', 'test'],
      metadata: {
        priority: 'high',
        deadline: '2023-12-31'
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      createdBy: '1' // Admin user
    };

    const project2: Project = {
      id: 'proj_002',
      name: 'Projet Archivé',
      description: 'Un ancien projet terminé',
      status: ProjectStatus.ARCHIVED,
      members: [
        { 
          userId: '1', // Admin user
          role: 'owner',
          joinedAt: new Date('2022-06-01')
        }
      ],
      tags: ['ancien', 'archive'],
      metadata: {
        priority: 'low',
        completedDate: '2022-12-15'
      },
      createdAt: new Date('2022-06-01'),
      updatedAt: new Date('2022-12-15'),
      createdBy: '1' // Admin user
    };

    this.projects.set(project1.id, project1);
    this.projects.set(project2.id, project2);
  }

  public async getProjectById(id: string): Promise<Project | null> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    const project = this.projects.get(id);
    if (!project) {
      this.logger.debug(`Project with ID ${id} not found`);
      return null;
    }
    return { ...project }; // Return a copy to prevent direct modification
  }

  public async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    // Validation
    if (!projectData.name) {
      throw new Error('Project name is required');
    }

    // Vérifier que l'utilisateur existe
    const creator = await this.userService.getUserById(projectData.createdBy);
    if (!creator) {
      throw new Error(`User with ID ${projectData.createdBy} not found`);
    }

    // Créer le projet
    const now = new Date();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      ...projectData,
    };

    this.projects.set(newProject.id, newProject);
    this.logger.info(`New project created: ${newProject.name} (${newProject.id})`);
    this.emitter.emit('project:created', newProject);
    
    this.notificationService.success(
      'Projet créé',
      `Le projet "${newProject.name}" a été créé avec succès`
    );

    return { ...newProject };
  }

  public async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'createdBy'>>): Promise<Project | null> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    const project = this.projects.get(id);
    if (!project) {
      this.logger.warn(`Attempt to update non-existent project: ${id}`);
      return null;
    }

    // Update project data
    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };

    this.projects.set(id, updatedProject);
    this.logger.info(`Project updated: ${updatedProject.name} (${updatedProject.id})`);
    this.emitter.emit('project:updated', updatedProject);

    return { ...updatedProject };
  }

  public async deleteProject(id: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    if (!this.projects.has(id)) {
      this.logger.warn(`Attempt to delete non-existent project: ${id}`);
      return false;
    }

    const project = this.projects.get(id)!;
    this.projects.delete(id);
    this.logger.info(`Project deleted: ${project.name} (${project.id})`);
    this.emitter.emit('project:deleted', project);

    return true;
  }

  public async addMemberToProject(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<Project | null> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      this.logger.warn(`Attempt to add member to non-existent project: ${projectId}`);
      return null;
    }

    // Vérifier que l'utilisateur existe
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Vérifier si l'utilisateur est déjà membre
    const existingMember = project.members.find(member => member.userId === userId);
    if (existingMember) {
      // Mettre à jour le rôle si nécessaire
      existingMember.role = role;
    } else {
      // Ajouter le nouvel utilisateur
      project.members.push({
        userId,
        role,
        joinedAt: new Date(),
      });
    }

    project.updatedAt = new Date();
    this.projects.set(projectId, project);
    
    this.logger.info(`User ${userId} added as ${role} to project ${projectId}`);
    this.emitter.emit('project:member:added', { project, userId, role });
    
    this.notificationService.info(
      'Membre ajouté',
      `${user.username} a été ajouté au projet "${project.name}"`
    );

    return { ...project };
  }

  public async removeMemberFromProject(projectId: string, userId: string): Promise<Project | null> {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }

    const project = this.projects.get(projectId);
    if (!project) {
      this.logger.warn(`Attempt to remove member from non-existent project: ${projectId}`);
      return null;
    }

    // Vérifier si l'utilisateur est membre
    const memberIndex = project.members.findIndex(member => member.userId === userId);
    if (memberIndex === -1) {
      this.logger.warn(`User ${userId} is not a member of project ${projectId}`);
      return null;
    }

    // Supprimer le membre
    project.members.splice(memberIndex, 1);
    project.updatedAt = new Date();
    
    this.projects.set(projectId, project);
    
    const user = await this.userService.getUserById(userId);
    const username = user ? user.username : userId;
    
    this.logger.info(`User ${userId} removed from project ${projectId}`);
    this.emitter.emit('project:member:removed', { project, userId });
    
    this.notificationService.info(
      'Membre retiré',
      `${username} a été retiré du projet "${project.name}"`
    );

    return { ...project };
  }

  public getAllProjects(): Project[] {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }
    
    return Array.from(this.projects.values()).map(project => ({ ...project }));
  }

  public getProjectsByUser(userId: string): Project[] {
    if (!this.isInitialized) {
      throw new Error('ProjectService not initialized');
    }
    
    return Array.from(this.projects.values())
      .filter(project => project.members.some(member => member.userId === userId))
      .map(project => ({ ...project }));
  }

  public getProjectsCount(): number {
    return this.projects.size;
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  public shutdown(): void {
    this.emitter.removeAllListeners();
    this.logger.info('ProjectService arrêté');
  }
}
