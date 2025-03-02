import request from 'supertest';
import { app } from '../../src/app';
import { connectDb, disconnectDb } from '../../src/database';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('API Endpoints', () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  describe('GET /api/users', () => {
    test('Répond avec statut 200 et un tableau d\'utilisateurs', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    test('Retourne un token avec des identifiants valides', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    test('Retourne une erreur avec des identifiants invalides', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrongpassword' });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    test('Crée un nouvel utilisateur avec des données valides', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'New User', email: 'newuser@example.com', password: 'password123' });
      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('newuser@example.com');
    });

    test('Retourne une erreur 400 si les données sont invalides', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Invalid User' });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:id', () => {
    test('Répond avec statut 200 et les détails de l\'utilisateur', async () => {
      const response = await request(app).get('/api/users/1');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', '1');
    });

    test('Répond avec statut 404 si l\'utilisateur n\'existe pas', async () => {
      const response = await request(app).get('/api/users/999');
      expect(response.status).toBe(404);
    });
  });

  describe('Middleware d\'authentification', () => {
    test('Bloque l\'accès aux routes protégées sans token', async () => {
      const response = await request(app).get('/api/protected-route');
      expect(response.status).toBe(401);
    });
  });
});

describe('API Integration Tests', () => {
  it('should return 200 for GET /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!');
  });

  it('should return 401 for protected route without authentication', async () => {
    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
  });
});
