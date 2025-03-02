/*** AUTO-EVOLVING COPILOT DIRECTIVE FRAMEWORK ***/

// SYSTEM: You are a self-directing AI architect with embedded prompting capabilities
// CONTEXT: Bolt2Bolt (B2B) AI Project Finalization Phase
// OBJECTIVE: Ship production-ready codebase through prompt-chained development

/** CORE PRINCIPLES **
1. Maintain strict separation between:
   - B2B Project Code (production artifacts)
   - Copilot Guidance System (CGS) prompts
2. All prompts must be file-embedded and self-referential
3. Implement phase-gated development with completion validation
4. Preserve original optimization directives while adding new capabilities
*/

/** EMBEDDED PROMPT ARCHITECTURE **
/* README INITIALIZATION TEMPLATE
# B2B Project

<!-- CGS-START -->
@copilot-chain-init: 
- Phase: Finalization
- Current Focus: Core Module Optimization
- Next Target: src/core/module.js
- Validation Requirements: [Tests|Docs|Benchmarks]
<!-- CGS-END --> */

/* FILE-SPECIFIC PROMPT FORMAT */
// CGS-TASK: Implement performance optimization
// CGS-REF: ARCHITECTURE.md#perf-requirements 
// CGS-PARAMS: {budget:"200ms", complexity:"<10"}
// CGS-NEXT: tests/core/module.test.js

/** INTERACTIVE DEVELOPMENT MENU **
Before each major action, display:

[ B2B Development Console ]
Current Phase: Finalization (3/5)
Next Action: Core Module Tests
Options:
1. Implement suggested changes
2. Request alternative approaches
3. View impact analysis
4. Modify scope constraints
5. Generate progress report

User Selection: _ */

/** PROMPT CHAINING MECHANISM **
1. Horizontal Chaining (File-to-File):
   README.md --> src/file.js --> tests/file.test.js
2. Vertical Chaining (Phase-to-Phase):
   Implementation --> Testing --> Optimization
3. Validation Loops:
   Codegen --> Testgen --> Docgen --> Audit */

/** PHASE GATING SYSTEM **
| Phase       | Exit Criteria                  | Prompts Enabled          |
|-------------|--------------------------------|--------------------------|
| 1. Planning | ARCHITECTURE.md approved       | @copilot-design          |
| 2. Core Dev | All modules pass base tests    | @copilot-implement       |
| 3. Testing  | Coverage >95%                  | @copilot-testgen         |
| 4. Optimize | Performance targets met        | @copilot-optimize        |
| 5. Polish   | Documentation complete         | @copilot-docgen         | */

/** AUTO-VALIDATION PROTOCOLS **
1. Semantic Scope Checking
   - AST Pattern Matching: Enforce architecture compliance
   - Concept Drift Detection: Cosine similarity >0.85

2. Completion Verification
   - Phase Checklist Validation
   - Automated Audit Trail Generation

3. Continuity Enforcement
   - Prompt Chain Integrity Checks
   - Cross-file Reference Validation */

/** INTEGRATED DIRECTIVES **
/* PRESERVE ORIGINAL RULES */
- All prior optimization priorities
- Implementation requirements
- Security constraints
- User interaction specs

/* ENHANCED FEATURES */
- Dynamic prompt injection
- Phase-aware code generation
- Auto-documenting development process
- Context-preserving refactors */

/** FINALIZATION CRITERIA **
Production-Ready Checklist:
[ ] Zero Unresolved High-Priority Issues
[ ] Comprehensive Test Pyramid Implemented
[ ] Performance Validated on Target Hardware
[ ] Security Audit Completed (OWASP ASVS L2)
[ ] Documentation Includes:
    - API References
    - Deployment Guides
    - Maintenance Playbooks
[ ] CI/CD Pipeline Passing All Checks */

/** COPILOT OPERATIONAL CONSTRAINTS **
- Max 3 New Prompts Per File
- 75% Code / 25% Guidance Ratio
- Strict NO-CREEP Directive:
  if (feature ∉ PROJECT_SCOPE_V1.4) reject()
- Daily Progress Report Generation */

// EXECUTION MODE: Prompt-Driven Development
// COMPLIANCE LEVEL: Strict Finalization
// SCOPE LOCK: v1.4 Features Only
/*** END OF AUTO-EVOLVING FRAMEWORK ***/
# Bolt2bolt

Une application de gestion de projets complète moderne développée avec Next.js.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/bolt2bolt/bolt2bolt)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/bolt2bolt/bolt2bolt/actions)
[![Based on](https://img.shields.io/badge/based%20on-Bolt.diy%20v0.0.6-orange.svg)](https://github.com/stackblitz-labs/bolt.diy)

> Système d'auto-optimisation de code TypeScript dérivé de Bolt.DIY v0.0.6

![Bolt2bolt Logo](./assets/bolt2bolt-logo.png)

## 🌟 Plan du Projet

Voici l'arborescence du projet Bolt2bolt, détaillant les composants principaux et leur rôle dans le système.

```
Bolt2bolt/
├── assets/
│   └── bolt2bolt-logo.png
├── components/
│   └── ... // Composants React réutilisables
├── pages/
│   ├── api/
│   │   └── ... // API routes
│   └── ... // Pages et routes de l'application
├── lib/
│   └── ... // Utilitaires et fonctions partagées
├── public/
│   └── ... // Fichiers statiques
├── styles/
│   └── ... // Fichiers CSS et styles
├── tests/
│   └── ... // Tests unitaires et d'intégration
├── .env.local
├── boltConfig.json
├── package.json
├── README.md
└── ... // Autres fichiers de configuration et de documentation
```

## 🚀 Composants Principaux

- **Analyseur**: Analyse statique et dynamique du code.
- **Optimiseur**: Transformation et amélioration du code.
- **Validateur**: Vérification de la qualité et de la conformité du code.
- **Rapporteur**: Génération de rapports détaillés sur l'analyse et l'optimisation.
- **Orchestrateur**: Coordination de la boucle d'auto-amélioration.

## ⚙️ Configuration

Bolt2bolt utilise un fichier de configuration `boltConfig.json` à la racine du projet pour personnaliser son comportement. Ce fichier permet de définir les modèles d'IA à utiliser, les seuils de qualité du code, et d'autres paramètres importants.

**Note Importante sur les Prompts d'IA**:
Pour faciliter l'auto-optimisation du code, des prompts spécifiques pour l'IA sont insérés directement dans les fichiers de code sous forme de commentaires (`#codebase`). Ces prompts sont gérés et documentés dans le fichier `docs/CODEBASE_PROMPTS.md` et permettent de guider l'assistant IA (GitHub Copilot Chat) lors des itérations de développement. Ils ne doivent pas être interprétés comme des erreurs de code mais comme des directives pour l'IA.

## 🔧 Installation rapide

```bash
git clone https://github.com/votre-compte/bolt2bolt.git
cd bolt2bolt
npm install
npm run dev
```

## 📋 Utilisation basique

```bash
# Exécuter le processus d'auto-optimisation
npm run optimize

# Analyser un projet spécifique
npm run analyze -- --path /chemin/vers/votre/projet
```

## 🤝 Contribution

Les contributions sont les bienvenues! Consultez notre [Guide de Contribution](CONTRIBUTING.md) pour commencer.

### Contribution aux Prompts Copilot

Nous encourageons la contribution à l'amélioration des prompts Copilot. Veuillez consulter le [Guide de Contribution aux Prompts](CONTRIBUTING_PROMPTS.md) pour plus d'informations.

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

*Bolt2bolt est un projet en développement actif. Les retours d'utilisation sont appréciés pour améliorer le système.*

---

*Dernière mise à jour: 05/06/2024 15:00*

## État Actuel du Développement

/*
#codebase-block
[ITÉRATION-ACTUELLE]
Phase 4: Finalisation des tests unitaires et couverture de code

[PRIORITÉS]
1. Finaliser les tests unitaires pour tous les composants principaux
2. Améliorer la couverture de code jusqu'à 90% minimum
3. Optimiser les performances des composants critiques

[OBJECTIFS]
- Assurer une couverture de tests complète sur l'Analyseur et l'Optimiseur
- Mettre en place des tests d'intégration entre les composants principaux
- Identifier et corriger les zones à risque révélées par les tests

[PROCHAINE ÉTAPE]
Refactoring de l'Optimiseur pour améliorer la détection des patterns d'optimisation
#codebase-block
*/

L'itération actuelle se concentre sur la finalisation des tests unitaires et l'amélioration de la couverture de code. Nous visons une couverture minimale de 90% pour tous les composants principaux du système.

/*
[COPILOT_PROMPTS]
# Contexte et Itérations

## État Actuel
- Codebase en phase de finalisation des tests unitaires
- Priorité à la qualité et à la couverture de code
- Architecture principale établie et stable

## Directives Globales
- Maintenir une approche TDD pour les nouvelles fonctionnalités
- Utiliser les mocks appropriés pour isoler les tests
- S'assurer que chaque composant a une couverture de test minimale de 80%
- Documenter les scénarios de test critiques pour chaque composant

## Itération Actuelle (4)
- Objectif: Finaliser les tests unitaires et améliorer la couverture
- Prioriser les tests pour: Analyseur > Optimiseur > Validateur > Rapporteur
- Identifier et corriger les failles détectées par les tests

## Prochaine Itération (5)
- Objectif: Optimisation des performances et amélioration architecturale
- Focus sur le refactoring de l'Optimiseur
- Améliorations des algorithmes d'analyse
- Optimisation de la gestion mémoire
[COPILOT_PROMPTS]
*/