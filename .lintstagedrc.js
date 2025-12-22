module.exports = {
  // Backend files
  'backend/**/*.js': ['eslint --fix', 'npx prettier --write'],

  // Frontend files
  'frontend/src/**/*.{ts,tsx}': ['eslint --fix', 'npx prettier --write'],

  // Frontend config files
  'frontend/**/*.{json,md}': ['npx prettier --write'],

  // Root config files
  '*.{json,md,yml,yaml}': ['npx prettier --write'],
};
