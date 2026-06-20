import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

// Filet de sécurité léger, non bloquant, qui complète `tsc` sans dupliquer son
// boulot. Prettier gère la mise en forme ; `prettier` (en dernier) désactive les
// règles de style ESLint qui entreraient en conflit.
export default ts.config(
  { ignores: ['dist/', 'coverage/', 'functions/'] },

  js.configs.recommended,
  ...ts.configs.recommended,

  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/exhaustive-deps': 'off',
      // New react-hooks v7 rules — too strict for intentional patterns in this codebase
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },

  // Convention front : pas de tiret cadratin (U+2014) ni demi-cadratin (U+2013)
  // dans le texte affiché (titres, labels, JSX, placeholders). Utiliser /, le
  // point médian (U+00B7) ou les points de suspension. Ne couvre ni les
  // commentaires ni le tiret simple (calculs, kebab-case, URLs). Voir CLAUDE.md.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/[\\u2013\\u2014]/]',
          message:
            'Tiret cadratin/demi-cadratin interdit dans le texte affiché. Utiliser /, le point médian ou les points de suspension.',
        },
        {
          selector: 'TemplateElement[value.raw=/[\\u2013\\u2014]/]',
          message:
            'Tiret cadratin/demi-cadratin interdit dans le texte affiché. Utiliser /, le point médian ou les points de suspension.',
        },
        {
          selector: 'JSXText[value=/[\\u2013\\u2014]/]',
          message:
            'Tiret cadratin/demi-cadratin interdit dans le texte affiché. Utiliser /, le point médian ou les points de suspension.',
        },
      ],
    },
  },

  // Lint type-aware ciblé : attrape les promesses oubliées (ex. un updateDoc/
  // deleteDoc Firestore lancé sans await ni gestion d'erreur). Pour un envoi
  // volontairement « fire-and-forget », préfixer l'appel par `void`.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  prettier,
);
