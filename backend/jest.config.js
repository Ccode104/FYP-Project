export default {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
    '**/?(*.)+(spec|test).js',
  ],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!controllers/index.js',
    '!routes/index.js',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/'],
  // The repo currently contains a mix of Jest and Vitest suites under __tests__.
  // Until these suites are consolidated, ignore Vitest-based directories for Jest.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__tests__/e2e/',
    '/__tests__/routes/',
    '/__tests__/performance/',
    '/__tests__/controllers/',
    '/__tests__/integration/',
    '/__tests__/security/',
  ],
  // Temporarily disable strict coverage thresholds until Jest test suite is restored.
  coverageThreshold: undefined,
  passWithNoTests: false,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {},
};
