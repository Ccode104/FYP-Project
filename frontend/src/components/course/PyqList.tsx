type Item = { id: string|number; filename?: string; title?: string; storage_path: string }

export default function PyqList({ isBackend, items }: { isBackend: boolean; items: Item[] }) {
  return (
    <section className="card">
      <h3>Previous Year Questions</h3>
      {isBackend ? (
        items.length === 0 ? <p className="muted">No PYQs available.</p> : (
          <ul className="list">
            {items.map((p) => (
              <li key={p.id}>
                <a href={p.storage_path} target="_blank" rel="noopener noreferrer">{p.filename || p.title}</a>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="muted">PYQs available in backend mode only.</p>
      )}
    </section>
  )
}
