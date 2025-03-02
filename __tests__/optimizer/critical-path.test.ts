// ...existing code...
import { expect } from 'chai';
import { optimizeCode } from '../../src/cli/optimize'; // ...existing import paths...
// ...existing code...

describe('Optimizer Safety Net', () => {
  test('devrait gérer les dépendances circulaires dans l’AST', async () => {
    // [SCENARIO] Création d’un code simulant une circular dependency
    const problematicCode = `
      const a = {};
      const b = { a };
      a.b = b;
      export default a;
    `;
    const result = await optimizeCode(problematicCode);
    expect(result.warnings).contain('CIRCULAR_REF');
  });
  
  test('devrait retourner un code optimisé sans avertissements pour un code simple', async () => {
    // [SCENARIO] Code minimal sans problèmes connus
    const simpleCode = `
      export function add(a, b) {
        return a + b;
      }
    `;
    const result = await optimizeCode(simpleCode);
    expect(result.warnings.length).toBe(0);
    expect(result.code).contain('function add');
  });
  // ...autres tests limités pour atteindre une couverture de +12%...
});
