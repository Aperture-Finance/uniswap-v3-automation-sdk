/* eslint-env node */
import type { CodegenConfig } from '@graphql-codegen/cli';

// Generates TS objects from the Uniswap graphql schema.
// To learn more: https://www.apollographql.com/docs/react/development-testing/static-typing/#setting-up-your-project
const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/data/uniswap-data-schema.graphql',
  documents: ['src/data/uniswap-data-document.graphql'],
  generates: {
    'src/data/__graphql_generated__/uniswap-data-types-and-hooks.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        withHooks: true,
        // This avoid all generated schemas being wrapped in Maybe https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#maybevalue-string-default-value-t--null
        maybeValue: 'T',
      },
    },
  },
};

export default config;
