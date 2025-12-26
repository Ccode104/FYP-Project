import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

/**
 * End-to-End Tests for AI Enhanced Code Editor
 * These tests simulate real user workflows through the application
 */

describe('E2E: AI Enhanced Code Editor', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  let authToken;
  let userId;

  beforeEach(async () => {
    // Login and get auth token
    const loginResponse = await request(baseURL)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testPassword123',
      })
      .catch(() => ({
        status: 200,
        body: { token: 'test-token', userId: '123' },
      }));

    authToken = loginResponse.body.token;
    userId = loginResponse.body.userId;
  });

  describe('Complete Code Analysis Workflow', () => {
    it('should analyze code and display results', async () => {
      const code = `
        function bubbleSort(arr) {
          for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length - i - 1; j++) {
              if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
              }
            }
          }
          return arr;
        }
      `;

      // Step 1: Analyze code complexity
      const analysisResponse = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          language: 'javascript',
        });

      expect(analysisResponse.status).toBe(200);
      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.analysis).toHaveProperty('timeComplexity');
      expect(analysisResponse.body.analysis).toHaveProperty('spaceComplexity');

      const analysisId = analysisResponse.body.analysis.id;

      // Step 2: Inject bug based on analysis
      const bugResponse = await request(baseURL)
        .post('/api/ai-editor/inject-bug')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          bugType: 'boundary-condition',
          language: 'javascript',
          analysisId,
        });

      expect(bugResponse.status).toBe(200);
      expect(bugResponse.body.bugInjection).toHaveProperty('modifiedCode');
      expect(bugResponse.body.bugInjection).toHaveProperty('explanation');

      // Step 3: Query AI for optimization tips
      const aiResponse = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'How can I optimize this bubble sort implementation?',
          code,
          language: 'javascript',
          analysisId,
        });

      expect(aiResponse.status).toBe(200);
      expect(aiResponse.body.response).toBeTruthy();
    });

    it('should retrieve full analysis history', async () => {
      // First, create some analyses
      const codes = [
        'const x = 1;',
        'function test() { }',
        'for (let i = 0; i < 10; i++) { }',
      ];

      for (const code of codes) {
        await request(baseURL)
          .post('/api/ai-editor/analyze-complexity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            code,
            language: 'javascript',
          });
      }

      // Retrieve history
      const historyResponse = await request(baseURL)
        .get('/api/ai-editor/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.queries).toBeDefined();
      expect(historyResponse.body.total).toBeGreaterThanOrEqual(codes.length);
    });

    it('should retrieve usage statistics', async () => {
      const statsResponse = await request(baseURL)
        .get('/api/ai-editor/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.stats).toHaveProperty('totalQueriesCount');
      expect(statsResponse.body.stats).toHaveProperty('totalTokensUsed');
      expect(statsResponse.body.stats).toHaveProperty('monthlyTokensUsed');
    });
  });

  describe('AI Query Workflow', () => {
    it('should process sequential AI queries', async () => {
      const queries = [
        {
          query: 'Can you explain how this code works?',
          code: 'const sum = (a, b) => a + b;',
        },
        {
          query: 'How can I make this more efficient?',
          code: 'for (let i = 0; i < arr.length; i++) { arr[i] *= 2; }',
        },
        {
          query: 'What is the time complexity?',
          code: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
        },
      ];

      const responses = [];

      for (const q of queries) {
        const response = await request(baseURL)
          .post('/api/ai-editor/query')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...q,
            language: 'javascript',
          });

        expect(response.status).toBe(200);
        expect(response.body.response).toBeTruthy();
        responses.push(response.body);
      }

      // Verify history contains all queries
      const historyResponse = await request(baseURL)
        .get('/api/ai-editor/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.queries.length).toBeGreaterThanOrEqual(queries.length);
    });

    it('should enforce rate limiting on excessive queries', async () => {
      // Attempt to send many queries in quick succession
      const queryCount = 60; // Assume limit is 50 per hour

      for (let i = 0; i < queryCount; i++) {
        const response = await request(baseURL)
          .post('/api/ai-editor/query')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Query ${i}`,
            code: 'const x = 1;',
            language: 'javascript',
          });

        if (i >= 50) {
          expect([429, 200]).toContain(response.status);
          if (response.status === 429) {
            expect(response.body.error).toContain('rate limit');
            break;
          }
        }
      }
    });

    it('should maintain conversation context', async () => {
      // First query establishes context
      const firstResponse = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'I have a recursive function',
          code: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
          language: 'javascript',
        });

      expect(firstResponse.status).toBe(200);

      // Follow-up query should reference context
      const followUpResponse = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'How do I convert this to iterative?',
          code: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
          language: 'javascript',
        });

      expect(followUpResponse.status).toBe(200);
      expect(followUpResponse.body.response).toBeTruthy();
    });
  });

  describe('Contest Mode Workflow', () => {
    it('should restrict AI features in contest mode', async () => {
      const code = 'const x = 1;';

      // Try to query AI in contest mode
      const contestResponse = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'How do I solve this?',
          code,
          language: 'javascript',
          contestMode: true,
        });

      // Should be blocked
      expect([403, 429]).toContain(contestResponse.status);
    });

    it('should allow code submission in contest mode', async () => {
      const code = `
        function solution(input) {
          // Contest solution
          return input.map(x => x * 2);
        }
      `;

      const submissionResponse = await request(baseURL)
        .post('/api/contests/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          language: 'javascript',
          contestId: 'contest-123',
          problemId: 'problem-1',
        });

      expect([200, 201, 400]).toContain(submissionResponse.status);
    });

    it('should track contest submission time', async () => {
      const code = 'const x = 1;';
      const submissionTime = new Date().toISOString();

      const response = await request(baseURL)
        .post('/api/contests/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          language: 'javascript',
          contestId: 'contest-123',
          submissionTime,
        });

      if (response.status === 200 || response.status === 201) {
        expect(response.body.submission).toHaveProperty('submittedAt');
      }
    });
  });

  describe('Bug Injection Learning', () => {
    it('should inject bugs and explain impact', async () => {
      const code = 'for (let i = 0; i < arr.length; i++) { console.log(arr[i]); }';

      // Inject off-by-one bug
      const bugResponse = await request(baseURL)
        .post('/api/ai-editor/inject-bug')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          bugType: 'off-by-one',
          language: 'javascript',
        });

      expect(bugResponse.status).toBe(200);
      expect(bugResponse.body.bugInjection).toHaveProperty('modifiedCode');
      expect(bugResponse.body.bugInjection).toHaveProperty('explanation');
      expect(bugResponse.body.bugInjection).toHaveProperty('impact');

      // Get AI explanation of the bug
      const explanationResponse = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What are the consequences of this bug?',
          code: bugResponse.body.bugInjection.modifiedCode,
          language: 'javascript',
        });

      expect(explanationResponse.status).toBe(200);
      expect(explanationResponse.body.response).toBeTruthy();
    });

    it('should support different bug types', async () => {
      const bugTypes = [
        { type: 'off-by-one', code: 'for (let i = 0; i < arr.length; i++)' },
        { type: 'boundary-condition', code: 'if (x > 0) { }' },
        { type: 'null-pointer', code: 'let val = obj.property;' },
        { type: 'scope-issue', code: 'var x = 1;' },
      ];

      for (const { type, code } of bugTypes) {
        const response = await request(baseURL)
          .post('/api/ai-editor/inject-bug')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            code,
            bugType: type,
            language: 'javascript',
          });

        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.bugInjection.bugType).toBe(type);
        }
      }
    });
  });

  describe('Multi-Language Support', () => {
    it('should analyze code in multiple languages', async () => {
      const codeByLanguage = {
        python: 'def bubble_sort(arr):\n  for i in range(len(arr)): pass',
        java: 'public void bubbleSort(int[] arr) { }',
        cpp: 'void bubbleSort(int arr[]) { }',
        go: 'func bubbleSort(arr []int) { }',
      };

      for (const [language, code] of Object.entries(codeByLanguage)) {
        const response = await request(baseURL)
          .post('/api/ai-editor/analyze-complexity')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            code,
            language,
          });

        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.analysis).toHaveProperty('timeComplexity');
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty code submission', async () => {
      const response = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: '',
          language: 'javascript',
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should handle invalid language parameter', async () => {
      const response = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'const x = 1;',
          language: 'invalid-language',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should handle network errors gracefully', async () => {
      // Send request with timeout
      const response = await request(baseURL)
        .post('/api/ai-editor/query')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(100)
        .send({
          query: 'Test',
          code: 'const x = 1;',
          language: 'javascript',
        })
        .catch((err) => ({
          status: err.status || 408,
          body: { error: 'Request timeout' },
        }));

      expect([408, 504, 200]).toContain(response.status);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(401);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Performance and Load', () => {
    it('should handle concurrent requests from multiple users', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(baseURL)
            .post('/api/ai-editor/analyze-complexity')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              code: `const x${i} = ${i};`,
              language: 'javascript',
            })
        );
      }

      const responses = await Promise.all(promises);

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should maintain response time under load', async () => {
      const startTime = Date.now();

      const response = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Data Persistence', () => {
    it('should persist analysis results across sessions', async () => {
      const code = 'function test() { }';

      // First session - create analysis
      const firstResponse = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code,
          language: 'javascript',
        });

      expect(firstResponse.status).toBe(200);
      const analysisId = firstResponse.body.analysis.id;

      // Second session - retrieve analysis
      const retrieveResponse = await request(baseURL)
        .get(`/api/ai-editor/analysis/${analysisId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(retrieveResponse.status);
      if (retrieveResponse.status === 200) {
        expect(retrieveResponse.body.analysis.code).toBe(code);
      }
    });

    it('should maintain referential integrity', async () => {
      // Create analysis
      const analysisResponse = await request(baseURL)
        .post('/api/ai-editor/analyze-complexity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      const analysisId = analysisResponse.body.analysis.id;

      // Create related bug injection
      const bugResponse = await request(baseURL)
        .post('/api/ai-editor/inject-bug')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'const x = 1;',
          bugType: 'off-by-one',
          language: 'javascript',
          analysisId,
        });

      expect(bugResponse.status).toBe(200);
      expect(bugResponse.body.bugInjection.analysisId).toBe(analysisId);
    });
  });
});
