/**
 * Analyseur de sécurité du code
 * 
 * Détecte les vulnérabilités et problèmes de sécurité potentiels
 * dans le code source TypeScript/JavaScript.
 * 
 * @module analyzer/static/security
 */

import * as ts from 'typescript';
import { v4 as uuidv4 } from 'uuid';
import { CodeAnalyzer } from '../../core/types';
import { CodeIssue, MetricType, SeverityLevel, SecurityScanLevel } from '../../types';
import { parseFile, getNodeLocation, isFunction } from '../ast/ast-utils';

/**
 * Règles de sécurité avec leurs descriptions et niveaux de sévérité
 */
interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  documentation: string[];
  detect: (node: ts.Node, sourceFile: ts.SourceFile) => boolean;
  message: (node: ts.Node) => string;
  suggestion: string[];
  scanLevel: SecurityScanLevel;
}

/**
 * Analyseur de sécurité qui détecte les vulnérabilités potentielles
 */
export class SecurityAnalyzer implements CodeAnalyzer {
  id = 'security-analyzer';
  name = 'Analyseur de Sécurité';
  description = 'Détecte les problèmes de sécurité potentiels dans le code source';
  metricType: MetricType = 'security';
  
  private rules: SecurityRule[] = [];
  private scanLevel: SecurityScanLevel;
  
  constructor(scanLevel: SecurityScanLevel = 'standard') {
    this.scanLevel = scanLevel;
    this.initializeRules();
  }
  
  /**
   * Initialise l'analyseur de sécurité
   */
  async initialize(): Promise<void> {
    // L'initialisation est déjà faite dans le constructeur
  }

  /**
   * Analyse la sécurité d'un fichier
   * @param filePath Chemin du fichier
   * @param fileContent Contenu du fichier
   * @returns Liste des problèmes de sécurité détectés
   */
  async analyzeFile(filePath: string, fileContent: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    try {
      // Parse le fichier
      const sourceFile = parseFile(fileContent, filePath);
      
      // Applique chaque règle de sécurité applicable selon le niveau de scan
      const applicableRules = this.rules.filter(rule => 
        this.isRuleApplicable(rule.scanLevel, this.scanLevel)
      );
      
      // Parcours l'AST et applique les règles
      this.traverseNode(sourceFile, sourceFile, filePath, applicableRules, issues);
    }
    catch (error) {
      console.error(`Error in security analysis for file ${filePath}:`, error);
      issues.push({
        id: uuidv4(),
        title: 'Erreur d\'analyse de sécurité',
        description: `Une erreur s'est produite lors de l'analyse de sécurité: ${error.message}`,
        location: { filePath, line: 1, column: 1 },
        severity: SeverityLevel.Error,
        metricType: this.metricType
      });
    }
    
    return issues;
  }

  /**
   * Nettoie les ressources utilisées par l'analyseur
   */
  async cleanup(): Promise<void> {
    // Pas de ressources à nettoyer
  }

  /**
   * Initialise les règles de sécurité
   */
  private initializeRules(): void {
    this.rules = [
      // Détection des injections potentielles
      {
        id: 'security-eval-usage',
        name: 'Utilisation dangereuse de eval()',
        description: 'La fonction eval() exécute du code arbitraire et peut être dangereuse si utilisée avec des entrées non fiables.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://owasp.org/www-community/attacks/Code_Injection',
          'https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/eval#ne_jamais_utiliser_eval!'
        ],
        detect: (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const expression = node.expression;
            if (ts.isIdentifier(expression) && expression.text === 'eval') {
              return true;
            }
          }
          return false;
        },
        message: () => 'Utilisation dangereuse de eval() détectée. Cette fonction peut exécuter du code arbitraire.',
        suggestion: [
          'Remplacer par une logique qui n\'exécute pas de code dynamique',
          'Utiliser JSON.parse() pour parser des données JSON',
          'Si eval() est nécessaire, valider strictement toutes les entrées'
        ],
        scanLevel: 'basic'
      },
      
      // Fonctions similaires à eval
      {
        id: 'security-function-constructor',
        name: 'Utilisation dangereuse du constructeur Function',
        description: 'Le constructeur Function est similaire à eval() et peut être dangereux.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Function/Function',
          'https://owasp.org/www-community/attacks/Code_Injection'
        ],
        detect: (node: ts.Node) => {
          if (ts.isNewExpression(node)) {
            const expression = node.expression;
            if (ts.isIdentifier(expression) && expression.text === 'Function') {
              return true;
            }
          }
          return false;
        },
        message: () => 'Utilisation dangereuse du constructeur Function détectée. Cette méthode peut exécuter du code arbitraire.',
        suggestion: [
          'Remplacer par une fonction statique',
          'Utiliser des fonctions fléchées ou expressions de fonctions'
        ],
        scanLevel: 'basic'
      },
      
      // Cross-site scripting (XSS) - innerHTML
      {
        id: 'security-innerHTML-usage',
        name: 'Utilisation à risque de innerHTML',
        description: 'L\'utilisation de innerHTML avec des données non sécurisées peut causer des vulnérabilités XSS.',
        severity: SeverityLevel.Warning,
        documentation: [
          'https://owasp.org/www-community/attacks/xss/',
          'https://developer.mozilla.org/fr/docs/Web/API/Element/innerHTML#considerations_de_s%C3%A9curit%C3%A9'
        ],
        detect: (node: ts.Node) => {
          if (ts.isPropertyAccessExpression(node) &&
              node.name.text === 'innerHTML' &&
              node.parent &&
              ts.isBinaryExpression(node.parent) &&
              node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            return true;
          }
          return false;
        },
        message: () => 'Utilisation à risque de innerHTML. Cela peut introduire des vulnérabilités XSS.',
        suggestion: [
          'Utiliser textContent pour du contenu textuel simple',
          'Échapper correctement le HTML avec des bibliothèques comme DOMPurify',
          'Utiliser des méthodes plus sécurisées comme createElement'
        ],
        scanLevel: 'basic'
      },
      
      // HTTP sans SSL/TLS
      {
        id: 'security-http-usage',
        name: 'URL HTTP non sécurisée',
        description: 'Utilisation d\'URLs HTTP non chiffrées au lieu de HTTPS.',
        severity: SeverityLevel.Warning,
        documentation: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html'
        ],
        detect: (node: ts.Node) => {
          if (ts.isStringLiteral(node) && node.text.startsWith('http://') && !node.text.includes('localhost')) {
            return true;
          }
          return false;
        },
        message: (node: ts.Node) => {
          const url = (node as ts.StringLiteral).text;
          return `URL non sécurisée détectée: ${url}. Les connections HTTP ne sont pas chiffrées.`;
        },
        suggestion: [
          'Utiliser HTTPS au lieu de HTTP',
          'Valider que tous les endpoints externes utilisent TLS/SSL'
        ],
        scanLevel: 'basic'
      },
      
      // Secrets en dur dans le code
      {
        id: 'security-hardcoded-secrets',
        name: 'Secrets codés en dur',
        description: 'Détection de secrets potentiels (clés API, mots de passe) dans le code source.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password'
        ],
        detect: (node: ts.Node) => {
          if (ts.isStringLiteral(node)) {
            const text = node.text;
            // Recherche de patterns potentiels de secrets
            const secretPatterns = [
              /api[-_]?key\s*[:=]\s*/i,
              /password\s*[:=]\s*/i,
              /secret\s*[:=]\s*/i,
              /token\s*[:=]\s*/i,
              /auth[-_]?key\s*[:=]\s*/i,
              // Tokens JWT
              /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
              // Clés d'API et tokens de longueurs suspectes
              /[a-zA-Z0-9_\-]{20,}/
            ];
            
            // Vérifie les noms de variables dans les déclarations
            if (node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name && ts.isIdentifier(node.parent.name)) {
              const variableName = node.parent.name.text.toLowerCase();
              if (variableName.includes('password') || 
                  variableName.includes('secret') || 
                  variableName.includes('token') || 
                  variableName.includes('apikey')) {
                return true;
              }
            }
            
            // Vérifie si le texte correspond à un pattern de secret
            return secretPatterns.some(pattern => pattern.test(text));
          }
          return false;
        },
        message: () => 'Possible secret (mot de passe, clé API, token) codé en dur détecté.',
        suggestion: [
          'Utiliser des variables d\'environnement pour stocker les secrets',
          'Migrer vers un service de gestion de secrets',
          'Ne jamais inclure de secrets dans le code source'
        ],
        scanLevel: 'standard'
      },
      
      // SQL Injection
      {
        id: 'security-sql-injection',
        name: 'Risque d\'injection SQL',
        description: 'Construction de requêtes SQL par concaténation de chaînes, vulnérable aux injections.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://owasp.org/www-community/attacks/SQL_Injection',
          'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
        ],
        detect: (node: ts.Node) => {
          if (ts.isBinaryExpression(node) &&
              node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            
            // Recherche de portions de SQL dans la concaténation
            const sqlPatterns = [
              /select\s+.*\s+from/i,
              /insert\s+into/i,
              /update\s+.*\s+set/i,
              /delete\s+from/i
            ];
            
            const left = node.left.getText();
            const right = node.right.getText();
            const fullText = left + ' + ' + right;
            
            // Vérifie si la concaténation semble être une requête SQL
            if (sqlPatterns.some(pattern => pattern.test(left) || pattern.test(right) || pattern.test(fullText))) {
              // Vérifie si une variable est impliquée dans la concaténation
              return ts.isIdentifier(node.left) || ts.isIdentifier(node.right);
            }
          }
          return false;
        },
        message: () => 'Risque d\'injection SQL détecté. La concaténation de chaînes pour des requêtes SQL est dangereuse.',
        suggestion: [
          'Utiliser des requêtes paramétrées ou préparées',
          'Implémenter un ORM pour abstraire les requêtes SQL',
          'Valider et échapper toutes les entrées utilisateur'
        ],
        scanLevel: 'standard'
      },
      
      // Cookies sans attributs de sécurité
      {
        id: 'security-insecure-cookies',
        name: 'Cookies sans attributs de sécurité',
        description: 'Cookies configurés sans attributs de sécurité essentiels comme HttpOnly, Secure ou SameSite.',
        severity: SeverityLevel.Warning,
        documentation: [
          'https://owasp.org/www-community/controls/SecureCookieAttribute',
          'https://developer.mozilla.org/fr/docs/Web/HTTP/Cookies#les_cookies_s%C3%A9curis%C3%A9s'
        ],
        detect: (node: ts.Node) => {
          if (ts.isCallExpression(node) &&
              ts.isPropertyAccessExpression(node.expression) &&
              node.expression.name.text === 'cookie' &&
              node.arguments.length > 0) {
            
            const cookieText = node.arguments[0].getText();
            
            // Vérifie si c'est un cookie sans attributs de sécurité
            if (cookieText.includes('=') && 
                !(cookieText.toLowerCase().includes('httponly') || 
                  cookieText.toLowerCase().includes('secure') || 
                  cookieText.toLowerCase().includes('samesite'))) {
              return true;
            }
          }
          return false;
        },
        message: () => 'Cookie défini sans attributs de sécurité importants (HttpOnly, Secure, SameSite).',
        suggestion: [
          'Ajouter l\'attribut HttpOnly pour empêcher l\'accès JavaScript',
          'Ajouter l\'attribut Secure pour limiter aux connexions HTTPS',
          'Définir SameSite=Strict ou SameSite=Lax pour limiter les requêtes cross-site'
        ],
        scanLevel: 'standard'
      },
      
      // Command Injection
      {
        id: 'security-command-injection',
        name: 'Risque d\'injection de commande',
        description: 'Exécution de commandes système avec des entrées non validées.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://owasp.org/www-community/attacks/Command_Injection',
          'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html'
        ],
        detect: (node: ts.Node) => {
          if (ts.isCallExpression(node) &&
              ts.isPropertyAccessExpression(node.expression)) {
            
            // Détection des méthodes d'exécution de commandes
            const dangerousMethods = [
              'exec', 'execSync', 'spawn', 'spawnSync', 'execFile', 'execFileSync'
            ];
            
            if (dangerousMethods.includes(node.expression.name.text)) {
              // Vérifie si la source est child_process
              const obj = node.expression.expression;
              if (ts.isIdentifier(obj) && 
                  ['child_process', 'require', 'exec', 'spawn'].includes(obj.text)) {
                
                // Si au moins un argument est une variable ou une concaténation, c'est suspect
                if (node.arguments.length > 0) {
                  const firstArg = node.arguments[0];
                  return ts.isIdentifier(firstArg) || 
                         (ts.isBinaryExpression(firstArg) && 
                          firstArg.operatorToken.kind === ts.SyntaxKind.PlusToken);
                }
              }
            }
          }
          return false;
        },
        message: () => 'Risque d\'injection de commande détecté. L\'exécution de commandes système avec des entrées non validées est dangereuse.',
        suggestion: [
          'Valider et assainir toutes les entrées utilisées dans des commandes système',
          'Utiliser des bibliothèques spécifiques au domaine plutôt que des commandes shell',
          'Limiter les permissions du processus d\'exécution'
        ],
        scanLevel: 'standard'
      },
      
      // Fuite d'informations sensibles dans les logs
      {
        id: 'security-sensitive-logging',
        name: 'Informations sensibles dans les logs',
        description: 'Journalisation potentielle d\'informations sensibles.',
        severity: SeverityLevel.Warning,
        documentation: [
          'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure'
        ],
        detect: (node: ts.Node) => {
          // Détecte les appels de fonctions de log
          if (ts.isCallExpression(node) &&
              ts.isPropertyAccessExpression(node.expression) &&
              ['log', 'info', 'warn', 'error', 'debug'].includes(node.expression.name.text)) {
            
            // Vérifie si l'objet est console
            const obj = node.expression.expression;
            if (ts.isIdentifier(obj) && obj.text === 'console') {
              
              // Vérifie si un des arguments contient une variable sensible
              return node.arguments.some(arg => {
                if (ts.isIdentifier(arg)) {
                  const name = arg.text.toLowerCase();
                  return name.includes('password') || 
                         name.includes('token') || 
                         name.includes('secret') || 
                         name.includes('key') ||
                         name.includes('auth') ||
                         name.includes('credit') ||
                         name.includes('ssn');
                }
                return false;
              });
            }
          }
          return false;
        },
        message: () => 'Possible journalisation d\'informations sensibles détectée. Évitez de logger des données sensibles.',
        suggestion: [
          'Masquer ou filtrer les données sensibles avant la journalisation',
          'Implémenter une journalisation sécurisée avec filtrage automatique',
          'Vérifier les normes de conformité comme GDPR, PCI DSS'
        ],
        scanLevel: 'standard'
      },
      
      // Utilisation de fonctions cryptographiques obsolètes
      {
        id: 'security-weak-crypto',
        name: 'Cryptographie faible ou obsolète',
        description: 'Utilisation d\'algorithmes cryptographiques faibles ou dépréciés.',
        severity: SeverityLevel.Error,
        documentation: [
          'https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration',
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html'
        ],
        detect: (node: ts.Node) => {
          // Détecte les appels à des fonctions cryptographiques faibles
          if (ts.isCallExpression(node) &&
              ts.isPropertyAccessExpression(node.expression)) {
            
            const weakAlgorithms = ['md5', 'sha1', 'des', '3des', 'rc4'];
            const methodName = node.expression.name.text.toLowerCase();
            
            // Vérifie si la méthode correspond à un algorithme faible
            if (weakAlgorithms.some(algo => methodName.includes(algo))) {
              return true;
            }
            
            // Vérifie les paramètres pour createHash, createCipheriv, etc.
            if (['createhash', 'createcipher', 'createcipheriv'].includes(methodName) &&
                node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              const algorithm = node.arguments[0].text.toLowerCase();
              return weakAlgorithms.some(algo => algorithm.includes(algo));
            }
          }
          return false;
        },
        message: () => 'Utilisation d\'algorithmes cryptographiques faibles ou obsolètes détectée.',
        suggestion: [
          'Remplacer MD5/SHA1 par SHA-256/SHA-3',
          'Remplacer DES/3DES par AES',
          'Utiliser des bibliothèques cryptographiques modernes et à jour',
          'Suivre les recommandations de NIST pour le choix des algorithmes'
        ],
        scanLevel: 'thorough'
      },
      
      // RegExp DoS (ReDOS)
      {
        id: 'security-unsafe-regex',
        name: 'Expression régulière vulnérable',
        description: 'Expression régulière potentiellement vulnérable aux attaques par déni de service (ReDoS).',
        severity: SeverityLevel.Warning,
        documentation: [
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS'
        ],
        detect: (node: ts.Node) => {
          // Détecte les expressions régulières avec des motifs problématiques
          if ((ts.isRegularExpressionLiteral(node) || 
               (ts.isNewExpression(node) && 
                ts.isIdentifier(node.expression) && 
                node.expression.text === 'RegExp'))) {
            
            let pattern = '';
            if (ts.isRegularExpressionLiteral(node)) {
              pattern = node.text;
            } else if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              pattern = (node.arguments[0] as ts.StringLiteral).text;
            } else {
              return false;
            }
            
            // Motifs vulnérables aux attaques ReDOS
            const dangerousPatterns = [
              // Groupes répétés qui peuvent causer une explosion exponentielle
              /(\(.*\)\+.*\*|\(.*\)\*.*\+)/,
              // Répétitions imbriquées
              /\(.*(\*|\+|\{\d+,\}).*(\*|\+|\{\d+,\}).*\)/,
              // Répétitions avec alternatives
              /(\(.*\|.*\))\s*(\*|\+|\{\d+,\})/
            ];
            
            return dangerousPatterns.some(dp => dp.test(pattern));
          }
          return false;
        },
        message: () => 'Expression régulière potentiellement vulnérable aux attaques ReDoS détectée.',
        suggestion: [
          'Éviter les répétitions imbriquées dans les expressions régulières',
          'Limiter l\'utilisation des backreferences',
          'Considérer l\'utilisation de bibliothèques d\'expressions régulières sécurisées',
          'Limiter le temps d\'exécution des opérations sur les expressions régulières'
        ],
        scanLevel: 'thorough'
      }
    ];
  }

  /**
   * Vérifie si une règle s'applique en fonction du niveau d'analyse
   * @param ruleLevel Niveau requis par la règle
   * @param scanLevel Niveau d'analyse configuré
   */
  private isRuleApplicable(ruleLevel: SecurityScanLevel, scanLevel: SecurityScanLevel): boolean {
    const levels: SecurityScanLevel[] = ['basic', 'standard', 'thorough'];
    const ruleLevelIndex = levels.indexOf(ruleLevel);
    const scanLevelIndex = levels.indexOf(scanLevel);
    
    // La règle s'applique si son niveau est inférieur ou égal au niveau de scan
    return ruleLevelIndex <= scanLevelIndex;
  }

  /**
   * Parcourt récursivement l'AST et applique les règles de sécurité
   */
  private traverseNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    rules: SecurityRule[],
    issues: CodeIssue[]
  ): void {
    // Applique chaque règle au nœud actuel
    for (const rule of rules) {
      try {
        if (rule.detect(node, sourceFile)) {
          const location = getNodeLocation(node, sourceFile, filePath);
          
          issues.push({
            id: uuidv4(),
            title: rule.name,
            description: rule.message(node),
            location,
            severity: rule.severity,
            metricType: this.metricType,
            documentationLinks: rule.documentation,
            suggestions: rule.suggestion
          });
        }
      } catch (error) {
        console.error(`Error applying security rule ${rule.id}:`, error);
      }
    }
    
    // Continue l'analyse sur les nœuds enfants
    ts.forEachChild(node, child => {
      this.traverseNode(child, sourceFile, filePath, rules, issues);
    });
  }
}