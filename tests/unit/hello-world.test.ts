import { describe, it, expect } from '@jest/globals';
import { helloWorld } from '../../src/hello-world';

describe('Hello World', () => {
  it('should return hello world message', () => {
    const result = helloWorld();
    expect(result).toBe('Hello, World!');
  });
});