export interface Env {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  /** Crea las tablas automaticamente. Pensado para desarrollo y para la demo. */
  DB_SYNCHRONIZE: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  /** Origen permitido por CORS; si falta, CORS queda desactivado */
  CORS_ORIGIN?: string;
  /** Si ambos estan definidos, se crea un usuario admin al arrancar */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

type RawEnv = Record<string, unknown>;

function required(raw: RawEnv, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Falta la variable de entorno ${key} (ver .env.example)`);
  }
  return value;
}

function optional(raw: RawEnv, key: string): string | undefined {
  const value = raw[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function integer(raw: RawEnv, key: string, fallback: number): number {
  const value = optional(raw, key);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} debe ser un entero positivo`);
  }
  return parsed;
}

/** Valida las variables de entorno al arrancar: la app no inicia con configuracion insegura. */
export function validateEnv(raw: RawEnv): Env {
  const jwtSecret = required(raw, 'JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  const adminEmail = optional(raw, 'ADMIN_EMAIL');
  const adminPassword = optional(raw, 'ADMIN_PASSWORD');
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD deben definirse juntos');
  }
  if (adminPassword && adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  return {
    NODE_ENV: optional(raw, 'NODE_ENV') ?? 'development',
    PORT: integer(raw, 'PORT', 3000),
    DB_HOST: optional(raw, 'DB_HOST') ?? 'localhost',
    DB_PORT: integer(raw, 'DB_PORT', 5432),
    DB_USER: required(raw, 'DB_USER'),
    DB_PASSWORD: required(raw, 'DB_PASSWORD'),
    DB_NAME: required(raw, 'DB_NAME'),
    DB_SYNCHRONIZE: optional(raw, 'DB_SYNCHRONIZE') === 'true',
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN_SECONDS: integer(raw, 'JWT_EXPIRES_IN_SECONDS', 3600),
    CORS_ORIGIN: optional(raw, 'CORS_ORIGIN'),
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
  };
}
