# Documentation Bolt2bolt

## Introduction

Bolt2bolt est un framework d'IA avancé qui optimise l'interaction avec GitHub Copilot grâce à un système intelligent de prompts et de directives. Ce système permet d'améliorer significativement la qualité et la pertinence du code généré par Copilot en fournissant des contextes riches et des directives précises.

## Architecture du système

Le système Bolt2bolt repose sur quatre composants principaux:

1. **Prompt Manager** - Gestion centrale des prompts dans la codebase
2. **Prompts Helper** - Utilitaires pour créer et analyser des prompts standardisés
3. **Prompt Integration** - Interface entre les prompts système et les prompts spécifiques
4. **Prompt Optimizer** - Optimisation automatique de l'efficacité des prompts

### Diagramme d'architecture

```
┌─────────────────┐     ┌──────────────────┐
│ Prompt Manager  │◄────┤ Prompts Helper   │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│Prompt Optimizer │◄────┤Prompt Integration│
└─────────────────┘     └──────────────────┘
```

## Guide de démarrage rapide

Pour commencer à utiliser Bolt2bolt dans votre projet:

1. Importez le `PromptManager` et configurez-le pour votre projet
2. Utilisez `generateFilePrompts()` pour créer des prompts contextuels
3. Analysez l'efficacité des prompts avec `analyzeFilePrompts()`
4. Optimisez vos prompts avec `PromptOptimizer`

Exemple d'utilisation:

```typescript
import { PromptManager } from './utils/prompt-manager';
import { PromptOptimizer } from './utils/prompt-optimizer';
import { PromptIntegration } from './utils/prompt-integration';

// Initialiser le gestionnaire de prompts
const manager = new PromptManager();

// Initialiser l'intégration et l'optimiseur
const integration = new PromptIntegration(manager);
const optimizer = new PromptOptimizer(manager, integration);

// Optimiser les prompts d'un fichier
const result = optimizer.optimizeFilePrompts(
  '/chemin/vers/fichier.ts',
  contenuDuFichier
);

// Générer un rapport d'optimisation
const report = optimizer.generateOptimizationReport(results);
```

## Documentation détaillée

- [Guide du Prompt Manager](./prompt-manager.md)
- [Utilisation de l'Optimiseur](./prompt-optimizer.md)
- [Intégration des Prompts](./prompt-integration.md)
- [Bonnes pratiques](./best-practices.md)

## Contribuer

Pour contribuer au projet Bolt2bolt, veuillez consulter notre [guide de contribution](./contributing.md).

## Documents disponibles

- [Documentation Unifiée](./DOCUMENTATION.md) - Vue d'ensemble complète du projet
- [Roadmap](./ROADMAP.md) - Feuille de route et vision du projet
- [Plan d'Implémentation](./IMPLEMENTATION-PLAN.md) - Plan détaillé par phases
- [Guide](./GUIDE.md) - Guide de développement, contribution et FAQ
- [Comparaison](./COMPARISON.md) - Comparaison avec Bolt.diy
- [Structure du Code](./CODEBASE.md) - Architecture technique détaillée

## Navigation rapide

Pour découvrir le projet, nous recommandons de commencer par:
1. La [Documentation Unifiée](./DOCUMENTATION.md) pour une vue d'ensemble
2. La [Roadmap](./ROADMAP.md) pour comprendre la vision
3. La [Structure du Code](./CODEBASE.md) pour l'architecture technique

## Contribuer à la documentation

Pour améliorer cette documentation:
1. Soumettez une pull request avec vos modifications
2. Suivez les [directives de contribution](../CONTRIBUTING.md)
3. Respectez la syntaxe Markdown et conventions de nommage

---

*Pour plus d'informations, consultez [le README principal](../README.md)*
