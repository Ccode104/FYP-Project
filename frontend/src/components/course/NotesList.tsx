type Item = {
  id: string | number;
  filename?: string;
  title?: string;
  storage_path: string;
};

export default function NotesList({
  isBackend,
  items,
}: {
  isBackend: boolean;
  items: Item[];
}) {
  return (
    <section className="assignments-section">
      <div className="section-header">
        <h2 className="section-title">Course Notes</h2>
        <span className="assignment-count">{items.length} available</span>
      </div>

      {isBackend ? (
        items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <h3>No notes yet</h3>
            <p>
              Course notes and study materials will appear here once uploaded by
              your instructor.
            </p>
          </div>
        ) : (
          <div className="resources-grid">
            {items.map((n) => (
              <a
                key={n.id}
                href={n.storage_path}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card"
              >
                <div className="resource-icon">📚</div>
                <div className="resource-info">
                  <h4 className="resource-title">{n.filename || n.title}</h4>
                  <span className="resource-type">Study Material</span>
                </div>
                <svg
                  className="resource-arrow"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </a>
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Backend mode only</h3>
          <p>Notes are available when connected to the backend server.</p>
        </div>
      )}
    </section>
  );
}
