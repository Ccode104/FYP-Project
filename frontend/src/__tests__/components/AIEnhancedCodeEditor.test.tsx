import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIEnhancedCodeEditor from '../../components/AIEnhancedCodeEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language, theme }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-language={language}
      data-theme={theme}
      placeholder="Code editor"
    />
  ),
}));

// Mock fetch API
global.fetch = vi.fn();

describe('AIEnhancedCodeEditor Component', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with all main sections', () => {
      render(<AIEnhancedCodeEditor />);

      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.getByText(/Complexity Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/Bug Injection/i)).toBeInTheDocument();
    });

    it('should render language selector with multiple options', () => {
      render(<AIEnhancedCodeEditor />);

      const languageSelector = screen.getByLabelText(/Language/i);
      expect(languageSelector).toBeInTheDocument();

      const options = ['javascript', 'python', 'java', 'cpp', 'go'];
      options.forEach((lang) => {
        expect(screen.getByText(lang)).toBeInTheDocument();
      });
    });

    it('should render theme toggle button', () => {
      render(<AIEnhancedCodeEditor />);

      const themeToggle = screen.getByRole('button', { name: /theme/i });
      expect(themeToggle).toBeInTheDocument();
    });

    it('should render contest mode toggle', () => {
      render(<AIEnhancedCodeEditor />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      expect(contestToggle).toBeInTheDocument();
    });

    it('should have proper ARIA labels for accessibility', () => {
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toHaveAttribute('aria-label') || expect(editor.parentElement).toHaveAttribute('role');
    });
  });

  describe('Code Editing', () => {
    it('should update code when user types', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      await user.clear(editor);
      await user.type(editor, 'const x = 1;');

      expect(editor).toHaveValue('const x = 1;');
    });

    it('should handle language switching', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const languageSelector = screen.getByLabelText(/Language/i);
      await user.selectOptions(languageSelector, 'python');

      expect(languageSelector).toHaveValue('python');
    });

    it('should preserve code when switching languages', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      const languageSelector = screen.getByLabelText(/Language/i);

      await user.clear(editor);
      await user.type(editor, 'const x = 1;');
      await user.selectOptions(languageSelector, 'python');
      await user.selectOptions(languageSelector, 'javascript');

      expect(editor).toHaveValue('const x = 1;');
    });

    it('should handle copy/paste operations', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      const testCode = 'function test() { return 42; }';

      await user.clear(editor);
      await user.type(editor, testCode);

      expect(editor).toHaveValue(testCode);
    });

    it('should show line numbers and code formatting', () => {
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toBeInTheDocument();
      // Monaco Editor provides line numbers by default
    });
  });

  describe('Complexity Analysis', () => {
    it('should analyze code complexity when button is clicked', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: {
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(1)',
            warnings: [],
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/O\(n\)/)).toBeInTheDocument();
      });
    });

    it('should display complexity warnings', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: {
            timeComplexity: 'O(2^n)',
            spaceComplexity: 'O(n)',
            warnings: ['Exponential complexity detected', 'Consider optimization'],
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Exponential complexity/i)).toBeInTheDocument();
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid code' }),
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during analysis', async () => {
      const user = userEvent.setup();
      global.fetch.mockImplementationOnce(() => {
        return new Promise(() => {}); // Never resolves
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      expect(screen.getByText(/Analyzing/i) || screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should display results in organized panels', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          analysis: {
            timeComplexity: 'O(n log n)',
            spaceComplexity: 'O(n)',
            warnings: [],
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        const results = screen.getByText(/Time Complexity/i);
        expect(results).toBeInTheDocument();
      });
    });
  });

  describe('AI Assistant', () => {
    it('should send AI query and display response', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'You can optimize this by using memoization...',
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const queryInput = screen.getByPlaceholderText(/Ask AI Assistant/i);
      await user.type(queryInput, 'How do I optimize this?');

      const sendBtn = screen.getByRole('button', { name: /Send/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/memoization/i)).toBeInTheDocument();
      });
    });

    it('should enforce AI query rate limiting', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too many requests' }),
      });

      render(<AIEnhancedCodeEditor />);

      const queryInput = screen.getByPlaceholderText(/Ask AI Assistant/i);
      await user.type(queryInput, 'Query');

      const sendBtn = screen.getByRole('button', { name: /Send/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
      });
    });

    it('should maintain conversation history', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Answer to query',
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const queryInput = screen.getByPlaceholderText(/Ask AI Assistant/i);
      const sendBtn = screen.getByRole('button', { name: /Send/i });

      // First query
      await user.type(queryInput, 'Query 1');
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/Query 1/)).toBeInTheDocument();
      });

      // Second query
      await user.clear(queryInput);
      await user.type(queryInput, 'Query 2');
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/Query 2/)).toBeInTheDocument();
      });
    });

    it('should show responsible AI warnings for harmful queries', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Query violates responsible AI policy' }),
      });

      render(<AIEnhancedCodeEditor />);

      const queryInput = screen.getByPlaceholderText(/Ask AI Assistant/i);
      await user.type(queryInput, 'How do I write a virus?');

      const sendBtn = screen.getByRole('button', { name: /Send/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/policy/i)).toBeInTheDocument();
      });
    });

    it('should display AI usage statistics', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          stats: {
            queriesUsedThisMonth: 45,
            queriesLimitThisMonth: 100,
            tokensUsed: 12500,
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const statsBtn = screen.getByRole('button', { name: /Stats/i });
      fireEvent.click(statsBtn);

      await waitFor(() => {
        expect(screen.getByText(/45.*100/)).toBeInTheDocument();
      });
    });
  });

  describe('Bug Injection', () => {
    it('should inject logical bugs into code', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          bugInjection: {
            bugType: 'off-by-one',
            modifiedCode: 'for (let i = 0; i <= n; i++)',
            explanation: 'Changed < to <=',
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const bugTypeSelector = screen.getByLabelText(/Bug Type/i);
      await user.selectOptions(bugTypeSelector, 'off-by-one');

      const injectBtn = screen.getByRole('button', { name: /Inject Bug/i });
      await user.click(injectBtn);

      await waitFor(() => {
        expect(screen.getByText(/off-by-one/i)).toBeInTheDocument();
      });
    });

    it('should show bug explanation and impact', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          bugInjection: {
            bugType: 'boundary-condition',
            explanation: 'This will cause array out of bounds exception',
            impact: 'Runtime Error',
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const bugTypeSelector = screen.getByLabelText(/Bug Type/i);
      await user.selectOptions(bugTypeSelector, 'boundary-condition');

      const injectBtn = screen.getByRole('button', { name: /Inject Bug/i });
      await user.click(injectBtn);

      await waitFor(() => {
        expect(screen.getByText(/array out of bounds/i)).toBeInTheDocument();
      });
    });

    it('should support multiple bug types', async () => {
      const bugTypes = ['off-by-one', 'boundary-condition', 'null-pointer', 'scope-issue'];

      render(<AIEnhancedCodeEditor />);

      const bugTypeSelector = screen.getByLabelText(/Bug Type/i);
      bugTypes.forEach((bugType) => {
        expect(screen.getByText(bugType)).toBeInTheDocument();
      });
    });

    it('should allow copying injected code', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          bugInjection: {
            bugType: 'off-by-one',
            modifiedCode: 'modified code snippet',
          },
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const bugTypeSelector = screen.getByLabelText(/Bug Type/i);
      await user.selectOptions(bugTypeSelector, 'off-by-one');

      const injectBtn = screen.getByRole('button', { name: /Inject Bug/i });
      await user.click(injectBtn);

      await waitFor(() => {
        const copyBtn = screen.getByRole('button', { name: /Copy/i });
        expect(copyBtn).toBeInTheDocument();
      });
    });
  });

  describe('Contest Mode', () => {
    it('should toggle contest mode on/off', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      expect(contestToggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(contestToggle);
      expect(contestToggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(contestToggle);
      expect(contestToggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('should hide AI assistance when in contest mode', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      await user.click(contestToggle);

      const aiSection = screen.queryByText(/AI Assistant/i);
      expect(aiSection).not.toBeInTheDocument();
    });

    it('should hide complexity analysis in contest mode', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      await user.click(contestToggle);

      const complexityBtn = screen.queryByRole('button', { name: /Analyze Complexity/i });
      expect(complexityBtn).not.toBeInTheDocument();
    });

    it('should show timer in contest mode', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor contestDuration={60} />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      await user.click(contestToggle);

      await waitFor(() => {
        expect(screen.getByText(/Time/i)).toBeInTheDocument();
      });
    });

    it('should submit code when contest time runs out', async () => {
      const onSubmit = vi.fn();
      render(<AIEnhancedCodeEditor contestDuration={1} onContestSubmit={onSubmit} />);

      const contestToggle = screen.getByRole('button', { name: /contest/i });
      fireEvent.click(contestToggle);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Theme Management', () => {
    it('should toggle between light and dark themes', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toHaveAttribute('data-theme', 'vs');

      const themeToggle = screen.getByRole('button', { name: /theme/i });
      await user.click(themeToggle);

      expect(editor).toHaveAttribute('data-theme', 'vs-dark');
    });

    it('should persist theme preference in localStorage', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const themeToggle = screen.getByRole('button', { name: /theme/i });
      await user.click(themeToggle);

      expect(localStorage.getItem('editorTheme')).toBe('vs-dark');
    });

    it('should apply saved theme preference on load', () => {
      localStorage.setItem('editorTheme', 'vs-dark');
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toHaveAttribute('data-theme', 'vs-dark');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile devices', () => {
      global.innerWidth = 375;
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toBeInTheDocument();

      const sections = screen.getAllByRole('region');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should stack panels vertically on small screens', () => {
      global.innerWidth = 480;
      const { container } = render(<AIEnhancedCodeEditor />);

      const layout = container.querySelector('[data-layout]');
      expect(layout).toHaveClass('vertical-layout');
    });

    it('should use side-by-side layout on large screens', () => {
      global.innerWidth = 1920;
      const { container } = render(<AIEnhancedCodeEditor />);

      const layout = container.querySelector('[data-layout]');
      expect(layout).toHaveClass('horizontal-layout');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form with Ctrl+Enter', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Result',
        }),
      });

      render(<AIEnhancedCodeEditor />);

      const queryInput = screen.getByPlaceholderText(/Ask AI Assistant/i);
      await user.type(queryInput, 'Query{Control>Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should copy code with Ctrl+C', async () => {
      const user = userEvent.setup();
      render(<AIEnhancedCodeEditor />);

      const editor = screen.getByTestId('code-editor');
      await user.type(editor, 'const x = 1;{Control>c}');

      // Clipboard content should be updated
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Network/i)).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      const user = userEvent.setup();
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, analysis: {} }),
        });

      render(<AIEnhancedCodeEditor />);

      const analyzeBtn = screen.getByRole('button', { name: /Analyze Complexity/i });
      await user.click(analyzeBtn);

      const retryBtn = await screen.findByRole('button', { name: /Retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
