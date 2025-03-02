/**
 * Script de validation des instructions #codebase
 * 
 * Ce script parcourt les fichiers du projet et vérifie que les instructions #codebase
 * respectent les standards définis.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Extensions de fichiers à scanner
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.md'],
  
  // Dossiers à ignorer
  ignoreDirs: ['node_modules', 'dist', 'build', '.git'],
  
  // Sections requises pour les blocs #codebase-block
  requiredSections: {
    // Pour les fichiers de code
    code: ['CONTEXTE', 'OBJECTIF'],
    
    // Pour les fichiers markdown
    markdown: ['ITÉRATION-ACTUELLE']
  },
  
  // Pattern d'expression régulière pour trouver les blocs #codebase
  blockPattern: /#codebase-block[\s\S]*?#codebase-block/gm,
  
  // Pattern pour trouver les sections dans un bloc
  sectionPattern: /\[(.*?)\]/g
};

/**
 * Vérifie si un fichier contient des instructions #codebase valides
 * @param {string} filePath - Chemin du fichier à vérifier
 * @returns {Object} Résultat de la validation
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileExt = path.extname(filePath);
  
  // Déterminer le type de fichier (code ou markdown)
  const fileType = fileExt === '.md' ? 'markdown' : 'code';
  const requiredSections = CONFIG.requiredSections[fileType];
  
  const results = {
    filePath,
    hasCodebaseBlock: false,
    missingSections: [],
    isValid: true
  };
  
  // Rechercher les blocs #codebase
  const blocks = content.match(CONFIG.blockPattern);
  
  if (!blocks) {
    // Pas de bloc #codebase trouvé, c'est OK pour les fichiers non-critiques
    return results;
  }
  
  results.hasCodebaseBlock = true;
  
  // Pour chaque bloc, vérifier les sections requises
  blocks.forEach(block => {
    const sections = [];
    let match;
    
    while ((match = CONFIG.sectionPattern.exec(block)) !== null) {
      sections.push(match[1]);
    }
    
    // Vérifier les sections manquantes
    requiredSections.forEach(section => {
      if (!sections.includes(section)) {
        results.missingSections.push(section);
        results.isValid = false;
      }
    });
  });
  
  return results;
}

/**
 * Fonction principale qui exécute la validation sur tous les fichiers
 */
function main() {
  // Créer le pattern glob pour les extensions
  const extensionPattern = CONFIG.fileExtensions.map(ext => `**/*${ext}`).join('|');
  
  // Obtenir tous les fichiers correspondant aux extensions
  const files = glob.sync(extensionPattern, {
    ignore: CONFIG.ignoreDirs.map(dir => `**/${dir}/**`)
  });
  
  console.log(`Validation des instructions #codebase dans ${files.length} fichiers...`);
  
  let invalidFiles = 0;
  let filesWithBlocks = 0;
  
  // Valider chaque fichier
  files.forEach(file => {
    const result = validateFile(file);
    
    if (result.hasCodebaseBlock) {
      filesWithBlocks++;
      
      if (!result.isValid) {
        invalidFiles++;
        console.log(`❌ ${file}:`);
        console.log(`   Sections manquantes: ${result.missingSections.join(', ')}`);
      }
    }
  });
  
  // Afficher les résultats
  console.log('\n--- Résumé ---');
  console.log(`Total de fichiers scannés: ${files.length}`);
  console.log(`Fichiers avec instructions #codebase: ${filesWithBlocks}`);
  console.log(`Fichiers avec instructions invalides: ${invalidFiles}`);
  
  if (invalidFiles === 0) {
    console.log('✅ Toutes les instructions #codebase sont valides!');
    process.exit(0);
  } else {
    console.error(`❌ ${invalidFiles} fichier(s) contiennent des instructions invalides.`);
    process.exit(1);
  }
}

// Exécuter le script
main();
