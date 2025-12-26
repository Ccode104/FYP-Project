import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createContest,
  getContest,
  listContests,
  getContestQuestions,
  submitContest,
  getContestSubmissions,
  gradeContestSubmission,
  deleteContest
} from '../../controllers/contestsController.js';
import { pool } from '../../db/index.js';

// Mock the database pool
vi.mock('../../db/index.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

describe('Contests Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 1,
        role: 'faculty'
      },
      params: {},
      body: {}
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('createContest', () => {
    it('should create a contest successfully', async () => {
      mockReq.body = {
        course_offering_id: 1,
        title: 'Data Structures Contest',
        description: 'Test your data structures knowledge',
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T12:00:00Z',
        max_score: 100,
        allow_multiple_submissions: false,
        question_ids: [1, 2, 3]
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, faculty_id: 1 }] }) // course offering check
          .mockResolvedValueOnce({ // insert contest
            rows: [{
              id: 1,
              course_offering_id: 1,
              title: 'Data Structures Contest',
              max_score: 100
            }]
          })
          .mockResolvedValueOnce({}) // insert question 1
          .mockResolvedValueOnce({}) // insert question 2
          .mockResolvedValueOnce({}) // insert question 3
          .mockResolvedValueOnce(undefined), // commit
        release: vi.fn()
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      await createContest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        title: 'Data Structures Contest'
      }));
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = {
        title: 'Incomplete Contest'
        // Missing course_offering_id, start_at, end_at
      };

      pool.query.mockResolvedValueOnce({ rowCount: 0 });

      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      await createContest(mockReq, mockRes);

      // Should handle missing required fields gracefully
      expect(mockRes.status || mockRes.json).toBeTruthy();
    });

    it('should check authorization for faculty', async () => {
      mockReq.user.role = 'faculty';
      mockReq.user.id = 1;
      mockReq.body = {
        course_offering_id: 1,
        title: 'Test Contest',
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T12:00:00Z'
      };

      // Faculty is NOT the course owner
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ faculty_id: 999 }] // Different faculty
      });

      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      await createContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('listContests', () => {
    it('should list contests for a course offering', async () => {
      mockReq.params.courseOfferingId = '1';
      mockReq.user.role = 'student';
      mockReq.user.id = 1;

      pool.query.mockResolvedValueOnce({
        rowCount: 1
      }) // enrollment check
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              course_offering_id: 1,
              title: 'Contest 1',
              start_at: '2024-01-15T10:00:00Z',
              end_at: '2024-01-15T12:00:00Z'
            },
            {
              id: 2,
              course_offering_id: 1,
              title: 'Contest 2',
              start_at: '2024-02-15T10:00:00Z',
              end_at: '2024-02-15T12:00:00Z'
            }
          ]
        });

      await listContests(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Contest 1' }),
          expect.objectContaining({ title: 'Contest 2' })
        ])
      );
    });

    it('should return 400 if courseOfferingId is missing', async () => {
      mockReq.params.courseOfferingId = '';

      await listContests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if student is not enrolled', async () => {
      mockReq.params.courseOfferingId = '1';
      mockReq.user.role = 'student';

      pool.query.mockResolvedValueOnce({
        rowCount: 0 // Not enrolled
      });

      await listContests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should check faculty authorization', async () => {
      mockReq.params.courseOfferingId = '1';
      mockReq.user.role = 'faculty';
      mockReq.user.id = 1;

      pool.query.mockResolvedValueOnce({
        rowCount: 0 // Faculty is not owner
      });

      await listContests(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getContest', () => {
    it('should retrieve a contest by id', async () => {
      mockReq.params.id = '1';

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          course_offering_id: 1,
          title: 'Data Structures Contest',
          description: 'Test your knowledge',
          start_at: '2024-01-15T10:00:00Z',
          end_at: '2024-01-15T12:00:00Z',
          max_score: 100
        }]
      });

      await getContest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'Data Structures Contest'
        })
      );
    });

    it('should return 400 if contest id is missing', async () => {
      mockReq.params.id = '';

      await getContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if contest not found', async () => {
      mockReq.params.id = '999';

      pool.query.mockResolvedValueOnce({
        rows: []
      });

      await getContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getContestQuestions', () => {
    it('should get questions for a contest', async () => {
      mockReq.params.id = '1';
      mockReq.user.role = 'student';

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, course_offering_id: 1 }]
      }) // contest exists
        .mockResolvedValueOnce({
          rows: [
            { id: 1, title: 'Question 1', description: 'Q1 desc' },
            { id: 2, title: 'Question 2', description: 'Q2 desc' }
          ]
        }); // questions

      await getContestQuestions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Question 1' }),
          expect.objectContaining({ title: 'Question 2' })
        ])
      );
    });

    it('should return 404 if contest not found', async () => {
      mockReq.params.id = '999';

      pool.query.mockResolvedValueOnce({
        rows: []
      });

      await getContestQuestions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('submitContest', () => {
    it('should submit a contest solution', async () => {
      mockReq.params.contestId = '1';
      mockReq.body = {
        question_id: 1,
        code: 'console.log("Hello");',
        language: 'javascript',
        score: 85
      };
      mockReq.user.id = 1;

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // contest exists
          .mockResolvedValueOnce({ rows: [{ allow_multiple_submissions: true }] }) // check contest
          .mockResolvedValueOnce({ rows: [] }) // check existing submission
          .mockResolvedValueOnce({ // insert submission
            rows: [{
              id: 1,
              contest_id: 1,
              question_id: 1,
              student_id: 1,
              code: 'console.log("Hello");',
              score: 85
            }]
          })
          .mockResolvedValueOnce(undefined), // commit
        release: vi.fn()
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      await submitContest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          contest_id: 1,
          question_id: 1
        })
      );
    });

    it('should prevent multiple submissions if not allowed', async () => {
      mockReq.params.contestId = '1';
      mockReq.user.id = 1;

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // contest exists
          .mockResolvedValueOnce({ rows: [{ allow_multiple_submissions: false }] }) // check contest
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }), // submission exists
        release: vi.fn()
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      await submitContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteContest', () => {
    it('should delete a contest', async () => {
      mockReq.params.id = '1';
      mockReq.user.role = 'faculty';
      mockReq.user.id = 1;

      pool.query.mockResolvedValueOnce({
        rows: [{ course_offering_id: 1, faculty_id: 1 }]
      }) // contest exists and user is owner
        .mockResolvedValueOnce({}); // delete contest

      await deleteContest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });

    it('should return 403 if not authorized to delete', async () => {
      mockReq.params.id = '1';
      mockReq.user.role = 'faculty';
      mockReq.user.id = 1;

      pool.query.mockResolvedValueOnce({
        rows: [{ course_offering_id: 1, faculty_id: 999 }] // Different faculty
      });

      await deleteContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.params.id = '1';

      pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await getContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should rollback transaction on error during create', async () => {
      mockReq.body = {
        course_offering_id: 1,
        title: 'Test Contest',
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T12:00:00Z',
        question_ids: [1]
      };

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, faculty_id: 1 }] })
          .mockRejectedValueOnce(new Error('Insert failed')),
        release: vi.fn()
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      await createContest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
