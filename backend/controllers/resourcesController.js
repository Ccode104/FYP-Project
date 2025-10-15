import { pool } from '../db/index.js';

export async function createResource(req, res) {
  const { course_offering_id, title, description, resource_type, storage_path, filename } = req.body;
  const uploaded_by = req.user?.id || null;
  const q = `INSERT INTO resources (course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const r = await pool.query(q, [course_offering_id, uploaded_by, title, description, resource_type, storage_path, filename]);
  res.json(r.rows[0]);
}

export async function listResources(req, res) {
  const offeringId = req.query.offeringId;
  const q = `SELECT * FROM resources WHERE course_offering_id = $1 ORDER BY uploaded_at DESC`;
  const r = await pool.query(q, [offeringId]);
  res.json(r.rows);
}

// Upload a new resource (faculty/ta)
export async function uploadResource(req, res) {
  // TODO: Implement file upload logic and DB insert
  res.json({ message: 'uploadResource not implemented' });
}

// Delete a resource (faculty/ta)
export async function deleteResource(req, res) {
  // TODO: Implement resource deletion logic
  res.json({ message: 'deleteResource not implemented' });
}

// Get a single resource by ID
export async function getResourceById(req, res) {
  // TODO: Implement logic to fetch a resource by its ID
  res.json({ message: 'getResourceById not implemented' });
}

// Update resource metadata (faculty/ta)
export async function updateResource(req, res) {
  // TODO: Implement logic to update resource metadata
  res.json({ message: 'updateResource not implemented' });
}

// Get all resources (PYQs, notes, assignments) for a course offering
export async function getCourseResources(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM resources WHERE course_offering_id = $1`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseResources error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get only PYQs for a course offering
export async function getCoursePYQs(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM resources WHERE course_offering_id = $1 AND resource_type = 'pyq'`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCoursePYQs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get only notes for a course offering
export async function getCourseNotes(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM resources WHERE course_offering_id = $1 AND resource_type = 'lecture_note'`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseNotes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get only assignments for a course offering
export async function getCourseAssignments(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      `SELECT * FROM assignments WHERE course_offering_id = $1`,
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseAssignments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
