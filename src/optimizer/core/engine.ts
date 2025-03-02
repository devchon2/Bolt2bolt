/**
 * Moteur principal d'optimisation de code
 * 
 * Coordonne le processus d'optimisation, applique les transformations
 * et gère les résultats.
 * 
 * @module optimizer/core/engine
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { glob } from 'glob';
import * as ts from 'typescript';

import { analyzeCode } from '../../analyzer';
import { OptimizationOptions, AppliedTransformation } from '../types';
import { 
  OptimizationResult, 
  OptimizationStats, 
  ModifiedFile,
  TransformationContext,
  ValidationResult
} from './types';

import { getTransformations } from '../transformations';
import { validateTransformation } from './validator';
import { calculateImprovementScores } from './metrics';

/**
 * Moteur principal d'optimisation de code
 */
export class OptimizerEngine {
  private options: OptimizationOptions;
  private transformations: any[] = [];
  private initialized: boolean = false;

  /**
   * Crée une instance du moteur d'optimisation
   * @param options Options de configuration pour l'optimisation
   */
  constructor(options: OptimizationOptions) {
    this.options = options;
  }

  /**
   * Initialise le moteur d'optimisation et charge les transformations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Charge les transformations disponibles selon les types d'optimisation demandés
    this.transformations = await getTransformations(this.options.optimizationTypes);
    
    // Filtre les transformations selon la sévérité configurée
    this.transformations = this.transformations.filter(t => 
      this.options.severity.includes(t.severity)
    );
    
    // Trie les transformations selon la méthode de priorisation
    this.sortTransformations();
    
    this.initialized = true;
  }

  /**
   * Optimise le code source aux chemins spécifiés
   * @param sourcePath Chemin ou liste de chemins à optimiser
   * @param analysisResults Résultats d'analyse précédente (optionnel)
   * @returns Résultat complet de l'optimisation
   */
  public async optimize(
    sourcePath: string | string[],
    analysisResults?: any
  ): Promise<OptimizationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const paths = Array.isArray(sourcePath) ? sourcePath : [sourcePath];
    
    // Obtient des résultats d'analyse si non fournis
    if (!analysisResults) {
      analysisResults = await analyzeCode(sourcePath);
    }
    
    // Collecte tous les fichiers à optimiser
    const filePaths = await this.collectFiles(paths);
    
    // Préparation des structures pour les résultats
    const appliedTransformations: AppliedTransformation[] = [];
    const rejectedTransformations: AppliedTransformation[] = [];
    const modifiedFiles: ModifiedFile[] = [];
    
    // Compteurs pour les statistiques
    const transformationsByType: Record<string, number> = {};
    this.options.optimizationTypes.forEach(type => {
      transformationsByType[type] = 0;
    });
    
    // Traite chaque fichier
    for (const filePath of filePaths) {
      try {
        // Récupère le contenu du fichier
        const originalContent = await fs.readFile(filePath, 'utf-8');
        
        // Obtient les problèmes spécifiques à ce fichier
        const fileIssues = analysisResults.issues.filter((issue: any) => 
          issue.location.filePath === filePath
        );
        
        // Si aucun problème, passe au fichier suivant
        if (fileIssues.length === 0) {
          continue;
        }
        
        // Parse le fichier en AST
        const sourceFile = ts.createSourceFile(
          filePath,
          originalContent,
          ts.ScriptTarget.Latest,
          true
        );
        
        // Prépare le contexte de transformation
        const context: TransformationContext = {
          fileContent: originalContent,
          filePath,
          ast: sourceFile,
          issues: fileIssues
        };
        
        // Tente d'appliquer les transformations
        const fileTransformations = await this.applyTransformations(context);
        
        // Si des transformations ont été appliquées, enregistre le fichier modifié
        if (fileTransformations.applied.length > 0) {
          // Génère le nouveau contenu du fichier
          let optimizedContent = originalContent; // À implémenter: appliquer les transformations
          
          // Enregistre les statistiques par type de transformation
          fileTransformations.applied.forEach(t => {
            const type = t.transformation.type;
            transformationsByType[type] = (transformationsByType[type] || 0) + 1;
          });
          
          // Calcule les scores d'amélioration
          const improvementScores = calculateImprovementScores(
            originalContent,
            optimizedContent,
            fileTransformations.applied
          );
          
          // Ajoute le fichier à la liste des fichiers modifiés
          modifiedFiles.push({
            path: filePath,
            transformationsCount: fileTransformations.applied.length,
            originalContent,
            optimizedContent,
            improvementScores
          });
          
          // Si ce n'est pas un dry run, écrit les changements dans le fichier
          if (!this.options.dryRun) {
            await fs.writeFile(filePath, optimizedContent);
            
            // Si on doit garder le code original, crée une copie de sauvegarde
            if (this.options.keepOriginalCode) {
              const backupPath = `${filePath}.bak`;
              await fs.writeFile(backupPath, originalContent);
            }
          }
        }
        
        // Ajoute les transformations aux listes globales
        appliedTransformations.push(...fileTransformations.applied);
        rejectedTransformations.push(...fileTransformations.rejected);
      } catch (error) {
        console.error(`Error optimizing file ${filePath}:`, error);
      }
    }
    
    // Calcule les statistiques globales
    const stats = this.calculateStats(
      filePaths.length,
      modifiedFiles.length,
      appliedTransformations.length,
      rejectedTransformations.length,
      transformationsByType,
      modifiedFiles,
      startTime
    );
    
    // Génère un résumé textuel
    const summary = this.generateSummary(stats, modifiedFiles.length);
    
    // Prépare le résultat final
    const result: OptimizationResult = {
      optimizationId: uuidv4(),
      timestamp: startTime,
      stats,
      appliedTransformations,
      rejectedTransformations,
      modifiedFiles,
      summary
    };
    
    return result;
  }

  /**
   * Tente d'appliquer les transformations disponibles sur un fichier
   */
  private async applyTransformations(context: TransformationContext): Promise<{
    applied: AppliedTransformation[];
    rejected: AppliedTransformation[];
  }> {
    const applied: AppliedTransformation[] = [];
    const rejected: AppliedTransformation[] = [];
    
    // Itère à travers les transformations dans l'ordre de priorité
    for (const transformation of this.transformations) {
      // Vérifie si la transformation est applicable
      if (transformation.isApplicable(context.ast, context)) {
        try {
          // Applique la transformation
          const result = transformation.transform(context.ast, context);
          
          // Construit l'objet représentant la transformation appliquée
          const appliedTransformation: AppliedTransformation = {
            transformation,
            filePath: context.filePath,
            startPosition: { line: 0, column: 0 }, // À remplir avec les positions réelles
            endPosition: { line: 0, column: 0 },
            originalCode: "", // À remplir avec le code original spécifique
            transformedCode: "", // À remplir avec le code transformé spécifique
            validated: false
          };
          
          // Si validation requise, vérifie la transformation
          if (this.options.requireValidation) {
            const validationResult = await validateTransformation(
              appliedTransformation,
              context
            );
            
            if (validationResult.valid) {
              appliedTransformation.validated = true;
              applied.push(appliedTransformation);
            } else {
              appliedTransformation.validationError = validationResult.errorMessage;
              rejected.push(appliedTransformation);
            }
          } else {
            appliedTransformation.validated = true;
            applied.push(appliedTransformation);
          }
          
          // Limite le nombre de transformations par fichier si configuré
          if (applied.length >= this.options.maxChangesPerFile) {
            break;
          }
        } catch (error) {
          console.error(`Error applying transformation ${transformation.id}:`, error);
        }
      }
    }
    
    return { applied, rejected };
  }

  /**
   * Trie les transformations selon la méthode de priorisation configurée
   */
  private sortTransformations(): void {
    switch (this.options.prioritizeBy) {
      case 'severity':
        // Ordre de sévérité: critical > error > warning > info
        const severityOrder = { 'critical': 0, 'error': 1, 'warning': 2, 'info': 3 };
        this.transformations.sort((a, b) => 
          (severityOrder[a.severity] - severityOrder[b.severity]) || 
          (b.priority - a.priority)
        );
        break;
        
      case 'impact':
        this.transformations.sort((a, b) => 
          (b.impact - a.impact) || 
          (b.priority - a.priority)
        );
        break;
        
      case 'complexity':
        // Commence par les transformations les moins complexes
        this.transformations.sort((a, b) => 
          (a.complexity - b.complexity) || 
          (b.priority - a.priority)
        );
        break;
        
      case 'type':
        // Groupe par type d'optimisation
        this.transformations.sort((a, b) => 
          a.type.localeCompare(b.type) || 
          (b.priority - a.priority)
        );
        break;
        
      default:
        // Par défaut, utilise simplement la priorité
        this.transformations.sort((a, b) => b.priority - a.priority);
        break;
    }
  }

  /**
   * Collecte tous les fichiers à optimiser en respectant les exclusions
   */
  private async collectFiles(paths: string[]): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const sourcePath of paths) {
      if ((await fs.stat(sourcePath)).isDirectory()) {
        // Pour les répertoires, utilise glob pour trouver tous les fichiers
        const files = await glob('**/*.{ts,tsx,js,jsx}', {
          cwd: sourcePath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
          absolute: true
        });
        
        allFiles.push(...files);
      } else {
        // Pour les fichiers individuels, les ajoute directement
        allFiles.push(sourcePath);
      }
    }
    
    return allFiles;
  }

  /**
   * Calcule les statistiques globales de l'optimisation
   */
  private calculateStats(
    filesAnalyzed: number,
    filesModified: number,
    transformationsApplied: number,
    transformationsRejected: number,
    transformationsByType: Record<string, number>,
    modifiedFiles: ModifiedFile[],
    startTime: number
  ): OptimizationStats {
    // Calcule les scores d'amélioration agrégés
    const improvementScores: Partial<Record<string, number>> = {};
    
    // Agrège les scores d'amélioration de tous les fichiers
    for (const file of modifiedFiles) {
      for (const [metric, score] of Object.entries(file.improvementScores)) {
        if (improvementScores[metric] === undefined) {
          improvementScores[metric] = 0;
        }
        improvementScores[metric] += score;
      }
    }
    
    // Normalise les scores par le nombre de fichiers modifiés
    if (filesModified > 0) {
      for (const metric of Object.keys(improvementScores)) {
        improvementScores[metric] = improvementScores[metric] / filesModified;
      }
    }
    
    return {
      filesAnalyzed,
      filesModified,
      transformationsApplied,
      transformationsRejected,
      transformationsByType,
      improvementScores,
      optimizationTimeMs: Date.now() - startTime
    };
  }

  /**
   * Génère un résumé textuel de l'optimisation
   */
  private generateSummary(stats: OptimizationStats, modifiedFilesCount: number): string {
    const { 
      filesAnalyzed, 
      transformationsApplied, 
      transformationsRejected,
      optimizationTimeMs 
    } = stats;
    
    let summary = `Optimisation terminée en ${optimizationTimeMs / 1000}s.\n`;
    summary += `Fichiers analysés: ${filesAnalyzed}\n`;
    summary += `Fichiers modifiés: ${modifiedFilesCount}\n`;
    summary += `Transformations appliquées: ${transformationsApplied}\n`;
    
    if (transformationsRejected > 0) {
      summary += `Transformations rejetées: ${transformationsRejected}\n`;
    }
    
    // Ajoute des détails sur les types de transformations
    summary += "\nTransformations par type:\n";
    for (const [type, count] of Object.entries(stats.transformationsByType)) {
      if (count > 0) {
        summary += `- ${type}: ${count}\n`;
      }
    }
    
    // Ajoute des informations sur les améliorations
    if (Object.keys(stats.improvementScores).length > 0) {
      summary += "\nAméliorations estimées:\n";
      for (const [metric, score] of Object.entries(stats.improvementScores)) {
        summary += `- ${metric}: ${score.toFixed(2)}\n`;
      }
    }
    
    return summary;
  }
}
