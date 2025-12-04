import { Octokit } from '@octokit/rest';

// Simplified token handling - storing tokens in plain text
// Note: This reduces security but simplifies the implementation

// Simple in-memory cache for repository data
class RepositoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }

  set(key, value) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

const repoCache = new RepositoryCache();

/**
 * Create GitHub API client for a user
 * @param {string} accessToken - GitHub access token (plain text)
 * @returns {Octokit} - GitHub API client instance
 */
export function createGitHubClient(accessToken) {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Fetch user repositories from GitHub with caching
 * @param {string} accessToken - Encrypted GitHub access token
 * @param {Object} options - Options for fetching
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.per_page - Items per page (default: 30, max: 100)
 * @param {string} options.sort - Sort field (default: 'updated')
 * @param {string} options.direction - Sort direction (default: 'desc')
 * @returns {Promise<Array>} - Array of repository objects
 */
export async function fetchUserRepositories(accessToken, options = {}) {
  const {
    page = 1,
    per_page = 30,
    sort = 'updated',
    direction = 'desc'
  } = options;

  const cacheKey = `repos_${accessToken}_${page}_${per_page}_${sort}_${direction}`;

  // Check cache first
  const cached = repoCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const octokit = createGitHubClient(accessToken);

    const response = await octokit.repos.listForAuthenticatedUser({
      page,
      per_page: Math.min(per_page, 100), // GitHub API limit
      sort,
      direction,
      type: 'owner' // Only show repositories owned by the user
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      language: repo.language,
      private: repo.private,
      fork: repo.fork,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      size: repo.size,
      stargazers_count: repo.stargazers_count,
      watchers_count: repo.watchers_count,
      forks_count: repo.forks_count,
      open_issues_count: repo.open_issues_count,
      default_branch: repo.default_branch
    }));

    // Cache the result
    repoCache.set(cacheKey, repos);

    return repos;
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }
}

/**
 * Get GitHub user information
 * @param {string} accessToken - Encrypted GitHub access token
 * @returns {Promise<Object>} - GitHub user object
 */
export async function getGitHubUser(accessToken) {
  try {
    const octokit = createGitHubClient(accessToken);
    const response = await octokit.users.getAuthenticated();
    return response.data;
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    throw new Error(`Failed to fetch user info: ${error.message}`);
  }
}

/**
 * Validate GitHub access token
 * @param {string} accessToken - Encrypted GitHub access token
 * @returns {Promise<boolean>} - True if token is valid
 */
export async function validateGitHubToken(accessToken) {
  try {
    await getGitHubUser(accessToken);
    return true;
  } catch (error) {
    return false;
  }
}