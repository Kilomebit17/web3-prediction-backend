// ESLint v9 flat config
// ROADMAP 1.2: enforces Clean Architecture layer rules via eslint-plugin-boundaries
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const boundaries = require('eslint-plugin-boundaries');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'eslint.config.js',
    ],
  },
  {
    files: ['{apps,libs}/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      boundaries,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022,
      },
    },
    settings: {
      // ROADMAP 1.2: Clean Architecture boundaries
      'boundaries/elements': [
        { type: 'domain', pattern: 'libs/domain/src/**' },
        { type: 'application', pattern: 'libs/application/src/**' },
        { type: 'infrastructure', pattern: 'libs/infrastructure/src/**' },
        { type: 'shared', pattern: 'libs/shared/src/**' },
        { type: 'api', pattern: 'apps/api/src/**' },
        { type: 'worker', pattern: 'apps/worker/src/**' },
      ],
      'boundaries/ignore': ['**/*.spec.ts', '**/*.test.ts'],
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // ROADMAP 1.2: domain MUST NOT import NestJS, Prisma, infrastructure
      // ROADMAP 1.2: application MUST NOT import infrastructure
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain', 'shared'] },
            { from: 'application', allow: ['domain', 'application', 'shared'] },
            { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure', 'shared'] },
            { from: 'shared', allow: ['shared'] },
            { from: 'api', allow: ['domain', 'application', 'infrastructure', 'shared'] },
            { from: 'worker', allow: ['domain', 'application', 'infrastructure', 'shared'] },
          ],
        },
      ],
    },
  },
];
