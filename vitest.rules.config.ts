import { defineConfig } from 'vitest/config';

// Config dédiée aux tests des règles Firestore : environnement node, vrai SDK
// Firebase contre l'émulateur (pas de mock), lancée via `npm run test:rules`
// qui démarre l'émulateur avec `firebase emulators:exec`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
