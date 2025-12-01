import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';

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
      const data = await apiFetch<Comment[]>(`/assignments/${assignmentId}/comments`);
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

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch(`/assignments/${assignmentId}/comments`, {
        method: 'POST',
        body: { content: newComment.trim() }
      });
      Alert.alert('Success', 'Comment posted successfully!');
      setNewComment('');
      loadComments(); // Refresh comments
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      Alert.alert('Error', error?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch(`/assignments/${assignmentId}/comments`, {
        method: 'POST',
        body: { content: replyContent.trim(), parentId }
      });
      Alert.alert('Success', 'Reply posted successfully!');
      setReplyContent('');
      setReplyingTo(null);
      loadComments(); // Refresh comments
    } catch (error: any) {
      console.error('Failed to post reply:', error);
      Alert.alert('Error', error?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'faculty': return 'Instructor';
      case 'ta': return 'TA';
      case 'admin': return 'Admin';
      default: return 'Student';
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <View key={comment.id} style={[styles.comment, isReply && styles.reply, comment.is_instructor_reply && styles.instructor]}>
      <View style={styles.commentHeader}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{comment.author_name}</Text>
          <Text style={[styles.authorRole, comment.author_role === 'faculty' && styles.instructorRole]}>
            {getRoleDisplay(comment.author_role)}
          </Text>
        </View>
        <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
      {!isReply && user && (
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
      )}
      {replyingTo === comment.id && (
        <View style={styles.replyForm}>
          <TextInput
            style={styles.replyInput}
            value={replyContent}
            onChangeText={setReplyContent}
            placeholder="Write your reply..."
            multiline
            numberOfLines={3}
          />
          <View style={styles.replyActions}>
            <TouchableOpacity
              style={[styles.submitReplyButton, (!replyContent.trim() || submitting) && styles.disabledButton]}
              onPress={() => handleSubmitReply(comment.id)}
              disabled={!replyContent.trim() || submitting}
            >
              <Text style={styles.submitReplyText}>
                {submitting ? 'Posting...' : 'Post Reply'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelReplyButton}
              onPress={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
            >
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.replies}>
          {comment.replies.map(reply => renderComment(reply, true))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Questions & Discussions</Text>

      {/* New Comment Form */}
      {user && (
        <View style={styles.newCommentForm}>
          <Text style={styles.formTitle}>Ask a Question</Text>
          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Have a question about this assignment? Ask here..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitButton, (!newComment.trim() || submitting) && styles.disabledButton]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Posting...' : 'Post Question'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comments List */}
      <View style={styles.commentsList}>
        {comments.length === 0 ? (
          <View style={styles.noComments}>
            <Text style={styles.noCommentsText}>No questions yet. Be the first to ask!</Text>
          </View>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  loading: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    padding: 20,
  },
  newCommentForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
    marginBottom: 12,
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  commentsList: {
    // Container for comments
  },
  noComments: {
    alignItems: 'center',
    padding: 40,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  comment: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reply: {
    marginLeft: 20,
    backgroundColor: '#f8f9fa',
  },
  instructor: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  authorRole: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e9ecef',
    color: '#666',
  },
  instructorRole: {
    backgroundColor: '#cce5ff',
    color: '#007bff',
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
  },
  replyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  replyButtonText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  replyForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
    marginBottom: 8,
    minHeight: 60,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  submitReplyButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  submitReplyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelReplyButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelReplyText: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
  },
  replies: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
});