import { pool } from '../db/index.js';

// Create a support ticket
export async function createTicket(req, res) {
  const { title, description, category, priority, course_offering_id } = req.body;
  const userId = req.user.id;

  try {
    const query = `
      INSERT INTO support_tickets (user_id, title, description, category, priority, course_offering_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, title, description, category, priority || 'medium', course_offering_id]);

    // Get the created ticket with user info
    const ticketQuery = `
      SELECT st.*, u.name as user_name, u.email as user_email,
             co.course_code, co.course_title
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN course_offerings co ON st.course_offering_id = co.id
      WHERE st.id = $1
    `;
    const ticketResult = await pool.query(ticketQuery, [result.rows[0].id]);

    res.json({ ticket: ticketResult.rows[0], message: 'Support ticket created successfully' });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
}

// Get user's tickets
export async function getUserTickets(req, res) {
  const userId = req.user.id;
  const { status, category } = req.query;

  try {
    let query = `
      SELECT st.*, u.name as user_name, u.email as user_email,
             co.course_code, co.course_title,
             au.name as assigned_to_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN course_offerings co ON st.course_offering_id = co.id
      LEFT JOIN users au ON st.assigned_to = au.id
      WHERE st.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND st.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND st.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ' ORDER BY st.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

// Get all tickets (for admin/staff)
export async function getAllTickets(req, res) {
  const { status, category, assigned_to, priority } = req.query;

  try {
    let query = `
      SELECT st.*, u.name as user_name, u.email as user_email,
             co.course_code, co.course_title,
             au.name as assigned_to_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN course_offerings co ON st.course_offering_id = co.id
      LEFT JOIN users au ON st.assigned_to = au.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND st.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND st.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (assigned_to) {
      query += ` AND st.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }

    if (priority) {
      query += ` AND st.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    query += ' ORDER BY st.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

// Get ticket details with comments
export async function getTicket(req, res) {
  const { id } = req.params;

  try {
    // Get ticket
    const ticketQuery = `
      SELECT st.*, u.name as user_name, u.email as user_email,
             co.course_code, co.course_title,
             au.name as assigned_to_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN course_offerings co ON st.course_offering_id = co.id
      LEFT JOIN users au ON st.assigned_to = au.id
      WHERE st.id = $1
    `;
    const ticketResult = await pool.query(ticketQuery, [id]);

    if (ticketResult.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get comments
    const commentsQuery = `
      SELECT tc.*, u.name as commenter_name, u.email as commenter_email
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    const commentsResult = await pool.query(commentsQuery, [id]);

    // Get attachments
    const attachmentsQuery = `
      SELECT ta.*, u.name as uploader_name
      FROM ticket_attachments ta
      LEFT JOIN users u ON ta.uploaded_by = u.id
      WHERE ta.ticket_id = $1
      ORDER BY ta.uploaded_at DESC
    `;
    const attachmentsResult = await pool.query(attachmentsQuery, [id]);

    res.json({
      ticket: ticketResult.rows[0],
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
}

// Update ticket status
export async function updateTicketStatus(req, res) {
  const { id } = req.params;
  const { status, assigned_to, priority } = req.body;

  try {
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramIndex}`);
      params.push(assigned_to);
      paramIndex++;
    }

    if (priority) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    updateFields.push(`updated_at = now()`);

    const query = `
      UPDATE support_tickets
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: result.rows[0], message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}

// Add comment to ticket
export async function addTicketComment(req, res) {
  const { id } = req.params;
  const { comment, is_internal } = req.body;
  const userId = req.user.id;

  try {
    const query = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [id, userId, comment, is_internal || false]);

    // Update ticket updated_at
    await pool.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [id]);

    // Get the comment with user info
    const commentQuery = `
      SELECT tc.*, u.name as commenter_name, u.email as commenter_email
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1
    `;
    const commentResult = await pool.query(commentQuery, [result.rows[0].id]);

    res.json({ comment: commentResult.rows[0], message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

// Delete ticket
export async function deleteTicket(req, res) {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM support_tickets WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
}