import { getSystemPrompt, CONTINUE_PROMPT } from '../../app/lib/common/prompts/prompts';
import { PromptManager } from './prompt-manager';

/**
 * Configuratoin pour l'intégration de prompts
 */
export interface PromptIntegrationConfig {
  /**
   * Répertoire de travail actuel
   */
  workDir?: string;
  
  /**
   * Si true, inclut des directives de système dans les prompts générés
   */
  includeSystemDirectives?: boolean;
  
  /**
   * Nombre maximal de caractères autorisés dans un prompt
   */
  maxPromptLength?: number;
}

/**
 * Intègre les prompts système avec le gestionnaire de prompts
 */
export class PromptIntegration {
  private promptManager: PromptManager;
  private config: PromptIntegrationConfig;
  
  /**
   * Crée une nouvelle instance d'intégration de prompts
   */
  constructor(
    promptManager: PromptManager,
    config: PromptIntegrationConfig = {}
  ) {
    this.promptManager = promptManager;
    this.config = {
      workDir: process.cwd(),
      includeSystemDirectives: true,
      maxPromptLength: 8000,
      ...config
    };
  }
  
  /**
   * Génère un prompt complet pour un fichier donné
   */
  public generateFilePrompt(
    filePath: string, 
    fileContent: string,
    fileRole: string
  ): string {
    // Obtenir les prompts spécifiques au fichier
    const filePrompts = this.promptManager.generateFilePrompts(filePath, fileContent, fileRole);
    
    // Combiner avec le prompt système si nécessaire
    let fullPrompt = filePrompts.join('\n\n');
    
    if (this.config.includeSystemDirectives) {
      const systemPrompt = getSystemPrompt(this.config.workDir);
      
      // Vérifier si le prompt ne dépasse pas la taille maximale
      if ((systemPrompt.length + fullPrompt.length) < this.config.maxPromptLength) {
        fullPrompt = `${systemPrompt}\n\n${fullPrompt}`;
      } else {
        // Ajouter une version résumée des directives système
        fullPrompt = this.extractCoreDirectives(systemPrompt) + '\n\n' + fullPrompt;
      }
    }
    
    return fullPrompt;
  }
  
  /**
   * Génère un prompt de continuation
   */
  public generateContinuePrompt(): string {
    return CONTINUE_PROMPT;
  }
  
  /**
   * Extrait les directives principales d'un prompt système
   */
  private extractCoreDirectives(systemPrompt: string): string {
    // Extraire les sections les plus importantes
    const sections = [
      this.extractSection(systemPrompt, '<system_constraints>', '</system_constraints>'),
      this.extractSection(systemPrompt, '<code_formatting_info>', '</code_formatting_info>'),
      this.extractSection(systemPrompt, '<chain_of_thought_instructions>', '</chain_of_thought_instructions>')
    ].filter(Boolean);
    
    return sections.join('\n\n');
  }
  
  /**
   * Extrait une section d'un texte entre deux marqueurs
   */
  private extractSection(text: string, startMarker: string, endMarker: string): string | null {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return null;
    
    const endIndex = text.indexOf(endMarker, startIndex);
    if (endIndex === -1) return null;
    
    return text.substring(startIndex, endIndex + endMarker.length);
  }
  
  /**
   * Analyse l'efficacité des prompts dans un fichier
   */
  public analyzePromptEffectiveness(
    filePath: string,
    fileContent: string,
    generatedContent: string
  ): {
    effectivenessScore: number;
    improvementSuggestions: string[];
  } {
    const analysis = this.promptManager.analyzeFilePrompts(filePath, fileContent);
    
    // Calculer un score d'efficacité simple (0-100)
    let effectivenessScore = 70; // Score de base
    
    // Ajuster le score en fonction de la densité des prompts
    if (analysis.density > 50) {
      effectivenessScore -= 15; // Trop peu de prompts
    } else if (analysis.density < 10) {
      effectivenessScore -= 5; // Peut-être trop de prompts
    }
    
    // Vérifier si le contenu généré semble suivre les directives
    const relevanceScore = this.estimateContentRelevance(fileContent, generatedContent);
    effectivenessScore += relevanceScore;
    
    // Limiter le score entre 0 et 100
    effectivenessScore = Math.max(0, Math.min(100, effectivenessScore));
    
    return {
      effectivenessScore,
      improvementSuggestions: analysis.suggestions
    };
  }
  
  /**
   * Estime la pertinence du contenu généré par rapport aux directives
   */
  private estimateContentRelevance(originalContent: string, generatedContent: string): number {
    // Cette méthode utiliserait idéalement des techniques plus avancées
    // pour l'instant, nous utilisons une heuristique simple
    
    let score = 0;
    
    // Vérifier si le contenu généré maintient le style du contenu original
    const originalLines = originalContent.split('\n');
    const indentMatch = originalLines.find(line => /^\s+/.test(line));
    const indentSize = indentMatch ? indentMatch.match(/^(\s+)/)?.[1].length : 2;
    
    const generatedIndent = generatedContent.split('\n').find(line => /^\s+/.test(line))?.match(/^(\s+)/)?.[1].length;
    if (indentSize === generatedIndent) {
      score += 5; // Le style d'indentation correspond
    }
    
    // Vérifier si des mots-clés importants sont préservés
    const keywordsFromOriginal = this.extractKeywords(originalContent);
    const keywordsInGenerated = this.extractKeywords(generatedContent);
    
    const keywordOverlap = keywordsFromOriginal.filter(kw => keywordsInGenerated.includes(kw)).length;
    const keywordScore = Math.min(15, Math.floor((keywordOverlap / keywordsFromOriginal.length) * 15));
    
    score += keywordScore;
    
    return score;
  }
  
  /**
   * Extrait des mots-clés importants d'un texte
   */
  private extractKeywords(text: string): string[] {
    // Version simplifiée - extraire les noms de variables, classes, fonctions, etc.
    const matches = text.match(/\b(class|function|interface|enum|const|let|var|import|export)\s+([A-Za-z0-9_]+)/g) || [];
    return matches.map(match => match.split(/\s+/)[1]).filter(Boolean);
  }
}
