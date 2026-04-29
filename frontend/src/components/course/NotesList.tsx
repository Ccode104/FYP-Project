import { useNavigate, useParams } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const handleCite = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    if (!courseId) return;
    const title = item.filename || item.title || 'Untitled Note';
    navigate(`/courses/${courseId}/discussion`, {
      state: {
        prefill: `[Citing: ${title}](${item.storage_path})\n\n`,
      },
    });
  };
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
            {items.map((n) => {
              console.log('NotesList item:', { id: n.id, storage_path: n.storage_path, filename: n.filename, title: n.title });
              return (
                <div
                  key={n.id}
                  className="resource-card"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Opening notes PDF:', n.storage_path);
                    if (!n.storage_path || n.storage_path === 'null' || n.storage_path === '') {
                      alert('PDF file not available');
                      return;
                    }

                    // Simply open the URL directly - Cloudinary URLs should be accessible
                    window.open(n.storage_path, '_blank');
                  }}
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
                <button
                  className="resource-cite-btn"
                  title="Cite in Discussion"
                  onClick={(e) => handleCite(e, n)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_quote</span>
                </button>
              </div>
              );
            })}
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
