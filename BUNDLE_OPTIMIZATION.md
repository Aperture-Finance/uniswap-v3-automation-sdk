# Bundle Size Analysis and Optimization

## Current Bundle Metrics
- CommonJS (CJS):
  - Main bundle (index.js): 23.71 KB
  - Viem bundle (viem.js): 16.19 KB
  - Shared chunks: 1.10 MB
- ES Modules (ESM):
  - Main bundle (index.mjs): 6.71 KB
  - Viem bundle (viem.mjs): 4.80 KB
  - Shared chunks: 1.09 MB
- TypeScript declarations:
  - Main types (index.d.ts): 2.26 MB
  - Viem types (viem.d.ts): 6.57 KB

## Current Optimizations

### 1. Module Splitting
The SDK now supports two ways to import the viem module:

```typescript
// Legacy import (through main bundle)
import { viem } from '@aperture_finance/uniswap-v3-automation-sdk';

// Direct import (separate bundle)
import * as viem from '@aperture_finance/uniswap-v3-automation-sdk/viem';
```

### 2. Build Configuration
```typescript
// tsup.config.ts improvements
export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'viem': 'src/viem/index.ts'
  },
  // Enhanced minification
  minify: 'terser',
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  
  // Tree shaking
  treeshake: {
    preset: 'recommended'
  },
  
  // External dependencies
  external: [
    'ethers',
    '@0xsequence/multicall',
    'axios',
    'big.js',
    'bottleneck',
    'jsbi',
    'lodash',
    'viem'
  ],
  
  // Debug removal
  esbuildOptions: (options) => {
    options.pure = ['console.log', 'console.debug', 'console.info'];
    options.treeShaking = true;
    options.ignoreAnnotations = false;
    options.chunkNames = 'chunks/[name]-[hash]';
  }
})
```

## Further Optimization Recommendations

### 1. Dependencies Optimization
- **Heavy Dependencies Review**
  - Consider full migration from `ethers` to `viem`
  - Optimize SDK dependencies usage (`@aperture_finance/uniswap-v3-sdk`, `@uniswap/permit2-sdk`)
  - Review necessity of `@0xsequence/multicall`

- **Import Optimization**
  - Use specific lodash imports: 
    ```typescript
    // Instead of
    import { get } from 'lodash'
    // Use
    import get from 'lodash/get'
    ```
  - Apply selective imports for all large packages

- **Dependencies Management**
  - Move common libraries to `peerDependencies`
  - Review and update dependency versions

### 2. Code Organization
- Implement dynamic imports for less frequently used features
- Split more features into optional bundles
- Review and remove unused exports
- Optimize TypeScript types generation

### 3. Monitoring Setup
- Add bundle size limits using `size-limit`
- Set up CI checks for bundle size changes
- Use `import-cost` in development
- Regular bundle analysis reviews

## Implementation Priority
1. Build configuration updates (immediate impact)
2. Module splitting for viem (immediate impact)
3. Dependencies optimization (significant impact)
4. Code organization improvements (medium-term)
5. Monitoring setup (long-term maintenance)

## Expected Outcomes
- Reduced bundle size by potentially 30-40%
- Improved tree-shaking effectiveness
- Better development experience with size monitoring
- More efficient loading in consumer applications

## Memory Management
For large TypeScript projects, the build process may require additional memory. The following NODE_OPTIONS has been added to the build script:
```json
{
  "scripts": {
    "build": "yarn clean && NODE_OPTIONS='--max-old-space-size=8192' tsup"
  }
}
