// #COPILOT-ALPHA: Ce fichier fait partie de la phase alpha. Suivez strictement ces directives pour orienter l'auto-optimisation et assurer une cohérence globale entre les fichiers.

// #codebase: [CONTEXTE] Utilitaire pour gérer les prompts d'injection pour GitHub Copilot Chat.
// #codebase: [RESPONSABILITÉ] Fournir des fonctions pour créer et analyser des prompts standardisés.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et couverture de code.

/*
[COPILOT_PROMPTS]
# Utilitaire de Prompts - Directives d'Implémentation

## Responsabilité
- Standardiser le format des prompts d'injection dans la codebase
- Faciliter la création et l'analyse des prompts
- Assurer la cohérence des directives à travers le projet

## Points d'Extension
- Ajouter de nouveaux types de prompts standardisés
- Développer des fonctionnalités d'analyse de l'efficacité des prompts
- Créer un système de validation des prompts

## Anti-patterns
- Éviter d'utiliser ces fonctions pour le code de production
- Ne pas exécuter ces fonctions dans les builds de production
- Ne pas utiliser pour stocker de la logique métier critique
[COPILOT_PROMPTS]
*/

/**
 * Types de prompts disponibles pour Copilot
 */
export enum PromptType {
  CONTEXT = 'CONTEXT',
  DIRECTIVE = 'DIRECTIVE',
  PATTERN = 'PATTERN',
  CONSTRAINT = 'CONSTRAINT',
  TEST = 'TEST',
  EXAMPLE = 'EXAMPLE'
}

/**
 * Interface pour un prompt d'injection formaté
 */
export interface CodebasePrompt {
  type: PromptType;
  subtype?: string;
  content: string;
}

/**
 * Options pour la génération de prompts
 */
export interface PromptOptions {
  indent?: number;
  multiline?: boolean;
}

/**
 * Crée un prompt en ligne pour GitHub Copilot
 * @param type Type de prompt
 * @param content Contenu du prompt
 * @param subtype Sous-type optionnel pour catégoriser davantage
 * @returns Prompt formaté
 */
export function createPrompt(
  type: PromptType,
  content: string,
  subtype?: string
): string {
  const prefix = '#codebase:';
  const typeString = subtype ? `[${type}:${subtype}]` : `[${type}]`;
  return `${prefix} ${typeString} ${content}`;
}

/**
 * Crée un bloc de prompts complet pour GitHub Copilot
 * @param sections Sections à inclure dans le bloc
 * @returns Bloc de prompts formaté
 */
export function createCopilotPromptBlock(
  sections: Array<{ title?: string; content: string }>
): string {
  const blockOpen = '[COPILOT_PROMPTS]';
  const blockClose = '[COPILOT_PROMPTS]';
  const formattedSections = sections.map(
    section => `${section.title ? `## ${section.title}\n` : ''}${section.content}`
  ).join('\n\n');
  return `${blockOpen}\n${formattedSections}\n${blockClose}`;
}

/**
 * Parse un commentaire contenant un prompt pour extraire ses composants
 * 
 * @param comment Commentaire contenant le prompt
 * @returns Objet CodebasePrompt ou null si format invalide
 */
export function parsePrompt(comment: string): CodebasePrompt | null {
  const promptRegex = /\/\/\s*#codebase:\s*\[([^\]]+)\]\s*(.*)/;
  const match = comment.match(promptRegex);
  
  if (!match) {
    return null;
  }
  
  const [_, typeStr, content] = match;
  const [type, subtype] = typeStr.split(':');
  
  // Vérifier si le type est valide
  if (!Object.values(PromptType).includes(type as PromptType)) {
    return null;
  }
  
  return {
    type: type as PromptType,
    subtype: subtype?.trim(),
    content: content.trim()
  };
}

/**
 * Génère un prompt de test unitaire standard
 * 
 * @param componentName Nom du composant à tester
 * @param testCases Cas de test à inclure
 * @returns Prompt formaté pour les tests
 */
export function createTestPrompt(
  componentName: string,
  testCases: string[]
): string {
  return `
describe('${componentName}', () => {
  ${testCases.map((testCase, index) => `
  it('devrait ${testCase}', () => {
    // TODO: Implémenter le test ${index + 1}
  });
  `).join('\n')}
});
  `;
}

/**
 * Vérifie si un fichier contient des prompts d'injection
 * 
 * @param fileContent Contenu du fichier à analyser
 * @returns Vrai si le fichier contient au moins un prompt
 */
export function hasPrompts(fileContent: string): boolean {
  return /\/\/\s*#codebase:/.test(fileContent) || 
         /\[COPILOT_PROMPTS\]/.test(fileContent);
}

/*
[COPILOT_PROMPTS]
# Tests pour l'Utilitaire de Prompts

## Structure Recommandée
describe('PromptHelper', () => {
  describe('createPrompt', () => {
    it('devrait créer un prompt simple avec type');
    it('devrait créer un prompt avec sous-type');
    it('devrait respecter les options d\'indentation');
    it('devrait créer un prompt multi-lignes quand spécifié');
  });

  describe('parsePrompt', () => {
    it('devrait extraire correctement le type et le contenu');
    it('devrait gérer les sous-types correctement');
    it('devrait retourner null pour un format invalide');
  });

  describe('createCopilotPromptBlock', () => {
    it('devrait créer un bloc de prompts formaté');
    it('devrait inclure tous les titres de section');
    it('devrait respecter l\'indentation');
  });
});

## Mocks et Fixtures Recommandés
- Exemples de prompts variés pour les tests
- Différents formats de commentaires pour tester le parsing
- Cas limites pour valider la robustesse
[COPILOT_PROMPTS]
*/
