import { validateEnv } from './env.js';

const valid = {
  DB_USER: 'app',
  DB_PASSWORD: 'secret',
  DB_NAME: 'tasks',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.DB_HOST).toBe('localhost');
    expect(env.DB_SYNCHRONIZE).toBe(false);
    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(3600);
  });

  it('exige JWT_SECRET', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: undefined })).toThrow(
      'JWT_SECRET',
    );
  });

  it('rechaza un JWT_SECRET corto', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'corto' })).toThrow(
      '32 caracteres',
    );
  });

  it('exige la contrasena de la base de datos', () => {
    expect(() => validateEnv({ ...valid, DB_PASSWORD: '' })).toThrow(
      'DB_PASSWORD',
    );
  });

  it('exige ADMIN_EMAIL y ADMIN_PASSWORD juntos', () => {
    expect(() => validateEnv({ ...valid, ADMIN_EMAIL: 'a@b.com' })).toThrow(
      'juntos',
    );
  });

  it('rechaza una contrasena de admin corta', () => {
    expect(() =>
      validateEnv({
        ...valid,
        ADMIN_EMAIL: 'a@b.com',
        ADMIN_PASSWORD: 'corta',
      }),
    ).toThrow('12 caracteres');
  });

  it('rechaza un puerto invalido', () => {
    expect(() => validateEnv({ ...valid, PORT: 'abc' })).toThrow('PORT');
  });
});
