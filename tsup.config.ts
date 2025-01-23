import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
  treeshake: {
    preset: 'recommended'
  },
  minify: 'terser',
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  keepNames: true,
  external: [
    'ethers',
    '@0xsequence/multicall',
    'axios',
    'big.js',
    'bottleneck',
    'jsbi',
    'lodash'
  ],
  outDir: 'dist',
  target: 'node18',
  onSuccess: 'tsc --emitDeclarationOnly && tsc-alias',
  esbuildOptions: (options) => {
    options.pure = ['console.log', 'console.debug', 'console.info'];
    options.treeShaking = true;
    options.ignoreAnnotations = false;
  }
});
