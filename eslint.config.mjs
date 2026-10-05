import eslintReact from '@eslint-react/eslint-plugin';

export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@eslint-react': eslintReact.configs['recommended'].plugins['@eslint-react'],
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',
      'no-throw-literal': 'error',
      // React-specific rules (equivalent to eslint-plugin-react@7 coverage)
      '@eslint-react/no-missing-key': 'warn',
      '@eslint-react/no-direct-mutation-state': 'error',
      '@eslint-react/no-duplicate-key': 'error',
    },
  },
];
