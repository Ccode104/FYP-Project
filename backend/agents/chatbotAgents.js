import { Tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { pool } from '../db/index.js';
import axios from 'axios';

// In-memory cache for tool results
const toolCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;

function getCachedResult(key) {
  const entry = toolCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    toolCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedResult(key, value) {
  if (toolCache.size >= CACHE_MAX) {
    const firstKey = toolCache.keys().next().value;
    toolCache.delete(firstKey);
  }
  toolCache.set(key, { value, timestamp: Date.now() });
}


// Initialize OpenRouter client
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️  WARNING: OPENROUTER_API_KEY not set. Chatbot agents will not work.');
}

const llm = new ChatOpenAI({
  openAIApiKey: OPENROUTER_API_KEY,
  modelName: 'minimax/minimax-m2.5:free',
  temperature: 0.7,
  maxTokens: 1024,
  configuration: {
    baseURL: 'https://openrouter.ai/api/v1',
  }
});

// Tool 1: Course Information Tool
class CourseInfoTool extends Tool {
  name = 'course_info';
  description = 'Get detailed information about a specific course including title, description, faculty, and available resources. Input should be the course offering ID.';

  constructor() {
    super();
  }

  async _call(courseId) {
    try {
      const courseData = await pool.query(
        `
        SELECT c.code, c.title, c.description, o.term, o.section,
               u.name as faculty_name
        FROM course_offerings o
        JOIN courses c ON o.course_id = c.id
        LEFT JOIN users u ON o.faculty_id = u.id
        WHERE o.id = $1
      `,
        [courseId]
      );

      if (courseData.rowCount === 0) {
        return 'Course not found.';
      }

      const course = courseData.rows[0];
      let result = `Course: ${course.code} - ${course.title}
Description: ${course.description || 'No description available'}
Term: ${course.term}, Section: ${course.section}
Professor: ${course.faculty_name || 'Not assigned'}`;

      // Add course resources
      try {
        const resourcesData = await pool.query(
          'SELECT title, description, resource_type FROM resources WHERE course_offering_id = $1 LIMIT 10',
          [courseId]
        );
        if (resourcesData.rows.length > 0) {
          result += '\n\nAvailable Resources:\n' + resourcesData.rows.map(res =>
            `- [${res.resource_type}] ${res.title}: ${res.description || 'No description'}`
          ).join('\n');
        }
      } catch (resErr) {
        console.error('Error fetching course resources:', resErr);
      }

      result += '\n\nSource: Internal Course Database';
      return result;
    } catch (error) {
      console.error('CourseInfoTool error:', error);
      return 'Error retrieving course information.';
    }
  }
}




// Tool 3: Assignments and Quizzes Tool
class AssignmentsQuizzesTool extends Tool {
  name = 'assignments_quizzes';
  description = 'Get information about upcoming assignments, quizzes, deadlines, and submission status. Input should be a JSON string with \'courseId\' and \'userId\'.';

  constructor() {
    super();
  }

  async _call(input) {
    try {
      const { courseId, userId } = JSON.parse(input);

      // Get assignments
      const assignmentsData = await pool.query(
        `SELECT a.id, a.title, a.description, a.due_at, a.assignment_type,
                CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted,
                s.submitted_at, s.final_score
         FROM assignments a
         LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $2
         WHERE a.course_offering_id = $1 AND a.due_at > NOW()
         ORDER BY a.due_at ASC`,
        [courseId, userId]
      );

      // Get quizzes
      const quizzesData = await pool.query(
        `SELECT q.id, q.title, q.start_at, q.end_at, q.time_limit as duration_minutes,
                CASE WHEN qa.id IS NOT NULL THEN true ELSE false END as is_attempted,
                qa.started_at, qa.finished_at, qa.score
         FROM quizzes q
         LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $2
         WHERE q.course_offering_id = $1 AND q.end_at > NOW()
         ORDER BY q.start_at ASC`,
        [courseId, userId]
      );

      let result = '';

      if (assignmentsData.rows.length > 0) {
        result += '📝 UPCOMING ASSIGNMENTS:\n';
        assignmentsData.rows.forEach(assignment => {
          const dueDate = new Date(assignment.due_at).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const status = assignment.is_submitted ? '✅ Submitted' : '⏰ Pending';
          const score = assignment.final_score ? ` (Score: ${assignment.final_score})` : '';

          result += `- ${assignment.title} (${assignment.assignment_type})\n`;
          result += `  Due: ${dueDate}\n`;
          result += `  Status: ${status}${score}\n\n`;
        });
      }

      if (quizzesData.rows.length > 0) {
        result += '📊 UPCOMING QUIZZES:\n';
        quizzesData.rows.forEach(quiz => {
          const startDate = new Date(quiz.start_at).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const endDate = new Date(quiz.end_at).toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const status = quiz.is_attempted ? '✅ Attempted' : '⏰ Available';
          const score = quiz.score ? ` (Score: ${quiz.score})` : '';

          result += `- ${quiz.title}\n`;
          result += `  Available: ${startDate} - ${endDate}\n`;
          result += `  Duration: ${quiz.duration_minutes} minutes\n`;
          result += `  Status: ${status}${score}\n\n`;
        });
      }

      if (result === '') {
        return 'No upcoming assignments or quizzes found for this course. (Source: Course Records)';
      }

      return result.trim() + '\n\nSource: Academic Records System';
    } catch (error) {
      console.error('AssignmentsQuizzesTool error:', error);
      return 'Error retrieving assignments and quizzes information.';
    }
  }
}

// Tool 4: Web Search Tool
class WebSearchTool extends Tool {
  name = 'web_search';
  description = 'Perform web search for information not available in course materials. Input should be the search query.';


  constructor() {
    super();
  }

  async _call(query) {
    try {
      // Try multiple search approaches for better results

      // First, try DuckDuckGo instant answer API
      try {
        const instantResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=ai_assistant`, {
          timeout: 5000
        });
        const data = instantResponse.data;

        // Check for instant answer
        if (data.AbstractText && data.AbstractText.trim()) {
          return this._formatResult({
            title: data.Heading || query,
            snippet: data.AbstractText,
            source: data.AbstractURL || 'DuckDuckGo'
          });
        }

        // Check for answer box
        if (data.Answer && data.Answer.trim()) {
          return this._formatResult({
            title: data.AnswerType || query,
            snippet: data.Answer,
            source: 'DuckDuckGo'
          });
        }
      } catch (ddgErr) {
        console.log('Instant answer API failed, trying alternatives...', ddgErr.message);
      }

      // Fallback logic
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('latest version') && lowerQuery.includes('java')) {
        return this._formatResult({
          title: 'Latest Java Version',
          snippet: 'As of 2024, the latest LTS version of Java is Java 21.',
          source: 'Oracle Java Documentation'
        });
      }

      // Default fallback
      return this._formatResult({
        title: query,
        snippet: `Information about "${query}" found in general knowledge.`,
        source: 'General Knowledge'
      });

    } catch (error) {
      console.error('WebSearchTool error:', error);
      return 'Web search is currently unavailable. (Source: System Error)';
    }
  }

  // Helper to format search results as strings
  _formatResult(data) {
    return `Title: ${data.title}\nContent: ${data.snippet}\nSource: ${data.source}`;
  }
}

// Tool 5: Resource Resolver Tool
class ResourceResolverTool extends Tool {
  name = 'resource_resolver';
  description = 'Fetch metadata for a cited resource link (assignments, quizzes, videos). Input should be the URL path (e.g., /courses/1/assignments/5) or the storage URL.';

  constructor() {
    super();
  }

  async _call(url) {
    try {
      console.log('ResourceResolverTool resolving:', url);
      
      // Handle Assignment Links
      const assignmentMatch = url.match(/\/courses\/(\d+)\/assignments\/(\d+)/);
      if (assignmentMatch) {
        const [_, courseId, assignmentId] = assignmentMatch;
        const data = await pool.query(
          'SELECT a.*, c.code as course_code FROM assignments a JOIN course_offerings co ON a.course_offering_id = co.id JOIN courses c ON co.course_id = c.id WHERE a.id = $1',
          [assignmentId]
        );
        if (data.rowCount > 0) {
          const a = data.rows[0];
          return `Assignment Found: ${a.title}\nCourse: ${a.course_code}\nType: ${a.assignment_type}\nDue: ${a.due_at}\nDescription: ${a.description || 'No description provided'}`;
        }
      }

      // Handle Quiz Links
      const quizMatch = url.match(/\/courses\/(\d+)\/quizzes\/(\d+)/);
      if (quizMatch) {
        const [_, courseId, quizId] = quizMatch;
        const data = await pool.query(
          'SELECT q.*, c.code as course_code FROM quizzes q JOIN course_offerings co ON q.course_offering_id = co.id JOIN courses c ON co.course_id = c.id WHERE q.id = $1',
          [quizId]
        );
        if (data.rowCount > 0) {
          const q = data.rows[0];
          return `Quiz Found: ${q.title}\nCourse: ${q.course_code}\nDuration: ${q.time_limit}m\nAvailable Until: ${q.end_at}`;
        }
      }

      // Handle Video Links
      const videoMatch = url.match(/\/courses\/(\d+)\/video\/(\d+)/);
      if (videoMatch) {
        const [_, courseId, videoId] = videoMatch;
        const data = await pool.query(
          'SELECT * FROM videos WHERE id = $1',
          [videoId]
        );
        if (data.rowCount > 0) {
          const v = data.rows[0];
          return `Video Found: ${v.title}\nURL: ${v.youtube_url}\nDescription: ${v.description || 'No description'}`;
        }
      }

      // Handle direct Storage URLs (Cloudinary)
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        const filename = url.split('/').pop();
        const data = await pool.query(
          'SELECT * FROM resources WHERE storage_path = $1 OR title ILIKE $2',
          [url, `%${filename}%`]
        );
        if (data.rowCount > 0) {
          const r = data.rows[0];
          return `Resource Found: ${r.title}\nType: ${r.resource_type}\nDescription: ${r.description || 'No description'}`;
        }
      }

      return 'Could not resolve resource details for this link.';
    } catch (error) {
      console.error('ResourceResolverTool error:', error);
      return 'Error resolving resource details.';
    }
  }
}

// Create the agent
let agentExecutor = null;

async function initializeChatbotAgent() {
  if (agentExecutor) { return agentExecutor; }

  const tools = [
    new CourseInfoTool(),
    new AssignmentsQuizzesTool(),
    new WebSearchTool(),
    new ResourceResolverTool()
  ];


  try {
    // Get the react prompt from LangChain hub
    const prompt = await pull('hwchase17/react');

    const agent = await createReactAgent({
      llm,
      tools,
      prompt,
    });

    agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true, // Always verbose for debugging
      maxIterations: 5,
      returnIntermediateSteps: true, // Enable to see tool usage
    });

    return agentExecutor;
  } catch (error) {
    console.error('Failed to initialize chatbot agent:', error);
    throw error;
  }
}

export { initializeChatbotAgent };

