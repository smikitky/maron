import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'lib',
  format: ['esm'],
  target: 'node20',
  sourcemap: true,
  bundle: true,
  splitting: false,
  clean: true
});
