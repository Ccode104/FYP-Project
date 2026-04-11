#!/usr/bin/env node

/**
 * Complete Feature Test Verification Script
 * Runs all tests for all features and generates a comprehensive report
 * 
 * Usage: node verify-all-features.js
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(80), 'bright');
  log(`  ${title}`, 'blue');
  log('='.repeat(80), 'bright');
}

function subsection(title) {
  log(`\n  📋 ${title}`, 'cyan');
  log('  ' + '-'.repeat(76), 'cyan');
}

function success(message) {
  log(`  ✅ ${message}`, 'green');
}

function error(message) {
  log(`  ❌ ${message}`, 'red');
}

function warning(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

async function runCommand(command, description) {
  try {
    log(`\n    Running: ${description}`, 'cyan');
    const output = execSync(command, {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err.message, output: err.stdout || '' };
  }
}

function parseTestOutput(output) {
  const testMatch = output.match(/(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/);
  const coverageMatch = output.match(/Statements\s+:\s+(\d+\.?\d*)%/);

  return {
    passed: testMatch ? parseInt(testMatch[1]) : 0,
    failed: failMatch ? parseInt(failMatch[1]) : 0,
    coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0,
  };
}

async function verifyFeatureGroup(name, testCommand, expectedTests) {
  subsection(name);

  const result = await runCommand(testCommand, `${name} tests`);

  if (result.success) {
    const stats = parseTestOutput(result.output);
    success(`${stats.passed}/${expectedTests} tests passed`);

    if (stats.coverage > 0) {
      if (stats.coverage >= 80) {
        success(`Coverage: ${stats.coverage}%`);
      } else if (stats.coverage >= 60) {
        warning(`Coverage: ${stats.coverage}% (target: 80%)`);
      } else {
        warning(`Coverage: ${stats.coverage}% (needs improvement)`);
      }
    }

    return {
      group: name,
      status: 'PASSED',
      passed: stats.passed,
      failed: stats.failed,
      coverage: stats.coverage,
    };
  } else {
    error(`Tests failed`);
    log(`    Error: ${result.error}`, 'red');
    return {
      group: name,
      status: 'FAILED',
      passed: 0,
      failed: expectedTests,
      coverage: 0,
    };
  }
}

async function runAllTests() {
  section('🧪 COMPLETE FEATURE TEST VERIFICATION');

  log('\nStarting comprehensive test suite verification...', 'bright');
  log('This will verify all 13 feature groups', 'bright');

  const results = [];

  // Group 1: Core LMS Features
  results.push(
    await verifyFeatureGroup(
      '1️⃣  Core LMS Features',
      'npm run test -- --testPathPattern="auth|courses|assignments" 2>&1',
      45,
    ),
  );

  // Group 2: Learning Content
  results.push(
    await verifyFeatureGroup(
      '2️⃣  Learning Content Features',
      'npm run test -- --testPathPattern="discussions|resources" 2>&1',
      30,
    ),
  );

  // Group 3: Lectures & Teaching
  results.push(
    await verifyFeatureGroup(
      '3️⃣  Lectures & Teaching Features',
      'npm run test -- --testPathPattern="lectures|videos" 2>&1',
      25,
    ),
  );

  // Group 4: Coding & Evaluation
  results.push(
    await verifyFeatureGroup(
      '4️⃣  Coding Platform Features',
      'npm run test -- --testPathPattern="judge|quizzes|codeQuestions" 2>&1',
      35,
    ),
  );

  // Group 5A: AI Chatbot
  results.push(
    await verifyFeatureGroup(
      '5️⃣A AI Chatbot Features',
      'npm run test -- --testPathPattern="chatbot" 2>&1',
      20,
    ),
  );

  // Group 5B: AI Viva Simulator
  results.push(
    await verifyFeatureGroup(
      '5️⃣B AI Viva Simulator Features',
      'npm run test -- --testPathPattern="viva|codeAnalysis" 2>&1',
      30,
    ),
  );

  // Group 5C: AI Grading
  results.push(
    await verifyFeatureGroup(
      '5️⃣C AI Grading Features',
      'npm run test -- --testPathPattern="taAgent|grading" 2>&1',
      20,
    ),
  );

  // Group 5D: Plagiarism Detection
  results.push(
    await verifyFeatureGroup(
      '5️⃣D Plagiarism Detection Features',
      'npm run test -- --testPathPattern="plagiarism" 2>&1',
      25,
    ),
  );

  // Group 6A: Course Planner
  results.push(
    await verifyFeatureGroup(
      '6️⃣A Course Planner Features',
      'npm run test -- --testPathPattern="planner" 2>&1',
      18,
    ),
  );

  // Group 6B: Success Dashboard
  results.push(
    await verifyFeatureGroup(
      '6️⃣B Success Centre Dashboard',
      'npm run test -- --testPathPattern="student|dashboard" 2>&1',
      15,
    ),
  );

  // Group 6C: At-Risk Detection
  results.push(
    await verifyFeatureGroup(
      '6️⃣C At-Risk Detection Features',
      'npm run test -- --testPathPattern="support|admin" 2>&1',
      20,
    ),
  );

  // Group 7: Gamification
  results.push(
    await verifyFeatureGroup(
      '7️⃣  Gamification Features',
      'npm run test -- --testPathPattern="gamification|progress" 2>&1',
      18,
    ),
  );

  // Group 8: Proctoring
  results.push(
    await verifyFeatureGroup(
      '8️⃣  Proctoring Features',
      'npm run test -- --testPathPattern="proctoring" 2>&1',
      20,
    ),
  );

  return results;
}

async function verifySecurity() {
  section('🔒 SECURITY & DEVOPS VERIFICATION');

  subsection('Security Scans');

  // Check for npm audit
  const auditResult = await runCommand('npm audit 2>&1', 'npm audit');
  if (auditResult.success) {
    success('npm audit passed');
  } else {
    warning('npm audit found vulnerabilities (run: npm audit fix)');
  }

  // Check for ESLint
  subsection('Linting & Code Quality');
  const lintResult = await runCommand('npm run lint 2>&1', 'ESLint');
  if (lintResult.success) {
    success('ESLint passed');
  } else {
    warning('ESLint found issues (run: npm run lint:fix)');
  }
}

async function verifyDatabase() {
  section('🗄️  DATABASE VERIFICATION');

  const script = path.join(__dirname, 'scripts', 'test-database.js');

  if (fs.existsSync(script)) {
    subsection('Database Connectivity');
    const result = await runCommand(`node ${script} 2>&1`, 'Database test');

    if (result.success) {
      success('Database connection verified');
      log(result.output.substring(0, 500), 'cyan');
    } else {
      error('Database connection failed');
      log(`    ${result.error}`, 'red');
    }
  } else {
    warning('Database test script not found');
  }
}

async function verifySeedData() {
  section('🌱 DEMO DATA VERIFICATION');

  subsection('Available Seed Scripts');

  const scriptsDir = path.join(__dirname, 'scripts');
  const seedScripts = fs
    .readdirSync(scriptsDir)
    .filter((f) => f.includes('seed') && f.endsWith('.js'))
    .sort();

  if (seedScripts.length > 0) {
    seedScripts.forEach((script) => {
      success(`${script}`);
    });

    log('\n  📝 To populate demo data:', 'cyan');
    log('    cd backend', 'cyan');
    log('    node scripts/apply-comprehensive-seed.js', 'cyan');
  } else {
    warning('No seed scripts found');
  }
}

async function generateTestationMatrix(results) {
  section('📊 FINAL TEST VERIFICATION MATRIX');

  log('', 'reset');
  let totalPassed = 0;
  let totalFailed = 0;
  let totalCoverage = 0;

  const matrix = results
    .map((r) => {
      totalPassed += r.passed;
      totalFailed += r.failed;
      totalCoverage += r.coverage;

      const status = r.status === 'PASSED' ? '✅' : '❌';
      const coverage = r.coverage > 0 ? `${r.coverage.toFixed(1)}%` : 'N/A';

      return `  ${status} ${r.group.padEnd(35)} | ${r.passed}/${r.passed + r.failed} tests | Coverage: ${coverage}`;
    })
    .join('\n');

  log(matrix, 'bright');

  log('\n' + '-'.repeat(80), 'bright');

  const totalTests = totalPassed + totalFailed;
  const avgCoverage = results.filter((r) => r.coverage > 0).length > 0 
    ? totalCoverage / results.filter((r) => r.coverage > 0).length 
    : 0;

  log(
    `  📈 TOTALS: ${totalPassed}/${totalTests} tests passed | Avg Coverage: ${avgCoverage.toFixed(1)}%`,
    totalFailed === 0 ? 'green' : 'yellow',
  );

  return {
    totalTests,
    totalPassed,
    totalFailed,
    avgCoverage,
  };
}

async function main() {
  try {
    log('\n\n', 'reset');
    log('╔' + '═'.repeat(78) + '╗', 'bright');
    log('║' + '  COMPREHENSIVE PROJECT FEATURE TEST & VERIFICATION SUITE  '.padEnd(79) + '║', 'bright');
    log('║' + '  Testing all 13 feature groups with 100+ test cases  '.padEnd(79) + '║', 'bright');
    log('╚' + '═'.repeat(78) + '╝', 'bright');

    // Run all tests
    const testResults = await runAllTests();

    // Verify security
    await verifySecurity();

    // Verify database
    await verifyDatabase();

    // Verify seed data availability
    await verifySeedData();

    // Generate matrix
    const summary = await generateTestationMatrix(testResults);

    // Final summary
    section('✨ VERIFICATION COMPLETE');

    if (summary.totalFailed === 0) {
      success(`All ${summary.totalTests} tests passed! ✨`);
      success(`Average code coverage: ${summary.avgCoverage.toFixed(1)}%`);
      log(
        '\n  🚀 Your project is ready for demonstration!',
        'green',
      );
    } else {
      warning(`${summary.totalFailed} tests failed - some features need fixes`);
      log('\n  Please review failures above and fix issues', 'yellow');
    }

    log('\n' + '═'.repeat(80), 'bright');
    log('\n  Next steps:', 'cyan');
    log('    1. Run demo database seed: node scripts/apply-comprehensive-seed.js', 'cyan');
    log('    2. Start backend: npm run dev', 'cyan');
    log('    3. Start frontend: npm run dev', 'cyan');
    log('    4. Follow FEATURE_DEMO_VERIFICATION_GUIDE.md for feature demos', 'cyan');
    log('\n');

  } catch (err) {
    error('Test verification failed!');
    log(`Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
