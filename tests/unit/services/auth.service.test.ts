import { AuthService } from '../../../src/services/auth.service'; // Update the path as needed
import { User } from '../../../src/models/user';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  test('generateToken crée un token JWT valide', async () => {
    const user = new User({
      id: '1',
      email: 'test@example.com',
      role: 'user'
    });

    const token = await authService.generateToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Vérifier que le token contient les informations de l’utilisateur
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    expect(payload.userId).toBe(user.id);
  });

  test('verifyToken valide correctement un token', async () => {
    const user = new User({
      id: '1',
      email: 'test@example.com',
      role: 'user'
    });

    const token = await authService.generateToken(user);
    const decoded = await authService.verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(user.id);
  });

  it('should authenticate user with valid credentials', async () => {
    const result = await authService.authenticate('validUser', 'validPassword');
    expect(result).toBe(true);
  });

  it('should not authenticate user with invalid credentials', async () => {
    const result = await authService.authenticate('invalidUser', 'invalidPassword');
    expect(result).toBe(false);
  });

  test('authenticate retourne false pour des identifiants invalides', async () => {
    const result = await authService.authenticate('invalidUser', 'invalidPassword');
    expect(result).toBe(false);
  });

  test('authenticate retourne true pour des identifiants valides', async () => {
    const result = await authService.authenticate('validUser', 'validPassword');
    expect(result).toBe(true);
  });
});
