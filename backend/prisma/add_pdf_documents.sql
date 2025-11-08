-- Table for storing PDF documents and their extracted text
CREATE TABLE IF NOT EXISTS pdf_documents (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_documents_uploaded_by ON pdf_documents(uploaded_by);
