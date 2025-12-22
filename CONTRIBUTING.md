# Contributing to Unified Academic Portal

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/FYP-Project.git
   cd FYP-Project
   ```

2. **Install Dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` files (if available) to `.env`
   - Configure required environment variables
   - See README.md for detailed setup instructions

## Development Workflow

### Branch Naming

Use descriptive branch names following the pattern:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

**Examples:**

```
feat(auth): add Google OAuth sign-in
fix(ui): resolve button alignment issue
docs(readme): update installation instructions
refactor(api): simplify authentication middleware
```

### Pre-commit Hooks

The project uses Husky and lint-staged to ensure code quality:

- **Linting**: ESLint runs automatically on staged files
- **Formatting**: Prettier formats code automatically
- **Tests**: Full test suite runs before commit

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## Code Quality Standards

### Linting

- **Backend**: ESLint with custom rules
- **Frontend**: ESLint + TypeScript ESLint

Run linting:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint:fix
```

### Formatting

We use Prettier for consistent code formatting:

```bash
npm run format
```

### Type Checking

Frontend uses TypeScript:

```bash
cd frontend
npm run type-check
```

### Testing

Write tests for new features and bug fixes:

**Backend:**

```bash
cd backend
npm test
npm run test:watch  # Watch mode
```

**Frontend:**

```bash
cd frontend
npm test
npm run test:watch  # Watch mode
```

## Pull Request Process

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, maintainable code
   - Add tests for new features
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

4. **Push and Create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a Pull Request on GitHub.

5. **PR Requirements**
   - Clear description of changes
   - Reference related issues
   - Ensure CI checks pass
   - Request review from maintainers

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Respond to feedback promptly
- Update PR based on review comments
- Mark conversations as resolved when addressed

### For Reviewers

- Be constructive and respectful
- Focus on code quality and maintainability
- Approve when satisfied
- Request changes when needed

## Testing Guidelines

### Unit Tests

- Test individual functions and components
- Aim for high coverage (>80%)
- Test edge cases and error scenarios

### Integration Tests

- Test API endpoints
- Test component interactions
- Test database operations

### E2E Tests

- Test critical user workflows
- Test cross-browser compatibility

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation (Swagger) for backend changes
- Keep inline comments clear and concise

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Ask questions in discussions or issues

Thank you for contributing! 🎉
