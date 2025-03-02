/**
 * Exemples de code pour les tests
 * Fournit des échantillons standardisés de code pour les tests unitaires
 */

export const codeSamples = {
  /**
   * Code simple avec une fonction basique
   */
  simple: `function add(a, b) {
  return a + b;
}`,

  /**
   * Code avec une complexité élevée
   */
  complex: `function processData(data) {
  // ...existing code...
}`,

  /**
   * Code avec des problèmes de sécurité
   */
  security: `function processUserInput(input) {
  // Problème de sécurité: utilisation de eval
  return eval('(' + input + ')');
}

function loadData(url) {
  // Vulnérabilité d'injection possible
  const script = document.createElement('script');
  script.src = url;
  document.body.appendChild(script);
}`,

  /**
   * Code avec des problèmes de logs
   */
  logs: `function debugFunction(data) {
  console.log("Debug data:", data);
  console.log("Processing...");
  
  const result = processData(data);
  
  console.log("Result:", result);
  return result;
}`,

  /**
   * Code avec différents types de fonctions
   */
  functions: `// Fonction nommée
function namedFunction(a, b) {
  return a + b;
}

// Fonction anonyme
const anonymousFunction = function(a, b) {
  return a * b;
};

// Méthode d'objet
const calculator = {
  add: function(a, b) {
    return a + b;
  },
  
  multiply(a, b) {
    return a * b;
  }
};

// Arrow function
const subtract = (a, b) => {
  return a - b;
};

// Arrow function inline
const square = x => x * x;

// IIFE
(function() {
  console.log("Immediately Invoked Function Expression");
})();

// Classe avec méthodes
class MathUtils {
  constructor() {
    this.pi = 3.14159;
  }
  
  circleArea(radius) {
    return this.pi * radius * radius;
  }
  
  static random() {
    return Math.random();
  }
}`,

  /**
   * Code avec des dépendances circulaires potentielles
   */
  circular: `// Module A
import * as B from './moduleB';

export function functionA() {
  return B.functionB() + 1;
}

// Module B
import * as A from './moduleA';

export function functionB() {
  return A.functionA() + 2;
}`
};

export default codeSamples;
