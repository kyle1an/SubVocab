import antfu from '@antfu/eslint-config'
import stylistic from '@stylistic/eslint-plugin'
import packageJson from 'eslint-plugin-package-json/configs/recommended'

export default antfu(
  {
    stylistic: false,
  },
  stylistic.configs.customize({
    arrowParens: true,
    braceStyle: '1tbs',
    quoteProps: 'as-needed',
  }),
  {
    name: 'style',
    rules: {
      '@stylistic/multiline-ternary': ['off'],
      '@stylistic/no-extra-semi': 'off',
      'no-extra-semi': 'off',
      '@stylistic/switch-colon-spacing': 'warn',
      '@stylistic/quotes': [1, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      '@stylistic/brace-style': ['error', '1tbs'],
      'unused-imports/no-unused-vars': 'off',
      'prefer-arrow-callback': 'off',
    },
  },
  {
    ...packageJson,
    rules: {
      'package-json/sort-collections': [
        'error',
        [
          'dependencies',
          'devDependencies',
          'peerDependencies',
        ],
      ],
    },
  },
  {
    name: 'root/perfectionist',
    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          internalPattern: ['^@/.+'],
        },
      ],
    },
  },
  {
    files: ['**/*.toml', '**/*.y?(a)ml'],
    rules: {
      'style/spaced-comment': 'off',
    },
  },
  {
    settings: {
      regexp: {
        allowedCharacterRanges: ['alphanumeric', 'À-ÿ', 'À-Þ'],
      },
    },
  },
  {
    rules: {
      'ts/ban-ts-comment': 'off',
      'ts/consistent-type-definitions': 'off',
    },
  },
  {
    files: ['tsconfig.json', 'tsconfig.*.json'],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
)