import { describe, it, expect, beforeEach } from '@jest/globals';
import { User } from '../../../src/models/user';

describe('User Model', () => {
  it('should create a user with valid properties', () => {
    const user = new User('username', 'password');
    expect(user.username).toBe('username');
    expect(user.password).toBe('password');
  });
});

describe('Modèle User', () => {
  let user: User;

  beforeEach(() => {
    user = new User({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user'
    });
  });

  test('Le constructeur initialise correctement les propriétés', () => {
    expect(user.id).toBe('1');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe('user');
  });

  test('La méthode isAdmin retourne true pour les admins', () => {
    const adminUser = new User({
      id: '2',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin'
    });
    expect(adminUser.isAdmin()).toBe(true);
    expect(user.isAdmin()).toBe(false);
  });

  test('isAdmin retourne false si le rôle n\'est pas défini', () => {
    const noRoleUser = new User({
      id: '3',
      name: 'No Role',
      email: 'noreply@example.com',
      // role manquant
    });
    expect(noRoleUser.isAdmin()).toBe(false);
  });

  test('La méthode isAdmin retourne false pour les utilisateurs non-admin', () => {
    expect(user.isAdmin()).toBe(false);
  });

  test('La méthode isAdmin retourne true pour les utilisateurs admin', () => {
    user.role = 'admin';
    expect(user.isAdmin()).toBe(true);
  });
});
