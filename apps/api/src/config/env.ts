/**
 * Variables de entorno de la API.
 * Se leen una sola vez al arrancar; si falta una obligatoria, el proceso termina con un mensaje claro.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Falta la variable de entorno ${name} (revisá apps/api/.env)`);
    process.exit(1);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: Number(optional('PORT', '4000')),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),

  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),

  SMTP_HOST: optional('SMTP_HOST', 'localhost'),
  SMTP_PORT: Number(optional('SMTP_PORT', '1025')),
  SMTP_FROM: optional('SMTP_FROM', 'Gym Tonic <no-reply@gymtonic.local>'),

  EXERCISEDB_BASE_URL: optional('EXERCISEDB_BASE_URL', 'https://www.exercisedb.dev/api/v1'),
};
