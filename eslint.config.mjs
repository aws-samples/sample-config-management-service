import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

import prettierPlugin from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('.eslintrc.js'),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      eslint: typescriptEslintPlugin,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        node: {},
        typescript: {
          project: path.join(__dirname, 'tsconfig.json'),
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['!@/*'],
        },
      ],
      'no-duplicate-imports': ['error'],
      'key-spacing': ['warn'],
      'no-multiple-empty-lines': ['warn'],
      'no-return-await': ['off'],
      'no-trailing-spaces': ['warn'],
      'dot-notation': ['warn'],
      'no-bitwise': ['error'],
      indent: ['error', 2],
      semi: ['error', 'always'],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      'comma-dangle': ['error', 'always-multiline'],
      'max-lines': ['error', 300],
      'prettier/prettier': ['warn'],
      '@typescript-eslint/no-unused-vars': ['error'],
    },
  },
];
