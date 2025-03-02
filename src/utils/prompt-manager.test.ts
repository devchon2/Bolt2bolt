// #codebase: [CONTEXTE] Tests pour le gestionnaire de prompts d'injection.
// #codebase: [RESPONSABILITÉ] Vérifier la génération, analyse et optimisation des prompts.
// #codebase: [ITÉRATION-ACTUELLE] Phase 5: Optimisation des prompts et chaînage intelligent.

import { expect } from 'chai';
import * as sinon from 'sinon';
import { PromptManager, FileType } from './prompt-manager';
import { PromptType } from './prompts-helper';
import { describe, beforeEach, afterEach, it } from 'vitest';

// #codebase: [TEST:FIXTURES] Utiliser des fixtures représentatives pour les tests de prompts.
const TYPESCRIPT_FILE_CONTENT = `
// Un exemple de fichier TypeScript
import { Service } from './service';

export class MyClass {
  constructor(private service: Service) {}
  
  public doSomething(): void {
    if (this.service.isReady()) {
      this.service.execute();
    }
  }
}
`;

const FILE_WITH_PROMPTS = `
// #codebase: [CONTEXTE] Un exemple de fichier avec prompts.
// #codebase: [DIRECTIVE] Suivre ces conventions pour les modifications.

import { Something } from './something';

/*
[COPILOT_PROMPTS]
# Directives pour ce module
- Faire ceci
- Éviter cela
[COPILOT_PROMPTS]
*/

export function example() {
  // Implémentation...
}
`;

describe('PromptManager', () => {
  let promptManager: PromptManager;
  
  beforeEach(() => {
    promptManager = new PromptManager();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('generateInlinePrompt', () => {
    it('devrait générer un prompt correctement formaté', () => {
      const prompt = promptManager.generateInlinePrompt(
        PromptType.CONTEXT,
        'Contexte du module'
      );
      
      expect(prompt).to.include('[CONTEXTE]');
      expect(prompt).to.include('Contexte du module');
      expect(prompt).to.include('#codebase:');
    });
    
    it('devrait inclure le sous-type quand fourni', () => {
      const prompt = promptManager.generateInlinePrompt(
        PromptType.PATTERN,
        'Observer pour la réactivité',
        'OBSERVER'
      );
      
      expect(prompt).to.include('[PATTERN:OBSERVER]');
    });
  });
  
  describe('generatePromptBlock', () => {
    it('devrait créer un bloc avec les sections spécifiées', () => {
      const block = promptManager.generatePromptBlock(
        'Titre du Bloc',
        [
          { title: 'Section 1', content: 'Contenu 1' },
          { content: 'Contenu sans titre' }
        ]
      );
      
      expect(block).to.include('[COPILOT_PROMPTS]');
      expect(block).to.include('# Titre du Bloc');
      expect(block).to.include('## Section 1');
      expect(block).to.include('Contenu 1');
      expect(block).to.include('Contenu sans titre');
    });
    
    it('devrait ajouter automatiquement le contexte si demandé', () => {
      const block = promptManager.generatePromptBlock(
        'Avec Contexte',
        [{ content: 'Contenu principal' }],
        'Contexte personnalisé'
      );
      
      expect(block).to.include('## Contexte');
      expect(block).to.include('Contexte personnalisé');
      expect(block).to.include('Itération actuelle:');
    });
  });
  
  describe('generateFilePrompts', () => {
    it('devrait générer des prompts adaptés au type de fichier', () => {
      const tsPrompts = promptManager.generateFilePrompts(
        'src/component.ts',
        TYPESCRIPT_FILE_CONTENT,
        'Composant fonctionnel'
      );
      
      const testPrompts = promptManager.generateFilePrompts(
        'src/service.test.ts',
        TYPESCRIPT_FILE_CONTENT,
        'Test unitaire'
      );
      
      // Vérifier que les prompts TypeScript contiennent des directives sur les patterns
      expect(tsPrompts.some(p => p.includes('[PATTERN]'))).to.be.true;
      
      // Vérifier que les prompts de test contiennent des directives de test
      expect(testPrompts.some(p => p.includes('[TEST]'))).to.be.true;
    });
    
    it('devrait inclure le contexte et l\'itération actuelle', () => {
      const prompts = promptManager.generateFilePrompts(
        'src/any-file.ts',
        TYPESCRIPT_FILE_CONTENT,
        'Un rôle quelconque'
      );
      
      expect(prompts.some(p => p.includes('[CONTEXTE]'))).to.be.true;
      expect(prompts.some(p => p.includes('Itération actuelle'))).to.be.true;
    });
  });
  
  describe('analyzeFilePrompts', () => {
    it('devrait détecter correctement les prompts existants', () => {
      const analysis = promptManager.analyzeFilePrompts(
        'src/example.ts',
        FILE_WITH_PROMPTS
      );
      
      expect(analysis.hasPrompts).to.be.true;
      expect(analysis.promptCount).to.be.at.least(3); // 2 inline + 1 bloc
    });
    
    it('devrait calculer précisément la densité de prompts', () => {
      const analysis = promptManager.analyzeFilePrompts(
        'src/example.ts',
        FILE_WITH_PROMPTS
      );
      
      expect(analysis.density).to.be.a('number');
    });
  });
});