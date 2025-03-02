const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

/**
 * Worker pour l'analyse de fichier individuel.
 * Ce worker reçoit un filePath et des options d'analyse,
 * effectue l'analyse et renvoie le rapport.
 */

try {
  const { file, rootDir, analysisDepth } = workerData;

  const relativePath = path.relative(rootDir, file);
  const stats = fs.statSync(file);
  const fileContent = fs.readFileSync(file, 'utf-8');

  // Analyse syntaxique si c'est un fichier TypeScript
  const isTypeScript = file.endsWith('.ts') || file.endsWith('.tsx');
  const issues = [];

  if (isTypeScript) {
    // Analyse TypeScript
    const sourceFile = ts.createSourceFile(
      file,
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

  const fileReport = {
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

  parentPort.postMessage(fileReport);
} catch (error) {
  console.error('Erreur dans le worker:', error);
}

/**
 * Analyse un fichier TypeScript
 */
function analyzeTypeScriptFile(sourceFile, depth) {
  const issues = [];

  // Le niveau d'analyse dépend de la profondeur demandée
  const visitor = (node) => {
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
function analyzeJavaScriptFile(fileContent, depth) {
  const issues = [];

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
function calculateComplexity(fileContent) {
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
function calculateMaintainability(fileContent, issues) {
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
function calculateSecurityScore(issues) {
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
function calculatePerformanceScore(issues) {
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
function generateFileSummary(issues, complexityScore, maintainabilityScore) {
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
  if (maintainabilityIssues > 0) summary += ` ${maintainabilityIssues} de maintenabilité.`;

  if (complexityScore < 60) {
    summary += ' La complexité du code est élevée.';
  }

  if (maintainabilityScore < 60) {
    summary += ' La maintenabilité du code est faible.';
  }

  return summary;
}

/**
 * Détermine la priorité d'optimisation pour un fichier
 */
function determineOptimizationPriority(
  issues,
  complexityScore,
  maintainabilityScore,
  securityScore,
  performanceScore
) {
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
