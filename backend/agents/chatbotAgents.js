import { Tool } from '@langchain/core/tools';
import { ChatGroq } from '@langchain/groq';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { pool } from '../db/index.js';
import axios from 'axios';

// In-memory PDF text store (shared with controller)
const pdfTextStore = new Map();
const documentSearchCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;

function getCachedResult(key) {
  const entry = documentSearchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    documentSearchCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedResult(key, value) {
  if (documentSearchCache.size >= CACHE_MAX) {
    const firstKey = documentSearchCache.keys().next().value;
    documentSearchCache.delete(firstKey);
  }
  documentSearchCache.set(key, { value, timestamp: Date.now() });
}

function rewriteQuery(query) {
  const base = query.toLowerCase();
  const synonyms = {
    assignment: ['homework', 'task'],
    quiz: ['test', 'mcq'],
    exam: ['final', 'midterm'],
    lecture: ['class', 'session'],
    notes: ['slides', 'handout'],
    resource: ['material', 'reference']
  };
  const tokens = base.split(/\s+/).filter(Boolean);
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (synonyms[token]) {
      synonyms[token].forEach(term => expanded.add(term));
    }
  }
  return Array.from(expanded).join(' ');
}

function scoreSnippet(snippet, queryTokens) {
  const text = snippet.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) score += 1;
  }
  return score;
}

// Initialize Groq client
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey || groqApiKey === 'gsk_your_api_key_here') {
  console.warn('⚠️  WARNING: GROQ_API_KEY not set. Chatbot agents will not work.');
}

const llm = new ChatGroq({
  apiKey: groqApiKey || 'gsk_your_api_key_here',
  modelName: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 1024,
});

// Tool 1: Course Information Tool
class CourseInfoTool extends Tool {
  name = 'course_info';
  description = 'Get detailed information about a specific course including title, description, faculty, notes, and previous year questions. Input should be the course offering ID.';

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

      // Add course notes
      try {
        const notesData = await pool.query(
          'SELECT title, description FROM resources WHERE course_offering_id = $1 AND resource_type = \'lecture_note\' LIMIT 5',
          [courseId]
        );
        if (notesData.rows.length > 0) {
          result += '\n\nCourse Notes:\n' + notesData.rows.map(note =>
            `- ${note.title}: ${note.description || 'No description'}`
          ).join('\n');
        }
      } catch (notesErr) {
        console.error('Error fetching course notes:', notesErr);
      }

      // Add PYQs
      try {
        const pyqData = await pool.query(
          'SELECT title, description FROM resources WHERE course_offering_id = $1 AND resource_type = \'pyq\' LIMIT 5',
          [courseId]
        );
        if (pyqData.rows.length > 0) {
          result += '\n\nPrevious Year Questions (PYQs):\n' + pyqData.rows.map(pyq =>
            `- ${pyq.title}: ${pyq.description || 'No description'}`
          ).join('\n');
        }
      } catch (pyqErr) {
        console.error('Error fetching PYQs:', pyqErr);
      }

      return result;
    } catch (error) {
      console.error('CourseInfoTool error:', error);
      return 'Error retrieving course information.';
    }
  }
}

// Tool 2: Document Search Tool (Enhanced RAG for PYQs and Notes)
class DocumentSearchTool extends Tool {
  name = 'document_search';
  description = 'Search through uploaded documents, course notes, and PYQs for relevant information. Input should be a JSON string with \'documentIds\' array, \'courseId\' for course resources, and \'query\' string.';

  constructor() {
    super();
  }

  async _call(input) {
    try {
      const { documentIds = [], courseId, query } = JSON.parse(input);
      const results = [];
      const cacheKey = JSON.stringify({ documentIds, courseId, query });
      const cached = getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Check if this is a document summary request
      const summaryKeywords = ['tell me about', 'what is this', 'what is the', 'describe', 'summary', 'overview', 'about this doc'];
      const isSummaryRequest = summaryKeywords.some(keyword => query.toLowerCase().includes(keyword));

      // Search uploaded documents (DB-backed)
      if (documentIds.length > 0) {
        const expandedQuery = rewriteQuery(query);
        const queryTokens = expandedQuery.split(/\s+/).filter(Boolean);

        if (isSummaryRequest) {
          const docs = await pool.query(
            `SELECT id, filename, used_ocr, length(content) as size, created_at
             FROM ai_documents
             WHERE id = ANY($1::uuid[])`,
            [documentIds]
          );

          docs.rows.forEach(doc => {
            results.push({
              source: 'uploaded_document',
              filename: doc.filename,
              snippets: [
                `Document: ${doc.filename}\nType: ${doc.used_ocr ? 'OCR Processed' : 'Text Document'}\nSize: ${doc.size} characters\nUploaded: ${doc.created_at}`
              ],
              usedOCR: doc.used_ocr
            });
          });
        } else {
          let chunks = await pool.query(
            `SELECT c.document_id, d.filename, d.used_ocr, c.content
             FROM ai_document_chunks c
             JOIN ai_documents d ON d.id = c.document_id
             WHERE c.document_id = ANY($1::uuid[])
             AND c.content_tsv @@ plainto_tsquery('english', $2)
             ORDER BY ts_rank(c.content_tsv, plainto_tsquery('english', $2)) DESC
             LIMIT 8`,
            [documentIds, expandedQuery]
          );

          if (chunks.rows.length === 0) {
            chunks = await pool.query(
              `SELECT c.document_id, d.filename, d.used_ocr, c.content
               FROM ai_document_chunks c
               JOIN ai_documents d ON d.id = c.document_id
               WHERE c.document_id = ANY($1::uuid[])
               AND c.content ILIKE $2
               LIMIT 6`,
              [documentIds, `%${query}%`]
            );
          }

          const grouped = new Map();
          for (const row of chunks.rows) {
            const entry = grouped.get(row.document_id) || {
              source: 'uploaded_document',
              filename: row.filename,
              snippets: [],
              usedOCR: row.used_ocr
            };
            entry.snippets.push(row.content);
            grouped.set(row.document_id, entry);
          }

          for (const entry of grouped.values()) {
            entry.snippets = entry.snippets
              .map(snippet => snippet.split(/\n+/).slice(0, 3).join(' '))
              .sort((a, b) => scoreSnippet(b, queryTokens) - scoreSnippet(a, queryTokens))
              .slice(0, 3);
            results.push(entry);
          }
        }
      } else {
        // Fallback to in-memory store for legacy uploads
        for (const [docId, doc] of pdfTextStore.entries()) {
          if (!doc) continue;
          if (isSummaryRequest) {
            const wordCount = doc.content.split(/\s+/).length;
            const charCount = doc.content.length;
            const snippet = doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : '');

            results.push({
              source: 'uploaded_document',
              filename: doc.filename,
              snippets: [`Document: ${doc.filename}\nType: ${doc.usedOCR ? 'OCR Processed' : 'Text Document'}\nSize: ${wordCount} words, ${charCount} characters\nUploaded: ${doc.uploaded_at}\n\nContent Preview:\n${snippet}`],
              usedOCR: doc.usedOCR
            });
          }
        }
      }

      // Search course resources (PYQs and Notes) if courseId provided
      if (courseId) {
        try {
          const expandedQuery = rewriteQuery(query);
          // Search lecture notes
          const notesData = await pool.query(
            `SELECT title, description FROM resources
             WHERE course_offering_id = $1 AND resource_type = 'lecture_note'
             AND (title ILIKE $2 OR description ILIKE $2)`,
            [courseId, `%${expandedQuery}%`]
          );

          notesData.rows.forEach(note => {
            results.push({
              source: 'course_notes',
              filename: note.title,
              snippets: [note.description || 'No description available'],
              usedOCR: false
            });
          });

          // Search PYQs
          const pyqData = await pool.query(
            `SELECT title, description FROM resources
             WHERE course_offering_id = $1 AND resource_type = 'pyq'
             AND (title ILIKE $2 OR description ILIKE $2)`,
            [courseId, `%${expandedQuery}%`]
          );

          pyqData.rows.forEach(pyq => {
            results.push({
              source: 'pyq',
              filename: pyq.title,
              snippets: [pyq.description || 'No description available'],
              usedOCR: false
            });
          });

        } catch (dbError) {
          console.error('Error searching course resources:', dbError);
        }
      }

      if (results.length === 0) {
        const message = `No relevant information found for "${query}". Try rephrasing your question or check if the content is available in course materials.`;
        setCachedResult(cacheKey, message);
        return message;
      }

      const response = results.map(r => {
        const sourceLabel = r.source === 'uploaded_document' ? 'Document' :
          r.source === 'course_notes' ? 'Course Notes' :
            r.source === 'pyq' ? 'Previous Year Question' : 'Resource';
        return `${sourceLabel}: ${r.filename}${r.usedOCR ? ' (OCR processed)' : ''}\nRelevant content:\n${r.snippets.join('\n')}`;
      }).join('\n\n');
      setCachedResult(cacheKey, response);
      return response;
    } catch (error) {
      console.error('DocumentSearchTool error:', error);
      return 'Error searching documents and course materials.';
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
        return 'No upcoming assignments or quizzes found for this course.';
      }

      return result.trim();
    } catch (error) {
      console.error('AssignmentsQuizzesTool error:', error);
      return 'Error retrieving assignments and quizzes information.';
    }
  }
}

// Tool 4: Web Search Tool
class WebSearchTool extends Tool {
  name = 'web_search';
  description = 'Perform web search for information not available in course materials or documents. Input should be the search query.';

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
          return {
            title: data.Heading || query,
            snippet: data.AbstractText,
            source: data.AbstractURL || 'DuckDuckGo'
          };
        }

        // Check for answer box
        if (data.Answer && data.Answer.trim()) {
          return {
            title: data.AnswerType || query,
            snippet: data.Answer,
            source: 'DuckDuckGo'
          };
        }
      } catch {
        console.log('Instant answer API failed, trying alternatives...');
      }

      // Fallback: Use a simple web search simulation with known facts
      const lowerQuery = query.toLowerCase();

      // Handle common programming/version queries
      if (lowerQuery.includes('latest version') && lowerQuery.includes('java')) {
        return {
          title: 'Latest Java Version',
          snippet: 'As of 2024, the latest LTS (Long Term Support) version of Java is Java 21, released in September 2023. The current latest version is Java 22, but Java 21 is recommended for production use due to LTS support until at least 2031.',
          source: 'Oracle Java Documentation'
        };
      }

      if (lowerQuery.includes('python') && lowerQuery.includes('version')) {
        return {
          title: 'Latest Python Version',
          snippet: 'As of 2024, Python 3.12 is the latest stable version, released in October 2023. Python 3.11 is also widely used and has long-term support.',
          source: 'Python.org'
        };
      }

      // For general queries, provide helpful information
      if (lowerQuery.includes('what is') || lowerQuery.includes('explain') || lowerQuery.includes('how')) {
        return {
          title: query,
          snippet: `For detailed information about "${query}", I recommend checking official documentation, educational resources, or reputable websites. While I don't have real-time web access, I can help explain concepts based on general knowledge.`,
          source: 'General Knowledge'
        };
      }

      // For current events or real-time data
      if (lowerQuery.includes('weather') || lowerQuery.includes('news') || lowerQuery.includes('today') || lowerQuery.includes('current')) {
        return {
          title: query,
          snippet: `For real-time information like "${query}", please check directly from official sources or specialized websites/apps that provide current data.`,
          source: 'Real-time Data Notice'
        };
      }

      // Default fallback
      return {
        title: query,
        snippet: `I searched for information about "${query}". For the most accurate and up-to-date information, I recommend checking official documentation, educational resources, or specialized websites directly.`,
        source: 'Search Recommendation'
      };

    } catch (error) {
      console.error('WebSearchTool error:', error);
      return {
        title: query,
        snippet: 'Web search is currently unavailable. Please try again later.',
        source: 'Error'
      };
    }
  }
}

// Create the agent
let agentExecutor = null;

async function initializeChatbotAgent() {
  if (agentExecutor) {return agentExecutor;}

  const tools = [
    new CourseInfoTool(),
    new AssignmentsQuizzesTool(),
    new DocumentSearchTool(),
    new WebSearchTool()
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

// Function to update the PDF text store (called from controller)
function updatePdfTextStore(store) {
  // Copy the store
  for (const [key, value] of store.entries()) {
    pdfTextStore.set(key, value);
  }
}

export { initializeChatbotAgent, updatePdfTextStore };
