export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
    '!**/node_modules/**',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  passWithNoTests: true,
  moduleNameMapper: {},
};
