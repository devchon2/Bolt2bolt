import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';
import { cpus } from 'os';
import { Worker } from 'worker_threads';
// import { injectPrompt } from './prompt-injector'; // Ensure this module exists or remove if not needed

export interface AnalyzerOptions {
  includeDirs?: string[];
  excludeDirs?: string[];
  includeFiles?: string[];
  excludeFiles?: string[];
  minFileSizeKb?: number;
  maxFileSizeKb?: number;
  analysisDepth?: 'basic' | 'standard' | 'deep';
  concurrency?: number;
}

export interface AnalyzerReport {
  projectName: string;
  analyzedFiles: number;
  filesRequiringOptimization: number;
  totalIssues: number;
  fileReports: Record<string, FileAnalysisReport>;
  summary: {
    complexity: number;
    maintainability: number;
    security: number;
    performance: number;
  };
  timestamp: string;
}

export interface FileAnalysisReport {
  filePath: string;
  fileSize: number;
  modifiedTime: Date;
  issues: Issue[];
  metrics: {
    complexity: number;
    maintainability: number;
    security: number;
    performance: number;
  };
  summary: string;
  requiresOptimization: boolean;
  optimizationPriority: 'high' | 'medium' | 'low' | 'none';
}

export interface Issue {
  type: 'security' | 'performance' | 'complexity' | 'maintainability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  line?: number;
  column?: number;
  code?: string;
  recommendation?: string;
  ruleId?: string;
}

export interface AnalysisResult {
  fileReports: Record<string, FileAnalysisReport>;
  filesByPriority: {
    high: string[];
    medium: string[];
    low: string[];
  };
  overallStats: {
    totalFiles: number;
    totalIssues: number;
    securityIssues: number;
    performanceIssues: number;
    complexityIssues: number;
    maintainabilityIssues: number;
  };
}

/**
 * Version optimisée de l'analyse de projet avec parallélisation
 */
export async function analyzeProject(
  rootDir: string,
  options: AnalyzerOptions = {}
): Promise<{ report: AnalyzerReport; analysisResults: AnalysisResult }> {
  console.log('🔍 Démarrage de l\'analyse du projet avec optimisations Bolt2bolt...');
  injectPrompt('PROJECT_ANALYSIS_INIT', 'Consider using more advanced static analysis techniques.');
  
  // Options par défaut
  const {
    includeDirs = ['.'],
    excludeDirs = ['node_modules', 'dist', '.git', 'coverage'],
    includeFiles = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
    excludeFiles = ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],
    minFileSizeKb = 0,
    maxFileSizeKb = 1000,
    analysisDepth = 'standard',
    concurrency = Math.max(1, cpus().length - 1) // Utiliser tous les cœurs sauf un
  } = options;
  
  // Trouver tous les fichiers à analyser avec cache pour accélérer les analyses répétées
  const cacheDir = path.join(rootDir, '.bolt-cache');
  const cacheFile = path.join(cacheDir, 'file-list-cache.json');
  let files: string[];
  
  if (fs.existsSync(cacheFile)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const cacheAge = Date.now() - cacheData.timestamp;
      
      if (cacheAge < 3600000) { // Cache valide
        files = cacheData.files;
      } else {
        injectPrompt('CACHE_INVALIDATION', 'Implement a smarter cache invalidation strategy.');
        files = await findFiles(rootDir, includeDirs, excludeDirs, includeFiles, excludeFiles);
        fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), files }));
      }
    } catch (error) {
      console.error('⚠️ Erreur de lecture du cache, recalcul des fichiers à analyser.', error);
      injectPrompt('CACHE_READ_ERROR', 'Improve error handling for cache read operations.');
      files = await findFiles(rootDir, includeDirs, excludeDirs, includeFiles, excludeFiles);
      fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), files }));
    }
  } else {
    injectPrompt('CACHE_MISS', 'Optimize the initial cache creation process.');
    files = await findFiles(rootDir, includeDirs, excludeDirs, includeFiles, excludeFiles);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), files }));
  }
  
  console.log(`📁 ${files.length} fichiers trouvés pour analyse.`);
  
  // Analyse des fichiers
  const fileReports: Record<string, FileAnalysisReport> = {};
  const projectName = path.basename(rootDir);
  
  // Analyse en parallèle avec contrôle de concurrence
  const chunkSize = Math.max(1, Math.ceil(files.length / concurrency));
  const fileChunks = Array(Math.ceil(files.length / chunkSize))
    .fill(0)
    .map((_, i) => files.slice(i * chunkSize, (i + 1) * chunkSize));
  
  await Promise.all(
    fileChunks.map(async (chunk) => {
      const workerPromises = chunk.map((file) => {
        return new Promise<void>((resolve, reject) => {
          const worker = new Worker('./analyzeFileWorker.js', {
            workerData: { file, rootDir, analysisDepth }
          });
          
          worker.on('message', (fileReport) => {
            const relativePath = path.relative(rootDir, file);
            fileReports[relativePath] = fileReport;
            resolve();
          });
          
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      });
      
      await Promise.all(workerPromises);
    })
  );
  
  // Calculer les statistiques globales
  const analysisResults = calculateAnalysisResults(fileReports);
  
  // Générer le rapport
  const report: AnalyzerReport = {
    projectName,
    analyzedFiles: Object.keys(fileReports).length,
    filesRequiringOptimization: Object.values(fileReports).filter((r) => r.requiresOptimization).length,
    totalIssues: Object.values(fileReports).reduce((sum, report) => sum + report.issues.length, 0),
    fileReports,
    summary: {
      complexity: calculateAverageMetric(fileReports, 'complexity'),
      maintainability: calculateAverageMetric(fileReports, 'maintainability'),
      security: calculateAverageMetric(fileReports, 'security'),
      performance: calculateAverageMetric(fileReports, 'performance')
    },
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ Analyse du projet terminée!');
  console.log(`📊 ${report.analyzedFiles} fichiers analysés, ${report.filesRequiringOptimization} nécessitent une optimisation.`);
  
  return { report, analysisResults };
}

/**
 * Trouve les fichiers à analyser en fonction des critères spécifiés
 */
async function findFiles(
  rootDir: string,
  includeDirs: string[],
  excludeDirs: string[],
  includeFiles: string[],
  excludeFiles: string[]
): Promise<string[]> {
  const allFiles: string[] = [];
  
  for (const includeDir of includeDirs) {
    const dirPath = path.join(rootDir, includeDir);
    
    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️ Le répertoire ${dirPath} n'existe pas, ignoré.`);
      continue;
    }
    
    // Construire les patterns d'exclusion
    const ignorePatterns = excludeDirs.map((dir) => `**/${dir}/**`);
    
    // Trouver les fichiers correspondant aux patterns d'inclusion
    for (const pattern of includeFiles) {
      const matches = await glob(pattern, {
        cwd: dirPath,
        ignore: [...ignorePatterns, ...excludeFiles],
        absolute: true
      });
      
      allFiles.push(...matches);
    }
  }
  
  return [...new Set(allFiles)]; // Éliminer les doublons
}

/**
 * Analyse un fichier individuel
 */
async function analyzeFile(filePath: string, rootDir: string, analysisDepth: string): Promise<FileAnalysisReport> {
  const relativePath = path.relative(rootDir, filePath);
  const stats = fs.statSync(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Analyse syntaxique si c'est un fichier TypeScript
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const issues: Issue[] = [];
  
  if (isTypeScript) {
    // Analyse TypeScript
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    issues.push(...analyzeTypeScriptFile(sourceFile, analysisDepth));
  } else {
    // Analyse JavaScript (moins détaillée)
    issues.push(...analyzeJavaScriptFile(fileContent, analysisDepth));
  }
  
  // Calcul des métriques
  const complexityScore = calculateComplexity(fileContent);
  const maintainabilityScore = calculateMaintainability(fileContent, issues);
  const securityScore = calculateSecurityScore(issues);
  const performanceScore = calculatePerformanceScore(issues);
  
  // Décider si le fichier nécessite une optimisation
  const requiresOptimization = issues.length > 0 || 
    complexityScore < 60 ||
    maintainabilityScore < 60 || 
    securityScore < 70 || 
    performanceScore < 70;
  
  // Déterminer la priorité d'optimisation
  const optimizationPriority = determineOptimizationPriority(
    issues, 
    complexityScore,
    maintainabilityScore,
    securityScore,
    performanceScore
  );
  
  return {
    filePath: relativePath,
    fileSize: stats.size,
    modifiedTime: stats.mtime,
    issues,
    metrics: {
      complexity: complexityScore,
      maintainability: maintainabilityScore,
      security: securityScore,
      performance: performanceScore
    },
    summary: generateFileSummary(issues, complexityScore, maintainabilityScore),
    requiresOptimization,
    optimizationPriority
  };
}

/**
 * Analyse un fichier TypeScript
 */
function analyzeTypeScriptFile(sourceFile: ts.SourceFile, depth: string): Issue[] {
  const issues: Issue[] = [];
  
  // Le niveau d'analyse dépend de la profondeur demandée
  const visitor = (node: ts.Node) => {
    // Détecter les problèmes de complexité
    if (ts.isFunctionLike(node)) {
      const functionText = node.getText(sourceFile);
      const lineCount = functionText.split('\n').length;
      
      if (lineCount > 50) {
        issues.push({
          type: 'complexity',
          severity: 'medium',
          description: 'Fonction trop longue',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          recommendation: 'Envisagez de diviser cette fonction en sous-fonctions plus petites'
        });
      }
    }
    
    // Détecter les problèmes de sécurité
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(sourceFile);
      if (expression.includes('eval')) {
        issues.push({
          type: 'security',
          severity: 'high',
          description: 'Utilisation d\'eval détectée',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          recommendation: 'Évitez d\'utiliser eval pour des raisons de sécurité'
        });
      }
    }
    
    // Analyse approfondie si demandée
    if (depth === 'deep') {
      // Analyse supplémentaire...
    }
    
    ts.forEachChild(node, visitor);
  };
  
  ts.forEachChild(sourceFile, visitor);
  
  return issues;
}

/**
 * Analyse un fichier JavaScript
 */
function analyzeJavaScriptFile(fileContent: string, depth: string): Issue[] {
  const issues: Issue[] = [];
  
  // Analyse simple basée sur des patterns (moins précise que l'analyse TS)
  
  // Détecter les problèmes de sécurité
  if (fileContent.includes('eval(')) {
    issues.push({
      type: 'security',
      severity: 'high',
      description: 'Utilisation d\'eval détectée',
      recommendation: 'Évitez d\'utiliser eval pour des raisons de sécurité'
    });
  }
  
  // Analyse de la complexité
  const lineCount = fileContent.split('\n').length;
  if (lineCount > 500) {
    issues.push({
      type: 'maintainability',
      severity: 'medium',
      description: 'Fichier trop long',
      recommendation: 'Envisagez de diviser ce fichier en modules plus petits'
    });
  }
  
  return issues;
}

/**
 * Calcule un score de complexité pour le fichier
 */
function calculateComplexity(fileContent: string): number {
  // Calcul simplifié basé sur des métriques comme:
  // - Nombre de lignes
  // - Profondeur d'imbrication
  // - Nombre de branches conditionnelles
  
  const lineCount = fileContent.split('\n').length;
  const cyclomaticComplexity = (fileContent.match(/if|for|while|switch|catch|\?/g) || []).length;
  const nestingDepth = Math.max(
    ...fileContent.split('\n').map(line => (line.match(/\{/g) || []).length)
  );
  
  // Score sur 100, où 100 est le meilleur (moins complexe)
  const rawScore = 100 - (
    lineCount / 10 + 
    cyclomaticComplexity * 2 + 
    nestingDepth * 5
  );
  
  // Limiter le score entre 0 et 100
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Calcule un score de maintenabilité
 */
function calculateMaintainability(fileContent: string, issues: Issue[]): number {
  // Calcul basé sur:
  // - Ratio commentaires/code
  // - Problèmes de qualité du code
  // - Longueur des fonctions
  
  const codeLines = fileContent.split('\n').filter(line => 
    !line.trim().startsWith('//') && !line.trim().startsWith('/*') && line.trim() !== ''
  ).length;
  
  const commentLines = fileContent.split('\n').filter(line => 
    line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
  ).length;
  
  const commentRatio = commentLines / (codeLines > 0 ? codeLines : 1);
  const maintainabilityIssues = issues.filter(issue => issue.type === 'maintainability').length;
  
  // Score sur 100, où 100 est le meilleur (plus maintenable)
  const rawScore = 100 - (
    (maintainabilityIssues * 10) + 
    (commentRatio < 0.1 ? 20 : 0) + 
    (codeLines > 1000 ? 20 : 0)
  );
  
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Calcule un score de sécurité
 */
function calculateSecurityScore(issues: Issue[]): number {
  // Score basé sur le nombre et la sévérité des problèmes de sécurité
  const securityIssues = issues.filter(issue => issue.type === 'security');
  
  const criticalIssues = securityIssues.filter(issue => issue.severity === 'critical').length;
  const highIssues = securityIssues.filter(issue => issue.severity === 'high').length;
  const mediumIssues = securityIssues.filter(issue => issue.severity === 'medium').length;
  const lowIssues = securityIssues.filter(issue => issue.severity === 'low').length;
  
  // Score sur 100, où 100 est le meilleur (plus sécurisé)
  const rawScore = 100 - (
    (criticalIssues * 25) + 
    (highIssues * 15) + 
    (mediumIssues * 7) + 
    (lowIssues * 3)
  );
  
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Calcule un score de performance
 */
function calculatePerformanceScore(issues: Issue[]): number {
  // Score basé sur les problèmes de performance identifiés
  const performanceIssues = issues.filter(issue => issue.type === 'performance');
  
  const criticalIssues = performanceIssues.filter(issue => issue.severity === 'critical').length;
  const highIssues = performanceIssues.filter(issue => issue.severity === 'high').length;
  const mediumIssues = performanceIssues.filter(issue => issue.severity === 'medium').length;
  const lowIssues = performanceIssues.filter(issue => issue.severity === 'low').length;
  
  // Score sur 100, où 100 est le meilleur (plus performant)
  const rawScore = 100 - (
    (criticalIssues * 25) + 
    (highIssues * 15) + 
    (mediumIssues * 7) + 
    (lowIssues * 3)
  );
  
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Génère un résumé textuel pour le fichier
 */
function generateFileSummary(issues: Issue[], complexityScore: number, maintainabilityScore: number): string {
  if (issues.length === 0 && complexityScore > 80 && maintainabilityScore > 80) {
    return 'Ce fichier est bien structuré et ne nécessite pas d\'optimisation.';
  }
  
  const securityIssues = issues.filter(issue => issue.type === 'security').length;
  const performanceIssues = issues.filter(issue => issue.type === 'performance').length;
  const complexityIssues = issues.filter(issue => issue.type === 'complexity').length;
  const maintainabilityIssues = issues.filter(issue => issue.type === 'maintainability').length;
  
  let summary = `Ce fichier présente ${issues.length} problèmes:`;
  
  if (securityIssues > 0) summary += ` ${securityIssues} de sécurité,`;
  if (performanceIssues > 0) summary += ` ${performanceIssues} de performance,`;
  if (complexityIssues > 0) summary += ` ${complexityIssues} de complexité,`;
  if (maintainabilityIssues > 0) summary += ` ${maintenabilitéIssues} de maintenabilité.`;
  
  if (complexityScore < 60) {
    summary += ' La complexité du code est élevée.';
  }
  
  if (maintenabilitéScore < 60) {
    summary += ' La maintenabilité du code est faible.';
  }
  
  return summary;
}

/**
 * Détermine la priorité d'optimisation pour un fichier
 */
function determineOptimizationPriority(
  issues: Issue[],
  complexityScore: number,
  maintainabilityScore: number,
  securityScore: number,
  performanceScore: number
): 'high' | 'medium' | 'low' | 'none' {
  // Problèmes critiques ou de sécurité = priorité haute
  if (issues.some(issue => issue.severity === 'critical') || securityScore < 50) {
    return 'high';
  }
  
  // Problèmes de performance importants ou nombreux problèmes
  if (performanceScore < 60 || issues.length > 10) {
    return 'high';
  }
  
  // Complexité ou maintenabilité faible
  if (complexityScore < 40 || maintainabilityScore < 40) {
    return 'high';
  }
  
  // Problèmes moyens
  if (
    issues.some(issue => issue.severity === 'high') || 
    complexityScore < 60 || 
    maintainabilityScore < 60 ||
    performanceScore < 70
  ) {
    return 'medium';
  }
  
  // Quelques problèmes mineurs
  if (issues.length > 0) {
    return 'low';
  }
  
  return 'none';
}

/**
 * Calcule une moyenne des métriques pour tous les fichiers
 */
function calculateAverageMetric(fileReports: Record<string, FileAnalysisReport>, metricName: keyof FileAnalysisReport['metrics']): number {
  const reports = Object.values(fileReports);
  
  if (reports.length === 0) {
    return 100; // Valeur par défaut
  }
  
  const sum = reports.reduce((total, report) => total + report.metrics[metricName], 0);
  return Math.round(sum / reports.length);
}
