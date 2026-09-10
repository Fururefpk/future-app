const request = require('supertest');
const mongoose = require('mongoose');

// Set required env vars before loading the app
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRE = '15m';
process.env.REFRESH_TOKEN_EXPIRE = '7d';
process.env.NODE_ENV = 'test';
// Omit MONGODB_URI intentionally — tests run without a live DB.
// Disable Mongoose buffering so queries fail fast instead of hanging 10s.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 1000);

const app = require('../server');

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});

describe('Health & static routes', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET / returns the index.html page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('GET /app.js serves the frontend integration script', async () => {
    const res = await request(app).get('/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
  });
});

describe('Auth routes (no DB)', () => {
  it('POST /api/v1/auth/login returns error without body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    // Without DB it will fail, but we verify the route exists
    expect([400, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register returns error without body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({});
    expect([400, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/forgot-password returns 200 or 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'test@example.com' });
    // Without DB, might be 500 or 200 (email-not-found branch)
    expect([200, 400, 500]).toContain(res.status);
  });
});

describe('Protected routes', () => {
  it('GET /api/v1/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('404 handler', () => {
  it('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
