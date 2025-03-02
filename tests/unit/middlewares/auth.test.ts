import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { authMiddleware } from '../../src/middlewares/auth'; // Update the path as needed
import { Request, Response, NextFunction } from 'express';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = { headers: {} };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    nextFunction = vi.fn();
  });

  test('Rejette les requêtes sans token', () => {
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  test('Accepte les requêtes avec un token valide', () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next if user is authenticated', () => {
    const req = { isAuthenticated: () => true };
    const res = {};
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should not call next if user is not authenticated', () => {
    const req = { isAuthenticated: () => false };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  test('Accepte les requêtes avec un token valide', () => {
    const req = { headers: { authorization: 'Bearer validToken' } };
    const res = {};
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('Refuse les requêtes sans token', () => {
    const req = { headers: {} };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });
});
