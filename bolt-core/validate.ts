import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Résultat de validation
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  testResults?: TestResult;
  lintResults?: LintResult;
}

/**
 * Erreur de validation
 */
export interface ValidationError {
  type: 'syntax' | 'test' | 'lint' | 'build' | 'type';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

/**
 * Avertissement de validation
 */
export interface ValidationWarning {
  type: 'lint' | 'build' | 'type';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

/**
 * Résultat des tests
 */
export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

/**
 * Résultat du linting
 */
export interface LintResult {
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

/**
 * Options de validation
 */
export interface ValidationOptions {
  runTests?: boolean;
  runLint?: boolean;
  runTypecheck?: boolean;
  runBuild?: boolean;
  testCommand?: string;
  lintCommand?: string;
  typecheckCommand?: string;
  buildCommand?: string;
}

/**
 * Valide un projet pour s'assurer qu'il fonctionne correctement
 * @param projectDir Répertoire du projet
 * @param options Options de validation
 */
export async function validateProject(
  projectDir: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const {
    runTests = true,
    runLint = true,
    runTypecheck = true,
    runBuild = true,
    testCommand = 'npm test',
    lintCommand = 'npm run lint',
    typecheckCommand = 'npm run typecheck',
    buildCommand = 'npm run build'
  } = options;

  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  // Vérifier la syntaxe JavaScript/TypeScript des fichiers
  try {
    await validateSyntax(projectDir, result);
  } catch (error) {
    result.success = false;
    result.errors.push({
      type: 'syntax',
      message: error instanceof Error ? error.message : String(error)
    });
  }

  // Vérifier si le projet contient un package.json
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
  if (!hasPackageJson) {
    console.warn('⚠️ Aucun package.json trouvé, certaines validations seront ignorées.');
    return result;
  }

  // Exécuter le build du projet
  if (runBuild) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const hasBuildScript = packageJson.scripts && packageJson.scripts.build;

      if (hasBuildScript) {
        console.log('🔧 Construction du projet...');
        await execCommand(buildCommand, projectDir);
        console.log('✅ La construction du projet a réussi.');
      } else {
        console.log('ℹ️ Aucun script de construction trouvé dans package.json');
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'build',
        message: error instanceof Error ? error.message : String(error)
      });
      console.error('❌ Échec de la construction du projet:', error);
    }
  }

  // Exécuter les tests si configurés
  if (runTests) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const hasTestScript = packageJson.scripts && packageJson.scripts.test;

      if (hasTestScript) {
        console.log('🧪 Exécution des tests...');
        await execCommand(testCommand, projectDir);
        console.log('✅ Tous les tests sont passés.');
      } else {
        console.log('ℹ️ Aucun script de test trouvé dans package.json');
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'test',
        message: error instanceof Error ? error.message : String(error)
      });
      console.error('❌ Certains tests ont échoué:', error);
    }
  }

  // Exécuter le lint si configuré
  if (runLint) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const hasLintScript = packageJson.scripts && packageJson.scripts.lint;

      if (hasLintScript) {
        console.log('🔍 Exécution du linting...');
        await execCommand(lintCommand, projectDir);
        console.log('✅ Linting réussi.');
      } else {
        console.log('ℹ️ Aucun script de lint trouvé dans package.json');
      }
    } catch (error) {
      // Le lint peut échouer sans que cela soit critique
      result.warnings.push({
        type: 'lint',
        message: error instanceof Error ? error.message : String(error)
      });
      console.warn('⚠️ Des problèmes de linting ont été détectés:', error);
    }
  }

  // Exécuter la vérification des types si configurée
  if (runTypecheck) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
      const hasTypecheckScript = packageJson.scripts && packageJson.scripts.typecheck;

      if (hasTypecheckScript) {
        console.log('🔍 Vérification des types...');
        await execCommand(typecheckCommand, projectDir);
        console.log('✅ Vérification des types réussie.');
      } else {
        console.log('ℹ️ Aucun script de vérification de types trouvé dans package.json');
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'type',
        message: error instanceof Error ? error.message : String(error)
      });
      console.error('❌ Des erreurs de typage ont été détectées:', error);
    }
  }

  return result;
}

/**
 * Valide la syntaxe des fichiers JavaScript et TypeScript
 */
async function validateSyntax(projectDir: string, result: ValidationResult): Promise<void> {
  // Implémentation basique de validation de syntaxe
  const jsFiles = await findFiles(projectDir, ['.js', '.jsx', '.ts', '.tsx']);
  
  for (const file of jsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      // Détection basique d'erreurs de syntaxe JavaScript
      Function(`"use strict";${content}`);
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'syntax',
        message: error instanceof Error ? error.message : String(error),
        file: path.relative(projectDir, file)
      });
    }
  }
}

/**
 * Valide les optimisations pour s'assurer qu'elles n'ont pas introduit de régressions
 */
export async function validateOptimizations(
  projectDir: string,
  optimizationResults: any[],
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  console.log('🧪 Validation des optimisations...');
  
  // Effectuer une validation complète du projet
  const validationResult = await validateProject(projectDir, options);
  
  // Si la validation échoue, analyser les résultats pour voir s'ils sont liés aux optimisations
  if (!validationResult.success && optimizationResults.length > 0) {
    console.log('🔍 Analyse des problèmes de validation en relation avec les optimisations...');
    
    // Filtrer les erreurs qui correspondent aux fichiers optimisés
    const optimizedFilePaths = optimizationResults.map((r: any) => r.filePath);
    
    const errorsInOptimizedFiles = validationResult.errors.filter(error => 
      error.file && optimizedFilePaths.some(filePath => 
        error.file && error.file.includes(path.basename(filePath)))
    );
    
    if (errorsInOptimizedFiles.length > 0) {
      console.warn(`⚠️ ${errorsInOptimizedFiles.length} erreurs détectées dans les fichiers optimisés.`);
    } else {
      console.log('✅ Aucune erreur détectée dans les fichiers optimisés.');
    }
  }
  
  return validationResult;
}

/**
 * Exécute une commande shell dans un répertoire spécifié
 */
async function execCommand(command: string, cwd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { cwd });
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'exécution de la commande '${command}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Trouve les fichiers avec les extensions spécifiées
 */
async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const result: string[] = [];
  
  function traverseDir(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.git')) {
        traverseDir(filePath);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        result.push(filePath);
      }
    }
  }
  
  traverseDir(dir);
  return result;
}
