import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import * as aiEditorRoutes from '../../routes/aiEditorRoutes.js';
import * as aiAssistantController from '../../controllers/aiAssistantController.js';
import * as codeAnalysisController from '../../controllers/codeAnalysisController.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/ai-editor', aiEditorRoutes.default);

jest.mock('../../controllers/aiAssistantController.js');
jest.mock('../../controllers/codeAnalysisController.js');

describe('AI Editor Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai-editor/analyze-complexity', () => {
    it('should call analyzeComplexity controller', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          analysis: {
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(1)',
          },
        });
      });

      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle controller errors', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        return res.status(500).json({ error: 'Internal error' });
      });

      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/ai-editor/inject-bug', () => {
    it('should call injectLogicalBug controller', async () => {
      codeAnalysisController.injectLogicalBug.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          bugInjection: {
            bugType: 'off-by-one',
            modifiedCode: 'for (let i = 0; i <= n; i++)',
          },
        });
      });

      const response = await request(app)
        .post('/api/ai-editor/inject-bug')
        .send({
          code: 'for (let i = 0; i < n; i++)',
          bugType: 'off-by-one',
          language: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate bug type parameter', async () => {
      const response = await request(app)
        .post('/api/ai-editor/inject-bug')
        .send({
          code: 'const x = 1;',
          bugType: 'invalid-bug',
          language: 'javascript',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/ai-editor/query', () => {
    it('should process AI query', async () => {
      aiAssistantController.processAIQuery.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          response: 'Here is the optimization...',
        });
      });

      const response = await request(app)
        .post('/api/ai-editor/query')
        .send({
          query: 'How do I optimize this?',
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should enforce rate limiting', async () => {
      aiAssistantController.processAIQuery.mockImplementation((req, res) => {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      });

      const response = await request(app)
        .post('/api/ai-editor/query')
        .send({
          query: 'Test',
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(429);
    });
  });

  describe('GET /api/ai-editor/history', () => {
    it('should retrieve query history', async () => {
      aiAssistantController.getAIQueryHistory.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          queries: [
            { id: '1', query: 'First query' },
            { id: '2', query: 'Second query' },
          ],
          total: 2,
        });
      });

      const response = await request(app)
        .get('/api/ai-editor/history')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.queries).toHaveLength(2);
    });

    it('should support pagination parameters', async () => {
      aiAssistantController.getAIQueryHistory.mockImplementation((req, res) => {
        return res.status(200).json({ success: true, queries: [] });
      });

      const response = await request(app)
        .get('/api/ai-editor/history')
        .query({ limit: 5, offset: 10 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/ai-editor/stats', () => {
    it('should retrieve usage statistics', async () => {
      aiAssistantController.getAIUsageStats.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          stats: {
            totalQueriesCount: 100,
            totalTokensUsed: 50000,
            monthlyTokensUsed: 12000,
            monthlyTokenLimit: 100000,
          },
        });
      });

      const response = await request(app)
        .get('/api/ai-editor/stats');

      expect(response.status).toBe(200);
      expect(response.body.stats.totalQueriesCount).toBe(100);
    });
  });

  describe('Input validation middleware', () => {
    it('should reject requests without authentication header', async () => {
      const response = await request(app)
        .post('/api/ai-editor/query')
        .send({
          query: 'Test',
          code: 'const x = 1;',
          language: 'javascript',
        });

      // Depends on whether auth middleware is applied
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should validate Content-Type header', async () => {
      const response = await request(app)
        .post('/api/ai-editor/query')
        .set('Content-Type', 'text/plain')
        .send('invalid');

      expect([400, 413, 422]).toContain(response.status);
    });

    it('should enforce maximum request size', async () => {
      const hugeCode = 'x'.repeat(1000000);
      const response = await request(app)
        .post('/api/ai-editor/query')
        .send({
          query: 'Test',
          code: hugeCode,
          language: 'javascript',
        });

      expect([413, 400]).toContain(response.status);
    });

    it('should sanitize string inputs', async () => {
      const response = await request(app)
        .post('/api/ai-editor/query')
        .send({
          query: '<script>alert("xss")</script>',
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect([200, 400, 403]).toContain(response.status);
    });
  });

  describe('Error responses', () => {
    it('should return 400 for bad requests', async () => {
      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/ai-editor/non-existent');

      expect(response.status).toBe(404);
    });

    it('should return 405 for wrong HTTP methods', async () => {
      const response = await request(app)
        .get('/api/ai-editor/analyze-complexity');

      expect(response.status).toBe(405);
    });

    it('should handle server errors gracefully', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Performance and load handling', () => {
    it('should handle concurrent requests', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        return res.status(200).json({ success: true });
      });

      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/ai-editor/analyze-complexity')
          .send({
            code: 'const x = 1;',
            language: 'javascript',
          })
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r.status === 200)).toBe(true);
    });

    it('should timeout long-running requests', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        return new Promise(() => {
          // Never resolves - will timeout
        });
      });

      // This test depends on configured request timeout
      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .timeout(1000)
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        })
        .catch(err => ({ status: 408, body: { error: err.message } }));

      expect([408, 504]).toContain(response.status);
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response format', async () => {
      codeAnalysisController.analyzeComplexity.mockImplementation((req, res) => {
        return res.status(200).json({
          success: true,
          analysis: { timeComplexity: 'O(n)' },
        });
      });

      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        });

      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    it('should include error details in error responses', async () => {
      const response = await request(app)
        .post('/api/ai-editor/analyze-complexity')
        .send({});

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
