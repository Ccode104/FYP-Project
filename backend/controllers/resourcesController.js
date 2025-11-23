import { pool } from '../db/index.js';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

// Configure Cloudinary (should be done once, but ensuring here)
if (!cloudinary.config().cloud_name) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

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

    // Upload to Cloudinary
    const publicId = `lms_resources/${uuidv4()}_${Date.now()}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'raw', // For PDFs and documents
          folder: 'lms_resources'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

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
      uploadResult.secure_url,
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

    // Get resource info first to delete from Cloudinary
    const resourceQuery = `SELECT storage_path FROM resources WHERE id = $1`;
    const resourceResult = await pool.query(resourceQuery, [id]);

    if (resourceResult.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceResult.rows[0];

    // Delete from Cloudinary if it's a Cloudinary URL
    if (resource.storage_path && resource.storage_path.includes('cloudinary')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = resource.storage_path.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = `lms_resources/${publicIdWithExtension.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch (cloudinaryError) {
        console.warn('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    const deleteQuery = `DELETE FROM resources WHERE id = $1 RETURNING *`;
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

    const query = `SELECT * FROM resources WHERE id = $1`;
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

    res.json({
      message: 'Resource updated successfully',
      resource: result.rows[0]
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
