import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  listDiscussionMessages,
  postDiscussionMessage,
  deleteDiscussionMessage,
  requestDiscussionAiAssist,
  listCourseResources,
  requestDiscussionAiDeepDive,
  fetchAiLimits,
  type DiscussionMessage,
  type CourseResource,
} from '../features/discussion/api/discussion';
import './DiscussionForum.css';

interface CourseInfo {
  id: number;
  course_code: string;
  course_title: string;
  term?: string;
  section?: string;
  faculty_name?: string;
}

interface ThreadWithMeta extends DiscussionMessage {
  is_pinned?: boolean;
  is_locked?: boolean;
  category?: 'general' | 'assignments' | 'exams';
  reply_count: number;
  view_count: number;
  teacher_answered?: boolean;
  is_streaming?: boolean;
}

function extractAiQuery(content: string): string | null {
  const match = content.match(/@ai\b([\s\S]*)/i);
  if (!match) return null;
  const query = match[1]?.trim();
  return query || 'Please help with this discussion thread.';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DiscussionForum() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [threads, setThreads] = useState<ThreadWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLimits, setAiLimits] = useState<{ available: boolean; usage: number; limit: number; isFreeTier: boolean; percentage: string } | null>(null);
  const [newThreadContent, setNewThreadContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [anonymityEnabled, setAnonymityEnabled] = useState(true);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [repliesMap, setRepliesMap] = useState<Map<number, DiscussionMessage[]>>(new Map());
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThreadCategory, setNewThreadCategory] = useState<'general' | 'assignments' | 'exams'>('general');
  const [newThreadTopic, setNewThreadTopic] = useState('');
  const [aiLoadingByThread, setAiLoadingByThread] = useState<Record<number, boolean>>({});
  const [deepDiveModalOpen, setDeepDiveModalOpen] = useState(false);
  const [deepDiveThreadId, setDeepDiveThreadId] = useState<number | null>(null);
  const [deepDiveMessageId, setDeepDiveMessageId] = useState<number | null>(null);
  const [deepDiveQuery, setDeepDiveQuery] = useState(
    'Please provide a deeper explanation of the last AI response, including examples and a step-by-step breakdown.'
  );
  const [courseResources, setCourseResources] = useState<CourseResource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [deepDivePromptText, setDeepDivePromptText] = useState('');
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [showCiteSection, setShowCiteSection] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'ta';
  const roleLabel = user?.role === 'teacher' ? 'Teacher' : user?.role === 'ta' ? 'TA' : 'Student';

  // Handle prefill from citation buttons and HoverAIOverlay
  useEffect(() => {
    const state = location.state as { prefill?: string } | null;
    if (state?.prefill) {
      setNewThreadContent(state.prefill);
      setShowNewThreadModal(true);
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!deepDiveModalOpen || !courseId) return;

    const loadResources = async () => {
      try {
        const data = await listCourseResources(courseId);
        setCourseResources(data.resources || []);
      } catch (err) {
        console.error('Failed to load discussion resources:', err);
      }
    };

    loadResources();
  }, [deepDiveModalOpen, courseId]);

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const courseData = await apiFetch<CourseInfo>(`/api/student/courses/${courseId}`);
        setCourse(courseData);

        const [messages, limitsData] = await Promise.all([
          listDiscussionMessages(courseId),
          fetchAiLimits().catch(() => null)
        ]);

        if (limitsData && limitsData.available) {
          setAiLimits(limitsData);
        }

        const threadMap = new Map<number, ThreadWithMeta>();
        const repliesMap = new Map<number, DiscussionMessage[]>();

        messages.forEach(msg => {
          if (!msg.parent_id) {
            const content = msg.content || '';
            const thread: ThreadWithMeta = {
              ...msg,
              is_pinned:
                content.toLowerCase().includes('pinned') ||
                content.toLowerCase().includes('announcement'),
              is_locked: false,
              category: categorizeContent(content),
              reply_count: 0,
              view_count: Math.floor(Math.random() * 50) + 10,
              teacher_answered: content.toLowerCase().includes('answer'),
            };
            threadMap.set(msg.id, thread);
          } else {
            const replies = repliesMap.get(msg.parent_id) || [];
            replies.push(msg);
            repliesMap.set(msg.parent_id, replies);
          }
        });

        threadMap.forEach((thread, id) => {
          const replies = repliesMap.get(id) || [];
          thread.reply_count = replies.length;
        });

        const threadArray = Array.from(threadMap.values());
        threadArray.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setThreads(threadArray);
        setRepliesMap(repliesMap);
      } catch (err) {
        console.error('Failed to load discussion:', err);
        setError('Failed to load discussion threads');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  function categorizeContent(content: string): 'assignments' | 'exams' | 'general' {
    const lower = content.toLowerCase();
    if (lower.includes('assignment') || lower.includes('submit') || lower.includes('project'))
      return 'assignments';
    if (lower.includes('exam') || lower.includes('quiz') || lower.includes('test')) return 'exams';
    return 'general';
  }

  const filteredThreads = useMemo(() => {
    if (selectedCategory === 'all') return threads;
    return threads.filter(t => t.category === selectedCategory);
  }, [threads, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: threads.length,
      assignments: threads.filter(t => t.category === 'assignments').length,
      exams: threads.filter(t => t.category === 'exams').length,
      general: threads.filter(t => t.category === 'general').length,
    };
  }, [threads]);

  const appendReplyToThread = (threadId: number, reply: DiscussionMessage) => {
    setRepliesMap(prev => {
      const next = new Map(prev);
      const replies = next.get(threadId) || [];
      next.set(threadId, [...replies, reply]);
      return next;
    });

    setThreads(prev =>
      prev.map(thread =>
        thread.id === threadId ? { ...thread, reply_count: thread.reply_count + 1 } : thread
      )
    );
  };

  const updateMessageContent = (threadId: number, msgId: number, content: string) => {
    setRepliesMap(prev => {
      const next = new Map(prev);
      const list = [...(next.get(threadId) || [])];
      const idx = list.findIndex(m => m.id === msgId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], content };
      }
      next.set(threadId, list);
      return next;
    });
  };

  const replaceMessage = (threadId: number, oldId: number, newMessage: DiscussionMessage) => {
    setRepliesMap(prev => {
      const next = new Map(prev);
      const list = [...(next.get(threadId) || [])];
      const idx = list.findIndex(m => m.id === oldId);
      if (idx !== -1) {
        list[idx] = newMessage;
      }
      next.set(threadId, list);
      return next;
    });
  };

  const openDeepDiveModal = (threadId: number, messageId: number) => {
    setDeepDiveThreadId(threadId);
    setDeepDiveMessageId(messageId);
    const defaultQuery =
      'Please provide a deeper explanation of the last AI response, including examples and a step-by-step breakdown.';
    setDeepDiveQuery(defaultQuery);
    setShowCiteSection(false);
    setSelectedResourceIds([]);
    setDeepDivePromptText('');
    setDeepDiveModalOpen(true);
  };

  const submitDeepDive = async () => {
    if (!courseId || deepDiveThreadId == null || deepDiveMessageId == null) return;
    setIsDeepDiveLoading(true);
    setError(null);
    setDeepDivePromptText('');

    try {
      const result = await requestDiscussionAiDeepDive(
        courseId,
        deepDiveMessageId,
        deepDiveQuery,
        selectedResourceIds
      );
      setDeepDivePromptText(result.prompt);
    } catch (err) {
      console.error('Failed to generate deep dive prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate deep dive prompt');
    } finally {
      setIsDeepDiveLoading(false);
    }
  };

  const handleAiAssist = async (threadId: number, messageId: number, userQuery?: string | null) => {
    if (!courseId) return;

    setAiLoadingByThread(prev => ({ ...prev, [threadId]: true }));
    setError(null);

    try {
      const response = await requestDiscussionAiAssist(courseId, messageId, userQuery || undefined, true);

      if (response instanceof Response) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to start AI stream');

        const decoder = new TextDecoder();
        let fullContent = '';
        const tempId = -Date.now();

        // Add placeholder message
        appendReplyToThread(threadId, {
          id: tempId,
          course_offering_id: Number(courseId),
          user_id: null,
          parent_id: threadId,
          content: '',
          created_at: new Date().toISOString(),
          author_name: 'AI Assistant',
          author_role: 'assistant',
          // @ts-ignore
          is_streaming: true,
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.content) {
                if (fullContent === '') {
                  fullContent = data.content;
                } else {
                  fullContent += data.content;
                }
                updateMessageContent(threadId, tempId, fullContent);
              }
              if (data.done && data.ai_message) {
                replaceMessage(threadId, tempId, data.ai_message);
              }
              if (data.mode === 'fallback_prompt') {
                updateMessageContent(threadId, tempId, data.content);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      } else {
        // Handle non-streaming response
        appendReplyToThread(
          threadId,
          response.ai_message || {
            id: -Date.now(),
            course_offering_id: Number(courseId),
            user_id: null,
            parent_id: threadId,
            content: response.content,
            created_at: new Date().toISOString(),
            author_name: 'AI Assistant',
            author_role: 'assistant',
          }
        );
      }
    } catch (err) {
      console.error('Failed to get AI assist:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI assistance');
    } finally {
      setAiLoadingByThread(prev => ({ ...prev, [threadId]: false }));
    }
  };

  const handlePostThread = async () => {
    if (!newThreadTopic.trim() || !newThreadContent.trim() || !courseId) return;

    setPosting(true);
    try {
      const finalContent = `${newThreadTopic.trim()}\n\n${newThreadContent.trim()}`;
      const result = await postDiscussionMessage(courseId, finalContent);
      const newThread: ThreadWithMeta = {
        ...result.message,
        is_pinned: false,
        is_locked: false,
        category: newThreadCategory,
        reply_count: 0,
        view_count: 1,
        teacher_answered: false,
      };
      setThreads(prev => [newThread, ...prev]);
      const aiQuery = extractAiQuery(newThreadContent);
      setNewThreadTopic('');
      setNewThreadContent('');
      setShowNewThreadModal(false);
      if (aiQuery) {
        await handleAiAssist(newThread.id, newThread.id, aiQuery);
      }
    } catch (err) {
      console.error('Failed to post thread:', err);
      setError('Failed to post thread');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (threadId: number) => {
    if (!replyContent.trim() || !courseId) return;

    setPosting(true);
    try {
      const result = await postDiscussionMessage(courseId, replyContent, threadId);
      const newReply = result.message;
      setRepliesMap(prev => {
        const next = new Map(prev);
        const list = next.get(threadId) || [];
        next.set(threadId, [...list, newReply]);
        return next;
      });
      setThreads(prev =>
        prev.map(t => {
          if (t.id === threadId) {
            return { ...t, reply_count: t.reply_count + 1 };
          }
          return t;
        })
      );
      const aiQuery = extractAiQuery(replyContent);
      setReplyContent('');
      setReplyingTo(null);
      if (aiQuery) {
        await handleAiAssist(threadId, newReply.id, aiQuery);
      }
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteMessage = async (messageId: number, threadId: number) => {
    if (!courseId || !window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const res = await deleteDiscussionMessage(courseId, messageId);
      if (res.hardDelete) {
        // Hard delete: Remove from threads list if it's a root thread, otherwise remove from repliesMap
        setThreads(prev => prev.filter(t => t.id !== messageId));
        setRepliesMap(prev => {
          const next = new Map(prev);
          next.forEach((replies, parentId) => {
            const filtered = replies.filter(r => r.id !== messageId);
            if (filtered.length !== replies.length) {
              next.set(parentId, filtered);
            }
          });
          return next;
        });
      } else {
        // Soft delete: Update the content in UI
        if (threadId === messageId) {
          setThreads(prev => prev.map(t => t.id === messageId ? { ...t, content: '<!--DELETED-->' + t.content, author_name: 'Anonymous', author_role: 'deleted' } : t));
        } else {
          setRepliesMap(prev => {
            const next = new Map(prev);
            next.forEach((replies, parentId) => {
              const updated = replies.map(r => r.id === messageId ? { ...r, content: '<!--DELETED-->' + r.content, author_name: 'Anonymous', author_role: 'deleted' } : r);
              next.set(parentId, updated);
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message.');
    }
  };

  const renderReplies = (parentId: number, rootThreadId: number, depth: number = 1): JSX.Element | null => {
    const replies = repliesMap.get(parentId) || [];
    if (replies.length === 0) return null;

    return (
      <div className="thread-replies" style={{ marginLeft: depth > 1 ? '16px' : '0', borderLeft: depth > 1 ? '2px solid var(--border)' : 'none', paddingLeft: depth > 1 ? '16px' : '0' }}>
        {replies.map(reply => (
          <div key={reply.id} className="reply-wrapper">
            <div
              className={`thread-reply ${reply.author_role === 'assistant' ? 'ai-reply' : ''} ${
                // @ts-ignore
                reply.is_streaming ? 'streaming' : ''
              } ${reply.author_role === 'deleted' ? 'deleted-reply' : ''}`}
            >
              <div className="reply-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{reply.author_name || 'Anonymous'}</strong>
                  {reply.author_role && reply.author_role !== 'deleted' && ` (${reply.author_role})`}
                  {' • '}
                  {formatTimeAgo(reply.created_at)}
                </div>
                <div className="reply-actions-small">
                  {(user?.id === reply.user_id || isTeacher) && reply.author_role !== 'deleted' && (
                    <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => handleDeleteMessage(reply.id, rootThreadId)} title="Delete message">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="reply-content" style={{ opacity: reply.author_role === 'deleted' ? 0.6 : 1 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(reply.content || '').replace(/^<!--DELETED-->/, '')}
                </ReactMarkdown>
                {/* @ts-ignore */}
                {reply.is_streaming && <span className="streaming-cursor">|</span>}
              </div>
              
              {reply.author_role === 'assistant' && !reply.is_streaming && (
                <div className="deep-dive-footer">
                  <span>Want a deeper explanation?</span>
                  <button
                    className="btn btn-ghost deep-dive-btn"
                    onClick={() => openDeepDiveModal(rootThreadId, reply.id)}
                  >
                    Ask for deep dive
                  </button>
                </div>
              )}

              {depth < 5 && (
                <div className="reply-to-reply-section" style={{ marginTop: '8px' }}>
                  {replyingTo === reply.id ? (
                    <div className="reply-form">
                      <textarea
                        className="reply-textarea"
                        placeholder="Write a reply... Use @ai to invite the assistant into the thread."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        disabled={posting}
                      />
                      <div className="reply-actions" style={{ marginTop: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleReply(reply.id)}
                          disabled={!replyContent.trim() || posting}
                        >
                          {posting ? 'Posting...' : 'Reply'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '13px' }} onClick={() => setReplyingTo(reply.id)}>
                      Reply
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Recursively render children of this reply */}
            {renderReplies(reply.id, rootThreadId, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="discussion-page">
        <div className="discussion-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading discussions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discussion-page">
      <div className="discussion-container">
        {/* Editorial Header Section */}
        <header className="discussion-header">
          <div className="discussion-header-info">
            <div className="discussion-header-top">
              <span className="role-pill">
                <span className="role-pill-text">{roleLabel}</span>
              </span>
              <span className="course-divider">
                / {course?.course_code} {course?.course_title}
              </span>
            </div>
            <h1 className="discussion-title">Discussion Forum</h1>
            <p className="discussion-subtitle">
              A quiet place for rigorous academic exchange and collaborative inquiry.
            </p>
          </div>
          <div className="discussion-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-primary" onClick={() => setShowNewThreadModal(true)}>
              <span className="material-symbols-outlined">add_comment</span>
              New Thread
            </button>
          </div>
        </header>

        {/* Forum Layout (Asymmetrical Bento) */}
        <div className="discussion-layout">
          {/* Sidebar: Categories & Filters */}
          <aside className="discussion-sidebar">
            <section className="sidebar-section">
              <h4 className="sidebar-title">Inquiry Domains</h4>
              <div className="category-list">
                <button
                  className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <div className="category-btn-left">
                    <span className="material-symbols-outlined">all_inbox</span>
                    <span>All Threads</span>
                  </div>
                  <span className="category-count">{categoryCounts.all}</span>
                </button>
                <button
                  className={`category-btn ${selectedCategory === 'assignments' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('assignments')}
                >
                  <div className="category-btn-left">
                    <span className="material-symbols-outlined">assignment_late</span>
                    <span>Assignments</span>
                  </div>
                  <span className="category-count">{categoryCounts.assignments}</span>
                </button>
                <button
                  className={`category-btn ${selectedCategory === 'exams' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('exams')}
                >
                  <div className="category-btn-left">
                    <span className="material-symbols-outlined">quiz</span>
                    <span>Exams</span>
                  </div>
                  <span className="category-count">{categoryCounts.exams}</span>
                </button>
                <button
                  className={`category-btn ${selectedCategory === 'general' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('general')}
                >
                  <div className="category-btn-left">
                    <span className="material-symbols-outlined">forum</span>
                    <span>General</span>
                  </div>
                  <span className="category-count">{categoryCounts.general}</span>
                </button>
              </div>
            </section>

            {isTeacher && (
              <section className="sidebar-section">
                <h4 className="sidebar-title">Moderation Tools</h4>
                <div className="moderation-list">
                  <label className="toggle-item">
                    <div
                      className={`toggle-switch ${autoLockEnabled ? 'on' : ''}`}
                      onClick={() => setAutoLockEnabled(!autoLockEnabled)}
                    >
                      <div className="toggle-knob"></div>
                    </div>
                    <span>Auto-lock after 7 days</span>
                  </label>
                  <label className="toggle-item">
                    <div
                      className={`toggle-switch ${anonymityEnabled ? 'on' : ''}`}
                      onClick={() => setAnonymityEnabled(!anonymityEnabled)}
                    >
                      <div className="toggle-knob"></div>
                    </div>
                    <span>Student anonymity active</span>
                  </label>
                </div>
              </section>
            )}
          </aside>

          {/* Main Feed: Threads */}
          <main className="discussion-feed">
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {filteredThreads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No discussions yet</h3>
                <p>Be the first to start a conversation!</p>
                <button className="btn btn-primary" onClick={() => setShowNewThreadModal(true)}>
                  Start a Thread
                </button>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <article
                  key={thread.id}
                  className={`thread-item ${thread.is_pinned ? 'pinned' : ''} ${thread.is_locked ? 'locked' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="thread-meta">
                        {thread.is_pinned && (
                          <>
                            <span className="material-symbols-outlined pinned-icon">push_pin</span>
                            <span className="pinned-label">PINNED ANNOUNCEMENT</span>
                            <span className="meta-divider">•</span>
                          </>
                        )}
                        {thread.category && (
                          <>
                            <span className={`category-label ${thread.category}`}>
                              {thread.category === 'assignments'
                                ? 'Assignments'
                                : thread.category === 'exams'
                                  ? 'Exams'
                                  : 'General'}
                            </span>
                            <span className="meta-divider">•</span>
                          </>
                        )}
                        <span className="thread-time">{formatTimeAgo(thread.created_at)}</span>
                      </div>
                      <h3 className="thread-title">
                        {thread.content.split('\n')[0].substring(0, 100)}
                      </h3>
                      <div className="thread-content" style={{ opacity: thread.author_role === 'deleted' ? 0.6 : 1 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {(() => {
                            const lines = (thread.content || '').replace(/^<!--DELETED-->/, '').split('\n');
                            const body = lines.slice(1).join('\n').trim();
                            return body || thread.content.replace(/^<!--DELETED-->/, '') || '';
                          })()}
                        </ReactMarkdown>
                      </div>
                      <div className="thread-stats">
                        <div className="stat-item">
                          <span className="material-symbols-outlined">forum</span>
                          {thread.reply_count} {thread.reply_count === 1 ? 'Reply' : 'Replies'}
                        </div>
                        <div className="stat-item">
                          <span className="material-symbols-outlined">visibility</span>
                          {thread.view_count} Views
                        </div>
                        {thread.teacher_answered && (
                          <div className="teacher-answered">
                            <span className="material-symbols-outlined">verified</span>
                            Teacher Answered
                          </div>
                        )}
                        {thread.is_locked && (
                          <>
                            <span className="material-symbols-outlined lock-icon">lock</span>
                            <span className="archived-text">Archived by Instructor</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="thread-actions">
                      {isTeacher && (
                        <button className="action-btn" title={thread.is_pinned ? 'Unpin' : 'Pin'}>
                          <span className="material-symbols-outlined">
                            {thread.is_pinned ? 'keep_off' : 'push_pin'}
                          </span>
                        </button>
                      )}
                      {isTeacher && (
                        <button
                          className="action-btn"
                          title={thread.is_locked ? 'Unlock' : 'Lock Thread'}
                        >
                          <span className="material-symbols-outlined">
                            {thread.is_locked ? 'lock' : 'lock_open'}
                          </span>
                        </button>
                      )}
                      {(user?.id === thread.user_id || isTeacher) && thread.author_role !== 'deleted' && (
                        <button className="action-btn" title="Delete Thread" onClick={() => handleDeleteMessage(thread.id, thread.id)}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Replies (Nested) */}
                  {renderReplies(thread.id, thread.id, 1)}
                  {/* Root Reply Form */}
                  {replyingTo === thread.id ? (
                    <div className="reply-form" style={{ marginTop: '16px' }}>
                      <textarea
                        className="reply-textarea"
                        placeholder="Write a reply... Use @ai to invite the assistant into the thread."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        disabled={posting}
                      />
                      <div className="reply-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleReply(thread.id)}
                          disabled={!replyContent.trim() || posting}
                        >
                          {posting ? 'Posting...' : 'Reply'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setReplyingTo(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="reply-btn" style={{ marginTop: '16px' }} onClick={() => setReplyingTo(thread.id)}>
                      Reply to Original Post
                    </button>
                  )}
                </article>
              ))
            )}

            {/* Empty Space for Editorial Balance */}
            <div className="load-more">
              <button className="load-more-btn">Load historical inquiries</button>
            </div>
          </main>
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="modal-overlay" onClick={() => setShowNewThreadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start a New Thread</h2>
              <button className="modal-close" onClick={() => setShowNewThreadModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category</label>
                <div className="category-select">
                  <button
                    className={`cat-option ${newThreadCategory === 'general' ? 'selected' : ''}`}
                    onClick={() => setNewThreadCategory('general')}
                  >
                    General
                  </button>
                  <button
                    className={`cat-option ${newThreadCategory === 'assignments' ? 'selected' : ''}`}
                    onClick={() => setNewThreadCategory('assignments')}
                  >
                    Assignments
                  </button>
                  <button
                    className={`cat-option ${newThreadCategory === 'exams' ? 'selected' : ''}`}
                    onClick={() => setNewThreadCategory('exams')}
                  >
                    Exams
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Topic</label>
                <input
                  type="text"
                  className="thread-input"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text)', marginBottom: '16px', fontSize: '15px' }}
                  placeholder="Enter the thread topic..."
                  value={newThreadTopic}
                  onChange={e => setNewThreadTopic(e.target.value)}
                  disabled={posting}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="thread-textarea"
                  placeholder="Share your thoughts, ask questions, or start a conversation... Use @ai to summon the assistant."
                  value={newThreadContent}
                  onChange={e => setNewThreadContent(e.target.value)}
                  rows={6}
                  disabled={posting}
                />
                
                {/* Citation Preview */}
                {newThreadContent.includes('[Citing:') && (
                  <div className="citation-detection-preview">
                    <div className="citation-preview-header">
                      <span className="material-symbols-outlined">link</span>
                      <span>Referenced Resources Detected</span>
                    </div>
                    <div className="citation-preview-list">
                      {newThreadContent.match(/\[Citing: (.*?)\]\((.*?)\)/g)?.map((match, idx) => {
                        const titleMatch = match.match(/\[Citing: (.*?)\]/);
                        return (
                          <div key={idx} className="citation-preview-item">
                            <span className="material-symbols-outlined">description</span>
                            <span className="citation-title">{titleMatch ? titleMatch[1] : 'Resource'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewThreadModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePostThread}
                disabled={!newThreadTopic.trim() || !newThreadContent.trim() || posting}
              >
                {posting ? 'Posting...' : 'Post Thread'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={deepDiveModalOpen}
        onClose={() => setDeepDiveModalOpen(false)}
        title="Ask AI for a deep dive"
      >
        <p className="modal-text">
          Ask the AI to produce a ChatGPT prompt and context summary for a more detailed follow-up answer.
        </p>
        <label className="modal-label">Deep dive question</label>
        <textarea
          className="deep-dive-textarea"
          value={deepDiveQuery}
          onChange={e => {
            const nextValue = e.target.value;
            setDeepDiveQuery(nextValue);
            if (nextValue.toLowerCase().includes('@cite')) {
              setShowCiteSection(true);
            }
          }}
          rows={5}
        />
        <button
          className="btn btn-ghost cite-toggle-btn"
          onClick={() => {
            if (!deepDiveQuery.toLowerCase().includes('@cite')) {
              setDeepDiveQuery(prev => prev.trim() + ' @cite');
            }
            setShowCiteSection(true);
          }}
        >
          Add @cite and select resources
        </button>

        <div className="cite-resources-section" style={{ display: showCiteSection ? 'block' : 'none' }}>
          <div className="cite-header">
            <span className="cite-title">Cite course resources</span>
            <span className="cite-subtitle">Select resources to include metadata in the prompt.</span>
          </div>
          {courseResources.length === 0 ? (
            <p className="cite-note">No course resources available or loaded yet.</p>
          ) : (
            <div className="resource-list">
              {courseResources.map(resource => (
                <label key={resource.id} className="resource-item">
                  <input
                    type="checkbox"
                    checked={selectedResourceIds.includes(resource.id)}
                    onChange={() => {
                      setSelectedResourceIds(prev =>
                        prev.includes(resource.id)
                          ? prev.filter(id => id !== resource.id)
                          : [...prev, resource.id]
                      );
                    }}
                  />
                  <span>
                    <strong>{resource.title}</strong> ({resource.resource_type})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {deepDivePromptText ? (
          <div className="deep-dive-result">
            <h4>Copy this prompt into ChatGPT or another LLM</h4>
            <textarea
              className="deep-dive-textarea"
              readOnly
              value={deepDivePromptText}
              rows={10}
            />
            <button
              className="btn btn-secondary"
              onClick={() => navigator.clipboard.writeText(deepDivePromptText)}
            >
              Copy Prompt
            </button>
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDeepDiveModalOpen(false)}>
            Close
          </button>
          <button className="btn btn-primary" onClick={submitDeepDive} disabled={isDeepDiveLoading}>
            {isDeepDiveLoading ? 'Generating…' : 'Generate Prompt'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
