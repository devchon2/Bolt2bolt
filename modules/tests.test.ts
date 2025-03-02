import { describe, it, expect, vi } from 'vitest';
import { runTests } from '../bolt-core/modules/tests';
import { moduleTests } from './tests';

describe('Module Tests Runner', () => {
  it('devrait retourner true lorsque les tests passent', async () => {
    const result = await runTests();
    expect(result).toBe(true);
  });
  
  it('moduleTests devrait appeler runTests et retourner son résultat', async () => {
    // Mock de la fonction runTests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockRunTests = vi.fn().mockResolvedValue(true);
    vi.mock('../bolt-core/modules/tests', () => ({
      runTests: mockRunTests
    }));
    
    const result = await moduleTests();
    
    expect(mockRunTests).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(console.log).toHaveBeenCalledWith("Module tests passed:", true);
    
    vi.restoreAllMocks();
  });
});