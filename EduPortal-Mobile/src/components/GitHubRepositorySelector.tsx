import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  private: boolean;
  fork: boolean;
}

interface GitHubRepositorySelectorProps {
  onRepositorySelect: (repository: GitHubRepository) => void;
  selectedRepository?: GitHubRepository | null;
}

interface RepositoriesResponse {
  repositories: GitHubRepository[];
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export default function GitHubRepositorySelector({
  onRepositorySelect,
  selectedRepository
}: GitHubRepositorySelectorProps) {
  const { theme } = useTheme();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);

  // Check GitHub connection status
  const checkGitHubConnection = useCallback(async () => {
    try {
      // Try to fetch repositories to check if GitHub is connected
      await apiFetch<RepositoriesResponse>('/github/repositories?page=1&per_page=1');
      setIsGitHubConnected(true);
    } catch (err: any) {
      if (err.message.includes('GitHub not connected')) {
        setIsGitHubConnected(false);
      } else {
        setIsGitHubConnected(null); // Other error, assume connected but API issue
      }
    }
  }, []);

  // Fetch repositories from API
  const fetchRepositories = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<RepositoriesResponse>(
        `/github/repositories?page=${pageNum}&per_page=30&sort=updated&direction=desc`
      );

      const newRepos = response.repositories;
      setRepositories(prev => append ? [...prev, ...newRepos] : newRepos);
      setFilteredRepositories(prev => append ? [...prev, ...newRepos] : newRepos);
      setPage(pageNum);
      setHasMore(response.pagination.has_more);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Filter repositories based on search query
  const filterRepositories = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredRepositories(repositories);
      return;
    }

    const filtered = repositories.filter(repo =>
      repo.name.toLowerCase().includes(query.toLowerCase()) ||
      repo.description?.toLowerCase().includes(query.toLowerCase()) ||
      repo.language?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredRepositories(filtered);
  }, [repositories]);

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterRepositories(text);
  };

  // Handle repository selection
  const handleRepositorySelect = (repository: GitHubRepository) => {
    onRepositorySelect(repository);
  };

  // Load more repositories
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRepositories(page + 1, true);
    }
  };

  // Initial load
  useEffect(() => {
    checkGitHubConnection();
  }, [checkGitHubConnection]);

  useEffect(() => {
    if (isGitHubConnected) {
      fetchRepositories(1, false);
    }
  }, [isGitHubConnected, fetchRepositories]);

  // Render repository item
  const renderRepositoryItem = ({ item }: { item: GitHubRepository }) => {
    const isSelected = selectedRepository?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.repositoryItem,
          {
            backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
            borderColor: isSelected ? theme.primary : theme.border,
          }
        ]}
        onPress={() => handleRepositorySelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.repositoryHeader}>
          <Text style={[styles.repositoryName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.repositoryBadges}>
            {item.private && (
              <View style={[styles.badge, { backgroundColor: theme.error }]}>
                <Text style={[styles.badgeText, { color: theme.bg }]}>Private</Text>
              </View>
            )}
            {item.fork && (
              <View style={[styles.badge, { backgroundColor: theme.secondary }]}>
                <Text style={[styles.badgeText, { color: theme.text }]}>Fork</Text>
              </View>
            )}
          </View>
        </View>

        {item.description && (
          <Text style={[styles.repositoryDescription, { color: theme['text-secondary'] }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.repositoryFooter}>
          {item.language && (
            <View style={styles.languageContainer}>
              <View style={[styles.languageDot, { backgroundColor: getLanguageColor(item.language) }]} />
              <Text style={[styles.languageText, { color: theme['text-secondary'] }]}>
                {item.language}
              </Text>
            </View>
          )}
          <Text style={[styles.updatedText, { color: theme['text-secondary'] }]}>
            Updated {formatDate(item.updated_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => fetchRepositories(1, false)}
          >
            <Text style={[styles.retryButtonText, { color: theme.bg }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isGitHubConnected === false) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme['text-secondary'] }]}>
            GitHub not connected
          </Text>
          <Text style={[styles.emptySubtext, { color: theme['text-secondary'] }]}>
            Please connect your GitHub account to select repositories
          </Text>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme['text-secondary'] }]}>
            No repositories found
          </Text>
          <Text style={[styles.emptySubtext, { color: theme['text-secondary'] }]}>
            Try adjusting your search query
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, { color: theme['text-secondary'] }]}>
          No repositories available
        </Text>
      </View>
    );
  };

  // Render footer for loading more
  const renderFooter = () => {
    if (!loading || repositories.length === 0) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerText, { color: theme['text-secondary'] }]}>
          Loading more repositories...
        </Text>
      </View>
    );
  };

  if (isGitHubConnected === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme['text-secondary'] }]}>
          Checking GitHub connection...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search repositories..."
          placeholderTextColor={theme['text-secondary']}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Repository List */}
      <FlatList
        data={filteredRepositories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRepositoryItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredRepositories.length === 0 ? styles.emptyListContainer : undefined}
      />
    </View>
  );
}

// Helper function to get language color
function getLanguageColor(language: string): string {
  const colors: { [key: string]: string } = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
  };
  return colors[language] || '#586069';
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'today';
  if (diffDays === 2) return 'yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 40,
    fontSize: 16,
  },
  repositoryItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  repositoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repositoryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  repositoryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  repositoryDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  repositoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  languageText: {
    fontSize: 12,
  },
  updatedText: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});