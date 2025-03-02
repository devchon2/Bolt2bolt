// #codebase: [CONTEXT] Centralized prompt injection manager for Copilot.
// #codebase: [RESPONSIBILITY] Generate, analyze and optimize prompts in the codebase.
// #codebase: [CURRENT-ITERATION] Phase 5: Prompt optimization and intelligent chaining.
// #codebase: Veuillez suivre les directives du fichier CODEBASE_PROMPTS.md pour orienter les modifications lors des itérations.

import * as fs from 'fs';
import * as path from 'path';
import { createPrompt, createCopilotPromptBlock, PromptType } from './prompts-helper';

/*
[COPILOT_PROMPTS]
# Gestionnaire de Prompts - Directives d'Implémentation

## Objectif
Ce module optimise l'interaction avec GitHub Copilot en fournissant:
1. Génération contextuelle de prompts adaptés à chaque type de fichier
2. Chaînage intelligent des directives à travers la codebase
3. Analyse de l'efficacité des prompts utilisés

## Stratégies de Prompt Engineering
- Contextualisation: Toujours fournir le contexte actuel du projet et du fichier
- Décomposition: Diviser les directives complexes en sous-tâches claires
- Exemplification: Inclure des exemples concrets pour les patterns souhaités
- Contraintes explicites: Définir clairement les limites et garde-fous
- Continuité: Maintenir la cohérence à travers les chaînes de prompts

## Anti-patterns
- Éviter les prompts contradictoires entre fichiers
- Ne pas surcharger avec trop d'informations par prompt
- Éviter l'ambiguïté dans les directives
- Ne pas dupliquer les mêmes prompts sans adaptation au contexte
[COPILOT_PROMPTS]
*/

/**
 * Types de fichiers supportés pour l'injection de prompts
 */
export enum FileType {
  TYPESCRIPT = 'ts',
  TYPESCRIPT_REACT = 'tsx',
  JAVASCRIPT = 'js',
  JAVASCRIPT_REACT = 'jsx',
  MARKDOWN = 'md',
  JSON = 'json',
  YAML = 'yml',
  HTML = 'html',
  CSS = 'css',
  TEST = 'test.ts'
}

/**
 * Contexte du projet utilisé pour personnaliser les prompts
 */
export interface ProjectContext {
  /**
   * Phase actuelle du projet
   */
  currentIteration: string;
  
  /**
   * Priorités de l'itération en cours
   */
  currentPriorities: string[];
  
  /**
   * Composants principaux du projet
   */
  coreComponents: string[];
  
  /**
   * Architecture adoptée
   */
  architecture: {
    patterns: string[];
    principles: string[];
  };
  
  /**
   * Métriques de qualité cibles
   */
  qualityThresholds: {
    testCoverage: number;
    maxComplexity: number;
    minMaintainabilityIndex: number;
  };
}

/**
 * Configuration du gestionnaire de prompts
 */
export interface PromptManagerConfig {
  /**
   * Activer ou désactiver l'insertion automatique de prompts
   */
  enabled: boolean;
  
  /**
   * Préfixe pour les prompts inline
   */
  inlinePrefix: string;
  
  /**
   * Tags pour les blocs de prompts
   */
  blockTags: {
    open: string;
    close: string;
  };
  
  /**
   * Densité des prompts (prompts par N lignes de code)
   */
  promptDensity: number;
  
  /**
   * Chemin vers les templates de prompts
   */
  templatesPath: string;
  
  /**
   * Collect metrics about prompt effectiveness
   */
  collectMetrics: boolean;
}

/**
 * Gestionnaire de prompts pour la codebase
 */
export class PromptManager {
  private config: PromptManagerConfig;
  private projectContext: ProjectContext;
  private promptTemplates: Map<string, string>;
  private promptEffectiveness: Map<string, number>;
  
  /**
   * Crée une nouvelle instance du gestionnaire de prompts
   */
  constructor(config: Partial<PromptManagerConfig> = {}) {
    // Configuration par défaut
    this.config = {
      enabled: true,
      inlinePrefix: '#codebase:',
      blockTags: {
        open: '[COPILOT_PROMPTS]',
        close: '[COPILOT_PROMPTS]'
      },
      promptDensity: 20, // Un prompt tous les 20 lignes en moyenne
      templatesPath: path.resolve(__dirname, '../../templates/prompts'),
      collectMetrics: true,
      ...config
    };
    
    this.projectContext = this.loadProjectContext();
    this.promptTemplates = new Map();
    this.promptEffectiveness = new Map();
    
    this.loadPromptTemplates();
  }
  
  /**
   * Génère un prompt inline ou block pour guider GitHub Copilot.
   * Chaque méthode ici est utilisée pour enrichir le contexte et alimenter l’auto-optimisation de la codebase.
   * @see createPrompt
   * @see createCopilotPromptBlock
   */
  public generateInlinePrompt(
    type: PromptType, 
    content: string,
    subtype?: string
  ): string {
    return createPrompt(type, content, subtype);
  }
  
  /**
   * Génère un bloc de prompts Copilot complet
   */
  public generatePromptBlock(
    title: string,
    sections: Array<{ title?: string, content: string }>,
    context?: string
  ): string {
    // Ajouter automatiquement le contexte du projet si demandé
    const allSections = [
      { title, content: '' },
      ...sections
    ];
    
    if (context) {
      allSections.unshift({
        title: 'Contexte',
        content: this.enrichWithContext(context)
      });
    }
    
    return createCopilotPromptBlock(allSections);
  }
  
  /**
   * Génère une chaîne de prompts pour un fichier spécifique
   * basée sur son type et son rôle dans le projet
   */
  public generateFilePrompts(
    filePath: string,
    fileContent: string,
    fileRole: string
  ): string[] {
    const fileType = this.getFileType(filePath);
    const prompts: string[] = [];
    
    // Ajouter un prompt de contexte en haut du fichier
    prompts.push(this.generateInlinePrompt(
      PromptType.CONTEXT,
      `${fileRole} dans le système Bolt2bolt.`
    ));
    
    // Ajouter un prompt sur l'itération actuelle
    prompts.push(this.generateInlinePrompt(
      PromptType.DIRECTIVE,
      `Itération actuelle: ${this.projectContext.currentIteration}`
    ));
    
    // Ajouter des prompts spécifiques au type de fichier
    if (fileType === FileType.TEST) {
      prompts.push(this.getTestFilePrompts());
    } else if (fileType === FileType.TYPESCRIPT || fileType === FileType.TYPESCRIPT_REACT) {
      prompts.push(...this.getTypeScriptFilePrompts(fileRole));
    }
    
    // Ajouter un bloc de prompts détaillé si approprié
    if (this.shouldAddDetailedBlock(filePath, fileContent)) {
      prompts.push(this.getDetailedBlockForFile(filePath, fileRole));
    }
    
    return prompts;
  }
  
  /**
   * Analyse un fichier pour la présence et l'efficacité des prompts
   */
  public analyzeFilePrompts(filePath: string, fileContent: string): {
    hasPrompts: boolean;
    promptCount: number;
    density: number;
    suggestions: string[];
  } {
    const lines = fileContent.split('\n');
    const promptLines = lines.filter(line => 
      line.includes(this.config.inlinePrefix) || 
      line.includes(this.config.blockTags.open)
    );
    
    const hasPrompts = promptLines.length > 0;
    const promptCount = promptLines.length;
    const density = lines.length / (promptCount || 1);
    
    // Générer des suggestions pour améliorer les prompts
    const suggestions = this.generatePromptSuggestions(filePath, fileContent);
    
    return {
      hasPrompts,
      promptCount,
      density,
      suggestions
    };
  }
  
  /**
   * Suggère des améliorations pour les prompts d'un fichier
   */
  private generatePromptSuggestions(filePath: string, fileContent: string): string[] {
    const suggestions: string[] = [];
    const fileType = this.getFileType(filePath);
    
    // Vérifier la densité des prompts
    const { promptCount, density } = this.analyzeFilePrompts(filePath, fileContent);
    if (density > this.config.promptDensity * 1.5) {
      suggestions.push(`Augmenter la densité de prompts (actuellement 1 pour ${Math.round(density)} lignes)`);
    }
    
    // Vérifier si les prompts couvrent les aspects importants
    if (!fileContent.includes('[CONTEXTE]')) {
      suggestions.push('Ajouter un prompt de contexte en haut du fichier');
    }
    
    if (this.projectContext.currentIteration && 
        !fileContent.includes(this.projectContext.currentIteration)) {
      suggestions.push(`Mentionner l'itération actuelle: ${this.projectContext.currentIteration}`);
    }
    
    // Suggestions spécifiques au type de fichier
    if (fileType === FileType.TEST && !fileContent.includes('TEST')) {
      suggestions.push('Ajouter des prompts spécifiques aux tests (cas à couvrir, mocks)');
    }
    
    // Vérifier s'il y a des blocs de prompts détaillés pour les fichiers importants
    const isCorFile = this.projectContext.coreComponents.some(comp => 
      filePath.includes(`/${comp}`) || filePath.includes(`\\${comp}`)
    );
    
    if (isCorFile && !fileContent.includes(this.config.blockTags.open)) {
      suggestions.push('Ajouter un bloc de prompts détaillé pour ce composant principal');
    }
    
    return suggestions;
  }
  
  /**
   * Déterminer si un bloc détaillé devrait être ajouté à un fichier
   */
  private shouldAddDetailedBlock(filePath: string, fileContent: string): boolean {
    // Vérifier si c'est un composant principal
    const isCore = this.projectContext.coreComponents.some(comp => 
      filePath.includes(`/${comp}`) || filePath.includes(`\\${comp}`)
    );
    
    // Vérifier la complexité approximative du fichier
    const complexity = this.estimateComplexity(fileContent);
    
    // Ajouter un bloc pour les fichiers complexes ou les composants principaux
    return isCore || complexity > 3;
  }
  
  /**
   * Estimer la complexité d'un fichier (0-5)
   */
  private estimateComplexity(fileContent: string): number {
    // Estimation simplifiée basée sur des heuristiques
    const lines = fileContent.split('\n').length;
    const classes = (fileContent.match(/class\s+\w+/g) || []).length;
    const interfaces = (fileContent.match(/interface\s+\w+/g) || []).length;
    const functions = (fileContent.match(/function\s+\w+|\w+\s*\([^)]*\)\s*{/g) || []).length;
    const conditionals = (fileContent.match(/if\s*\(|switch\s*\(|catch\s*\(/g) || []).length;
    
    // Formule simple pour estimer la complexité
    return Math.min(5, Math.floor((lines / 100) + classes + (interfaces / 2) + 
                                (functions / 3) + (conditionals / 10)));
  }
  
  /**
   * Obtenir des prompts spécifiques pour les fichiers de test
   */
  private getTestFilePrompts(): string {
    return this.generateInlinePrompt(
      PromptType.TEST,
      'Assurer une couverture complète des cas nominaux et d\'erreur'
    );
  }
  
  /**
   * Obtenir des prompts spécifiques pour les fichiers TypeScript
   */
  private getTypeScriptFilePrompts(fileRole: string): string[] {
    return [
      this.generateInlinePrompt(
        PromptType.PATTERN,
        `Suivre les patterns établis pour ${fileRole}`
      ),
      this.generateInlinePrompt(
        PromptType.CONSTRAINT,
        `Respecter les principes SOLID et l'architecture existante`
      )
    ];
  }
  
  /**
   * Obtenir un bloc détaillé de prompts pour un fichier spécifique
   */
  private getDetailedBlockForFile(filePath: string, fileRole: string): string {
    const fileName = path.basename(filePath);
    const templateKey = this.getTemplateKey(filePath);
    
    // Utiliser un template s'il existe, sinon en créer un générique
    if (this.promptTemplates.has(templateKey)) {
      // Remplacer les variables dans le template
      let template = this.promptTemplates.get(templateKey) || '';
      template = template
        .replace('{{fileName}}', fileName)
        .replace('{{fileRole}}', fileRole)
        .replace('{{iteration}}', this.projectContext.currentIteration);
      
      return template;
    } else {
      // Créer un bloc générique
      return this.generatePromptBlock(
        `Directives pour ${fileName}`,
        [
          { 
            title: 'Responsabilité', 
            content: `Ce fichier est responsable de: ${fileRole}` 
          },
          { 
            title: 'Principes à Suivre',
            content: this.projectContext.architecture.principles.join('\n- ')
          },
          {
            title: 'Priorités de l\'Itération Actuelle',
            content: this.projectContext.currentPriorities.map(p => `- ${p}`).join('\n')
          }
        ],
        'Fichier faisant partie du système Bolt2bolt'
      );
    }
  }
  
  /**
   * Déterminer la clé de template à utiliser pour un fichier
   */
  private getTemplateKey(filePath: string): string {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).substring(1);
    
    // Essayer de trouver un template spécifique au nom de fichier
    if (this.promptTemplates.has(fileName)) {
      return fileName;
    }
    
    // Essayer de trouver un template pour le type de fichier
    for (const component of this.projectContext.coreComponents) {
      if (filePath.includes(`/${component}`) || filePath.includes(`\\${component}`)) {
        const componentTemplate = `${component}.${extension}`;
        if (this.promptTemplates.has(componentTemplate)) {
          return componentTemplate;
        }
      }
    }
    
    // Template par défaut pour l'extension
    return extension;
  }
  
  /**
   * Obtenir le type de fichier à partir de son extension
   */
  private getFileType(filePath: string): FileType {
    const extension = path.extname(filePath).toLowerCase().substring(1);
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts')) {
      return FileType.TEST;
    }
    
    if (Object.values(FileType).includes(extension as FileType)) {
      return extension as FileType;
    }
    
    return FileType.TYPESCRIPT; // Type par défaut
  }
  
  /**
   * Enrichir un texte avec le contexte du projet
   */
  private enrichWithContext(text: string): string {
    return `${text}\n\nItération actuelle: ${this.projectContext.currentIteration}\nPriorités: ${this.projectContext.currentPriorities.join(', ')}`;
  }
  
  /**
   * Charger le contexte du projet
   */
  private loadProjectContext(): ProjectContext {
    // Dans une implémentation réelle, cela pourrait charger depuis un fichier de configuration
    const context: ProjectContext = {
      currentIteration: 'Phase 5: Optimisation des prompts et chaînage intelligent',
      currentPriorities: [
        'Optimiser le système de prompts',
        'Améliorer le chaînage de directives',
        'Standardiser les formats de prompts',
        'Mesurer l\'efficacité des prompts'
      ],
      coreComponents: ['analyzer', 'optimizer', 'validator', 'reporter', 'orchestrator'],
      architecture: {
        patterns: ['Observer', 'Strategy', 'Factory', 'Chain of Responsibility'],
        principles: [
          'Séparation des préoccupations',
          'Interface stable, implémentation flexible',
          'Testabilité intégrée',
          'Extensibilité via plugins'
        ]
      },
      qualityThresholds: {
        testCoverage: 80,
        maxComplexity: 15,
        minMaintainabilityIndex: 75
      }
    };

    if (this.config.handleCircularDependencies) {
      const hasCircularDependencies = this.handleCircularDependencies(ast);
      if (hasCircularDependencies) {
        context.warnings.push('CIRCULAR_REF');
      }
    }

    return context;
  }
  
  /**
   * Charger les templates de prompts
   */
  private loadPromptTemplates(): void {
    // Dans une implémentation réelle, cela chargerait les fichiers depuis this.config.templatesPath
    console.log('Chargement des templates de prompts...');
  }

  private handleCircularDependencies(ast: any): boolean {
    // Implémentation pour détecter et gérer les dépendances circulaires
    return false;
  }

  public newPromptMethod() {
    // Implémentation de la nouvelle méthode
  }
}