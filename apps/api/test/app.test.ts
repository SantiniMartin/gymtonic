import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('app', () => {
  const app = createApp();

  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('responde 404 en JSON para rutas inexistentes', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('responde 400 con JSON mal formado', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"malo":');
    expect(res.status).toBe(400);
  });

  it('responde 400 con los errores del DTO', async () => {
    const res = await request(app).get('/api/trainers?page=0&pageSize=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(2);
  });
});
