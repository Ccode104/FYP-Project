type Item = { id: string|number; filename?: string; title?: string; storage_path: string }

export default function NotesList({ isBackend, items }: { isBackend: boolean; items: Item[] }) {
  return (
    <section className="card">
      <h3>Notes</h3>
      {isBackend ? (
        items.length === 0 ? <p className="muted">No notes available.</p> : (
          <ul className="list">
            {items.map((n) => (
              <li key={n.id}>
                <a href={n.storage_path} target="_blank" rel="noopener noreferrer">{n.filename || n.title}</a>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="muted">Notes available in backend mode only.</p>
      )}
    </section>
  )
}
