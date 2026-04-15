CREATE TABLE IF NOT EXISTS assignment_sheets (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  spreadsheet_id TEXT UNIQUE NOT NULL,
  spreadsheet_url TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_sheets_assignment ON assignment_sheets(assignment_id);
