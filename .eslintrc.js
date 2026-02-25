module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
    },
    plugins: [
      '@typescript-eslint/eslint-plugin',
      'unused-imports', // Auto remove unused imports
      'prettier',
    ],
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    root: true,
    env: {
      node: true,
      jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'class-methods-use-this': 'off',
      'no-shadow': ['off'],
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'linebreak-style': ['error', 'windows'],
      'curly': ['error', 'all'],
      'dot-notation': ['error', { 'allowPattern': '^[a-zA-Z_]+$'}],
      'no-trailing-spaces': 'error',
      'lines-between-class-members': 'error',
      'unused-imports/no-unused-imports': 'warn',
      'max-len': [
        'error',
          {
            'code': 100,
            'tabWidth': 2,
            'ignoreComments': false, //"comments": 80
            'ignoreUrls': true,
            'ignoreStrings': false,
            'ignoreTemplateLiterals': true,
            'ignorePattern': '^import\\s.+\\sfrom\\s.+;$',
          }
      ],
      'no-param-reassign': ['error', { props: false }],
      'prettier/prettier': [
        'error',
        {
          'singleQuote': true,
          'trailingComma': 'all',
          'arrowParens': 'always',
          'endOfLine': 'crlf',
          'printWidth': 100,
          'tabWidth': 2
        }
      ]
    },
  };
  