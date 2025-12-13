import { pool } from '../db/index.js';

// Create a new rubric
export async function createRubric(req, res) {
  const { title, description, course_offering_id, criteria } = req.body;
  const created_by = req.user?.id;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create rubric
      const rubricQuery = `
        INSERT INTO rubrics (title, description, course_offering_id, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const rubricResult = await client.query(rubricQuery, [title, description, course_offering_id, created_by]);
      const rubric = rubricResult.rows[0];

      // Add criteria if provided
      if (criteria && Array.isArray(criteria) && criteria.length > 0) {
        const criteriaValues = criteria.map((c, index) =>
          `(${rubric.id}, '${c.title}', '${c.description || ''}', ${c.max_points || 10}, ${c.weight || 1.0}, ${index + 1})`
        ).join(', ');
        const criteriaQuery = `
          INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position)
          VALUES ${criteriaValues}
        `;
        await client.query(criteriaQuery);
      }

      await client.query('COMMIT');
      res.json({ rubric, message: 'Rubric created successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating rubric:', error);
    res.status(500).json({ error: 'Failed to create rubric' });
  }
}

// Get rubrics for a course offering
export async function getRubrics(req, res) {
  const { courseOfferingId } = req.params;

  try {
    const query = `
      SELECT r.*,
             json_agg(
               json_build_object(
                 'id', rc.id,
                 'title', rc.title,
                 'description', rc.description,
                 'max_points', rc.max_points,
                 'weight', rc.weight,
                 'position', rc.position
               ) ORDER BY rc.position
             ) as criteria
      FROM rubrics r
      LEFT JOIN rubric_criteria rc ON r.id = rc.rubric_id
      WHERE r.course_offering_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [courseOfferingId]);
    res.json({ rubrics: result.rows });
  } catch (error) {
    console.error('Error fetching rubrics:', error);
    res.status(500).json({ error: 'Failed to fetch rubrics' });
  }
}

// Get a specific rubric with criteria
export async function getRubric(req, res) {
  const { id } = req.params;

  try {
    const rubricQuery = 'SELECT * FROM rubrics WHERE id = $1';
    const rubricResult = await pool.query(rubricQuery, [id]);

    if (rubricResult.rowCount === 0) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    const criteriaQuery = `
      SELECT * FROM rubric_criteria
      WHERE rubric_id = $1
      ORDER BY position
    `;
    const criteriaResult = await pool.query(criteriaQuery, [id]);

    res.json({
      rubric: rubricResult.rows[0],
      criteria: criteriaResult.rows
    });
  } catch (error) {
    console.error('Error fetching rubric:', error);
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
}

// Update a rubric
export async function updateRubric(req, res) {
  const { id } = req.params;
  const { title, description, criteria } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update rubric
      const updateQuery = `
        UPDATE rubrics
        SET title = $1, description = $2, updated_at = now()
        WHERE id = $3
        RETURNING *
      `;
      const rubricResult = await client.query(updateQuery, [title, description, id]);

      if (rubricResult.rowCount === 0) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Update criteria if provided
      if (criteria && Array.isArray(criteria)) {
        // Delete existing criteria
        await client.query('DELETE FROM rubric_criteria WHERE rubric_id = $1', [id]);

        // Insert new criteria
        if (criteria.length > 0) {
          const criteriaValues = criteria.map((c, index) =>
            `(${id}, '${c.title}', '${c.description || ''}', ${c.max_points || 10}, ${c.weight || 1.0}, ${index + 1})`
          ).join(', ');
          const criteriaQuery = `
            INSERT INTO rubric_criteria (rubric_id, title, description, max_points, weight, position)
            VALUES ${criteriaValues}
          `;
          await client.query(criteriaQuery);
        }
      }

      await client.query('COMMIT');
      res.json({ rubric: rubricResult.rows[0], message: 'Rubric updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating rubric:', error);
    res.status(500).json({ error: 'Failed to update rubric' });
  }
}

// Delete a rubric
export async function deleteRubric(req, res) {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM rubrics WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    res.json({ message: 'Rubric deleted successfully' });
  } catch (error) {
    console.error('Error deleting rubric:', error);
    res.status(500).json({ error: 'Failed to delete rubric' });
  }
}

// Assign rubric to assignment
export async function assignRubricToAssignment(req, res) {
  const { assignmentId, rubricId } = req.body;

  try {
    const query = `
      INSERT INTO assignment_rubrics (assignment_id, rubric_id)
      VALUES ($1, $2)
      ON CONFLICT (assignment_id)
      DO UPDATE SET rubric_id = EXCLUDED.rubric_id
      RETURNING *
    `;
    const result = await pool.query(query, [assignmentId, rubricId]);
    res.json({ assignment_rubric: result.rows[0], message: 'Rubric assigned successfully' });
  } catch (error) {
    console.error('Error assigning rubric:', error);
    res.status(500).json({ error: 'Failed to assign rubric' });
  }
}

// Get rubric for assignment
export async function getAssignmentRubric(req, res) {
  const { assignmentId } = req.params;

  try {
    const query = `
      SELECT r.*, ar.assignment_id,
             json_agg(
               json_build_object(
                 'id', rc.id,
                 'title', rc.title,
                 'description', rc.description,
                 'max_points', rc.max_points,
                 'weight', rc.weight,
                 'position', rc.position
               ) ORDER BY rc.position
             ) as criteria
      FROM assignment_rubrics ar
      JOIN rubrics r ON ar.rubric_id = r.id
      LEFT JOIN rubric_criteria rc ON r.id = rc.rubric_id
      WHERE ar.assignment_id = $1
      GROUP BY r.id, ar.assignment_id
    `;
    const result = await pool.query(query, [assignmentId]);

    if (result.rowCount === 0) {
      return res.json({ rubric: null, criteria: [] });
    }

    res.json({
      rubric: result.rows[0],
      criteria: result.rows[0].criteria || []
    });
  } catch (error) {
    console.error('Error fetching assignment rubric:', error);
    res.status(500).json({ error: 'Failed to fetch assignment rubric' });
  }
}