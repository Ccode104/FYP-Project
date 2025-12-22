/**
 * Code Analysis and Complexity Checker
 * Analyzes code for time and space complexity
 */

import { pool } from '../db/index.js';

/**
 * Analyze code complexity using pattern matching and AST analysis
 */
export async function analyzeComplexity(req, res) {
  try {
    const { code, language, question_id } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Analyze complexity based on patterns
    const analysis = analyzeCodePatterns(code, language);

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
 * Analyze code patterns to determine complexity
 */
function analyzeCodePatterns(code, language) {
  const patterns = [];
  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';
  let loopDepth = 0;
  let recursionDetected = false;
  let dpDetected = false;

  // Normalize code for analysis
  const lines = code.split('\n');
  const codeStr = code.toLowerCase();

  // Track nesting depth
  let nestingLevels = 0;

  // Analyze each line
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) continue;

    // Loop detection
    if (/\b(for|while)\b.*\bin\b|\bfor\s*\(/.test(trimmedLine)) {
      patterns.push('Linear loop detected');
      nestingLevels++;
    }

    // Nested loop detection
    if (/\b(for|while)\b/.test(trimmedLine)) {
      loopDepth++;
    }

    // Recursion detection
    if (/def\s+\w+\(|function\s+\w+\(|void\s+\w+\(/.test(trimmedLine) && loopDepth === 0) {
      if (codeStr.includes(trimmedLine.split('(')[0].split(/def|function/).pop()?.trim())) {
        recursionDetected = true;
        patterns.push('Recursion detected');
      }
    }

    // DP detection
    if (/dp\[|memo\[|cache\[|\[i\]\[j\]/.test(trimmedLine)) {
      dpDetected = true;
      patterns.push('Dynamic Programming detected');
    }

    // Sorting detection
    if (/sort|merge|heap|quick/.test(trimmedLine)) {
      patterns.push('Sorting algorithm detected');
      timeComplexity = 'O(n log n)';
    }

    // Binary search detection
    if (/binary|bisect|lower_bound|upper_bound/.test(trimmedLine)) {
      patterns.push('Binary Search detected');
      timeComplexity = 'O(log n)';
    }

    // Nested structure detection
    if (/\[\]\[/.test(trimmedLine) || /\.keys\(\)/.test(trimmedLine)) {
      patterns.push('2D structure or Map detected');
    }
  }

  // Determine overall complexity
  if (loopDepth >= 3) {
    timeComplexity = 'O(n³)';
    patterns.push('Triple nested loop');
  } else if (loopDepth === 2) {
    timeComplexity = 'O(n²)';
    patterns.push('Double nested loop');
  } else if (loopDepth === 1) {
    timeComplexity = 'O(n)';
    patterns.push('Single loop');
  } else if (recursionDetected) {
    if (dpDetected) {
      timeComplexity = 'O(n) - O(n²)';
    } else {
      // Check for exponential recursion
      if (/fib|fibonacci/.test(codeStr)) {
        timeComplexity = 'O(2^n)';
        patterns.push('Exponential recursion (Fibonacci)');
      } else {
        timeComplexity = 'O(n)';
      }
    }
  }

  // Space complexity analysis
  if (/stack|call.*stack/.test(codeStr)) {
    spaceComplexity = 'O(n)';
    patterns.push('Stack space usage');
  } else if (dpDetected) {
    if (/\[\]\[/.test(codeStr)) {
      spaceComplexity = 'O(n²)';
      patterns.push('2D DP array');
    } else {
      spaceComplexity = 'O(n)';
      patterns.push('1D DP array');
    }
  } else if (/set|hashmap|hash|dict|map/.test(codeStr)) {
    spaceComplexity = 'O(n)';
    patterns.push('Hash-based data structure');
  } else if (recursionDetected) {
    spaceComplexity = 'O(n)';
    patterns.push('Recursive call stack');
  }

  // Generate analysis string
  let analysis = `Detected patterns: ${patterns.join(', ')}\n`;
  analysis += `Loop depth: ${loopDepth}\n`;
  analysis += `Recursion: ${recursionDetected ? 'Yes' : 'No'}\n`;
  analysis += `Dynamic Programming: ${dpDetected ? 'Yes' : 'No'}`;

  return {
    time_complexity: timeComplexity,
    space_complexity: spaceComplexity,
    patterns,
    analysis
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
    const bugInfo = selectBugInjectionPoint(code, language);

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
function selectBugInjectionPoint(code, language) {
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
