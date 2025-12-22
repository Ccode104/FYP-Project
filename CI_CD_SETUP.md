# CI/CD Pipeline Setup Documentation

This document describes the comprehensive CI/CD pipeline setup for the Unified Academic Portal project.

## Overview

The project now includes a professional-grade CI/CD pipeline that ensures code quality, security, and maintainability. The pipeline is designed to be:

- **Automated**: Runs on every push and pull request
- **Fast**: Parallel execution and caching for optimal performance
- **Comprehensive**: Covers linting, testing, security, and code quality
- **Maintainable**: Well-documented and easy to extend

## Pipeline Components

### 1. GitHub Actions Workflows

#### Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Ignores documentation and image files for faster runs

**Jobs:**

1. **Backend Lint** - ESLint validation for backend code
2. **Backend Tests** - Jest test suite execution with coverage
3. **Frontend Lint** - ESLint validation for frontend code
4. **Frontend Type Check** - TypeScript compilation check
5. **Frontend Tests** - Vitest test suite execution with coverage
6. **Frontend Build** - Production build verification
7. **Quality Gate** - Ensures all checks pass

**Features:**

- Parallel job execution for faster feedback
- Node.js 20.x LTS
- npm caching for faster installs
- Test result artifacts retention (7 days)
- Build artifacts for deployment

#### PR Quality Checks (`.github/workflows/pr-checks.yml`)

**Checks:**

- Merge conflict detection
- Conventional commit message validation
- Large file detection (>5MB)

#### Security Scanning (`.github/workflows/security.yml`)

**Features:**

- Dependency review for PRs
- npm audit for backend and frontend
- Weekly scheduled scans
- Audit result artifacts

#### CodeQL Analysis (`.github/workflows/codeql.yml`)

**Features:**

- Automated security vulnerability detection
- Code quality analysis
- Weekly scheduled scans
- JavaScript/TypeScript analysis

#### Dependency Updates (`.github/workflows/dependency-update.yml`)

**Features:**

- Monthly dependency update checks
- Automated issue creation for review
- Manual trigger support

### 2. Pre-commit Hooks (Husky)

#### Pre-commit Hook (`.husky/pre-commit`)

**Actions:**

1. Runs `lint-staged` on staged files only (fast)
2. Runs full test suite (ensures everything works)

**Benefits:**

- Only lints/formats changed files
- Catches issues before commit
- Prevents broken code from being committed

#### Commit Message Hook (`.husky/commit-msg`)

**Validation:**

- Enforces Conventional Commits format
- Validates commit message structure
- Provides helpful error messages

**Format:** `type(scope): description`

**Types:** feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert

### 3. Code Quality Tools

#### Lint-Staged (`.lintstagedrc.js`)

**Configuration:**

- Backend JS files → ESLint + Prettier
- Frontend TS/TSX files → ESLint + Prettier
- Config files → Prettier only

**Benefits:**

- Only processes changed files
- Automatic formatting
- Fast feedback

#### Prettier (`.prettierrc.json`)

**Configuration:**

- Single quotes
- 2-space indentation
- 100 character line width
- Semicolons enabled
- LF line endings

**Ignored:**

- node_modules
- dist/build folders
- EduPortal-Mobile directory
- Lock files

### 4. Dependabot (`.github/dependabot.yml`)

**Configuration:**

- Monthly updates for backend dependencies
- Monthly updates for frontend dependencies
- Monthly updates for GitHub Actions
- Automatic PR creation with labels

### 5. Documentation

#### Contributing Guide (`CONTRIBUTING.md`)

**Contents:**

- Code of conduct
- Development setup
- Branch naming conventions
- Commit message guidelines
- PR process
- Code review guidelines
- Testing guidelines

#### CODEOWNERS (`.github/CODEOWNERS`)

**Purpose:**

- Defines code ownership
- Ensures proper reviews
- Maintains code quality

## Workflow Summary

### Development Workflow

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Stage Changes**

   ```bash
   git add .
   ```

4. **Commit** (hooks run automatically)

   ```bash
   git commit -m "feat(scope): your message"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feature/your-feature
   ```

6. **CI Pipeline Runs**
   - All checks run automatically
   - PR shows status checks
   - Fix any failures

7. **Code Review**
   - Reviewers check code
   - Address feedback
   - Merge when approved

### CI Pipeline Flow

```
Push/PR → GitHub Actions Trigger
    ↓
Parallel Jobs:
    ├─ Backend Lint ✓
    ├─ Backend Tests ✓
    ├─ Frontend Lint ✓
    ├─ Frontend Type Check ✓
    ├─ Frontend Tests ✓
    └─ Frontend Build ✓
    ↓
Quality Gate → All Pass? → ✅ Success
```

## Configuration Files

### Root Level

- `.gitignore` - Git ignore patterns (excludes EduPortal-Mobile)
- `.prettierrc.json` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.lintstagedrc.js` - Lint-staged configuration
- `package.json` - Root scripts and dependencies
- `CONTRIBUTING.md` - Contribution guidelines

### GitHub

- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/pr-checks.yml` - PR quality checks
- `.github/workflows/security.yml` - Security scanning
- `.github/workflows/codeql.yml` - CodeQL analysis
- `.github/workflows/dependency-update.yml` - Dependency checks
- `.github/dependabot.yml` - Dependabot configuration
- `.github/CODEOWNERS` - Code ownership

### Husky

- `.husky/pre-commit` - Pre-commit hook
- `.husky/commit-msg` - Commit message validation

## Best Practices

### For Developers

1. **Always run tests locally before pushing**

   ```bash
   npm run test
   ```

2. **Format code before committing**

   ```bash
   npm run format
   ```

3. **Follow commit message conventions**
   - Use conventional commits format
   - Be descriptive but concise
   - Reference issues when applicable

4. **Keep PRs focused**
   - One feature/fix per PR
   - Keep changes reasonably sized
   - Update documentation

5. **Respond to CI failures**
   - Fix linting errors
   - Fix failing tests
   - Address security warnings

### For Maintainers

1. **Review PRs thoroughly**
   - Check code quality
   - Verify tests pass
   - Ensure documentation updated

2. **Monitor CI/CD health**
   - Check workflow runs regularly
   - Address flaky tests
   - Update dependencies monthly

3. **Keep dependencies updated**
   - Review Dependabot PRs
   - Test updates before merging
   - Update security patches promptly

## Troubleshooting

### Pre-commit Hook Fails

**Issue:** Hook fails but code looks fine

**Solution:**

```bash
# Run linting manually
npm run lint

# Run formatting
npm run format

# Run tests
npm run test
```

### CI Pipeline Fails

**Issue:** Tests pass locally but fail in CI

**Solutions:**

- Check Node.js version matches (20.x)
- Ensure environment variables are set in GitHub Secrets
- Verify all dependencies are committed
- Check for platform-specific code

### Commit Message Rejected

**Issue:** Commit message doesn't follow format

**Solution:**

```bash
# Use conventional commits format
git commit -m "feat(scope): description"
# or
git commit -m "fix(scope): description"
```

## Performance Optimizations

1. **Caching**
   - npm cache in GitHub Actions
   - Reduces install time significantly

2. **Parallel Execution**
   - Backend and frontend checks run in parallel
   - Faster overall pipeline execution

3. **Path Filtering**
   - Ignores documentation and images
   - Skips CI for non-code changes

4. **Lint-Staged**
   - Only processes changed files
   - Faster pre-commit hooks

## Security Features

1. **Dependency Scanning**
   - npm audit in CI
   - Dependabot for updates
   - Security alerts

2. **CodeQL Analysis**
   - Automated vulnerability detection
   - Code quality checks
   - Weekly scans

3. **Secret Management**
   - GitHub Secrets for sensitive data
   - No secrets in code
   - Environment variable validation

## Maintenance

### Monthly Tasks

1. Review and merge Dependabot PRs
2. Check security audit results
3. Review CodeQL findings
4. Update documentation as needed

### Quarterly Tasks

1. Review and update CI/CD workflows
2. Update Node.js version if needed
3. Review and optimize test coverage
4. Update contribution guidelines

## Future Enhancements

Potential improvements:

- [ ] E2E testing with Playwright/Cypress
- [ ] Performance testing
- [ ] Load testing
- [ ] Automated deployment workflows
- [ ] Staging environment
- [ ] Preview deployments for PRs
- [ ] Code coverage reporting
- [ ] Bundle size analysis

## Support

For issues or questions:

- Check existing GitHub issues
- Review CONTRIBUTING.md
- Open a new issue with details

---

**Last Updated:** 2025-01-14
**Maintained By:** Development Team
