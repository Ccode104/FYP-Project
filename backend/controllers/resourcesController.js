import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const resourceStorageDir = path.join(process.cwd(), 'uploads', 'resources');

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
  const q = 'SELECT * FROM resources WHERE course_offering_id = $1 ORDER BY uploaded_at DESC';
  const r = await pool.query(q, [offeringId]);
  res.json(r.rows);
}

// Upload a new resource (faculty/ta)
export async function uploadResource(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { offeringId } = req.params;
    const { type } = req.body; // 'pyq' or 'lecture_note'

    if (!offeringId || !type) {
      return res.status(400).json({ error: 'Missing offeringId or type' });
    }

    if (!['pyq', 'lecture_note'].includes(type)) {
      return res.status(400).json({ error: 'Invalid resource type. Must be pyq or lecture_note' });
    }

    await fs.mkdir(resourceStorageDir, { recursive: true });
    const filenameOnDisk = `${uuidv4()}_${Date.now()}_${path.basename(req.file.originalname)}`;
    const storagePath = path.join(resourceStorageDir, filenameOnDisk);
    await fs.writeFile(storagePath, req.file.buffer);

    // Insert into database
    const query = `
      INSERT INTO resources (course_offering_id, uploaded_by, resource_type, storage_path, filename)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      offeringId,
      req.user?.id,
      type,
      storagePath,
      req.file.originalname
    ];

    const result = await pool.query(query, values);
    const resource = result.rows[0];

    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: {
        id: resource.id,
        filename: resource.filename,
        storage_path: resource.storage_path,
        resource_type: resource.resource_type,
        uploaded_at: resource.uploaded_at
      }
    });
  } catch (error) {
    console.error('uploadResource error:', error);
    res.status(500).json({ error: 'Failed to upload resource', details: error.message });
  }
}

// Delete a resource (faculty/ta)
export async function deleteResource(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    const resourceQuery = 'SELECT storage_path FROM resources WHERE id = $1';
    const resourceResult = await pool.query(resourceQuery, [id]);

    if (resourceResult.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceResult.rows[0];

    if (resource.storage_path && !resource.storage_path.startsWith('http')) {
      try {
        await fs.unlink(resource.storage_path);
      } catch (unlinkError) {
        console.warn('Failed to delete local resource file:', unlinkError);
      }
    }

    // Delete from database
    const deleteQuery = 'DELETE FROM resources WHERE id = $1 RETURNING *';
    const deleteResult = await pool.query(deleteQuery, [id]);

    res.json({
      message: 'Resource deleted successfully',
      resource: deleteResult.rows[0]
    });
  } catch (error) {
    console.error('deleteResource error:', error);
    res.status(500).json({ error: 'Failed to delete resource', details: error.message });
  }
}

// Get a single resource by ID
export async function getResourceById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    const query = 'SELECT * FROM resources WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('getResourceById error:', error);
    res.status(500).json({ error: 'Failed to fetch resource', details: error.message });
  }
}

// Update resource metadata (faculty/ta)
export async function updateResource(req, res) {
  try {
    const { id } = req.params;
    const { filename, title, description } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    const query = `
      UPDATE resources
      SET filename = COALESCE($2, filename),
          title = COALESCE($3, title),
          description = COALESCE($4, description),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    const values = [id, filename, title, description];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const updated = result.rows[0];

    res.json({
      message: 'Resource updated successfully',
      resource: updated
    });
  } catch (error) {
    console.error('updateResource error:', error);
    res.status(500).json({ error: 'Failed to update resource', details: error.message });
  }
}

// Get all resources (PYQs, notes, assignments) for a course offering
export async function getCourseResources(req, res) {
  try {
    const { offeringId } = req.params;
    const result = await pool.query(
      'SELECT * FROM resources WHERE course_offering_id = $1',
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
      'SELECT * FROM resources WHERE course_offering_id = $1 AND resource_type = \'pyq\'',
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
      'SELECT * FROM resources WHERE course_offering_id = $1 AND resource_type = \'lecture_note\'',
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
      'SELECT * FROM assignments WHERE course_offering_id = $1',
      [offeringId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCourseAssignments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
