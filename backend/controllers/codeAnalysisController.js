/**
 * Code Analysis and Complexity Checker
 * Analyzes code for time and space complexity
 */

import { pool } from '../db/index.js';

// Use OpenRouter API for AI analysis
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Analyze code complexity using Groq (LLM) with local heuristic fallback
 */
export async function analyzeComplexity(req, res) {
  try {
    const { code, language, question_id } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    let analysis;

    // First, try AI to estimate Big-O; fall back to local heuristic on error
    try {
      analysis = await analyzeWithAI(code, language);
    } catch (aiError) {
      console.warn('AI complexity analysis failed, falling back to local heuristic:', aiError.message);
      analysis = analyzeCodePatterns(code, language);
    }

    // Store analysis if needed (optional)
    if (question_id && req.user?.id) {
      try {
        await pool.query(
          `INSERT INTO code_analysis_logs (
            user_id, question_id, code_hash, time_complexity, space_complexity, analysis
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, question_id) DO UPDATE SET
            time_complexity = $4, space_complexity = $5, analysis = $6, analyzed_at = NOW()`,
          [
            req.user.id,
            question_id,
            hashCode(code),
            analysis.time_complexity,
            analysis.space_complexity,
            analysis.patterns.join(', ')
          ]
        );
      } catch (e) {
        // Ignore logging errors
        console.warn('Failed to log analysis:', e.message);
      }
    }

    res.json(analysis);
  } catch (error) {
    console.error('Complexity analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze complexity' });
  }
}

/**
 * Analyze code patterns locally to determine complexity (heuristic fallback)
 */
function analyzeCodePatterns(code, language) {
  const patterns = [];
  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';

  // Normalize code for analysis
  const lines = code.split('\n');
  const codeStr = code.toLowerCase();

  // --- Function and recursion detection ------------------------------------------------------
  const functionNames = new Set();
  const lang = (language || '').toLowerCase();

  const functionDefRegexes = [];
  if (lang === 'python') {
    functionDefRegexes.push(/^\s*def\s+([a-zA-Z_]\w*)\s*\(/);
  } else if (
    lang === 'javascript' ||
    lang === 'typescript' ||
    lang === 'jsx' ||
    lang === 'tsx'
  ) {
    // function foo(...) {}
    functionDefRegexes.push(/^\s*(?:async\s+)?function\s+([a-zA-Z_]\w*)\s*\(/);
    // const foo = (...) => {}
    functionDefRegexes.push(/^\s*const\s+([a-zA-Z_]\w*)\s*=\s*\(/);
    // foo = (...) => {}
    functionDefRegexes.push(/^\s*([a-zA-Z_]\w*)\s*=\s*\(/);
  } else {
    // Generic C/Java/C++ style: returnType foo(...)
    functionDefRegexes.push(/^(?:\s*(?:public|private|protected|static|final|inline)\s+)*[\w<>\[\]]+\s+([a-zA-Z_]\w*)\s*\(/);
  }

  for (const line of lines) {
    for (const re of functionDefRegexes) {
      const match = line.match(re);
      if (match && match[1]) {
        functionNames.add(match[1]);
      }
    }
  }

  const recursionInfo = {
    detected: false,
    exponential: false
  };

  if (functionNames.size > 0) {
    const namesPattern = Array.from(functionNames).join('|');
    const callRegex = new RegExp(`\\b(${namesPattern})\\s*\\(`, 'g');

    const callCounts = {};
    let m;
    while ((m = callRegex.exec(code)) !== null) {
      const name = m[1];
      callCounts[name] = (callCounts[name] || 0) + 1;
    }

    for (const [name, count] of Object.entries(callCounts)) {
      if (count > 1) {
        recursionInfo.detected = true;
        patterns.push(`Recursion detected in ${name}()`);
      }
    }

    // Obvious exponential recursion patterns (e.g. Fibonacci)
    if (
      /return\s+\w+\s*\([^)]*\)\s*\+\s*\w+\s*\([^)]*\)/i.test(codeStr) ||
      /fib|fibonacci/.test(codeStr)
    ) {
      recursionInfo.detected = true;
      recursionInfo.exponential = true;
      patterns.push('Exponential recursion pattern detected (e.g., Fibonacci)');
    }
  }

  // --- Loop and nesting detection -----------------------------------------------------------
  let totalLoops = 0;
  let maxLoopNesting = 0;
  const loopIndentStack = [];

  let hasLinearLoop = false; // loop clearly over input size
  let hasLogLoop = false;    // loop that shrinks by factor (n, n/2, ...)

  const loopRegex = /\b(for|while)\b/;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) {
      continue;
    }
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
      continue;
    }

    const indent = (rawLine.match(/^\s*/) || [''])[0].length;

    // Pop loops that are no longer in scope based on indentation
    while (loopIndentStack.length && indent <= loopIndentStack[loopIndentStack.length - 1]) {
      loopIndentStack.pop();
    }

    if (loopRegex.test(trimmedLine)) {
      totalLoops++;
      loopIndentStack.push(indent);
      maxLoopNesting = Math.max(maxLoopNesting, loopIndentStack.length);

      const lowerLine = trimmedLine.toLowerCase();

      const linearLoopPattern =
        /<\s*n\b/.test(lowerLine) ||
        /<\s*len\s*\(/.test(lowerLine) ||
        /<\s*\w+\.length\b/.test(lowerLine) ||
        /\bfor\s+\w+\s+in\s+\w+/.test(lowerLine);

      const logLoopPattern = /\/=\s*2|>>=\s*1/.test(lowerLine);

      if (linearLoopPattern) {
        hasLinearLoop = true;
        patterns.push('Loop over input size detected');
      } else if (logLoopPattern) {
        hasLogLoop = true;
        patterns.push('Logarithmic loop pattern detected');
      } else {
        patterns.push('Loop detected (treated as near-constant or small range)');
      }
    }
  }

  // --- Algorithmic pattern detection (sorting, search, DP, structures) ----------------------
  const dpDetected = /\b(dp|memo|cache)\s*[\[\.\_]/.test(codeStr) || /\[i\]\s*\[j\]/i.test(code);
  if (dpDetected) {
    patterns.push('Dynamic Programming pattern detected');
  }

  if (/\b(sort|sorted)\b/.test(codeStr)) {
    patterns.push('Sorting algorithm usage detected');
    hasLinearLoop = true; // sorting depends on input size
    hasLogLoop = true;    // most efficient sorts are n log n
  }

  if (/\bbinary\s+search\b|\bbisect\b|\blower_bound\b|\bupper_bound\b/.test(codeStr)) {
    patterns.push('Binary search usage detected');
    hasLogLoop = true;
  }

  const usesHashLike = /\b(set|unordered_set|hashmap|hash_map|dict|dictionary|map)\b/.test(codeStr);
  const usesArrayLike = /vector<|list<|array<|std::vector|std::array|\[\]/.test(code);

  // --- Time complexity decision -------------------------------------------------------------
  if (recursionInfo.detected) {
    if (recursionInfo.exponential) {
      timeComplexity = 'O(2^n)';
    } else {
      timeComplexity = 'O(n)';
    }
  }

  if (hasLinearLoop) {
    if (maxLoopNesting >= 2) {
      const exp = maxLoopNesting;
      timeComplexity = `O(n^${exp})`;
      patterns.push(`${exp}-level nested loop over input size detected`);
    } else if (hasLogLoop && !recursionInfo.exponential) {
      timeComplexity = 'O(n log n)';
      patterns.push('Combined linear scan with logarithmic operation (n log n)');
    } else if (!recursionInfo.exponential) {
      timeComplexity = 'O(n)';
    }
  } else if (hasLogLoop && !hasLinearLoop && !recursionInfo.exponential) {
    timeComplexity = 'O(log n)';
  }

  // --- Space complexity decision ------------------------------------------------------------
  if (dpDetected) {
    if (/\[[^\]]+\]\s*\[[^\]]+\]/.test(code)) {
      spaceComplexity = 'O(n^2)';
      patterns.push('2D DP / matrix-like structure suggests quadratic space');
    } else {
      spaceComplexity = 'O(n)';
      patterns.push('1D DP array suggests linear space');
    }
  } else if (usesHashLike || usesArrayLike) {
    spaceComplexity = 'O(n)';
    patterns.push('Data structures likely scale with input size (hash/array/list)');
  } else if (recursionInfo.detected) {
    spaceComplexity = 'O(n)';
    patterns.push('Recursive call stack space');
  }

  // Generate analysis string
  let analysis = `Detected patterns: ${patterns.join(', ') || 'None'}\\n`;
  analysis += `Total loops: ${totalLoops}, Max loop nesting: ${maxLoopNesting}\\n`;
  analysis += `Recursion: ${recursionInfo.detected ? 'Yes' : 'No'}${recursionInfo.exponential ? ' (possibly exponential)' : ''}\\n`;
  analysis += `Dynamic Programming: ${dpDetected ? 'Yes' : 'No'}`;

  return {
    time_complexity: timeComplexity,
    space_complexity: spaceComplexity,
    patterns,
    analysis
  };
}

/**
 * Call AI via OpenRouter to estimate Big-O time and space complexity
 */
async function analyzeWithAI(code, language) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const systemPrompt = [
    'You are an expert in algorithm and complexity analysis.',
    'Given a code snippet, you estimate its WORST-CASE time and space complexity in Big-O notation.',
    'You MUST respond with ONLY a JSON object, no markdown, no explanation.',
    'The JSON format must be:',
    '{',
    '  "time_complexity": "O(1)",',
    '  "space_complexity": "O(1)",',
    '  "notes": ["short note 1", "short note 2"]',
    '}',
    'Use concise, standard Big-O forms like O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n).'
  ].join('\n');

  const userPrompt = [
    `Language: ${language}`,
    'Code:',
    '```',
    code,
    '```',
    '',
    'Analyze this code and respond ONLY with the JSON object described above.'
  ].join('\n');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'FYP Coding Platform'
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2.5:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.0,
      max_tokens: 256
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `AI complexity API error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  content = content.trim();

  // Strip ```json fences if present
  if (content.startsWith('```')) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      content = match[1].trim();
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.warn('Failed to parse Groq complexity JSON response:', e);
    throw new Error('Failed to parse Groq complexity JSON response');
  }

  const time = parsed.time_complexity || parsed.timeComplexity || 'O(?)';
  const space = parsed.space_complexity || parsed.spaceComplexity || 'O(?)';
  const notes = Array.isArray(parsed.notes) ? parsed.notes : [];

  const analysisLines = [];
  if (notes.length) {
    analysisLines.push('Groq notes:');
    analysisLines.push(...notes);
  }

  return {
    time_complexity: time,
    space_complexity: space,
    patterns: notes,
    analysis: analysisLines.join('\n') || 'Complexity estimated by AI.'
  };
}

/**
 * Simple hash function for code
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

/**
 * Inject logical bugs for testing (with RAG analysis)
 */
export async function injectLogicalBug(req, res) {
  try {
    const { code, language, question_id } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Analyze code to find injection points
    const bugInfo = selectBugInjectionPoint(code);

    if (!bugInfo) {
      return res.json({
        code,
        bug_description: 'No suitable injection point found. Try again.',
        injected: false
      });
    }

    // Inject the bug
    const modifiedCode = injectBugIntoCode(code, bugInfo);

    // Log if user is authenticated
    if (req.user?.id && question_id) {
      try {
        await pool.query(
          `INSERT INTO logical_bug_injections (
            user_id, question_id, original_code, modified_code, bug_type, bug_description
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            question_id,
            hashCode(code),
            hashCode(modifiedCode),
            bugInfo.type,
            bugInfo.description
          ]
        );
      } catch (e) {
        // Ignore logging errors
        console.warn('Failed to log bug injection:', e.message);
      }
    }

    res.json({
      code: modifiedCode,
      bug_description: bugInfo.description,
      injected: true,
      hint: bugInfo.hint
    });
  } catch (error) {
    console.error('Bug injection error:', error);
    res.status(500).json({ error: 'Failed to inject bug' });
  }
}

/**
 * Select a suitable point for bug injection
 */
function selectBugInjectionPoint(code) {
  const lines = code.split('\n');
  const bugs = [
    {
      pattern: /for\s*\(\s*let\s+i\s*=\s*0/,
      type: 'loop_boundary',
      description: 'Off-by-one error in loop initialization',
      hint: 'Check your loop starting point',
      replacement: (match) => match.replace('= 0', '= 1')
    },
    {
      pattern: /for\s*\(\s*i\s*<\s*n/,
      type: 'loop_boundary',
      description: 'Incorrect loop condition',
      hint: 'Review loop boundary conditions',
      replacement: (match) => match.replace('< n', '<= n')
    },
    {
      pattern: /if\s*\(\s*(\w+)\s*===?/,
      type: 'condition',
      description: 'Incorrect comparison operator',
      hint: 'Double-check your comparison logic',
      replacement: (match) => {
        if (match.includes('>=')) return match.replace('>=', '>');
        if (match.includes('>')) return match.replace('>', '>=');
        return match.replace('==', '!=');
      }
    },
    {
      pattern: /arr\[i\s*\+\s*1\]|array\[i\s*\+\s*1\]/,
      type: 'indexing',
      description: 'Potential array index out of bounds',
      hint: 'Check array bounds carefully',
      replacement: (match) => match.replace('+ 1', '')
    }
  ];

  // Find a suitable bug
  for (const bug of bugs) {
    for (let i = 0; i < lines.length; i++) {
      if (bug.pattern.test(lines[i])) {
        return {
          ...bug,
          lineNumber: i,
          originalLine: lines[i]
        };
      }
    }
  }

  return null;
}

/**
 * Inject bug into code
 */
function injectBugIntoCode(code, bugInfo) {
  const lines = code.split('\n');
  if (bugInfo.lineNumber !== undefined && bugInfo.replacement) {
    lines[bugInfo.lineNumber] = lines[bugInfo.lineNumber].replace(
      bugInfo.pattern,
      (match) => bugInfo.replacement(match)
    );
  }
  return lines.join('\n');
}

/**
 * Create tables for analysis logging (migration)
 */
export async function createAnalysisTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS code_analysis_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES code_questions(id) ON DELETE CASCADE,
      code_hash VARCHAR(255),
      time_complexity VARCHAR(50),
      space_complexity VARCHAR(50),
      analysis TEXT,
      analyzed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS logical_bug_injections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES code_questions(id) ON DELETE CASCADE,
      original_code VARCHAR(255),
      modified_code VARCHAR(255),
      bug_type VARCHAR(50),
      bug_description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_code_analysis_user ON code_analysis_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_code_analysis_question ON code_analysis_logs(question_id);
    CREATE INDEX IF NOT EXISTS idx_bug_injection_user ON logical_bug_injections(user_id);
    CREATE INDEX IF NOT EXISTS idx_bug_injection_question ON logical_bug_injections(question_id);
  `;

  try {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✅ Analysis tables created');
  } catch (error) {
    console.error('Error creating analysis tables:', error);
  }
}
