import { Tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { pool } from "../db/index.js";

// Initialize Groq client
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey || groqApiKey === "gsk_your_api_key_here") {
  console.warn("⚠️  WARNING: GROQ_API_KEY not set. TA agents will not work.");
}

const llm = new ChatGroq({
  apiKey: groqApiKey || "gsk_your_api_key_here",
  modelName: "llama-3.3-70b-versatile",
  temperature: 0.7,
  maxTokens: 1024,
});

// Tool 1: Assignment Submission Analyzer
class AssignmentAnalyzerTool extends Tool {
  name = "assignment_analyzer";
  description = "Analyze a specific assignment submission to understand student work, identify strengths/weaknesses, and provide grading insights. Input should be a JSON string with 'submissionId'.";

  async _call(input) {
    try {
      const { submissionId } = JSON.parse(input);

      // Get submission details
      const submissionQuery = `
        SELECT
          s.id,
          s.submitted_at,
          s.final_score,
          s.comments,
          s.attempt,
          a.title as assignment_title,
          a.description as assignment_description,
          a.max_score,
          a.assignment_type,
          u.name as student_name,
          u.email as student_email,
          co.course_code,
          co.course_title,
          cs.language,
          cs.code,
          cs.run_output,
          cs.test_results
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        JOIN course_offerings co ON a.offering_id = co.id
        LEFT JOIN code_submissions cs ON cs.submission_id = s.id
        WHERE s.id = $1
      `;

      const submissionResult = await pool.query(submissionQuery, [submissionId]);
      if (submissionResult.rowCount === 0) {
        return "Submission not found.";
      }

      const submission = submissionResult.rows[0];

      let analysis = `Assignment: ${submission.assignment_title}
Student: ${submission.student_name} (${submission.student_email})
Course: ${submission.course_code} - ${submission.course_title}
Submitted: ${new Date(submission.submitted_at).toLocaleString()}
Attempt: ${submission.attempt}
Max Score: ${submission.max_score}

`;

      if (submission.assignment_type === 'code') {
        analysis += `Code Submission Analysis:
Language: ${submission.language || 'Not specified'}

Code:
${submission.code || 'No code submitted'}

Run Output:
${submission.run_output || 'No output available'}

Test Results:
${submission.test_results ? JSON.stringify(submission.test_results, null, 2) : 'No test results available'}
`;
      } else {
        // For non-code assignments, we'd need to get file content
        analysis += `Assignment Type: ${submission.assignment_type}
Description: ${submission.assignment_description || 'No description available'}
`;
      }

      if (submission.final_score) {
        analysis += `
Current Grade: ${submission.final_score}/${submission.max_score}
Grader Comments: ${submission.comments || 'No comments'}
`;
      }

      return analysis;
    } catch (error) {
      console.error("AssignmentAnalyzerTool error:", error);
      return "Error analyzing assignment submission.";
    }
  }
}

// Tool 2: Viva Question Generator
class VivaQuestionGeneratorTool extends Tool {
  name = "viva_question_generator";
  description = "Generate viva (oral examination) questions based on assignment content, course material, or specific topics. Input should be a JSON string with 'assignmentId', 'difficulty' (easy/medium/hard), and 'count' (number of questions).";

  async _call(input) {
    try {
      const { assignmentId, difficulty = 'medium', count = 5 } = JSON.parse(input);

      // Get assignment details
      const assignmentQuery = `
        SELECT
          a.title,
          a.description,
          a.assignment_type,
          co.course_code,
          co.course_title,
          cs.language,
          cs.code
        FROM assignments a
        JOIN course_offerings co ON a.offering_id = co.id
        LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
        LEFT JOIN code_questions cq ON aq.question_id = cq.id
        LEFT JOIN code_submissions cs ON cs.assignment_question_id = aq.id
        WHERE a.id = $1
        LIMIT 1
      `;

      const assignmentResult = await pool.query(assignmentQuery, [assignmentId]);
      const assignment = assignmentResult.rows[0];

      if (!assignment) {
        return "Assignment not found.";
      }

      const context = `
Assignment: ${assignment.title}
Course: ${assignment.course_code} - ${assignment.course_title}
Type: ${assignment.assignment_type}
Description: ${assignment.description || 'No description available'}
${assignment.code ? `Sample Code:\n${assignment.code}` : ''}
Language: ${assignment.language || 'Not specified'}
      `;

      // Generate questions based on difficulty and context
      const difficultyPrompts = {
        easy: "basic concepts, fundamental understanding, simple explanations",
        medium: "intermediate concepts, practical applications, problem-solving approaches",
        hard: "advanced concepts, optimization, edge cases, complex scenarios"
      };

      const prompt = `Based on this assignment context, generate ${count} viva (oral examination) questions at ${difficulty} level focusing on ${difficultyPrompts[difficulty]}.

Context:
${context}

Generate questions that would test the student's understanding of the concepts, their ability to explain solutions, and their grasp of the subject matter. Include a mix of conceptual questions, problem-solving questions, and practical application questions.

Format each question with:
1. Question number
2. Question text
3. Expected answer type (conceptual/explanation/practical/problem-solving)
4. Key points to evaluate in the answer

Questions:`;

      // Use LLM to generate questions
      const response = await llm.invoke(prompt);
      return response.content || "Failed to generate viva questions.";
    } catch (error) {
      console.error("VivaQuestionGeneratorTool error:", error);
      return "Error generating viva questions.";
    }
  }
}

// Tool 3: Code Debugging Question Generator
class CodeDebugQuestionGeneratorTool extends Tool {
  name = "code_debug_generator";
  description = "Generate debugging questions and scenarios based on code submissions. Input should be a JSON string with 'submissionId' and 'questionType' (bug_identification/fix_explanation/optimization/improvement).";

  async _call(input) {
    try {
      const { submissionId, questionType = 'bug_identification' } = JSON.parse(input);

      // Get code submission
      const codeQuery = `
        SELECT
          cs.code,
          cs.language,
          cs.run_output,
          cs.test_results,
          a.title as assignment_title,
          a.description as assignment_description,
          u.name as student_name
        FROM code_submissions cs
        JOIN assignment_submissions s ON cs.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        WHERE cs.submission_id = $1
      `;

      const codeResult = await pool.query(codeQuery, [submissionId]);
      if (codeResult.rowCount === 0) {
        return "Code submission not found.";
      }

      const submission = codeResult.rows[0];

      const questionTypes = {
        bug_identification: "Identify bugs, errors, or logical issues in the code",
        fix_explanation: "Explain how to fix identified problems and why the fix works",
        optimization: "Suggest performance improvements and code optimizations",
        improvement: "Recommend best practices, code quality improvements, and alternative approaches"
      };

      const prompt = `Analyze this student's code submission and generate debugging questions focused on ${questionTypes[questionType]}.

Assignment: ${submission.assignment_title}
Student: ${submission.student_name}
Language: ${submission.language}

Code:
${submission.code}

Run Output:
${submission.run_output || 'No output available'}

Test Results:
${submission.test_results ? JSON.stringify(submission.test_results, null, 2) : 'No test results available'}

Generate 3-5 specific questions that would help evaluate the student's debugging skills, understanding of the code, and ability to identify and explain issues. Include the expected answers or evaluation criteria for each question.

Format as:
1. Question: [question text]
   Expected Evaluation: [what to look for in the answer]

Questions:`;

      const response = await llm.invoke(prompt);
      return response.content || "Failed to generate debugging questions.";
    } catch (error) {
      console.error("CodeDebugQuestionGeneratorTool error:", error);
      return "Error generating code debugging questions.";
    }
  }
}

// Tool 4: Grading Suggestion Tool
class GradingSuggestionTool extends Tool {
  name = "grading_suggester";
  description = "Provide grading suggestions and rubrics based on assignment requirements and student performance. Input should be a JSON string with 'submissionId' and 'rubricType' (detailed/brief/conceptual).";

  async _call(input) {
    try {
      const { submissionId, rubricType = 'detailed' } = JSON.parse(input);

      // Get submission and assignment details
      const detailsQuery = `
        SELECT
          s.final_score,
          s.comments,
          a.title,
          a.description,
          a.max_score,
          a.assignment_type,
          co.course_code,
          co.course_title,
          u.name as student_name,
          cs.code,
          cs.run_output,
          cs.test_results
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN course_offerings co ON a.offering_id = co.id
        JOIN users u ON s.student_id = u.id
        LEFT JOIN code_submissions cs ON cs.submission_id = s.id
        WHERE s.id = $1
      `;

      const detailsResult = await pool.query(detailsQuery, [submissionId]);
      if (detailsResult.rowCount === 0) {
        return "Submission not found.";
      }

      const submission = detailsResult.rows[0];

      const rubricLevels = {
        detailed: "comprehensive rubric with specific criteria and point breakdowns",
        brief: "concise rubric with main categories",
        conceptual: "concept-focused rubric emphasizing understanding over mechanics"
      };

      const prompt = `Create a ${rubricLevels[rubricType]} grading rubric for this assignment submission.

Assignment: ${submission.title}
Course: ${submission.course_code} - ${submission.course_title}
Student: ${submission.student_name}
Max Score: ${submission.max_score}
Assignment Type: ${submission.assignment_type}

${submission.code ? `Student Code:\n${submission.code}\n\nRun Output:\n${submission.run_output || 'No output'}` : ''}

Current Grade: ${submission.final_score || 'Not graded'}
Current Comments: ${submission.comments || 'No comments'}

Based on the assignment requirements and student work, provide:
1. Grading rubric with categories and point allocations
2. Specific feedback suggestions for different performance levels
3. Areas of strength and improvement opportunities
4. Suggested grade range with justification

Rubric:`;

      const response = await llm.invoke(prompt);
      return response.content || "Failed to generate grading suggestions.";
    } catch (error) {
      console.error("GradingSuggestionTool error:", error);
      return "Error generating grading suggestions.";
    }
  }
}

// Tool 5: Code Quality Analyzer
class CodeQualityAnalyzerTool extends Tool {
  name = "code_quality_analyzer";
  description = "Analyze code quality, style, best practices, and provide improvement suggestions. Input should be a JSON string with 'submissionId'.";

  async _call(input) {
    try {
      const { submissionId } = JSON.parse(input);

      // Get code submission
      const codeQuery = `
        SELECT
          cs.code,
          cs.language,
          cs.run_output,
          a.title as assignment_title,
          u.name as student_name
        FROM code_submissions cs
        JOIN assignment_submissions s ON cs.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        WHERE cs.submission_id = $1
      `;

      const codeResult = await pool.query(codeQuery, [submissionId]);
      if (codeResult.rowCount === 0) {
        return "Code submission not found.";
      }

      const submission = codeResult.rows[0];

      const prompt = `Analyze this code submission for quality, style, and best practices.

Assignment: ${submission.assignment_title}
Student: ${submission.student_name}
Language: ${submission.language}

Code:
${submission.code}

Run Output:
${submission.run_output || 'No output available'}

Provide a comprehensive code quality analysis covering:
1. Code structure and organization
2. Naming conventions and readability
3. Best practices and patterns
4. Potential bugs or issues
5. Performance considerations
6. Maintainability and extensibility
7. Specific improvement suggestions with code examples

Analysis:`;

      const response = await llm.invoke(prompt);
      return response.content || "Failed to analyze code quality.";
    } catch (error) {
      console.error("CodeQualityAnalyzerTool error:", error);
      return "Error analyzing code quality.";
    }
  }
}

// Create the TA agent
let taAgentExecutor = null;

async function initializeTAAgent() {
  if (taAgentExecutor) return taAgentExecutor;

  const tools = [
    new AssignmentAnalyzerTool(),
    new VivaQuestionGeneratorTool(),
    new CodeDebugQuestionGeneratorTool(),
    new GradingSuggestionTool(),
    new CodeQualityAnalyzerTool()
  ];

  try {
    const prompt = await pull("hwchase17/react");

    const agent = await createReactAgent({
      llm,
      tools,
      prompt,
    });

    taAgentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: process.env.NODE_ENV === 'development',
      maxIterations: 5,
      returnIntermediateSteps: false,
    });

    return taAgentExecutor;
  } catch (error) {
    console.error("Failed to initialize TA agent:", error);
    throw error;
  }
}

export { initializeTAAgent };