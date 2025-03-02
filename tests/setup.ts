import { config } from 'dotenv';
import { connectDb } from '../src/database';

config({ path: '.env.test' }); // Chargement des variables d'environnement pour les tests

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});
