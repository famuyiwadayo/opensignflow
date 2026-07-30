// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Ignore generated code and build artifacts first.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/target/**',

      // Generated source is typechecked, but not handwritten code.
      'packages/database/src/generated/**',

      // Framework-generated declarations.
      '**/*.d.ts',
      '**/next-env.d.ts',
    ],
  },

  // Base JavaScript correctness rules.
  eslint.configs.recommended,

  // TypeScript parser/plugin/recommended rules.
  ...tseslint.configs.recommended,

  // Shared TypeScript rules for handwritten code.
  {
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Keep warning initially; we can move to error once existing code is clean.
      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      '@typescript-eslint/no-non-null-assertion': 'warn',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      '@typescript-eslint/no-import-type-side-effects': 'error',

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],

      'prefer-const': 'error',
      'no-var': 'error',

      eqeqeq: [
        'error',
        'always',
        {
          null: 'ignore',
        },
      ],

      curly: ['error', 'all'],
    },
  },

  // Server-side applications and infrastructure packages.
  {
    files: [
      'apps/api/**/*.{ts,tsx}',
      'apps/worker/**/*.{ts,tsx}',
      'packages/**/*.{ts,tsx}',
      '*.{js,mjs,cjs,ts}',
    ],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
  },

  // Browser/Next.js application.
  {
    files: ['apps/web/**/*.{ts,tsx}'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
  },

  // Tests deliberately relax a small number of rules.
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts', '**/tests/**/*.ts'],

    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
];
