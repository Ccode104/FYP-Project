/**
 * Jest Setup File
 * Configures global test environment and utilities
 */

// Set environment to test
process.env.NODE_ENV = 'test';

// Suppress console logs in tests unless in debug mode
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  /**
   * Create a mock request object
   */
  createMockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: '123', email: 'test@example.com' },
    ...overrides,
  }),

  /**
   * Create a mock response object
   */
  createMockRes: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  }),

  /**
   * Generate mock code snippets
   */
  generateMockCode: (type = 'simple') => {
    const snippets = {
      simple: 'const x = 1;',
      function: 'function add(a, b) { return a + b; }',
      loop: 'for (let i = 0; i < 10; i++) { console.log(i); }',
      recursive: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
      async: 'async function fetch() { return await api.get(); }',
    };
    return snippets[type] || snippets.simple;
  },
};

// Set default timeout for all tests
jest.setTimeout(10000);

// Mock console methods after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
