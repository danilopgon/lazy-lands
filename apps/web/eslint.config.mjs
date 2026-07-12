import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import jsdoc from 'eslint-plugin-jsdoc'

const eslintConfig = [
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  {
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
          },
        },
      ],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-description': 'warn',
      'jsdoc/check-types': 'error',
    },
  },
  {
    // JSDoc documents the production API surface, not test fixtures/helpers
    // (buildX factories, renderPage, etc.). Relax the doc rules for tests.
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-description': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      '../../.agents/**',
      '../../.codex/**',
      '../../.github/**',
    ],
  },
]

export default eslintConfig
