import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'release/**', 'scripts/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.{ts,svelte}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser
      }
    }
  }
)