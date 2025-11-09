import { pool } from '../db/index.js';

export async function adminListMaterials(req, res) {
  try {
    const { departmentId, courseId, material, q } = req.query;
    const clauses = [];
    const params = [];
    if (departmentId) { params.push(Number(departmentId)); clauses.push(`m.department_id = $${params.length}`); }
    if (courseId) { params.push(Number(courseId)); clauses.push(`m.course_id = $${params.length}`); }
    if (material) { params.push(material); clauses.push(`m.material = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(m.title ILIKE $${params.length} OR m.description ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT m.*, c.code as course_code, c.title as course_title, d.name as department_name
      FROM study_materials m
      LEFT JOIN courses c ON m.course_id = c.id
      LEFT JOIN departments d ON m.department_id = d.id
      ${where}
      ORDER BY m.created_at DESC
      LIMIT 500
    `, params);
    res.json({ materials: r.rows });
  } catch (err) {
    console.error('adminListMaterials', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateMaterial(req, res) {
  try {
    const { department_id, course_id, title, description, category, material, storage_path, filename } = req.body || {};
    if (!department_id || !title || !material || !storage_path) {
      return res.status(400).json({ error: 'department_id, title, material, storage_path are required' });
    }
    const r = await pool.query(`
      INSERT INTO study_materials (department_id, course_id, title, description, category, material, storage_path, filename, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [Number(department_id), course_id ? Number(course_id) : null, title, description || null, category || null, material, storage_path, filename || null, req.user.id]);
    res.status(201).json({ material: r.rows[0] });
  } catch (err) {
    console.error('adminCreateMaterial', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUpdateMaterial(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { title, description, category, material, storage_path, filename, department_id, course_id } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (title !== undefined) set('title', title);
    if (description !== undefined) set('description', description);
    if (category !== undefined) set('category', category);
    if (material !== undefined) set('material', material);
    if (storage_path !== undefined) set('storage_path', storage_path);
    if (filename !== undefined) set('filename', filename);
    if (department_id !== undefined) set('department_id', department_id ? Number(department_id) : null);
    if (course_id !== undefined) set('course_id', course_id ? Number(course_id) : null);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE study_materials SET ${fields.join(', ')}, updated_at = now() WHERE id=$${params.length} RETURNING *`, params);
    res.json({ material: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateMaterial', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminDeleteMaterial(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM study_materials WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteMaterial', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListUsers(req, res) {
  try {
    const { role } = req.query;
    const clauses = [];
    const params = [];
    if (role) { params.push(role); clauses.push(`u.role = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT u.id, u.email, u.name, u.role, u.department_id, u.roll_number, u.is_active, d.name as department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT 500
    `, params);
    res.json({ users: r.rows });
  } catch (err) {
    console.error('adminListUsers', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Assign one or more faculty to a course
export async function adminAssignFacultyToCourse(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const { faculty_ids } = req.body || {};
    if (!courseId) return res.status(400).json({ error: 'Invalid course id' });
    if (!Array.isArray(faculty_ids) || faculty_ids.length === 0) {
      return res.status(400).json({ error: 'faculty_ids (non-empty array) is required' });
    }

    const values = [];
    const params = [];
    faculty_ids.forEach((fid) => {
      params.push(courseId, Number(fid));
      values.push(`($${params.length - 1}, $${params.length})`);
    });

    const q = `
      INSERT INTO faculty_courses (course_id, faculty_id)
      VALUES ${values.join(', ')}
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    const r = await pool.query(q, params);
    res.json({ assigned: r.rowCount });
  } catch (err) {
    console.error('adminAssignFacultyToCourse', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUpdateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { role, department_id, is_active, name } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (role !== undefined) set('role', role);
    if (name !== undefined) set('name', name);
    if (department_id !== undefined) set('department_id', department_id ? Number(department_id) : null);
    if (is_active !== undefined) set('is_active', !!is_active);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id=$${params.length} RETURNING id, email, name, role, department_id, is_active`, params);
    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateUser', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListDepartments(req, res) {
  try {
    const r = await pool.query('SELECT id, code, name FROM departments ORDER BY name ASC');
    res.json({ departments: r.rows });
  } catch (err) {
    console.error('adminListDepartments', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUserOverview(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const ures = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1 LIMIT 1', [id]);
    if (ures.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = ures.rows[0];

    if (user.role === 'student') {
      const q = `
        SELECT o.id as offering_id, c.code as course_code, c.title as course_title, o.term, o.section,
               f.id as faculty_id, f.name as faculty_name
        FROM enrollments e
        JOIN course_offerings o ON e.course_offering_id = o.id
        JOIN courses c ON o.course_id = c.id
        LEFT JOIN users f ON o.faculty_id = f.id
        WHERE e.student_id = $1
        ORDER BY o.id DESC`;
      const r = await pool.query(q, [id]);
      return res.json({ user, student: { enrollments: r.rows } });
    }

    if (user.role === 'faculty') {
      const off = await pool.query(`
        SELECT o.id as offering_id, c.code as course_code, c.title as course_title, o.term, o.section
        FROM course_offerings o
        JOIN courses c ON o.course_id = c.id
        WHERE o.faculty_id = $1
        ORDER BY o.id DESC`, [id]);
      const offeringIds = off.rows.map(r => r.offering_id);
      let enrollMap = {};
      if (offeringIds.length) {
        const enr = await pool.query(`
          SELECT e.course_offering_id, u.id as student_id, u.name as student_name, u.email as student_email
          FROM enrollments e JOIN users u ON e.student_id = u.id
          WHERE e.course_offering_id = ANY($1::bigint[])
          ORDER BY e.course_offering_id DESC, u.name ASC`, [offeringIds]);
        for (const row of enr.rows) {
          if (!enrollMap[row.course_offering_id]) enrollMap[row.course_offering_id] = [];
          enrollMap[row.course_offering_id].push({ id: row.student_id, name: row.student_name, email: row.student_email });
        }
      }
      const offerings = off.rows.map(o => ({ ...o, students: enrollMap[o.offering_id] || [] }));
      return res.json({ user, faculty: { offerings } });
    }

    if (user.role === 'ta') {
      const taOff = await pool.query(`
        SELECT o.id as offering_id, c.code as course_code, c.title as course_title, o.term, o.section
        FROM ta_assignments t JOIN course_offerings o ON t.course_offering_id = o.id
        JOIN courses c ON o.course_id = c.id
        WHERE t.ta_id = $1
        ORDER BY o.id DESC`, [id]);
      return res.json({ user, ta: { assignments: taOff.rows } });
    }

    // Admin
    return res.json({ user, admin: true });
  } catch (err) {
    console.error('adminUserOverview', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get courses by department
export async function adminGetCoursesByDepartment(req, res) {
  try {
    const deptId = Number(req.params.departmentId);
    if (!deptId) return res.status(400).json({ error: 'Invalid department id' });
    const r = await pool.query(`
      SELECT c.id, c.code, c.title, c.description, c.credits
      FROM courses c
      WHERE c.department_id = $1
      ORDER BY c.code ASC
    `, [deptId]);
    res.json({ courses: r.rows });
  } catch (err) {
    console.error('adminGetCoursesByDepartment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get course details with offerings, professors and students
export async function adminGetCourseDetails(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    if (!courseId) return res.status(400).json({ error: 'Invalid course id' });
    
    // Get course info
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rowCount === 0) return res.status(404).json({ error: 'Course not found' });
    const course = courseRes.rows[0];
    
    // Get all offerings with professors
    const offerings = await pool.query(`
      SELECT o.id as offering_id, o.term, o.section, o.faculty_id,
             u.name as faculty_name, u.email as faculty_email
      FROM course_offerings o
      LEFT JOIN users u ON o.faculty_id = u.id
      WHERE o.course_id = $1
      ORDER BY o.term DESC, o.section ASC
    `, [courseId]);
    
    // Get students for each offering
    const offeringIds = offerings.rows.map(o => o.offering_id);
    let enrollMap = {};
    if (offeringIds.length) {
      const enr = await pool.query(`
        SELECT e.course_offering_id, u.id as student_id, u.name as student_name, u.email as student_email, u.roll_number
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_offering_id = ANY($1::bigint[])
        ORDER BY u.name ASC
      `, [offeringIds]);
      for (const row of enr.rows) {
        if (!enrollMap[row.course_offering_id]) enrollMap[row.course_offering_id] = [];
        enrollMap[row.course_offering_id].push({
          id: row.student_id,
          name: row.student_name,
          email: row.student_email,
          roll_number: row.roll_number
        });
      }
    }
    
    const offeringsWithStudents = offerings.rows.map(o => ({
      ...o,
      students: enrollMap[o.offering_id] || []
    }));
    
    res.json({ course, offerings: offeringsWithStudents });
  } catch (err) {
    console.error('adminGetCourseDetails', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get assignments by faculty for a specific offering
export async function adminGetAssignmentsByFaculty(req, res) {
  try {
    const offeringId = Number(req.params.offeringId);
    if (!offeringId) return res.status(400).json({ error: 'Invalid offering id' });
    
    const r = await pool.query(`
      SELECT a.id, a.title, a.description, a.due_at as due_date, a.max_score as total_marks, a.created_at,
             c.code as course_code, c.title as course_title
      FROM assignments a
      JOIN course_offerings o ON a.course_offering_id = o.id
      JOIN courses c ON o.course_id = c.id
      WHERE a.course_offering_id = $1
      ORDER BY a.due_at DESC, a.created_at DESC
    `, [offeringId]);
    
    res.json({ assignments: r.rows });
  } catch (err) {
    console.error('adminGetAssignmentsByFaculty', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all assignments by a faculty member
export async function adminGetAssignmentsByFacultyId(req, res) {
  try {
    const facultyId = Number(req.params.facultyId);
    if (!facultyId) return res.status(400).json({ error: 'Invalid faculty id' });
    
    const r = await pool.query(`
      SELECT a.id, a.title, a.description, a.due_at as due_date, a.max_score as total_marks, a.created_at,
             c.code as course_code, c.title as course_title,
             o.term, o.section, o.id as offering_id
      FROM assignments a
      JOIN course_offerings o ON a.course_offering_id = o.id
      JOIN courses c ON o.course_id = c.id
      WHERE o.faculty_id = $1
      ORDER BY a.due_at DESC, a.created_at DESC
    `, [facultyId]);
    
    res.json({ assignments: r.rows });
  } catch (err) {
    console.error('adminGetAssignmentsByFacultyId', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get submissions for an assignment
export async function adminGetSubmissions(req, res) {
  try {
    const assignmentId = Number(req.params.assignmentId);
    if (!assignmentId) return res.status(400).json({ error: 'Invalid assignment id' });
    
    const r = await pool.query(`
      SELECT s.id, s.submitted_at, s.final_score as marks_obtained, s.comments as feedback, s.graded_at,
             u.id as student_id, u.name as student_name, u.email as student_email, u.roll_number,
             g.name as grader_name
      FROM assignment_submissions s
      JOIN users u ON s.student_id = u.id
      LEFT JOIN users g ON s.grader_id = g.id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);
    
    res.json({ submissions: r.rows });
  } catch (err) {
    console.error('adminGetSubmissions', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
