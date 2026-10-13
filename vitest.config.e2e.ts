import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Valores ficticios solo para los tests: no son secretos reales
    env: {
      NODE_ENV: 'test',
      DB_USER: 'test',
      DB_PASSWORD: 'test',
      DB_NAME: 'test',
      JWT_SECRET: 'clave-solo-para-tests-de-al-menos-32-caracteres',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'admin-password-123',
    },
  },
});
