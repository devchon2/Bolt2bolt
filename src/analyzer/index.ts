/**
 * Bolt2bolt Code Analyzer
 * 
 * Module principal d'analyse de code qui orchestre les différentes 
 * stratégies d'analyse et génère des rapports consolidés.
 * 
 * @module analyzer
 */

import { AnalysisOptions } from './types';
import { AnalysisResult } from './core/types';
import { AnalyzerEngine } from './core/engine';
import { readFile } from 'fs/promises';
import path from 'path';
import { TypeScriptParser } from './parsers/typescript';
import { JavaScriptParser } from './parsers/javascript';
import { Logger } from '../lib/logger';

/**
 * Version du module d'analyse
 */
export const ANALYZER_VERSION = '0.1.0';

/**
 * Options par défaut pour l'analyse de code
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  staticAnalysis: true,
  dynamicAnalysis: false,
  dependencyAnalysis: true,
  metrics: ['complexity', 'security', 'performance', 'maintainability'],
  maxFileSizeKb: 500,
  excludePatterns: ['node_modules/**', 'dist/**', '.git/**'],
  securityScanLevel: 'standard',
  optimizationTarget: 'balanced'
};

/**
 * Analyse un projet ou fichier avec les options spécifiées.
 * Point d'entrée principal du module d'analyse.
 * 
 * @param sourcePath - Chemin vers les fichiers à analyser
 * @param options - Options de configuration pour l'analyse
 * @returns Résultat complet de l'analyse
 */
export async function analyzeCode(
  sourcePath: string | string[],
  options: Partial<AnalysisOptions> = {}
): Promise<AnalysisResult> {
  const mergedOptions = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  
  const engine = new AnalyzerEngine(mergedOptions);
  
  // Initialisation du moteur d'analyse
  await engine.initialize();
  
  // Exécution de l'analyse
  const result = await engine.analyze(sourcePath);
  
  return result;
}

/**
 * Interface pour tous les types d'analyseurs
 */
export interface IAnalyzer {
  analyze(code: string, options: AnalysisOptions): Promise<AnalysisResult>;
  supportedExtensions: string[];
}

/**
 * Représente une opportunité d'optimisation détectée
 */
export interface OptimizationOpportunity {
  type: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  codeSnippet?: string;
  suggestion?: string;
}

/**
 * Analyseur de code principal qui coordonne l'analyse de différents types de fichiers
 */
export class CodeAnalyzer {
  private analyzers: Map<string, IAnalyzer> = new Map();
  private logger: Logger;
  
  constructor(logger?: Logger) {
    // #codebase: [POINT-EXTENSION] Enregistrer des analyseurs supplémentaires ici
    this.logger = logger || new Logger('CodeAnalyzer');
    
    // Initialisation des parseurs par défaut
    const tsParser = new TypeScriptParser();
    const jsParser = new JavaScriptParser();
    
    // Enregistrement des analyseurs par extension
    tsParser.supportedExtensions.forEach(ext => this.analyzers.set(ext, tsParser));
    jsParser.supportedExtensions.forEach(ext => this.analyzers.set(ext, jsParser));
  }
  
  /**
   * Enregistre un nouvel analyseur dans le système
   */
  public registerAnalyzer(analyzer: IAnalyzer): void {
    analyzer.supportedExtensions.forEach(ext => {
      this.analyzers.set(ext, analyzer);
      this.logger.debug(`Registered analyzer for extension: ${ext}`);
    });
  }
  
  /**
   * Analyse un fichier spécifique en sélectionnant l'analyseur approprié
   */
  // #codebase: [POINT-CRITIQUE] Point d'entrée principal pour l'analyse de fichier unique
  public async analyzeFile(filePath: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const extension = path.extname(filePath).toLowerCase();
    const analyzer = this.analyzers.get(extension);
    
    if (!analyzer) {
      this.logger.warn(`No analyzer found for extension: ${extension}`);
      return {
        success: false,
        error: `Unsupported file type: ${extension}`,
        opportunities: []
      };
    }
    
    try {
      const code = await readFile(filePath, 'utf8');
      this.logger.debug(`Analyzing file: ${filePath}`);
      
      const fileOptions = {
        ...options,
        filePath
      };
      
      return await analyzer.analyze(code, fileOptions);
    } catch (error) {
      this.logger.error(`Error analyzing file ${filePath}`, error);
      return {
        success: false,
        error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        opportunities: []
      };
    }
  }
  
  /**
   * Analyse un projet entier en parcourant récursivement les répertoires
   */
  // #codebase: [PERF:CRITIQUE] Optimiser pour les grands projets avec beaucoup de fichiers
  public async analyzeProject(
    projectPath: string, 
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult[]> {
    // À implémenter: parcours récursif du projet
    // Pour la phase actuelle, cette fonctionnalité est en développement
    throw new Error('Project analysis not implemented yet');
  }
  
  /**
   * Détecte les opportunités d'optimisation dans du code déjà analysé
   */
  public detectOptimizationOpportunities(
    ast: any, 
    options: AnalysisOptions = {}
  ): OptimizationOpportunity[] {
    // À implémenter: algorithmes de détection d'opportunités
    return [];
  }
}

// Exports publics du module
export * from './types';
export * from './core/types';
export * from './core/metrics';
export * from './core/reporter';
export default CodeAnalyzer;
