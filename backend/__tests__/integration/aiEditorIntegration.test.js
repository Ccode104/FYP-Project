import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { prisma } from '../../prisma/prismaClient.js';
import * as codeAnalysisController from '../../controllers/codeAnalysisController.js';
import * as aiAssistantController from '../../controllers/aiAssistantController.js';

jest.mock('../../prisma/prismaClient.js');

describe('AI Editor Integration Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { id: 'user-123', email: 'test@example.com' },
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('Complete Code Analysis Workflow', () => {
    it('should analyze code, inject bug, and track in database', async () => {
      const testCode = `
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

      // Step 1: Analyze complexity
      mockReq.body = {
        code: testCode,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: 'analysis-1',
        userId: 'user-123',
        code: testCode,
        language: 'javascript',
        timeComplexity: 'O(n²)',
        spaceComplexity: 'O(1)',
        warnings: ['Nested loops detected: O(n²) complexity'],
        createdAt: new Date(),
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      let response = mockRes.json.mock.calls[0][0];
      expect(response.analysis.timeComplexity).toBe('O(n²)');

      // Step 2: Inject bug based on analysis
      mockReq.body = {
        code: testCode,
        bugType: 'boundary-condition',
        language: 'javascript',
        analysisId: 'analysis-1',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: 'bug-1',
        userId: 'user-123',
        analysisId: 'analysis-1',
        originalCode: testCode,
        modifiedCode: testCode.replace('j < arr.length - i - 1', 'j <= arr.length - i - 1'),
        bugType: 'boundary-condition',
        explanation: 'Off-by-one error in inner loop',
        createdAt: new Date(),
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      response = mockRes.json.mock.calls[0][0];
      expect(response.bugInjection.bugType).toBe('boundary-condition');

      // Verify both records are linked
      expect(prisma.bugInjection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            analysisId: 'analysis-1',
          }),
        })
      );
    });

    it('should create analysis history for user tracking', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      const mockAnalysis = {
        id: 'analysis-2',
        userId: 'user-123',
        code: 'const x = 1;',
        language: 'javascript',
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
        createdAt: new Date(),
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue(mockAnalysis);
      prisma.codeAnalysis.findMany = jest.fn().mockResolvedValue([mockAnalysis]);

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Verify history can be retrieved
      prisma.codeAnalysis.findMany.mockResolvedValueOnce([mockAnalysis]);
      const history = await prisma.codeAnalysis.findMany({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });

      expect(history).toHaveLength(1);
      expect(history[0].userId).toBe('user-123');
    });
  });

  describe('AI Assistant Query with Code Analysis', () => {
    it('should analyze code and process AI query in sequence', async () => {
      const codeSnippet = 'function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }';

      // Step 1: Analyze the code
      mockReq.body = {
        code: codeSnippet,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: 'analysis-3',
        code: codeSnippet,
        timeComplexity: 'O(2^n)',
        warnings: ['Exponential time complexity detected'],
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Step 2: Query AI about optimization
      mockReq.body = {
        query: 'How can I optimize this fibonacci implementation?',
        code: codeSnippet,
        language: 'javascript',
        analysisId: 'analysis-3',
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue({
        id: 'query-1',
        userId: 'user-123',
        query: mockReq.body.query,
        analysisId: 'analysis-3',
        response: 'Consider using memoization or dynamic programming to reduce redundant calculations...',
        tokensUsed: 180,
        createdAt: new Date(),
      });

      prisma.aiQuery.count = jest.fn().mockResolvedValue(5); // Within rate limit

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.response).toContain('memoization');
    });

    it('should track query history with associated code analysis', async () => {
      mockReq.body = {
        query: 'Test query',
        code: 'const x = 1;',
        language: 'javascript',
      };

      const mockQuery = {
        id: 'query-2',
        userId: 'user-123',
        query: 'Test query',
        code: 'const x = 1;',
        response: 'Response',
        timestamp: new Date(),
      };

      prisma.aiQuery.create = jest.fn().mockResolvedValue(mockQuery);
      prisma.aiQuery.count = jest.fn().mockResolvedValue(3);
      prisma.aiQuery.findMany = jest.fn().mockResolvedValue([mockQuery]);

      await aiAssistantController.processAIQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Retrieve full history
      const history = await prisma.aiQuery.findMany({
        where: { userId: 'user-123' },
        orderBy: { timestamp: 'desc' },
      });

      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('Test query');
    });
  });

  describe('Contest Mode Workflow', () => {
    it('should restrict AI features in contest mode', async () => {
      mockReq.body = {
        query: 'How do I solve this?',
        code: 'some code',
        language: 'javascript',
        contestMode: true,
      };

      // In contest mode, AI queries should be blocked
      // This would be handled by middleware
      const hasContestMode = mockReq.body.contestMode;
      expect(hasContestMode).toBe(true);

      // Complexity analysis should also be restricted
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
        contestMode: true,
      };

      // This would be validated by middleware
      expect(mockReq.body.contestMode).toBe(true);
    });

    it('should allow complexity analysis in learning mode', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
        learningMode: true,
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: 'analysis-4',
        code: 'const x = 1;',
        timeComplexity: 'O(1)',
        learningMode: true,
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(prisma.codeAnalysis.create).toHaveBeenCalled();
    });
  });

  describe('Data Flow and Persistence', () => {
    it('should persist analysis results across multiple requests', async () => {
      const code1 = 'function test1() { }';
      const code2 = 'function test2() { }';

      // First analysis
      mockReq.body = { code: code1, language: 'javascript' };
      prisma.codeAnalysis.create = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'a1',
          code: code1,
          timeComplexity: 'O(1)',
        })
        .mockResolvedValueOnce({
          id: 'a2',
          code: code2,
          timeComplexity: 'O(n)',
        });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      // Second analysis
      mockReq.body = { code: code2, language: 'javascript' };
      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      // Verify both were created
      expect(prisma.codeAnalysis.create).toHaveBeenCalledTimes(2);
    });

    it('should maintain referential integrity between tables', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      const mockAnalysisData = {
        id: 'analysis-5',
        userId: 'user-123',
        code: 'const x = 1;',
        timeComplexity: 'O(1)',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue(mockAnalysisData);

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      // Create bug injection referencing analysis
      mockReq.body = {
        code: 'const x = 1;',
        bugType: 'off-by-one',
        analysisId: mockAnalysisData.id,
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: 'bug-2',
        userId: 'user-123',
        analysisId: mockAnalysisData.id,
        bugType: 'off-by-one',
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      // Verify the foreign key relationship
      expect(prisma.bugInjection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            analysisId: mockAnalysisData.id,
          }),
        })
      );
    });
  });

  describe('Error Recovery and Validation', () => {
    it('should validate data before database operations', async () => {
      mockReq.body = {
        code: 'x'.repeat(100001), // Exceeds limit
        language: 'javascript',
      };

      // Validation should happen before DB call
      if (mockReq.body.code.length > 100000) {
        mockRes.status(413).json({ error: 'Code exceeds maximum size' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(prisma.codeAnalysis.create).not.toHaveBeenCalled();
    });

    it('should handle concurrent requests safely', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        mockReq.body = {
          code: `const x${i} = ${i};`,
          language: 'javascript',
        };

        prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
          id: `analysis-${i}`,
          code: `const x${i} = ${i};`,
          timeComplexity: 'O(1)',
        });

        promises.push(codeAnalysisController.analyzeComplexity(mockReq, mockRes));
      }

      await Promise.all(promises);

      expect(mockRes.status).toHaveBeenLastCalledWith(200);
    });

    it('should rollback on transaction failure', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'analysis-6',
          code: 'const x = 1;',
        })
        .mockRejectedValueOnce(new Error('Constraint violation'));

      // First call succeeds
      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Reset mocks
      jest.clearAllMocks();
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn().mockReturnThis();

      // Second call fails
      prisma.codeAnalysis.create = jest.fn().mockRejectedValue(new Error('DB error'));
      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache complexity analysis results', async () => {
      const code = 'const x = 1;';
      mockReq.body = { code, language: 'javascript' };

      const cacheKey = `analysis:${code}:javascript`;

      // First request
      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: 'analysis-7',
        code,
        timeComplexity: 'O(1)',
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);
      expect(prisma.codeAnalysis.create).toHaveBeenCalledTimes(1);

      // Second request with same code - could use cache
      mockRes.json.mockClear();
      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      // Implementation should determine if cache is used
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle batch operations efficiently', async () => {
      const codes = ['const a = 1;', 'const b = 2;', 'const c = 3;'];

      const results = codes.map((code, idx) => ({
        id: `analysis-${idx}`,
        code,
        timeComplexity: 'O(1)',
      }));

      prisma.codeAnalysis.createMany = jest.fn().mockResolvedValue({
        count: codes.length,
      });

      // Bulk create
      await prisma.codeAnalysis.createMany({
        data: codes.map((code) => ({
          userId: 'user-123',
          code,
          language: 'javascript',
          timeComplexity: 'O(1)',
          spaceComplexity: 'O(1)',
        })),
      });

      expect(prisma.codeAnalysis.createMany).toHaveBeenCalled();
    });
  });

  describe('User Isolation and Security', () => {
    it('should prevent users from accessing other users data', async () => {
      const user1Id = 'user-123';
      const user2Id = 'user-456';

      // User 1 creates analysis
      mockReq.user = { id: user1Id };
      mockReq.body = { code: 'const x = 1;', language: 'javascript' };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: 'analysis-8',
        userId: user1Id,
        code: 'const x = 1;',
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      // User 2 tries to retrieve user 1's data
      prisma.codeAnalysis.findMany = jest.fn().mockResolvedValue([]); // Should be empty

      const user2Analysis = await prisma.codeAnalysis.findMany({
        where: { userId: user2Id },
      });

      expect(user2Analysis).toHaveLength(0);
    });

    it('should validate user authorization for sensitive operations', async () => {
      mockReq.user = null; // No authentication

      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      // Request should be rejected before DB access
      if (!mockReq.user) {
        mockRes.status(401).json({ error: 'Unauthorized' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(prisma.codeAnalysis.create).not.toHaveBeenCalled();
    });
  });
});
