/**
 * AI Generator Controller
 * Handles AI-assisted generation of coding questions, driver code, and test cases.
 */

import { pool } from '../db/index.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Generate coding question components based on title and description
 */
export async function generateCodingQuestion(req, res) {
  try {
    const { title, description, language = 'python' } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const systemPrompt = `You are an expert computer science professor creating a coding assignment.
Your task is to generate the technical components for a programming problem in JSON format.

FIELDS TO GENERATE:
1. constraints: A string describing time and space complexity constraints.
2. template_code: The initial code structure shown to the student (e.g., function definition).
3. driver_code: The hidden boilerplate code that reads stdin, calls the student's function, and prints results to stdout.
4. test_cases: An array of objects, each containing:
   - is_sample: boolean (true for visible samples, false for hidden tests)
   - input_text: string (stdin)
   - expected_text: string (expected stdout)

IMPORTANT RULES FOR DRIVER CODE:
- For Python: Use 'sys.stdin.read()' or 'input()' to read inputs. Print only the final result.
- For Java/C++/C: Ensure the driver code includes the main function and necessary imports.
- The driver code MUST be designed to be appended AFTER the student's code.

RESPONSE FORMAT:
Your response MUST be a valid JSON object ONLY. Do not include any markdown formatting or explanations.`;

    const userPrompt = `Create a coding problem for:
Title: ${title}
Description: ${description}
Target Language: ${language}

Return a JSON object with: constraints, template_code, driver_code, and test_cases (include at least 2 sample and 3 hidden tests).`;

    const aiResponse = await getAIResponse(systemPrompt, userPrompt);
    
    // Attempt to parse JSON from the response
    try {
      // Find the first '{' and last '}' to extract JSON if there's any surrounding text
      const start = aiResponse.indexOf('{');
      const end = aiResponse.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const jsonStr = aiResponse.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        return res.json(parsed);
      }
      throw new Error('No valid JSON found in AI response');
    } catch (parseError) {
      console.error('AI JSON Parse Error:', parseError, aiResponse);
      return res.status(500).json({ 
        error: 'AI generated invalid formatting. Please try again.',
        raw: aiResponse 
      });
    }
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate question components' });
  }
}

/**
 * Internal helper to fetch from AI API via OpenRouter
 */
async function getAIResponse(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'FYP Coding Platform'
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5-free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`AI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '{}';
}
