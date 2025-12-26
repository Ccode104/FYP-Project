import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as codeAnalysisController from '../../controllers/codeAnalysisController.js';
import { prisma } from '../../prisma/prismaClient.js';

// Mock Prisma
jest.mock('../../prisma/prismaClient.js');

describe('Code Analysis Controller', () => {
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

  describe('analyzeComplexity', () => {
    it('should analyze JavaScript code complexity correctly', async () => {
      const jsCode = `
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
      `;

      mockReq.body = {
        code: jsCode,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: '1',
        userId: '123',
        code: jsCode,
        language: 'javascript',
        timeComplexity: 'O(2^n)',
        spaceComplexity: 'O(n)',
        warnings: ['Exponential time complexity detected'],
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.analysis.timeComplexity).toContain('O(2^n)');
    });

    it('should handle missing code parameter', async () => {
      mockReq.body = {
        language: 'javascript',
      };

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.error).toContain('Code');
    });

    it('should handle missing language parameter', async () => {
      mockReq.body = {
        code: 'const x = 1;',
      };

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.error).toContain('Language');
    });

    it('should reject code exceeding size limit', async () => {
      const largeCode = 'x'.repeat(100001);
      mockReq.body = {
        code: largeCode,
        language: 'javascript',
      };

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(413);
    });

    it('should support multiple programming languages', async () => {
      const languages = ['javascript', 'python', 'java', 'cpp', 'go'];
      
      for (const lang of languages) {
        mockReq.body = {
          code: 'code snippet',
          language: lang,
        };

        prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
          id: '1',
          language: lang,
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(1)',
        });

        await codeAnalysisController.analyzeComplexity(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });

    it('should detect nested loops and warn about quadratic complexity', async () => {
      const nestedLoopCode = `
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            console.log(i * j);
          }
        }
      `;

      mockReq.body = {
        code: nestedLoopCode,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: '1',
        timeComplexity: 'O(n²)',
        warnings: ['Nested loops detected: possible O(n²) complexity'],
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.analysis.warnings).toContain(expect.stringMatching(/O\(n[²2]\)/));
    });

    it('should detect recursive calls and analyze recursion depth', async () => {
      const recursiveCode = `
        function factorial(n) {
          return n <= 1 ? 1 : n * factorial(n - 1);
        }
      `;

      mockReq.body = {
        code: recursiveCode,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockResolvedValue({
        id: '1',
        timeComplexity: 'O(n)',
        warnings: ['Recursive function detected: consider iterative approach'],
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.analysis.warnings).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('injectLogicalBug', () => {
    it('should inject off-by-one bug into loop code', async () => {
      const code = `
        for (let i = 0; i < array.length; i++) {
          console.log(array[i]);
        }
      `;

      mockReq.body = {
        code,
        bugType: 'off-by-one',
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: '1',
        originalCode: code,
        modifiedCode: 'for (let i = 0; i <= array.length; i++)',
        bugType: 'off-by-one',
        explanation: 'Changed < to <= will cause array out of bounds',
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.bugInjection.bugType).toBe('off-by-one');
    });

    it('should inject boundary condition bug', async () => {
      mockReq.body = {
        code: 'if (x > 0) { ... }',
        bugType: 'boundary-condition',
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: '1',
        bugType: 'boundary-condition',
        explanation: 'Changed > to >= changes boundary condition',
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.bugInjection.bugType).toBe('boundary-condition');
    });

    it('should inject null pointer exception bug', async () => {
      mockReq.body = {
        code: 'let value = obj.property;',
        bugType: 'null-pointer',
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: '1',
        bugType: 'null-pointer',
        explanation: 'Missing null check will cause NPE',
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.bugInjection.bugType).toBe('null-pointer');
    });

    it('should inject variable scope bug', async () => {
      mockReq.body = {
        code: 'var x = 1;',
        bugType: 'scope-issue',
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockResolvedValue({
        id: '1',
        bugType: 'scope-issue',
        explanation: 'Using var instead of let/const causes scope pollution',
      });

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.bugInjection.bugType).toBe('scope-issue');
    });

    it('should handle missing code parameter', async () => {
      mockReq.body = {
        bugType: 'off-by-one',
        language: 'javascript',
      };

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle invalid bug type', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        bugType: 'invalid-bug-type',
        language: 'javascript',
      };

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.error).toContain('Invalid');
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        code: 'const x = 1;',
        bugType: 'off-by-one',
        language: 'javascript',
      };

      prisma.bugInjection.create = jest.fn().mockRejectedValue(new Error('DB error'));

      await codeAnalysisController.injectLogicalBug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON input', async () => {
      mockReq.body = null;

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle missing authentication', async () => {
      mockReq.user = null;

      mockReq.body = {
        code: 'const x = 1;',
        language: 'javascript',
      };

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle timeout on large code analysis', async () => {
      const hugeCode = 'x'.repeat(50000);
      mockReq.body = {
        code: hugeCode,
        language: 'javascript',
      };

      prisma.codeAnalysis.create = jest.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      await codeAnalysisController.analyzeComplexity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(408);
    });
  });
});
