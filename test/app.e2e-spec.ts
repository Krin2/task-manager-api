import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { setupApp } from '../src/setup-app.js';
import { TestDatabaseModule } from './test-database.module.js';

// Coincide con ADMIN_EMAIL / ADMIN_PASSWORD de vitest.config.e2e.ts
const ADMIN = { email: 'admin@example.com', password: 'admin-password-123' };

describe('Task Manager API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string, password = 'una-clave-larga-123') {
    const res = await http
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken as string;
  }

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('publico', () => {
    it('GET /health responde sin token', async () => {
      await http.get('/health').expect(200, { status: 'ok' });
    });

    it('expone la documentacion Swagger y el JSON OpenAPI', async () => {
      await http.get('/docs').expect(200);
      const res = await http.get('/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining([
          '/auth/register',
          '/auth/login',
          '/tasks',
          '/tasks/{id}',
        ]),
      );
    });

    it('envia cabeceras de seguridad (helmet)', async () => {
      const res = await http.get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('auth', () => {
    it('registra y permite iniciar sesion', async () => {
      const token = await register('ana@example.com');
      const me = await http.get('/auth/me').set(bearer(token)).expect(200);
      expect(me.body).toMatchObject({ email: 'ana@example.com', role: 'user' });

      const login = await http
        .post('/auth/login')
        .send({ email: 'ANA@example.com', password: 'una-clave-larga-123' })
        .expect(200);
      expect(login.body.accessToken).toEqual(expect.any(String));
    });

    it('nunca devuelve el hash de la contrasena', async () => {
      const res = await http
        .post('/auth/register')
        .send({
          email: 'sin-hash@example.com',
          password: 'una-clave-larga-123',
        })
        .expect(201);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    it('rechaza un email repetido con 409', async () => {
      await register('repetido@example.com');
      await http
        .post('/auth/register')
        .send({
          email: 'repetido@example.com',
          password: 'una-clave-larga-123',
        })
        .expect(409);
    });

    it('rechaza credenciales invalidas con el mismo mensaje exista o no el usuario', async () => {
      await register('existe@example.com');
      const wrongPassword = await http
        .post('/auth/login')
        .send({
          email: 'existe@example.com',
          password: 'otra-clave-incorrecta',
        })
        .expect(401);
      const unknownUser = await http
        .post('/auth/login')
        .send({
          email: 'no-existe@example.com',
          password: 'otra-clave-incorrecta',
        })
        .expect(401);
      expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });

    it('valida el cuerpo: contrasena corta, email invalido y campos extra', async () => {
      await http
        .post('/auth/register')
        .send({ email: 'x@example.com', password: 'corta' })
        .expect(400);
      await http
        .post('/auth/register')
        .send({ email: 'no-es-email', password: 'una-clave-larga-123' })
        .expect(400);
      await http
        .post('/auth/register')
        .send({
          email: 'y@example.com',
          password: 'una-clave-larga-123',
          role: 'admin',
        })
        .expect(400);
    });

    it('exige token en rutas protegidas', async () => {
      await http.get('/tasks').expect(401);
      await http.get('/tasks').set(bearer('token.invalido.x')).expect(401);
    });
  });

  describe('tareas', () => {
    it('crea, lee, actualiza y elimina una tarea propia', async () => {
      const token = await register('crud@example.com');

      const created = await http
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'Preparar la demo', priority: 'high' })
        .expect(201);
      expect(created.body).toMatchObject({
        title: 'Preparar la demo',
        status: 'todo',
        priority: 'high',
      });
      const id = created.body.id;

      await http.get(`/tasks/${id}`).set(bearer(token)).expect(200);

      const updated = await http
        .patch(`/tasks/${id}`)
        .set(bearer(token))
        .send({ status: 'done' })
        .expect(200);
      expect(updated.body.status).toBe('done');

      await http.delete(`/tasks/${id}`).set(bearer(token)).expect(204);
      await http.get(`/tasks/${id}`).set(bearer(token)).expect(404);
    });

    it('valida el cuerpo de la tarea', async () => {
      const token = await register('valida@example.com');
      await http.post('/tasks').set(bearer(token)).send({}).expect(400);
      await http
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'a', status: 'inventado' })
        .expect(400);
      await http
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'a', ownerId: 99 })
        .expect(400);
      await http.get('/tasks/abc').set(bearer(token)).expect(400);
    });

    it('aisla las tareas por usuario (responde 404, no 403)', async () => {
      const owner = await register('dueno@example.com');
      const other = await register('otro@example.com');
      const created = await http
        .post('/tasks')
        .set(bearer(owner))
        .send({ title: 'Privada' })
        .expect(201);
      const id = created.body.id;

      await http.get(`/tasks/${id}`).set(bearer(other)).expect(404);
      await http
        .patch(`/tasks/${id}`)
        .set(bearer(other))
        .send({ title: 'Robada' })
        .expect(404);
      await http.delete(`/tasks/${id}`).set(bearer(other)).expect(404);

      const list = await http.get('/tasks').set(bearer(other)).expect(200);
      expect(list.body.meta.total).toBe(0);
    });

    it('filtra, busca, ordena y pagina', async () => {
      const token = await register('lista@example.com');
      const titles = ['Alfa', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
      for (const [i, title] of titles.entries()) {
        await http
          .post('/tasks')
          .set(bearer(token))
          .send({
            title,
            status: i % 2 === 0 ? 'done' : 'todo',
            description: i === 3 ? 'texto con 100%' : undefined,
          })
          .expect(201);
      }

      const done = await http
        .get('/tasks?status=done')
        .set(bearer(token))
        .expect(200);
      expect(done.body.meta.total).toBe(3);

      const search = await http
        .get('/tasks?search=gam')
        .set(bearer(token))
        .expect(200);
      expect(search.body.data.map((t: { title: string }) => t.title)).toEqual([
        'Gamma',
      ]);

      const page = await http
        .get('/tasks?sortBy=title&order=ASC&page=2&limit=2')
        .set(bearer(token))
        .expect(200);
      expect(page.body.data.map((t: { title: string }) => t.title)).toEqual([
        'Delta',
        'Epsilon',
      ]);
      expect(page.body.meta).toEqual({
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3,
      });
    });

    it('rechaza parametros de consulta peligrosos o fuera de rango', async () => {
      const token = await register('query@example.com');
      await http
        .get('/tasks?sortBy=passwordHash')
        .set(bearer(token))
        .expect(400);
      await http
        .get('/tasks?sortBy=id;DROP TABLE tasks')
        .set(bearer(token))
        .expect(400);
      await http.get('/tasks?limit=1000').set(bearer(token)).expect(400);
      await http.get('/tasks?page=0').set(bearer(token)).expect(400);
    });
  });

  describe('roles', () => {
    it('el admin inicial (de variables de entorno) ve las tareas de todos', async () => {
      const user = await register('visible@example.com');
      await http
        .post('/tasks')
        .set(bearer(user))
        .send({ title: 'Para el admin' })
        .expect(201);

      const login = await http.post('/auth/login').send(ADMIN).expect(200);
      expect(login.body.user.role).toBe('admin');

      const list = await http
        .get('/tasks?search=Para el admin')
        .set(bearer(login.body.accessToken))
        .expect(200);
      expect(list.body.meta.total).toBe(1);
    });

    it('no se puede obtener rol admin registrandose', async () => {
      const token = await register('quiere-admin@example.com');
      const me = await http.get('/auth/me').set(bearer(token)).expect(200);
      expect(me.body.role).toBe('user');
    });
  });
});
