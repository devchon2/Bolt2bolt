import * as readline from 'readline';
import { codeScanner } from './tools/code-scanner';
import { testGenerator } from './tools/test-generator';
import { DependencyAnalyzer } from './tools/dependency-analyzer';
import { codeRefactorer } from './tools/code-refactorer';
import { documentationUpdater } from './tools/documentation-updater';
import { performanceAnalyzer } from './tools/performanceAnalyzer';
import { complianceChecker } from './tools/compliance-checker';

// Interface pour standardiser le résultat des actions
interface ActionResult {
  success: boolean;
  summary: string;
  details: string[];
  metrics?: Record<string, any>;
}

/**
 * Menu principal d'actions pour l'optimisation de la codebase
 */
async function showMainMenu(): Promise<void> {
  console.clear();
  console.log('🛠️  Assistant d\'Optimisation Bolt2Bolt 🛠️\n');
  console.log('Sélectionnez une action:');
  console.log('1️⃣  Scanner et stabiliser la codebase actuelle');
  console.log('2️⃣  Générer & exécuter des tests unitaires intelligents');
  console.log('3️⃣  Analyser et optimiser les dépendances du projet');
  console.log('4️⃣  Refactoriser les parties du code jugées complexes');
  console.log('5️⃣  Mettre à jour la documentation sans ajout de nouveaux fichiers');
  console.log('6️⃣  Analyser et proposer des améliorations sur les performances');
  console.log('7️⃣  Vérifier la conformité aux standards TypeScript & sécurité');
  console.log('0️⃣  Quitter');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nVotre choix (0-7): ', async (choice) => {
    rl.close();
    
    let result: ActionResult | null = null;
    
    switch (choice) {
      case '1':
        console.log('\n🔍 Scanner et stabiliser la codebase...');
        result = await codeScanner.scan();
        break;
      case '2':
        console.log('\n🧪 Génération et exécution des tests unitaires...');
        // Prompt: Instruct the AI to analyze existing code and generate comprehensive unit tests.
        injectPrompt('TEST_GENERATION_INIT', 'Analyze the codebase to generate effective and comprehensive unit tests, covering various scenarios and edge cases. Prioritize testing critical functionalities and complex logic.');
        result = await testGenerator.generateAndRun();
        // Prompt: Instruct the AI to engrange the tests generated
        injectPrompt('TEST_GENERATION_STORE', 'Store the generated tests in a structured manner, making them easily accessible and maintainable for future use.');
        break;
      case '3':
        console.log('\n📦 Analyse des dépendances...');
        result = await dependencyAnalyzer.analyze();
        break;
      case '4':
        console.log('\n🔄 Refactorisation du code complexe...');
        result = await codeRefactorer.refactor();
        break;
      case '5':
        console.log('\n📝 Mise à jour de la documentation...');
        result = await documentationUpdater.update();
        break;
      case '6':
        console.log('\n⚡ Analyse des performances...');
        result = await performanceAnalyzer.analyze();
        break;
      case '7':
        console.log('\n✅ Vérification de la conformité et de la sécurité...');
        result = await complianceChecker.check();
        break;
      case '0':
        console.log('\nAu revoir!');
        return;
      default:
        console.log('\n❌ Choix invalide. Veuillez réessayer.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return showMainMenu();
    }
    
    if (result) {
      displayResult(result);
    }
    
    // Retour au menu après affichage des résultats
    rl.question('\nAppuyez sur Entrée pour revenir au menu principal...', () => {
      rl.close();
      showMainMenu();
    });
  });
}

/**
 * Affiche les résultats d'une action de manière formatée
 */
function displayResult(result: ActionResult): void {
  console.clear();
  console.log(`\n🛠 Résultat de l'action: ${result.success ? '✅ Succès' : '❌ Échec'}\n`);
  
  console.log('📊 Résumé:');
  console.log(result.summary);
  
  console.log('\n📋 Détails:');
  result.details.forEach(detail => console.log(`• ${detail}`));
  
  if (result.metrics) {
    console.log('\n📈 Métriques:');
    Object.entries(result.metrics).forEach(([key, value]) => {
      console.log(`• ${key}: ${value}`);
    });
  }
}

// Point d'entrée de l'application
(async () => {
  await showMainMenu();
})();
