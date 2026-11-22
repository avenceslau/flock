import { defineConfig } from 'vite-plus';

const ignorePatterns = ['tools/oxlint/anti-slop/**'];

export default defineConfig({
  lint: {
    ignorePatterns,
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'anti-slop',
        specifier: './tools/oxlint/anti-slop/index.ts',
      },
      {
        name: 'durability',
        specifier: '@durability/lint',
      },
    ],
    rules: {
      'oxc/no-accumulating-spread': 'error',
      'anti-slop/no-array-filter-map': 'error',
      'anti-slop/no-reduce-accumulator-copy': 'error',
      'anti-slop/no-chained-type-assertions': 'error',
      'anti-slop/no-conditional-empty-object-spread': 'error',
      'anti-slop/no-known-value-widening': 'error',
      'anti-slop/no-module-mocking': 'error',
      'anti-slop/no-object-parameters': 'error',
      'anti-slop/no-reflect-apply': 'error',
      'anti-slop/no-reflect-get': 'error',
      'anti-slop/no-runtime-typeof': 'error',
      'anti-slop/no-shape-in-symbol-names': 'error',
      'anti-slop/no-unknown-parameters': 'error',
      'anti-slop/no-unknown-returns': 'error',
      'anti-slop/no-unknown-type-aliases': 'error',
      'anti-slop/no-unsafe-dictionary-type': 'error',
      'anti-slop/no-widen-then-assert': 'error',
      'anti-slop/require-readable-spacing': 'error',
      'anti-slop/require-safety-comment-for-type-assertion': 'error',
      'durability/abort-after-sync': 'error',
      'durability/alarm-runner-only': 'error',
      'durability/durability-migrations-only': 'error',
      'durability/no-alarm-changes-in-alarm-handler': 'error',
      'durability/no-delete-all-in-transaction': 'error',
      'durability/no-deferred-storage-writes': 'error',
      'durability/transaction-sync-callback': 'error',
      'durability/transform-next-once': 'error',
    },
  },
  fmt: {
    ignorePatterns: [...ignorePatterns, '**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
    singleQuote: true,
  },
});
