import * as utils from '../../src/utils';
import { describe, it, expect, test } from '@jest/globals';

describe('Utilitaires', () => {
  test('formatDate formate correctement les dates', () => {
    const date = new Date('2023-01-15T12:00:00Z');
    expect(utils.formatDate(date)).toBe('15/01/2023');
    const date2 = new Date('2024-02-29T10:30:00Z');
    expect(utils.formatDate(date2)).toBe('29/02/2024');
  });

  test('validateEmail valide correctement les adresses email', () => {
    expect(utils.validateEmail('test@example.com')).toBe(true);
    expect(utils.validateEmail('invalid-email')).toBe(false);
    expect(utils.validateEmail('test.test@example.co.uk')).toBe(true);
    expect(utils.validateEmail('test@example')).toBe(false);
  });

  test('someUtilityFunction retourne la sortie attendue pour des entrées spécifiques', () => {
    const result = utils.someUtilityFunction('specificInput');
    expect(result).toBe('expectedOutputForSpecificInput');
  });

  test('someUtilityFunction gère les entrées invalides', () => {
    const result = utils.someUtilityFunction(null);
    expect(result).toBe('defaultOutput');
  });

  test('someUtilityFunction handles large inputs efficiently', () => {
    const largeInput = 'a'.repeat(1000000); // 1 million characters
    const result = utils.someUtilityFunction(largeInput);
    expect(result).toBe('expectedOutputForLargeInput');
  });
});

describe('Utils', () => {
  it('should perform the utility function correctly', () => {
    const result = someUtilityFunction('input');
    expect(result).toBe('expectedOutput');
  });
});
