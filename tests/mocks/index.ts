export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  password: 'hashedPassword123'
};

export const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const mockDbResponse = {
  acknowledged: true,
  modifiedCount: 1,
  upsertedId: null,
  upsertedCount: 0,
  matchedCount: 1
};

export class MockResponse {
  status = jest.fn().mockReturnThis();
  json = jest.fn().mockReturnThis();
  send = jest.fn().mockReturnThis();
}

export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});
