import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuthController } from '../../src/controllers/auth.controller'; // Update the path as needed
import { MockResponse } from '../../mocks';
import { Request } from 'express';

describe('AuthController', () => {
  let authController: AuthController;
  let mockRes: MockResponse;

  beforeEach(() => {
    authController = new AuthController();
    mockRes = new MockResponse();
  });

  it('should login user with valid credentials', async () => {
    const req = { body: { username: 'validUser', password: 'validPassword' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Login successful');
  });

  it('should not login user with invalid credentials', async () => {
    const req = { body: { username: 'invalidUser', password: 'invalidPassword' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Invalid credentials');
  });

  test('login retourne un token pour des identifiants valides', async () => {
    const mockReq = { body: { email: 'test@example.com', password: 'password123' } } as Request;
    await authController.login(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: expect.any(String) })
    );
  });

  test('login retourne une erreur pour des identifiants invalides', async () => {
    const mockReq = { body: { email: 'wrong@example.com', password: 'wrongpassword' } } as Request;
    await authController.login(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
