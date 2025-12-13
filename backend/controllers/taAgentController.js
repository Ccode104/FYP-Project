import { initializeTAAgent } from '../agents/taAgents.js';
import { logger } from '../utils/logger.js';

// Initialize the TA agent
let taAgent = null;
(async () => {
  try {
    taAgent = await initializeTAAgent();
  } catch (error) {
    console.error('Failed to initialize TA agent:', error);
  }
})();

/* ------------------------------------------------------------------
 * 🤖 TA AGENT CHAT FOR ASSIGNMENT EVALUATION
 * POST /api/ta/agent/chat
 * Body: { message: string, context: { submissionId?, assignmentId?, courseId?, action? } }
 * ------------------------------------------------------------------ */
export async function chatWithTAAgent(req, res) {
  try {
    const { message, context = {} } = req.body;
    const userId = req.user?.id;

    logger.info('TA Agent request', {
      userId,
      messageLength: message?.length,
      context
    });

    if (!message) {
      logger.warn('TA Agent request missing message', { userId });
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!taAgent) {
      logger.error('TA agent not initialized');
      return res.status(500).json({ error: 'TA agent not initialized' });
    }

    // Build context-aware prompt
    let contextInfo = '';
    if (context.submissionId) {
      contextInfo += `Submission ID: ${context.submissionId}\n`;
    }
    if (context.assignmentId) {
      contextInfo += `Assignment ID: ${context.assignmentId}\n`;
    }
    if (context.courseId) {
      contextInfo += `Course ID: ${context.courseId}\n`;
    }
    if (context.action) {
      contextInfo += `Requested Action: ${context.action}\n`;
    }

    // Prepare input for the agent
    const agentInput = `${contextInfo}
User Role: Teaching Assistant
User ID: ${userId}

User Request: ${message}

As a TA evaluation assistant, help with:
- Analyzing assignment submissions
- Generating viva questions
- Creating debugging exercises
- Providing grading suggestions
- Analyzing code quality
- Offering evaluation insights

Please use the available tools to provide comprehensive assistance for assignment evaluation and student assessment.`;

    // Call the agent
    const result = await taAgent.call({
      input: agentInput,
    });

    const reply = result.output || 'Sorry, I could not generate a response.';

    logger.info('TA Agent response generated', {
      userId,
      replyLength: reply.length
    });

    res.json({
      reply,
      timestamp: new Date().toISOString(),
      context: context
    });
  } catch (err) {
    logger.error('chatWithTAAgent error:', err, { userId: req.user?.id });
    res
      .status(500)
      .json({ error: 'Failed to process TA agent request', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 📊 GET TA AGENT SUGGESTIONS FOR SUBMISSION
 * GET /api/ta/agent/suggestions/:submissionId
 * ------------------------------------------------------------------ */
export async function getTAAgentSuggestions(req, res) {
  try {
    const { submissionId } = req.params;
    const { type = 'comprehensive' } = req.query; // comprehensive, grading, viva, debug

    if (!taAgent) {
      return res.status(500).json({ error: 'TA agent not initialized' });
    }

    let prompt = '';
    switch (type) {
    case 'grading':
      prompt = `Analyze submission ${submissionId} and provide detailed grading suggestions with rubric and feedback points.`;
      break;
    case 'viva':
      prompt = `Based on submission ${submissionId}, generate 5 viva questions at different difficulty levels.`;
      break;
    case 'debug':
      prompt = `Create debugging questions and scenarios based on submission ${submissionId}.`;
      break;
    case 'quality':
      prompt = `Analyze code quality and provide improvement suggestions for submission ${submissionId}.`;
      break;
    default:
      prompt = `Provide comprehensive evaluation assistance for submission ${submissionId}, including grading suggestions, viva questions, and code analysis.`;
    }

    const agentInput = `Submission ID: ${submissionId}
Requested Analysis Type: ${type}

${prompt}

Please use the appropriate tools to provide detailed, actionable suggestions for the TA.`;

    const result = await taAgent.call({
      input: agentInput,
    });

    const suggestions = result.output || 'Unable to generate suggestions.';

    res.json({
      submissionId,
      type,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('getTAAgentSuggestions error:', err);
    res.status(500).json({ error: 'Failed to get suggestions', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 🎯 GENERATE VIVA QUESTIONS FOR ASSIGNMENT
 * POST /api/ta/agent/viva-questions
 * Body: { assignmentId: number, difficulty: string, count: number }
 * ------------------------------------------------------------------ */
export async function generateVivaQuestions(req, res) {
  try {
    const { assignmentId, difficulty = 'medium', count = 5 } = req.body;

    if (!taAgent) {
      return res.status(500).json({ error: 'TA agent not initialized' });
    }

    const agentInput = `Assignment ID: ${assignmentId}
Task: Generate ${count} viva questions at ${difficulty} difficulty level.

Use the viva_question_generator tool to create appropriate questions for this assignment.`;

    const result = await taAgent.call({
      input: agentInput,
    });

    const questions = result.output || 'Failed to generate viva questions.';

    res.json({
      assignmentId,
      difficulty,
      count,
      questions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('generateVivaQuestions error:', err);
    res.status(500).json({ error: 'Failed to generate viva questions', details: err.message });
  }
}

/* ------------------------------------------------------------------
 * 🐛 GENERATE DEBUGGING QUESTIONS
 * POST /api/ta/agent/debug-questions
 * Body: { submissionId: number, questionType: string }
 * ------------------------------------------------------------------ */
export async function generateDebugQuestions(req, res) {
  try {
    const { submissionId, questionType = 'bug_identification' } = req.body;

    if (!taAgent) {
      return res.status(500).json({ error: 'TA agent not initialized' });
    }

    const agentInput = `Submission ID: ${submissionId}
Task: Generate debugging questions of type "${questionType}".

Use the code_debug_generator tool to create appropriate debugging questions for this code submission.`;

    const result = await taAgent.call({
      input: agentInput,
    });

    const questions = result.output || 'Failed to generate debugging questions.';

    res.json({
      submissionId,
      questionType,
      questions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('generateDebugQuestions error:', err);
    res.status(500).json({ error: 'Failed to generate debugging questions', details: err.message });
  }
}