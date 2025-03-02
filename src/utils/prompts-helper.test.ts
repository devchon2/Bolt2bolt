// #codebase: [CONTEXTE] Tests pour l'utilitaire de prompts d'injection.
// #codebase: [ITÉRATION-ACTUELLE] Phase 4: Finalisation des tests unitaires et couverture de code.

import { expect } from 'chai';
import { 
  createPrompt, 
  parsePrompt, 
  createCopilotPromptBlock, 
  createTestPrompt, 
  hasPrompts,
  PromptType 
} from './prompts-helper';

/*
[COPILOT_PROMPTS]
# Tests pour PromptHelper

## Objectifs des Tests
- Vérifier la création correcte des différents types de prompts
- Valider le parsing des prompts depuis des commentaires
- Confirmer la génération correcte des blocs de prompts complexes
- Tester tous les cas limites et formats

## Approche
- Utiliser des fixtures pour représenter différents scénarios
- Vérifier la structure et le contenu des prompts générés
- Assurer l'idempotence des opérations parse -> create
[COPILOT_PROMPTS]
*/

describe('PromptHelper', () => {
  describe('createPrompt', () => {
    it('devrait créer un prompt simple avec type', () => {
      const prompt = createPrompt(PromptType.CONTEXT, 'Contexte du module');
      expect(prompt).to.equal('// #codebase: [CONTEXTE] Contexte du module');
    });
    
    it('devrait créer un prompt avec sous-type', () => {
      const prompt = createPrompt(PromptType.PATTERN, 'Utiliser pour créer des instances', 'FACTORY');
      expect(prompt).to.equal('// #codebase: [PATTERN:FACTORY] Utiliser pour créer des instances');
    });
    
    it('devrait respecter les options d\'indentation', () => {
      const prompt = createPrompt(PromptType.DIRECTIVE, 'Suivre cette logique', undefined, { indent: 2 });
      expect(prompt).to.equal('  // #codebase: [DIRECTIVE] Suivre cette logique');
    });
    
    it('devrait créer un prompt multi-lignes quand spécifié', () => {
      const prompt = createPrompt(PromptType.EXTENSION, 'Ajouter support', undefined, { multiline: true });
      expect(prompt).to.equal('/*\n * #codebase: [EXTENSION] Ajouter support\n */');
    });
  });
  
  describe('parsePrompt', () => {
    it('devrait extraire correctement le type et le contenu', () => {
      const result = parsePrompt('// #codebase: [DIRECTIVE] Suivre cette logique');
      expect(result).to.deep.equal({
        type: PromptType.DIRECTIVE,
        content: 'Suivre cette logique',
        subtype: undefined
      });
    });
    
    it('devrait gérer les sous-types correctement', () => {
      const result = parsePrompt('// #codebase: [PATTERN:OBSERVER] Implémenter pour la réactivité');
      expect(result).to.deep.equal({
        type: PromptType.PATTERN,
        subtype: 'OBSERVER',
        content: 'Implémenter pour la réactivité'
      });
    });
    
    it('devrait gérer les espaces supplémentaires', () => {
      const result = parsePrompt('//   #codebase:  [PERF]   Optimiser cette section');
      expect(result).to.deep.equal({
        type: PromptType.PERF,
        content: 'Optimiser cette section',
        subtype: undefined
      });
    });
    
    it('devrait retourner null pour un format invalide', () => {
      expect(parsePrompt('// Commentaire normal')).to.be.null;
      expect(parsePrompt('#codebase: [DIRECTIVE] Sans les //')).to.be.null;
      expect(parsePrompt('// #codebase: TYPE_INVALIDE Contenu')).to.be.null;
    });
  });
  
  describe('createCopilotPromptBlock', () => {
    it('devrait créer un bloc de prompts formaté', () => {
      const block = createCopilotPromptBlock([
        { title: 'Titre du Bloc', content: '' },
        { title: 'Section 1', content: 'Contenu sans titre' },
      ]);
      expect(block).to.include('[COPILOT_PROMPTS]');
      expect(block).to.include('Titre du Bloc');
      expect(block).to.include('## Section 1');
      expect(block).to.include('Contenu sans titre');
    });
    
    it('devrait respecter l\'indentation', () => {
      const sections = [
        { title: 'Section 1', content: 'Contenu 1' },
        { title: 'Section 2', content: 'Contenu 2' }
      ];
      const prompt = createCopilotPromptBlock(sections, '  ');
      expect(prompt).to.include('  ## Section 1');
      expect(prompt).to.include('  Contenu 1');
      expect(prompt).to.include('  ## Section 2');
      expect(prompt).to.include('  Contenu 2');
    });
  });
  
  describe('createTestPrompt', () => {
    it('devrait générer un prompt de test complet', () => {
      const prompt = createTestPrompt('TestComponent', [
        'valider les entrées',
        "gérer les cas d'erreur"
      ]);
      expect(prompt).to.include("describe('TestComponent'");
      expect(prompt).to.include("it('devrait valider les entrées');");
      expect(prompt).to.include("it('devrait gérer les cas d'erreur');");
      expect(prompt).to.include('1. valider les entrées');
    });
  });
  
  describe('hasPrompts', () => {
    it('devrait détecter les prompts simples', () => {
      const content = `
        // Code normal
        // #codebase: [DIRECTIVE] Une directive
        plus de code
      `;
      expect(hasPrompts(content)).to.be.true;
    });
    
    it('devrait détecter les blocs de prompts', () => {
      const content = `
        /* 
        [COPILOT_PROMPTS]
        Contenu
        [COPILOT_PROMPTS]
        */
      `;
      expect(hasPrompts(content)).to.be.true;
    });
    
    it('devrait retourner false pour du code sans prompts', () => {
      const content = `
        // Commentaire normal
        function test() {
          // Autre commentaire
          return true;
        }
      `;
      expect(hasPrompts(content)).to.be.false;
    });
  });

  describe('generateTestCases', () => {
    it('devrait générer des cas de test paramétrés', () => {
      const functionName = 'add';
      const testCases = [
        { input: [1, 2], expected: 3 },
        { input: [3, 4], expected: 7 }
      ];
      const result = generateTestCases(functionName, testCases);
      expect(result).toContain("it('devrait retourner 3 pour l'entrée [1,2]', () => {");
      expect(result).toContain("it('devrait retourner 7 pour l'entrée [3,4]', () => {");
    });
  });
});
