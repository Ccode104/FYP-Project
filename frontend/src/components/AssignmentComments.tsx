import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useToast } from './ToastProvider';

interface Comment {
  id: number;
  assignment_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  is_instructor_reply: boolean;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_role: string;
  replies?: Comment[];
}

interface AssignmentCommentsProps {
  assignmentId: number;
}

export default function AssignmentComments({ assignmentId }: AssignmentCommentsProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [assignmentId]);

  const loadComments = async () => {
    try {
      const data = await apiFetch<Comment[]>(`/api/assignments/${assignmentId}/comments`);
      // Organize comments into threads
      const threadedComments = organizeComments(data);
      setComments(threadedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeComments = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map and identify root comments
    flatComments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
      if (!comment.parent_id) {
        rootComments.push(comment);
      }
    });

    // Second pass: attach replies to parents
    flatComments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies!.push(comment);
        }
      }
    });

    return rootComments;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch('/api/assignments/' + assignmentId + '/comments', {
        method: 'POST',
        body: { content: newComment.trim() }
      });
      toast?.push({ kind: 'success', message: 'Comment posted successfully!' });
      setNewComment('');
      loadComments(); // Refresh comments
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      toast?.push({ kind: 'error', message: error?.message || 'Failed to post comment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch('/api/assignments/' + assignmentId + '/comments', {
        method: 'POST',
        body: { content: replyContent.trim(), parentId }
      });
      toast?.push({ kind: 'success', message: 'Reply posted successfully!' });
      setReplyContent('');
      setReplyingTo(null);
      loadComments(); // Refresh comments
    } catch (error: any) {
      console.error('Failed to post reply:', error);
      toast?.push({ kind: 'error', message: error?.message || 'Failed to post reply' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`comment ${isReply ? 'reply' : ''} ${comment.is_instructor_reply ? 'instructor' : 'student'}`}>
      <div className="comment-header">
        <div className="author-info">
          <span className="author-name">{comment.author_name}</span>
          <span className={`author-role ${comment.author_role}`}>
            {comment.author_role === 'faculty' ? 'Instructor' :
             comment.author_role === 'ta' ? 'TA' :
             comment.author_role === 'admin' ? 'Admin' : 'Student'}
          </span>
        </div>
        <span className="comment-date">{formatDate(comment.created_at)}</span>
      </div>
      <div className="comment-content">
        {comment.content}
      </div>
      {!isReply && user && (
        <div className="comment-actions">
          <button
            className="reply-btn"
            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          >
            Reply
          </button>
        </div>
      )}
      {replyingTo === comment.id && (
        <div className="reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            rows={3}
          />
          <div className="reply-actions">
            <button
              onClick={() => handleSubmitReply(comment.id)}
              disabled={!replyContent.trim() || submitting}
              className="submit-reply-btn"
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
            <button
              onClick={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
              className="cancel-reply-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="assignment-comments"><div className="loading">Loading comments...</div></div>;
  }

  return (
    <div className="assignment-comments">
      <h2>Questions & Discussions</h2>

      {/* New Comment Form */}
      {user && (
        <div className="new-comment-form">
          <h3>Ask a Question</h3>
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Have a question about this assignment? Ask here..."
              rows={4}
              required
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="submit-comment-btn"
            >
              {submitting ? 'Posting...' : 'Post Question'}
            </button>
          </form>
        </div>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
}