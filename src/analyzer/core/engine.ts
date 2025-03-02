/**
 * Moteur principal du système d'analyse de code.
 * Orchestre les différents analyseurs et consolide les résultats.
 * 
 * @module analyzer/core/engine
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { glob } from 'glob';

import { AnalysisOptions, CodeIssue, SeverityLevel, MetricType } from '../types';
import { AnalysisResult, AnalysisStats, AnalyzedFile, CodeAnalyzer } from './types';
import { calculateMetrics } from './metrics';

// Importation des analyseurs spécifiques
import { createStaticAnalyzers } from '../static';
import { createDynamicAnalyzers } from '../dynamic';
import { createDependencyAnalyzers } from '../dependencies';

/**
 * Moteur principal d'analyse de code
 */
export class AnalyzerEngine {
  private options: AnalysisOptions;
  private analyzers: CodeAnalyzer[] = [];
  private initialized: boolean = false;

  /**
   * Crée une instance du moteur d'analyse
   * @param options Options de configuration pour l'analyse
   */
  constructor(options: AnalysisOptions) {
    this.options = options;
  }

  /**
   * Initialise le moteur d'analyse et ses analyseurs
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Création des analyseurs en fonction des options
    if (this.options.staticAnalysis) {
      this.analyzers.push(...await createStaticAnalyzers(this.options));
    }
    
    if (this.options.dynamicAnalysis) {
      this.analyzers.push(...await createDynamicAnalyzers(this.options));
    }
    
    if (this.options.dependencyAnalysis) {
      this.analyzers.push(...await createDependencyAnalyzers(this.options));
    }

    // Initialisation de chaque analyseur
    await Promise.all(this.analyzers.map(analyzer => analyzer.initialize()));
    
    this.initialized = true;
  }

  /**
   * Analyse le code source aux chemins spécifiés
   * @param sourcePath Chemin ou liste de chemins à analyser
   * @returns Résultat complet de l'analyse
   */
  public async analyze(sourcePath: string | string[]): Promise<AnalysisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const paths = Array.isArray(sourcePath) ? sourcePath : [sourcePath];
    
    // Collecte tous les fichiers à analyser
    const filePaths = await this.collectFiles(paths);
    
    // Analyse chaque fichier avec tous les analyseurs
    const analyzedFiles: AnalyzedFile[] = [];
    const allIssues: CodeIssue[] = [];
    
    for (const filePath of filePaths) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const fileIssues: CodeIssue[] = [];
        
        // Applique chaque analyseur au fichier
        for (const analyzer of this.analyzers) {
          try {
            const issues = await analyzer.analyzeFile(filePath, fileContent);
            fileIssues.push(...issues);
          } catch (error) {
            console.error(`Error in analyzer ${analyzer.id} for file ${filePath}:`, error);
          }
        }
        
        // Calcule les métriques pour ce fichier
        const lines = fileContent.split('\n').length;
        const metricScores = calculateMetrics(filePath, fileContent, fileIssues);
        const score = this.calculateFileScore(metricScores);
        
        // Crée l'entrée pour ce fichier
        const analyzedFile: AnalyzedFile = {
          path: filePath,
          lines,
          issues: fileIssues,
          score,
          metricScores
        };
        
        analyzedFiles.push(analyzedFile);
        allIssues.push(...fileIssues);
      } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
      }
    }
    
    // Calcule les statistiques globales
    const stats = this.calculateStats(analyzedFiles, allIssues, startTime);
    
    // Génère un résumé textuel
    const summary = this.generateSummary(stats, analyzedFiles.length);
    
    // Prépare le résultat final
    const result: AnalysisResult = {
      analysisId: uuidv4(),
      timestamp: Date.now(),
      stats,
      files: analyzedFiles,
      issues: allIssues,
      metrics: {},  // Sera rempli par les métriques globales
      summary
    };
    
    // Nettoyage des ressources
    await this.cleanup();
    
    return result;
  }

  /**
   * Nettoie les ressources utilisées par le moteur et les analyseurs
   */
  private async cleanup(): Promise<void> {
    await Promise.all(this.analyzers.map(analyzer => analyzer.cleanup()));
  }

  /**
   * Collecte tous les fichiers à analyser en respectant les exclusions
   */
  private async collectFiles(paths: string[]): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const sourcePath of paths) {
      if ((await fs.stat(sourcePath)).isDirectory()) {
        // Pour les répertoires, utilise glob pour trouver tous les fichiers
        const files = await glob('**/*.{ts,tsx,js,jsx}', {
          cwd: sourcePath,
          ignore: this.options.excludePatterns,
          absolute: true
        });
        
        allFiles.push(...files);
      } else {
        // Pour les fichiers individuels, les ajoute directement
        allFiles.push(sourcePath);
      }
    }
    
    // Filtre par taille de fichier si spécifié
    const filteredFiles: string[] = [];
    for (const file of allFiles) {
      try {
        const stats = await fs.stat(file);
        const sizeKb = stats.size / 1024;
        
        if (sizeKb <= this.options.maxFileSizeKb) {
          filteredFiles.push(file);
        }
      } catch (error) {
        console.error(`Error checking file size for ${file}:`, error);
      }
    }
    
    return filteredFiles;
  }

  /**
   * Calcule le score global d'un fichier basé sur ses scores de métriques
   */
  private calculateFileScore(metricScores: Partial<Record<MetricType, number>>): number {
    // Poids relatifs pour chaque type de métrique
    const weights: Partial<Record<MetricType, number>> = {
      security: 0.3,
      performance: 0.25,
      maintainability: 0.25,
      complexity: 0.2
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [metric, score] of Object.entries(metricScores)) {
      const metricType = metric as MetricType;
      const weight = weights[metricType] || 0.1;
      
      weightedSum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Calcule les statistiques globales de l'analyse
   */
  private calculateStats(
    analyzedFiles: AnalyzedFile[],
    allIssues: CodeIssue[],
    startTime: number
  ): AnalysisStats {
    // Compte les problèmes par sévérité
    const issuesBySeverity: Record<SeverityLevel, number> = {
      [SeverityLevel.Info]: 0,
      [SeverityLevel.Warning]: 0,
      [SeverityLevel.Error]: 0,
      [SeverityLevel.Critical]: 0
    };
    
    // Compte les problèmes par type de métrique
    const issuesByMetric: Record<MetricType, number> = {
      complexity: 0,
      security: 0,
      performance: 0,
      maintainability: 0,
      documentation: 0,
      typescript: 0,
      duplication: 0,
      dependencies: 0,
      tests: 0
    };
    
    // Calcule les totaux
    let totalLines = 0;
    
    for (const issue of allIssues) {
      issuesBySeverity[issue.severity]++;
      issuesByMetric[issue.metricType]++;
    }
    
    for (const file