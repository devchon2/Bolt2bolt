const request = require('supertest');
const mongoose = require('mongoose');
const { User } = require('../src/models/user');
const app = require('../src/app');

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'testpass123',
  role: 'client'
};

beforeEach(async () => {
  await User.deleteMany();
  await new User(testUser).save();
});

test('Doit créer un nouvel utilisateur', async () => {
  const response = await request(app)
    .post('/users')
    .send({
      name: 'New User',
      email: 'new@example.com',
      password: 'newpass123',
      role: 'technicien'
    })
    .expect(201);

  // Assertions
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  // Vérification que le mot de passe est bien haché
  expect(response.body.user.password).not.toBe('newpass123');
});

test('Doit connecter un utilisateur existant', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      email: testUser.email,
      password: testUser.password
    })
    .expect(200);

  // Vérification du token
  expect(response.body.token).not.toBeNull();
});

afterAll(async () => {
  await mongoose.connection.close();
});
