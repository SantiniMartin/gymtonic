import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // El paquete shared se publica como TS fuente: se incluye en el bundle.
  noExternal: ['@gymtonic/shared'],
});
