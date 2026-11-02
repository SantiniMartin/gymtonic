import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Con prisma.config.ts, Prisma no carga .env automáticamente.
try {
  process.loadEnvFile(path.join(import.meta.dirname, '.env'));
} catch {
  // Sin .env: se usan las variables de entorno del sistema.
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
