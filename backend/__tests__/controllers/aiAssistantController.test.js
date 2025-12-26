import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as aiAssistantController from '../../controllers/aiAssistantController.js';
import { prisma } from '../../prisma/prismaClient.js';

jest.mock('../../prisma/prismaClient.js');

describe('AI Assistant Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { id: '123', email: 'test@example.com' },
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('processAIQuery', () => {
    it('should process a valid AI query successfully', async () => {
      mockReq.body = {
        query: 'How do I optimize this recursive function?',
        code: 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }',
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue({
        id: '1',
        userId: '123',
        query: mockReq.body.query,
        response: 'Consider using memoization or dynamic programming approach...',
        tokensUsed: 150,
        timestamp: new Date(),
      });

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.response).toBeDefined();
    });

    it('should enforce rate limiting for excessive queries', async () => {
      mockReq.body = {
        query: 'Test query',
        code: 'const x = 1;',
        language: 'javascript',
      };

      // Simulate rate limit exceeded
      prisma.aiQuery.count = jest.fn().mockResolvedValue(51);

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.error).toContain('rate limit');
    });

    it('should handle queries with different code languages', async () => {
      const languages = ['javascript', 'python', 'java', 'cpp', 'go'];

      for (const lang of languages) {
        mockReq.body = {
          query: 'How can I improve this?',
          code: 'sample code',
          language: lang,
        };

        prisma.aiQuery.create = jest.fn().mockResolvedValue({
          id: '1',
          language: lang,
          response: `Optimization suggestions for ${lang}...`,
        });

        await aiAssistantController.processAIQuery(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });

    it('should validate query length constraints', async () => {
      mockReq.body = {
        query: 'x'.repeat(5001), // Exceeds max length
        code: 'const x = 1;',
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.error).toContain('Query');
    });

    it('should validate code length constraints', async () => {
      mockReq.body = {
        query: 'How to optimize?',
        code: 'x'.repeat(100001), // Exceeds max length
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(413);
    });

    it('should handle missing required parameters', async () => {
      mockReq.body = {
        query: 'How to optimize?',
        // Missing code and language
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should track token usage for billing', async () => {
      mockReq.body = {
        query: 'Test',
        code: 'const x = 1;',
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue({
        id: '1',
        tokensUsed: 250,
        userId: '123',
      });

      prisma.userAIUsage.update = jest.fn().mockResolvedValue({
        totalTokensUsed: 1250,
      });

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(prisma.aiQuery.create).toHaveBeenCalled();
      expect(prisma.userAIUsage.update).toHaveBeenCalled();
    });

    it('should store query history for analytics', async () => {
      mockReq.body = {
        query: 'How do I handle async/await?',
        code: 'async function test() { }',
        language: 'javascript',
      };

      const mockQueryData = {
        id: '1',
        userId: '123',
        query: mockReq.body.query,
        code: mockReq.body.code,
        timestamp: new Date(),
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue(mockQueryData);

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(prisma.aiQuery.create).toHaveBeenCalled();
      const createCall = prisma.aiQuery.create.mock.calls[0][0];
      expect(createCall.data.query).toBe(mockReq.body.query);
      expect(createCall.data.userId).toBe('123');
    });

    it('should handle AI service timeouts gracefully', async () => {
      mockReq.body = {
        query: 'Test',
        code: 'const x = 1;',
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('AI Service Timeout')), 100);
        });
      });

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(504);
    });

    it('should sanitize input to prevent injection attacks', async () => {
      mockReq.body = {
        query: '<script>alert("xss")</script>',
        code: "'; DROP TABLE users; --",
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue({
        id: '1',
        query: expect.not.stringContaining('<script>'),
      });

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAIQueryHistory', () => {
    it('should retrieve query history for authenticated user', async () => {
      mockReq.query = { limit: 10, offset: 0 };

      prisma.aiQuery.findMany = jest.fn().mockResolvedValue([
        { id: '1', query: 'First query', timestamp: new Date() },
        { id: '2', query: 'Second query', timestamp: new Date() },
      ]);

      prisma.aiQuery.count = jest.fn().mockResolvedValue(2);

      await aiAssistantController.getAIQueryHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.queries).toHaveLength(2);
      expect(responseData.total).toBe(2);
    });

    it('should support pagination', async () => {
      mockReq.query = { limit: 5, offset: 10 };

      prisma.aiQuery.findMany = jest.fn().mockResolvedValue([]);
      prisma.aiQuery.count = jest.fn().mockResolvedValue(100);

      await aiAssistantController.getAIQueryHistory(mockReq, mockRes);

      const findCall = prisma.aiQuery.findMany.mock.calls[0][0];
      expect(findCall.take).toBe(5);
      expect(findCall.skip).toBe(10);
    });

    it('should filter by date range', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      prisma.aiQuery.findMany = jest.fn().mockResolvedValue([]);

      await aiAssistantController.getAIQueryHistory(mockReq, mockRes);

      expect(prisma.aiQuery.findMany).toHaveBeenCalled();
    });

    it('should handle empty history', async () => {
      prisma.aiQuery.findMany = jest.fn().mockResolvedValue([]);
      prisma.aiQuery.count = jest.fn().mockResolvedValue(0);

      await aiAssistantController.getAIQueryHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.queries).toHaveLength(0);
    });

    it('should require authentication', async () => {
      mockReq.user = null;

      await aiAssistantController.getAIQueryHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getAIUsageStats', () => {
    it('should retrieve usage statistics for user', async () => {
      prisma.userAIUsage.findUnique = jest.fn().mockResolvedValue({
        userId: '123',
        totalQueriesCount: 100,
        totalTokensUsed: 50000,
        monthlyTokensUsed: 12000,
        lastQueryDate: new Date(),
      });

      prisma.aiQuery.count = jest.fn().mockResolvedValue(100);

      await aiAssistantController.getAIUsageStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.stats.totalQueriesCount).toBe(100);
      expect(responseData.stats.totalTokensUsed).toBe(50000);
    });

    it('should calculate monthly token usage', async () => {
      prisma.userAIUsage.findUnique = jest.fn().mockResolvedValue({
        userId: '123',
        monthlyTokensUsed: 15000,
        monthlyTokenLimit: 100000,
      });

      await aiAssistantController.getAIUsageStats(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.stats.monthlyTokensUsed).toBe(15000);
      expect(responseData.stats.monthlyTokenLimit).toBe(100000);
      expect(responseData.stats.usagePercentage).toBe(15);
    });

    it('should warn when approaching token limit', async () => {
      prisma.userAIUsage.findUnique = jest.fn().mockResolvedValue({
        userId: '123',
        monthlyTokensUsed: 90000,
        monthlyTokenLimit: 100000,
      });

      await aiAssistantController.getAIUsageStats(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.stats.warning).toBeDefined();
    });

    it('should handle users with no usage data', async () => {
      prisma.userAIUsage.findUnique = jest.fn().mockResolvedValue(null);

      await aiAssistantController.getAIUsageStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.stats).toBeDefined();
    });

    it('should require authentication', async () => {
      mockReq.user = null;

      await aiAssistantController.getAIUsageStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Responsible AI checks', () => {
    it('should prevent queries about exam answers', async () => {
      mockReq.body = {
        query: 'What are the answers to the midterm exam?',
        code: '',
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should prevent harmful code requests', async () => {
      mockReq.body = {
        query: 'How do I write a virus?',
        code: '',
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should prevent academic dishonesty', async () => {
      mockReq.body = {
        query: 'Write the complete solution for the assignment',
        code: '',
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should allow educational learning requests', async () => {
      mockReq.body = {
        query: 'Can you explain how closures work in JavaScript?',
        code: 'const x = () => {};',
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue({
        id: '1',
        response: 'Closures are functions that remember their scope...',
      });

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockReq.body = {
        query: 'Test',
        code: 'const x = 1;',
        language: 'javascript',
      };

      prisma.aiQuery.create = jest.fn().mockRejectedValue(new Error('DB Connection Error'));

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle missing authentication token', async () => {
      mockReq.user = null;

      mockReq.body = {
        query: 'Test',
        code: 'const x = 1;',
        language: 'javascript',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle malformed JSON in request', async () => {
      mockReq.body = null;

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle invalid language parameter', async () => {
      mockReq.body = {
        query: 'Test',
        code: 'const x = 1;',
        language: 'invalid-language',
      };

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
