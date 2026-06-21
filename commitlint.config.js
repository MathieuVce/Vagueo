export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'],
    ],
    // Descriptions en français autorisées : on ne force pas la casse de la 1re lettre.
    'subject-case': [0],
  },
};
