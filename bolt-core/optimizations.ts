import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from './modules/analysis';
import { ProjectAnalysisReport } from './modules/analysis';
import { applySecurityOptimizations } from './modules/security-optimizer';
import { applyPerformanceOptimizations } from './modules/performance-optimizer';
import { applyComplexityOptimizations } from './modules/complexity-optimizer';
import { applyMaintainabilityOptimizations } from './modules/maintainability-optimizer';

/**
 * Type d'optimisation
 */
export type OptimizationType = 'security' | 'performance' | 'complexity' | 'maintainability';

/**
 * Résultat d'une optimisation
 */
export interface OptimizationResult {
  filePath: string;
  originalContent: string;
  optimizedContent: string;
  optimizationsApplied: {
    type: OptimizationType;
    description: string;
    linesBefore?: [number, number];
    linesAfter?: [number, number];
  }[];
  optimized: boolean;
  error?: string;
}

/**
 * Applique des optimisations à un fichier spécifique
 */
export async function optimizeFile(
  filePath: string,
  analysisResult: AnalysisResult,
  optimizationTypes: OptimizationType[] = ['security', 'performance', 'complexity', 'maintainability']
): Promise<OptimizationResult> {
  try {
    // Lire le contenu original
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    let optimizedContent = originalContent;
    const optimizationsApplied: {
      type: OptimizationType;
      description: string;
      linesBefore?: [number, number];
      linesAfter?: [number, number];
    }[] = [];

    // Appliquer les différents types d'optimisations selon les types demandés
    if (optimizationTypes.includes('security')) {
      const securityResult = await applySecurityOptimizations(optimizedContent, analysisResult);
      optimizedContent = securityResult.optimizedContent;
      optimizationsApplied.push(...securityResult.optimizationsApplied.map(opt => ({
        ...opt,
        type: 'security' as OptimizationType
      })));
    }

    if (optimizationTypes.includes('performance')) {
      const performanceResult = await applyPerformanceOptimizations(optimizedContent, analysisResult);
      optimizedContent = performanceResult.optimizedContent;
      optimizationsApplied.push(...performanceResult.optimizationsApplied.map(opt => ({
        ...opt,
        type: 'performance' as OptimizationType
      })));
    }

    if (optimizationTypes.includes('complexity')) {
      const complexityResult = await applyComplexityOptimizations(optimizedContent, analysisResult);
      optimizedContent = complexityResult.optimizedContent;
      optimizationsApplied.push(...complexityResult.optimizationsApplied.map(opt => ({
        ...opt,
        type: 'complexity' as OptimizationType
      })));
    }

    if (optimizationTypes.includes('maintainability')) {
      const maintainabilityResult = await applyMaintainabilityOptimizations(optimizedContent, analysisResult);
      optimizedContent = maintainabilityResult.optimizedContent;
      optimizationsApplied.push(...maintainabilityResult.optimizationsApplied.map(opt => ({
        ...opt,
        type: 'maintainability' as OptimizationType
      })));
    }

    // Sauvegarder le contenu optimisé uniquement s'il y a des changements
    const optimized = originalContent !== optimizedContent;
    if (optimized) {
      fs.writeFileSync(filePath, optimizedContent, 'utf-8');
    }

    return {
      filePath,
      originalContent,
      optimizedContent,
      optimizationsApplied,
      optimized
    };
  } catch (error) {
    console.error(`Erreur lors de l'optimisation de ${filePath}:`, error);
    return {
      filePath,
      originalContent: fs.readFileSync(filePath, 'utf-8'),
      optimizedContent: fs.readFileSync(filePath, 'utf-8'),
      optimizationsApplied: [],
      optimized: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Optimise l'ensemble du codebase en fonction des analyses
 */
export async function optimizeCodebase(
  rootDir: string,
  analysisResults: Record<string, AnalysisResult>,
  analysisReport: ProjectAnalysisReport,
  optimizationTypes: OptimizationType[] = ['security', 'performance', 'complexity', 'maintainability']
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  
  // Filtrer les fichiers qui nécessitent une optimisation
  const filesToOptimize = Object.entries(analysisReport.fileReports as Record<string, { requiresOptimization: boolean }>)
    .filter(([, report]) => report.requiresOptimization)
    .map(([relativePath]) => path.join(rootDir, relativePath));
  
  console.log(`🔧 Optimisation de ${filesToOptimize.length} fichiers...`);
  
  // Optimiser chaque fichier séquentiellement
  for (const filePath of filesToOptimize) {
    try {
      const analysisResult = analysisResults[filePath];
      if (!analysisResult) {
        console.warn(`⚠️ Aucun résultat d'analyse trouvé pour ${filePath}, fichier ignoré`);
        continue;
      }
      
      console.log(`🔧 Optimisation de ${path.relative(rootDir, filePath)}...`);
      const result = await optimizeFile(filePath, analysisResult, optimizationTypes);
      results.push(result);
      
      if (result.optimized) {
        console.log(`✅ ${path.relative(rootDir, filePath)} optimisé avec ${result.optimizationsApplied.length} améliorations.`);
      } else if (result.error) {
        console.error(`❌ Erreur lors de l'optimisation de ${path.relative(rootDir, filePath)}: ${result.error}`);
      } else {
        console.log(`ℹ️ Aucune optimisation nécessaire pour ${path.relative(rootDir, filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Erreur inattendue lors du traitement de ${filePath}:`, error);
    }
  }
  
  return results;
}

/**
 * Génère un rapport détaillé des optimisations effectuées
 */
export function generateOptimizationReport(results: OptimizationResult[]): string {
  const optimizedFiles = results.filter(r => r.optimized);
  const timestamp = new Date().toISOString();
  
  let report = `# Rapport d'optimisation Bolt2Bolt\n\nDate: ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}\n\n`;
  
  // Résumé
  report += `## Résumé\n\n`;
  report += `- Fichiers analysés: ${results.length}\n`;
  report += `- Fichiers optimisés: ${optimizedFiles.length}\n`;
  report += `- Optimisations totales: ${optimizedFiles.reduce((acc, r) => acc + r.optimizationsApplied.length, 0)}\n\n`;
  
  // Répartition par type
  const typeCounts = optimizedFiles.reduce((acc, result) => {
    result.optimizationsApplied.forEach(opt => {
      acc[opt.type] = (acc[opt.type] || 0) + 1;
    });
    return acc;
  }, {} as Record<OptimizationType, number>);
  
  report += `### Répartition par type\n\n`;
  for (const [type, count] of Object.entries(typeCounts)) {
    report += `- ${type}: ${count} optimisations\n`;
  }
  report += `\n`;
  
  // Détails par fichier
  report += `## Détails par fichier\n\n`;
  
  for (const result of optimizedFiles) {
    const relativePath = path.basename(result.filePath);
    report += `### ${relativePath}\n\n`;
    
    if (result.optimizationsApplied.length === 0) {
      report += `Aucune optimisation nécessaire.\n\n`;
      continue;
    }
    
    for (const opt of result.optimizationsApplied) {
      report += `#### ${opt.type}\n\n`;
      report += `${opt.description}\n\n`;
      
      if (opt.linesBefore && opt.linesAfter) {
        report += "```diff\n";
        const originalLines = result.originalContent.split('\n').slice(opt.linesBefore[0] - 1, opt.linesBefore[1]);
        const optimizedLines = result.optimizedContent.split('\n').slice(opt.linesAfter[0] - 1, opt.linesAfter[1]);
        
        for (const line of originalLines) {
          report += `- ${line}\n`;
        }
        for (const line of optimizedLines) {
          report += `+ ${line}\n`;
        }
        report += "```\n\n";
      }
    }
  }
  
  return report;
}
export function applyOptimizations(applyOptimizations: any) {
  throw new Error("Function not implemented.");
}

