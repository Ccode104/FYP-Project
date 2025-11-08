import { type DiscussionMessage } from '../../services/discussion'

export default function DiscussionForum({
  loading,
  threads,
  repliesMap,
  newPostContent,
  onChangeNewPost,
  onPost,
  replyingTo,
  replyContent,
  onReplyChange,
  onStartReply,
  onSubmitReply,
  onCancelReply,
}: {
  loading: boolean
  threads: DiscussionMessage[]
  repliesMap: Map<number, DiscussionMessage[]>
  newPostContent: string
  onChangeNewPost: (v: string) => void
  onPost: () => void
  replyingTo: number | null
  replyContent: string
  onReplyChange: (v: string) => void
  onStartReply: (id: number) => void
  onSubmitReply: (id: number) => void
  onCancelReply: () => void
}) {
  return (
    <section className="card">
      <h3>Discussion Forum</h3>
      <div className="discussion-wrap">
        <div className="discussion-new">
          <textarea
            className="input"
            placeholder="Start a new discussion..."
            value={newPostContent}
            onChange={(e) => onChangeNewPost(e.target.value)}
            rows={3}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={onPost}
            disabled={!newPostContent.trim() || loading}
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {loading && threads.length === 0 ? (
          <p className="muted">Loading discussions...</p>
        ) : threads.length === 0 ? (
          <p className="muted">No discussions yet. Be the first to start one!</p>
        ) : (
          <ul className="discussion-list">
            {threads.map((thread) => {
              const replies = repliesMap.get(thread.id) || []
              return (
                <li key={thread.id} className="discussion-thread">
                  <div className="discussion-meta">
                    <strong>{thread.author_name || 'Anonymous'}</strong>
                    {thread.author_role && ` (${thread.author_role})`}
                    {' • '}
                    {new Date(thread.created_at).toLocaleString()}
                  </div>
                  <div className="discussion-content">{thread.content}</div>

                  {replies.length > 0 && (
                    <div className="discussion-replies">
                      {replies.map((reply) => (
                        <div key={reply.id} className="discussion-reply">
                          <div className="discussion-meta">
                            <strong>{reply.author_name || 'Anonymous'}</strong>
                            {reply.author_role && ` (${reply.author_role})`}
                            {' • '}
                            {new Date(reply.created_at).toLocaleString()}
                          </div>
                          <div className="discussion-content">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === thread.id ? (
                    <div className="discussion-reply-form">
                      <textarea
                        className="input"
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => onReplyChange(e.target.value)}
                        rows={2}
                        disabled={loading}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSubmitReply(thread.id)}
                          disabled={!replyContent.trim() || loading}
                        >
                          {loading ? 'Posting...' : 'Reply'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={onCancelReply}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => onStartReply(thread.id)}
                      style={{ marginTop: '12px' }}
                    >
                      Reply
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
