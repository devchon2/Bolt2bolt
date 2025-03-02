import { describe, it, expect } from 'vitest';
import { Optimizer, optimizeCode } from './optimizer';

describe('Optimizer', () => {
  it('should optimize code and return the optimized code', () => {
    const code = 'for (let i = 0; i < arr.length; i++) { console.log(i); }';
    const optimizedCode = optimizeCode(code);
    expect(optimizedCode).toContain('for (const item of arr)');
  });

  it('should handle empty code gracefully', () => {
    const code = '';
    // Utiliser la fonction optimizeCode au lieu de créer une instance
    const optimizedCode = optimizeCode(code);
    expect(optimizedCode).toBe('');
  });

  it('should remove dead code', () => {
    const code = 'function main() { console.log("Hello"); deadCode(); }';
    const optimizedCode = optimizeCode(code);
    expect(optimizedCode).not.toContain('deadCode()');
  });

  it('should improve performance', () => {
    const code = 'for (let i = 0; i < arr.length; i++) { console.log(arr[i]); }';
    const optimizedCode = optimizeCode(code);
    expect(optimizedCode).toContain('for (const item of arr)');
  });
});
