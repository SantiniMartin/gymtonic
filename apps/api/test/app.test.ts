import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { Router } from 'express';
import { createApp } from '../src/app.js';
import { validate } from '../src/middlewares/validate.js';

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
});

describe('middleware validate', () => {
  it('devuelve 400 con los detalles de zod', async () => {
    const { errorHandler } = await import('../src/middlewares/error-handler.js');
    const express = (await import('express')).default;
    const app = express();
    const router = Router();
    router.post('/', validate({ body: z.object({ name: z.string().min(2) }) }), (req, res) => {
      res.json(req.body);
    });
    app.use(express.json());
    app.use('/t', router);
    app.use(errorHandler);

    const bad = await request(app).post('/t').send({ name: 'a' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(bad.body.error.details[0].path).toBe('name');

    const ok = await request(app).post('/t').send({ name: 'Ana' });
    expect(ok.status).toBe(200);
  });
});
