import { type DiscussionMessage } from "../../services/discussion";

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
  loading: boolean;
  threads: DiscussionMessage[];
  repliesMap: Map<number, DiscussionMessage[]>;
  newPostContent: string;
  onChangeNewPost: (v: string) => void;
  onPost: () => void;
  replyingTo: number | null;
  replyContent: string;
  onReplyChange: (v: string) => void;
  onStartReply: (id: number) => void;
  onSubmitReply: (id: number) => void;
  onCancelReply: () => void;
}) {
  return (
    <>
      <div className="discussion-wrap">
        <div className="discussion-new-card">
          <h4 className="discussion-new-title">Start a Discussion</h4>
          <textarea
            className="discussion-textarea"
            placeholder="Share your thoughts, ask questions, or start a conversation..."
            value={newPostContent}
            onChange={(e) => onChangeNewPost(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <button
            className="btn-submit"
            onClick={onPost}
            disabled={!newPostContent.trim() || loading}
          >
            <span>{loading ? "Posting..." : "Post Discussion"}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
            </svg>
          </button>
        </div>

        {loading && threads.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading discussions...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No discussions yet</h3>
            <p>
              Be the first to start a conversation! Share your thoughts or ask
              questions above.
            </p>
          </div>
        ) : (
          <ul className="discussion-list">
            {threads.map((thread) => {
              const replies = repliesMap.get(thread.id) || [];
              return (
                <li key={thread.id} className="discussion-thread">
                  <div className="discussion-meta">
                    <strong>{thread.author_name || "Anonymous"}</strong>
                    {thread.author_role && ` (${thread.author_role})`}
                    {" • "}
                    {new Date(thread.created_at).toLocaleString()}
                  </div>
                  <div className="discussion-content">{thread.content}</div>

                  {replies.length > 0 && (
                    <div className="discussion-replies">
                      {replies.map((reply) => (
                        <div key={reply.id} className="discussion-reply">
                          <div className="discussion-meta">
                            <strong>{reply.author_name || "Anonymous"}</strong>
                            {reply.author_role && ` (${reply.author_role})`}
                            {" • "}
                            {new Date(reply.created_at).toLocaleString()}
                          </div>
                          <div className="discussion-content">
                            {reply.content}
                          </div>
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
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSubmitReply(thread.id)}
                          disabled={!replyContent.trim() || loading}
                        >
                          {loading ? "Posting..." : "Reply"}
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
                      style={{ marginTop: "12px" }}
                    >
                      Reply
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
