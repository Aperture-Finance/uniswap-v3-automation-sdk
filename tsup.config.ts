import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: true,
  keepNames: true,
  external: ['ethers'],
  outDir: 'dist',
  target: 'node18',
  onSuccess: 'tsc --emitDeclarationOnly && tsc-alias',
});
