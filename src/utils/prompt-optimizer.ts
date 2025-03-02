// #codebase: [CONTEXT] Optimiseur automatique de prompts pour GitHub Copilot.
// #codebase: [RESPONSIBILITY] Analyser et améliorer l'efficacité des prompts dans la codebase.
// #codebase: [CURRENT-ITERATION] Phase 5: Optimisation des prompts et chaînage intelligent.

import * as fs from 'fs';
import * as path from 'path';
import { PromptType, CodebasePrompt, parsePrompt } from './prompts-helper';
import { PromptManager, FileType, ProjectContext } from './prompt-manager';
import { PromptIntegration } from './prompt-integration';

/**
 * Métriques d'efficacité des prompts
 */
export interface PromptMetrics {
  /**
   * Score d'efficacité (0-100)
   */
  effectivenessScore: number;
  
  /**
   * Ratio de respect des directives (0-1)
   */
  complianceRatio: number;
  
  /**
   * Taux de couverture des concepts clés
   */
  conceptCoverage: number;
  
  /**
   * Clarté des directives (0-100)
   */
  clarityScore: number;
  
  /**
   * Efficacité historique basée sur les réponses précédentes
   */
  historicalEffectiveness: number;
}

/**
 * Résultat d'optimisation de prompt
 */
export interface OptimizationResult {
  /**
   * Prompt original
   */
  originalPrompt: string;
  
  /**
   * Prompt optimisé
   */
  optimizedPrompt: string;
  
  /**
   * Métriques avant optimisation
   */
  beforeMetrics: PromptMetrics;
  
  /**
   * Métriques après optimisation
   */
  afterMetrics: PromptMetrics;
  
  /**
   * Améliorations appliquées
   */
  improvements: string[];
}

/**
 * Options pour l'optimiseur de prompts
 */
export interface PromptOptimizerOptions {
  /**
   * Activer l'optimisation agressive (peut modifier la sémantique)
   */
  aggressiveOptimization?: boolean;
  
  /**
   * Appliquer automatiquement les optimisations
   */
  autoApply?: boolean;
  
  /**
   * Seuil de score minimal pour l'optimisation
   */
  minScoreThreshold?: number;
  
  /**
   * Taille maximale recommandée pour un prompt
   */
  maxPromptSize?: number;
  
  /**
   * Mots-clés et concepts prioritaires à inclure
   */
  priorityConcepts?: string[];
}

/**
 * Optimiseur automatique pour les prompts de GitHub Copilot
 */
export class PromptOptimizer {
  private manager: PromptManager;
  private integration: PromptIntegration;
  private options: PromptOptimizerOptions;
  private metricsCache: Map<string, PromptMetrics>;
  private optimizationHistory: Map<string, OptimizationResult[]>;
  private conceptImportance: Map<string, number>;
  
  /**
   * Crée un nouvel optimiseur de prompts
   * @param manager Gestionnaire de prompts
   * @param integration Intégration de prompts
   * @param options Options pour l'optimisation
   */
  constructor(
    manager: PromptManager,
    integration: PromptIntegration,
    options: PromptOptimizerOptions = {}
  ) {
    this.manager = manager;
    this.integration = integration;
    this.options = {
      aggressiveOptimization: false,
      autoApply: false,
      minScoreThreshold: 70,
      maxPromptSize: 3000,
      priorityConcepts: [],
      ...options
    };
    
    this.metricsCache = new Map<string, PromptMetrics>();
    this.optimizationHistory = new Map<string, OptimizationResult[]>();
    this.conceptImportance = this.buildConceptImportanceMap(this.options.priorityConcepts || []);
  }
  
  /**
   * Analyse et optimise les prompts dans un fichier
   * @param filePath Chemin du fichier
   * @param fileContent Contenu du fichier
   * @returns Résultat de l'optimisation
   */
  public optimizeFilePrompts(
    filePath: string,
    fileContent: string
  ): OptimizationResult | null {
    // Extraire les prompts existants
    const existingPrompts = this.extractPromptsFromFile(fileContent);
    
    if (existingPrompts.length === 0) {
      return null; // Pas de prompts à optimiser
    }
    
    // Analyser l'efficacité actuelle
    const beforeMetrics = this.analyzePrompts(existingPrompts, filePath, fileContent);
    
    // Si le score est déjà bon et qu'on n'est pas en mode agressif, ne rien faire
    if (beforeMetrics.effectivenessScore >= 90 && !this.options.aggressiveOptimization) {
      return null;
    }
    
    // Optimiser les prompts
    const optimizedPrompts = this.generateOptimizedPrompts(
      existingPrompts,
      filePath,
      fileContent
    );
    
    // Construire le nouveau contenu du fichier
    const optimizedContent = this.replacePromptsInFile(
      fileContent,
      existingPrompts,
      optimizedPrompts
    );
    
    // Analyser l'efficacité après optimisation
    const afterMetrics = this.analyzePrompts(optimizedPrompts, filePath, optimizedContent);
    
    // Construire le résultat
    const result: OptimizationResult = {
      originalPrompt: fileContent,
      optimizedPrompt: optimizedContent,
      beforeMetrics,
      afterMetrics,
      improvements: this.identifyImprovements(beforeMetrics, afterMetrics)
    };
    
    // Enregistrer l'historique d'optimisation
    this.recordOptimizationHistory(filePath, result);
    
    // Appliquer automatiquement si configuré
    if (this.options.autoApply) {
      this.applyOptimization(filePath, optimizedContent);
    }
    
    return result;
  }
  
  /**
   * Optimisation par lot des prompts dans plusieurs fichiers
   * @param files Liste des fichiers à optimiser
   * @returns Résultats d'optimisation par fichier
   */
  public batchOptimize(
    files: Array<{ path: string; content: string }>
  ): Map<string, OptimizationResult | null> {
    const results = new Map<string, OptimizationResult | null>();
    
    for (const file of files) {
      const result = this.optimizeFilePrompts(file.path, file.content);
      results.set(file.path, result);
    }
    
    return results;
  }
  
  /**
   * Génère un rapport d'optimisation global
   * @param results Résultats d'optimisation
   * @returns Rapport formaté
   */
  public generateOptimizationReport(
    results: Map<string, OptimizationResult | null>
  ): string {
    let report = "# Rapport d'Optimisation des Prompts\n\n";
    
    let totalFiles = 0;
    let optimizedFiles = 0;
    let totalScoreImprovement = 0;
    
    report += "## Résumé\n\n";
    report += "| Fichier | Score Avant | Score Après | Amélioration | Actions |\n";
    report += "|---------|------------|-------------|--------------|--------|\n";
    
    results.forEach((result, filePath) => {
      totalFiles++;
      
      if (result) {
        optimizedFiles++;
        const scoreBefore = Math.round(result.beforeMetrics.effectivenessScore);
        const scoreAfter = Math.round(result.afterMetrics.effectivenessScore);
        const improvement = scoreAfter - scoreBefore;
        totalScoreImprovement += improvement;
        
        report += `| ${path.basename(filePath)} | ${scoreBefore} | ${scoreAfter} | ${improvement > 0 ? '+' + improvement : improvement} | ${result.improvements.length} |\n`;
      }
    });
    
    report += "\n## Statistiques Globales\n\n";
    report += `- Fichiers analysés: ${totalFiles}\n`;
    report += `- Fichiers optimisés: ${optimizedFiles} (${Math.round((optimizedFiles / totalFiles) * 100)}%)\n`;
    report += `- Amélioration moyenne du score: ${totalScoreImprovement > 0 ? '+' : ''}${totalScoreImprovement > 0 ? Math.round(totalScoreImprovement / optimizedFiles) : 0} points\n`;
    
    report += "\n## Détails des Optimisations\n\n";
    
    results.forEach((result, filePath) => {
      if (result && result.improvements.length > 0) {
        report += `### ${path.basename(filePath)}\n\n`;
        report += "Améliorations:\n";
        result.improvements.forEach((improvement, i) => {
          report += `${i + 1}. ${improvement}\n`;
        });
        report += "\n";
      }
    });
    
    return report;
  }
  
  /**
   * Extrait les prompts d'un fichier
   * @param fileContent Contenu du fichier
   * @returns Liste des prompts extraits
   */
  private extractPromptsFromFile(fileContent: string): string[] {
    const prompts: string[] = [];
    const lines = fileContent.split('\n');
    
    // Extraire les prompts inline
    for (const line of lines) {
      if (line.includes('#codebase:')) {
        prompts.push(line);
      }
    }
    
    // Extraire les blocs de prompts
    const blockRegex = /\[COPILOT_PROMPTS\]([\s\S]*?)\[COPILOT_PROMPTS\]/g;
    let match: RegExpExecArray | null;
    
    while ((match = blockRegex.exec(fileContent)) !== null) {
      prompts.push(match[0]);
    }
    
    return prompts;
  }
  
  /**
   * Analyse l'efficacité des prompts
   */
  private analyzePrompts(
    prompts: string[],
    filePath: string,
    fileContent: string
  ): PromptMetrics {
    // Vérifier si nous avons déjà une métrique en cache
    const cacheKey = this.createCacheKey(prompts);
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }
    
    // Analyse de base
    const fileType = path.extname(filePath).substring(1) as FileType;
    const concepts = this.extractConcepts(fileContent);
    const conceptsInPrompts = this.extractConcepts(prompts.join('\n'));
    
    // Calculer les métriques
    const conceptCoverage = this.calculateConceptCoverage(concepts, conceptsInPrompts);
    const clarityScore = this.evaluateClarity(prompts);
    const complianceRatio = this.evaluateCompliance(prompts, fileType);
    const historicalEffectiveness = this.getHistoricalEffectiveness(filePath);
    
    // Score d'efficacité composé
    const effectivenessScore = this.calculateEffectivenessScore(
      conceptCoverage,
      clarityScore,
      complianceRatio,
      historicalEffectiveness
    );
    
    const metrics: PromptMetrics = {
      effectivenessScore,
      complianceRatio,
      conceptCoverage,
      clarityScore,
      historicalEffectiveness
    };
    
    // Mettre en cache
    this.metricsCache.set(cacheKey, metrics);
    
    return metrics;
  }
  
  /**
   * Génère des prompts optimisés
   */
  private generateOptimizedPrompts(
    existingPrompts: string[],
    filePath: string,
    fileContent: string
  ): string[] {
    const optimizedPrompts: string[] = [];
    const fileType = path.extname(filePath).substring(1) as FileType;
    const concepts = this.extractConcepts(fileContent);
    
    // Optimiser chaque prompt individuellement
    for (const prompt of existingPrompts) {
      // Si c'est un prompt inline simple
      if (prompt.includes('#codebase:')) {
        const parsedPrompt = parsePrompt(prompt);
        if (parsedPrompt) {
          // Améliorer la clarté et la spécificité
          const enhancedContent = this.enhancePromptContent(
            parsedPrompt.content,
            concepts,
            fileType
          );
          
          const optimizedPrompt = `// #codebase: [${parsedPrompt.type}${parsedPrompt.subtype ? `:${parsedPrompt.subtype}` : ''}] ${enhancedContent}`;
          optimizedPrompts.push(optimizedPrompt);
        } else {
          // Garder l'original si on ne peut pas l'analyser
          optimizedPrompts.push(prompt);
        }
      }
      // Si c'est un bloc de prompt
      else if (prompt.includes('[COPILOT_PROMPTS]')) {
        const optimizedBlock = this.optimizePromptBlock(prompt, concepts, fileType);
        optimizedPrompts.push(optimizedBlock);
      }
      // Autre type de prompt (conserver tel quel)
      else {
        optimizedPrompts.push(prompt);
      }
    }
    
    // Vérifier si nous avons besoin d'ajouter des prompts supplémentaires
    if (this.options.aggressiveOptimization && optimizedPrompts.length < 3) {
      const additionalPrompts = this.generateAdditionalPrompts(filePath, fileContent, concepts);
      optimizedPrompts.push(...additionalPrompts);
    }
    
    return optimizedPrompts;
  }
  
  /**
   * Optimise un bloc de prompts
   */
  private optimizePromptBlock(
    promptBlock: string,
    concepts: string[],
    fileType: string
  ): string {
    // Extraire le contenu entre les balises
    const content = promptBlock.substring(
      promptBlock.indexOf('[COPILOT_PROMPTS]') + '[COPILOT_PROMPTS]'.length,
      promptBlock.lastIndexOf('[COPILOT_PROMPTS]')
    );
    
    // Séparer les sections
    const sections = content.split(/#+\s+([^\n]+)/g);
    const optimizedSections: string[] = [];
    let currentTitle = '';
    
    // Traiter chaque section
    for (let i = 0; i < sections.length; i++) {
      if (i % 2 === 1) {
        // C'est un titre
        currentTitle = sections[i];
        optimizedSections.push(`# ${currentTitle}`);
      } else if (i > 0 && sections[i].trim()) {
        // C'est un contenu de section
        const enhancedContent = this.enhancePromptContent(
          sections[i],
          concepts,
          fileType
        );
        optimizedSections.push(enhancedContent);
      }
    }
    
    // Si pas de sections ou bloc mal formaté, retourner l'original
    if (optimizedSections.length === 0) {
      return promptBlock;
    }
    
    // Reconstruire le bloc
    return '[COPILOT_PROMPTS]\n' + optimizedSections.join('\n\n') + '\n[COPILOT_PROMPTS]';
  }
  
  /**
   * Génère des prompts supplémentaires en fonction du contexte
   */
  private generateAdditionalPrompts(
    filePath: string,
    fileContent: string,
    concepts: string[]
  ): string[] {
    const additionalPrompts: string[] = [];
    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath).substring(1) as FileType;
    
    // Déterminer le rôle du fichier à partir de son contenu
    const fileRole = this.determineFileRole(fileContent, filePath);
    
    // Ajouter un prompt de contexte si nécessaire
    if (!fileContent.includes('[CONTEXT]')) {
      additionalPrompts.push(
        `// #codebase: [CONTEXT] ${fileRole} dans le système Bolt2bolt.`
      );
    }
    
    // Ajouter un prompt de responsabilité si nécessaire
    if (!fileContent.includes('[RESPONSIBILITY]')) {
      additionalPrompts.push(
        `// #codebase: [RESPONSIBILITY] ${this.generateResponsibilityDescription(fileName, concepts)}`
      );
    }
    
    // Ajouter un prompt sur l'itération actuelle
    if (!fileContent.includes('[CURRENT-ITERATION]')) {
      additionalPrompts.push(
        `// #codebase: [CURRENT-ITERATION] Phase 5: Optimisation des prompts et chaînage intelligent.`
      );
    }
    
    return additionalPrompts;
  }
  
  /**
   * Détermine le rôle d'un fichier dans le projet
   */
  private determineFileRole(fileContent: string, filePath: string): string {
    // Analyser le nom du fichier
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('test')) {
      return "Test unitaire";
    }
    
    if (fileName.includes('prompt')) {
      return "Gestion des prompts";
    }
    
    if (fileName.includes('optimizer') || fileName.includes('optimiser')) {
      return "Optimisation de code";
    }
    
    // Analyser le contenu
    if (fileContent.includes('class') && fileContent.includes('interface')) {
      return "Définition de composant";
    }
    
    if (fileContent.includes('function') && fileContent.includes('export')) {
      return "Module utilitaire";
    }
    
    // Par défaut
    return "Module du système";
  }
  
  /**
   * Génère une description de responsabilité pour un fichier
   */
  private generateResponsibilityDescription(fileName: string, concepts: string[]): string {
    // Extraire des indices du nom de fichier
    if (fileName.includes('manager')) {
      return "Gérer et orchestrer les opérations liées aux " + this.extractMainConcept(fileName, concepts);
    }
    
    if (fileName.includes('helper') || fileName.includes('util')) {
      return "Fournir des fonctions utilitaires pour " + this.extractMainConcept(fileName, concepts);
    }
    
    if (fileName.includes('optimizer')) {
      return "Optimiser les performances et l'efficacité des " + this.extractMainConcept(fileName, concepts);
    }
    
    if (fileName.includes('test')) {
      return "Vérifier le comportement correct de " + this.extractMainConcept(fileName, concepts);
    }
    
    // Utiliser les concepts extraits
    const mainConcepts = concepts.slice(0, 3);
    if (mainConcepts.length > 0) {
      return `Gestion des fonctionnalités liées à ${mainConcepts.join(', ')}`;
    }
    
    // Générique
    return "Fournir des fonctionnalités pour le système Bolt2bolt";
  }
  
  /**
   * Extrait un concept principal du nom de fichier et des concepts identifiés
   */
  private extractMainConcept(fileName: string, concepts: string[]): string {
    // Supprimer suffixes et extensions courants
    let baseName = fileName
      .replace(/\.(ts|js|jsx|tsx)$/, '')
      .replace(/(manager|helper|util|optimizer|test|spec)$/, '');
    
    // Voir si un concept correspond partiellement au nom de base
    for (const concept of concepts) {
      if (baseName.includes(concept) || concept.includes(baseName)) {
        return concept;
      }
    }
    
    // Si aucun concept ne correspond, utiliser le nom de base ou le premier concept
    return baseName || (concepts.length > 0 ? concepts[0] : "composants du système");
  }
  
  /**
   * Améliore le contenu d'un prompt pour le rendre plus clair et efficace
   */
  private enhancePromptContent(
    content: string,
    concepts: string[],
    fileType: string
  ): string {
    let enhanced = content;
    
    // Éviter les optimisations si le contenu est trop court
    if (content.trim().length < 20) {
      return content;
    }
    
    // Ajouter des mots-clés importants s'ils manquent
    const missingConcepts = concepts
      .filter(c => this.conceptImportance.get(c) || 0 > 0.7)
      .filter(c => !content.toLowerCase().includes(c.toLowerCase()))
      .slice(0, 2);
    
    if (missingConcepts.length > 0 && this.options.aggressiveOptimization) {
      if (content.trim().endsWith('.')) {
        enhanced = enhanced.trim() + ` Intègre les concepts de ${missingConcepts.join(', ')}.`;
      } else {
        enhanced = enhanced.trim() + `. Intègre les concepts de ${missingConcepts.join(', ')}.`;
      }
    }
    
    // Améliorer la clarté par des ajustements structurels
    enhanced = this.improveClarity(enhanced);
    
    // Limiter la longueur si nécessaire
    if (enhanced.length > this.options.maxPromptSize!) {
      enhanced = this.truncatePrompt(enhanced, this.options.maxPromptSize!);
    }
    
    return enhanced;
  }
  
  /**
   * Améliore la clarté d'un prompt
   */
  private improveClarity(content: string): string {
    let improved = content;
    
    // Remplacer les formulations vagues par des directives plus précises
    improved = improved
      .replace(/peut-être|probablement/g, '')
      .replace(/devrait/g, 'doit')
      .replace(/il serait bien de/g, 'il faut')
      .replace(/si possible/g, '');
    
    // Structurer en liste si c'est une énumération
    if (improved.includes(',') && improved.includes('et') && !improved.includes('\n-')) {
      const parts = improved.split(/[,.] /);
      if (parts.length >= 3) {
        improved = parts[0] + ':\n- ' + parts.slice(1).join('\n- ');
      }
    }
    
    return improved;
  }
  
  /**
   * Tronque un prompt à une longueur maximale tout en préservant sa cohérence
   */
  private truncatePrompt(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Si c'est une liste, garder les premiers éléments
    if (content.includes('\n-')) {
      const lines = content.split('\n');
      let truncated = '';
      
      for (const line of lines) {
        if ((truncated + line + '\n').length <= maxLength - 3) {
          truncated += line + '\n';
        } else {
          break;
        }
      }
      
      return truncated.trim() + '...';
    }
    
    // Sinon, tronquer à la phrase complète la plus proche
    const sentences = content.split(/[.!?] /);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence + '. ').length <= maxLength - 3) {
        truncated += sentence + '. ';
      } else {
        break;
      }
    }
    
    return truncated.trim();
  }
  
  /**
   * Remplace les prompts existants par des prompts optimisés dans le contenu du fichier
   */
  private replacePromptsInFile(
    fileContent: string,
    existingPrompts: string[],
    optimizedPrompts: string[]
  ): string {
    let updatedContent = fileContent;
    
    // S'assurer que nous avons le même nombre de prompts
    const minLength = Math.min(existingPrompts.length, optimizedPrompts.length);
    
    // Remplacer chaque prompt existant par sa version optimisée
    for (let i = 0; i < minLength; i++) {
      updatedContent = updatedContent.replace(existingPrompts[i], optimizedPrompts[i]);
    }
    
    // Ajouter les prompts supplémentaires s'il y en a
    if (optimizedPrompts.length > existingPrompts.length) {
      // Trouver un bon endroit pour insérer les prompts (en haut du fichier)
      const additionalPrompts = optimizedPrompts.slice(existingPrompts.length);
      
      // Rechercher la première ligne non vide ou de commentaire
      const lines = updatedContent.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*')) {
          insertIndex = i;
          break;
        }
      }
      
      // Insérer les prompts supplémentaires
      lines.splice(insertIndex, 0, ...additionalPrompts);
      updatedContent = lines.join('\n');
    }
    
    return updatedContent;
  }
  
  /**
   * Calcule la couverture des concepts clés dans les prompts
   */
  private calculateConceptCoverage(
    concepts: string[],
    promptConcepts: string[]
  ): number {
    if (concepts.length === 0) {
      return 1.0; // Pas de concepts à couvrir
    }
    
    // Donner plus de poids aux concepts prioritaires
    let totalWeight = 0;
    let coveredWeight = 0;
    
    for (const concept of concepts) {
      const weight = this.conceptImportance.get(concept) || 0.5;
      totalWeight += weight;
      
      // Vérifier si le concept ou un terme similaire est couvert
      if (promptConcepts.some(pc => 
          pc.toLowerCase().includes(concept.toLowerCase()) || 
          concept.toLowerCase().includes(pc.toLowerCase()))) {
        coveredWeight += weight;
      }
    }
    
    return totalWeight > 0 ? coveredWeight / totalWeight : 1.0;
  }
  
  /**
   * Évalue la clarté des prompts
   */
  private evaluateClarity(prompts: string[]): number {
    // Facteurs de clarté:
    // 1. Longueur (ni trop court ni trop long)
    // 2. Structure (listes, titres, paragraphes courts)
    // 3. Spécificité des termes
    
    let totalScore = 0;
    
    for (const prompt of prompts) {
      let score = 70; // Score de base
      
      // Évaluer la longueur
      const wordCount = prompt.split(/\s+/).length;
      if (wordCount < 5) {
        score -= 20; // Trop court
      } else if (wordCount > 200) {
        score -= Math.min(30, (wordCount - 200) / 10); // Trop long
      } else if (wordCount >= 10 && wordCount <= 50) {
        score += 10; // Longueur idéale
      }
      
      // Évaluer la structure
      if (prompt.includes('\n-')) {
        score += 10; // Format liste
      }
      if (prompt.includes('#')) {
        score += 5; // Titres
      }
      
      // Évaluer la spécificité
      if (prompt.includes('doit') || prompt.includes('requiert') || prompt.includes('nécessite')) {
        score += 5; // Termes spécifiques
      }
      if (prompt.match(/[0-9]+/)) {
        score += 5; // Chiffres précis
      }
      
      // Limiter le score
      score = Math.max(0, Math.min(100, score));
      totalScore += score;
    }
    
    return prompts.length > 0 ? totalScore / prompts.length : 0;
  }
  
  /**
   * Évalue le respect des bonnes pratiques pour le type de fichier
   */
  private evaluateCompliance(prompts: string[], fileType: string): number {
    // Vérifier les patterns recommandés selon le type de fichier
    let compliance = 0.7; // Score de base
    
    // Conventions spécifiques au type de fichier
    const typeSpecificPatterns: Record<string, RegExp[]> = {
      'ts': [/interface/, /type/, /export/, /import/],
      'tsx': [/props/, /component/, /render/, /React/],
      'test.ts': [/describe/, /it/, /expect/, /mock/],
      'md': [/##/, /\*\*/, /\`\`\`/]
    };
    
    // Vérifier la présence des patterns pertinents
    const patterns = typeSpecificPatterns[fileType] || [];
    const promptText = prompts.join('\n');
    
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(promptText)) {
        matchCount++;
      }
    }
    
    // Ajuster le score en fonction du nombre de patterns trouvés
    if (patterns.length > 0) {
      const patternRatio = matchCount / patterns.length;
      compliance = 0.5 + (patternRatio * 0.5);
    }
    
    return compliance;
  }
  
  /**
   * Obtient l'efficacité historique des prompts pour un fichier
   */
  private getHistoricalEffectiveness(filePath: string): number {
    // Récupérer l'historique d'optimisation pour ce fichier
    const history = this.optimizationHistory.get(filePath);
    
    if (!history || history.length === 0) {
      return 50; // Score par défaut si pas d'historique
    }
    
    // Calculer la moyenne des 3 dernières optimisations
    const recentResults = history.slice(-3);
    const totalImprovement = recentResults.reduce((sum, result) => {
      return sum + (result.afterMetrics.effectivenessScore - result.beforeMetrics.effectivenessScore);
    }, 0);
    
    // Si les optimisations ont été efficaces, augmenter le score
    if (totalImprovement > 0) {
      return Math.min(90, 60 + totalImprovement);
    } else {
      return Math.max(30, 60 + totalImprovement);
    }
  }
  
  /**
   * Calcule un score d'efficacité global basé sur les différentes métriques
   */
  private calculateEffectivenessScore(
    conceptCoverage: number,
    clarityScore: number,
    complianceRatio: number,
    historicalEffectiveness: number
  ): number {
    // Pondération des différents facteurs
    const weights = {
      conceptCoverage: 0.3,
      clarityScore: 0.4,
      complianceRatio: 0.2,
      historicalEffectiveness: 0.1
    };
    
    // Calcul pondéré
    const score = (
      (conceptCoverage * 100) * weights.conceptCoverage +
      clarityScore * weights.clarityScore +
      (complianceRatio * 100) * weights.complianceRatio +
      historicalEffectiveness * weights.historicalEffectiveness
    );
    
    // Limiter entre 0 et 100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Extrait les concepts clés d'un texte
   */
  private extractConcepts(text: string): string[] {
    // Extraire les concepts à partir des mots-clés importants
    const keywords = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remplacer les caractères spéciaux par des espaces
      .split(/\s+/) // Diviser en mots
      .filter(word => word.length > 3); // Ignorer les mots courts
    
    // Compter les occurrences de chaque mot
    const wordCount = new Map<string, number>();
    keywords.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Identifier les concepts les plus fréquents en ignorant les mots courants
    const commonWords = ['this', 'that', 'with', 'from', 'have', 'function', 'const', 'return'];
    const concepts = Array.from(wordCount.entries())
      .filter(([word]) => !commonWords.includes(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Ajouter les termes spécifiques qui pourraient être importants
    const specialTerms = [
      'prompt', 'optimize', 'analyse', 'test', 'component', 'interface', 'directive', 'constraint'
    ];
    
    specialTerms.forEach(term => {
      if (text.toLowerCase().includes(term) && !concepts.includes(term)) {
        concepts.push(term);
      }
    });
    
    return concepts;
  }
  
  /**
   * Construit une carte d'importance des concepts
   */
  private buildConceptImportanceMap(priorityConcepts: string[]): Map<string, number> {
    const importanceMap = new Map<string, number>();
    
    // Donner une importance élevée aux concepts prioritaires
    priorityConcepts.forEach((concept, index) => {
      const importance = 1 - (index / priorityConcepts.length * 0.5);
      importanceMap.set(concept.toLowerCase(), importance);
    });
    
    // Concepts fondamentaux toujours importants
    const fundamentalConcepts = [
      'pattern', 'architecture', 'test', 'validation', 'security', 'performance'
    ];
    
    fundamentalConcepts.forEach(concept => {
      if (!importanceMap.has(concept)) {
        importanceMap.set(concept, 0.7);
      }
    });
    
    return importanceMap;
  }
  
  /**
   * Crée une clé de cache pour les métriques de prompts
   */
  private createCacheKey(prompts: string[]): string {
    // Utiliser un hash simple des prompts comme clé de cache
    return prompts
      .join('|')
      .split('')
      .reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
      }, 0)
      .toString(36);
  }
  
  /**
   * Identifie les améliorations entre deux états de métriques
   */
  private identifyImprovements(
    before: PromptMetrics,
    after: PromptMetrics
  ): string[] {
    const improvements: string[] = [];
    
    // Vérifier les améliorations sur différentes métriques
    if (after.effectivenessScore > before.effectivenessScore) {
      improvements.push(`Score d'efficacité amélioré de ${Math.round(before.effectivenessScore)} à ${Math.round(after.effectivenessScore)}`);
    }
    
    if (after.conceptCoverage > before.conceptCoverage) {
      const beforePercent = Math.round(before.conceptCoverage * 100);
      const afterPercent = Math.round(after.conceptCoverage * 100);
      improvements.push(`Couverture des concepts augmentée de ${beforePercent}% à ${afterPercent}%`);
    }
    
    if (after.clarityScore > before.clarityScore) {
      improvements.push(`Clarté des prompts améliorée de ${Math.round(before.clarityScore)} à ${Math.round(after.clarityScore)}`);
    }
    
    if (after.complianceRatio > before.complianceRatio) {
      const beforePercent = Math.round(before.complianceRatio * 100);
      const afterPercent = Math.round(after.complianceRatio * 100);
      improvements.push(`Conformité aux bonnes pratiques augmentée de ${beforePercent}% à ${afterPercent}%`);
    }
    
    // Si aucune amélioration spécifique n'a été identifiée mais le score global est meilleur
    if (improvements.length === 0 && after.effectivenessScore > before.effectivenessScore) {
      improvements.push(`Optimisation générale des prompts`);
    }
    
    return improvements;
  }
  
  /**
   * Enregistre l'historique d'optimisation pour un fichier
   */
  private recordOptimizationHistory(
    filePath: string,
    result: OptimizationResult
  ): void {
    // Récupérer ou créer l'historique pour ce fichier
    if (!this.optimizationHistory.has(filePath)) {
      this.optimizationHistory.set(filePath, []);
    }
    
    const history = this.optimizationHistory.get(filePath)!;
    
    // Ajouter le résultat à l'historique (limiter à 10 entrées)
    history.push(result);
    if (history.length > 10) {
      history.shift(); // Supprimer l'entrée la plus ancienne
    }
  }
  
  /**
   * Applique les optimisations à un fichier
   */
  private applyOptimization(
    filePath: string,
    optimizedContent: string
  ): void {
    try {
      fs.writeFileSync(filePath, optimizedContent, 'utf-8');
      console.log(`Prompts optimisés appliqués à ${filePath}`);
    } catch (error) {
      console.error(`Erreur lors de l'application des optimisations à ${filePath}:`, error);
    }
  }
}