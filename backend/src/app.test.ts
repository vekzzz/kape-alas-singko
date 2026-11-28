import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { connectTestDatabase } from '../test/testDatabase.js';

const { db, pool } = connectTestDatabase();
const app = createApp({ db, frontendOrigins: ['http://localhost:5173'], logLevel: 'silent' });

afterAll(() => pool.end());

describe('app basics', () => {
  it('answers the health check without touching the database', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('answers unknown routes with the error shape', async () => {
    const res = await request(app).get('/api/v1/nothing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Nothing here.' } });
  });

  it('rejects a malformed JSON body with a validation error', async () => {
    const res = await request(app).post('/api/v1/orders').set('Content-Type', 'application/json').send('{"nope');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('allows the frontend origin and nobody else', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const other = await request(app).get('/health').set('Origin', 'https://elsewhere.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
