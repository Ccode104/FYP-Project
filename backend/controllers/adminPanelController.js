import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

// Helper to check if user is super admin
async function isSuperAdmin(userId) {
  const r = await pool.query('SELECT is_super FROM admins WHERE user_id = $1', [userId]);
  return r.rowCount > 0 && r.rows[0].is_super;
}

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
    logger.error('adminListMaterials error', err);
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

    // Check if super admin
    const superAdmin = await isSuperAdmin(req.user.id);
    if (!superAdmin) {
      // Non-super admins cannot see other admins
      params.push('admin');
      clauses.push(`u.role != $${params.length}`);
    }

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

    // Check permissions
    const superAdmin = await isSuperAdmin(req.user.id);
    const targetUser = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetUser.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const targetRole = targetUser.rows[0].role;

    if (!superAdmin) {
      // Non-super cannot modify other admins
      if (targetRole === 'admin') return res.status(403).json({ error: 'Forbidden: cannot modify admin accounts' });
      // Cannot set role to admin
      if (role === 'admin') return res.status(403).json({ error: 'Forbidden: cannot promote to admin' });
    }

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

export async function adminCreateDepartment(req, res) {
  try {
    const { code, name } = req.body || {};
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    const r = await pool.query('INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id, code, name', [code.toUpperCase(), name]);
    res.status(201).json({ department: r.rows[0] });
  } catch (err) {
    console.error('adminCreateDepartment', err);
    if (err.code === '23505') { // unique violation
      res.status(400).json({ error: 'Department code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminUpdateDepartment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { code, name } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (code !== undefined) set('code', code.toUpperCase());
    if (name !== undefined) set('name', name);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE departments SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING id, code, name`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ department: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateDepartment', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Department code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminDeleteDepartment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Check if department has courses
    const courses = await pool.query('SELECT COUNT(*) FROM courses WHERE department_id = $1', [id]);
    if (parseInt(courses.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete department with existing courses' });
    }
    await pool.query('DELETE FROM departments WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteDepartment', err);
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

export async function adminDeleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    // Check permissions
    const superAdmin = await isSuperAdmin(req.user.id);
    const targetUser = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetUser.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const targetRole = targetUser.rows[0].role;

    if (!superAdmin && targetRole === 'admin') {
      return res.status(403).json({ error: 'Forbidden: cannot delete admin accounts' });
    }

    // Prevent deleting self
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteUser', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListOfferings(req, res) {
  try {
    const { courseId, facultyId, term, q } = req.query;
    const clauses = [];
    const params = [];
    if (courseId) { params.push(Number(courseId)); clauses.push(`co.course_id = $${params.length}`); }
    if (facultyId) { params.push(Number(facultyId)); clauses.push(`co.faculty_id = $${params.length}`); }
    if (term) { params.push(`%${term}%`); clauses.push(`co.term ILIKE $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(c.code ILIKE $${params.length} OR c.title ILIKE $${params.length} OR u.name ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT co.*, c.code as course_code, c.title as course_title, u.name as faculty_name, u.email as faculty_email,
             d.name as department_name
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON co.faculty_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${where}
      ORDER BY co.term DESC, co.section ASC
    `, params);
    res.json({ offerings: r.rows });
  } catch (err) {
    console.error('adminListOfferings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateOffering(req, res) {
  try {
    const { course_id, term, section, faculty_id, max_capacity, start_date, end_date } = req.body || {};
    if (!course_id || !term || !faculty_id) {
      return res.status(400).json({ error: 'course_id, term, and faculty_id are required' });
    }
    const r = await pool.query(`
      INSERT INTO course_offerings (course_id, term, section, faculty_id, max_capacity, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [Number(course_id), term, section || null, Number(faculty_id), max_capacity ? Number(max_capacity) : null, start_date || null, end_date || null]);
    res.status(201).json({ offering: r.rows[0] });
  } catch (err) {
    console.error('adminCreateOffering', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Offering already exists for this course, term, and section' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminUpdateOffering(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { term, section, faculty_id, max_capacity, start_date, end_date } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (term !== undefined) set('term', term);
    if (section !== undefined) set('section', section);
    if (faculty_id !== undefined) set('faculty_id', Number(faculty_id));
    if (max_capacity !== undefined) set('max_capacity', max_capacity ? Number(max_capacity) : null);
    if (start_date !== undefined) set('start_date', start_date);
    if (end_date !== undefined) set('end_date', end_date);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE course_offerings SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Offering not found' });
    res.json({ offering: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateOffering', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Offering already exists for this course, term, and section' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminDeleteOffering(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Check if offering has enrollments
    const enrollments = await pool.query('SELECT COUNT(*) FROM enrollments WHERE course_offering_id = $1', [id]);
    if (parseInt(enrollments.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete offering with existing enrollments' });
    }
    await pool.query('DELETE FROM course_offerings WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteOffering', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListCourses(req, res) {
  try {
    const { departmentId, q } = req.query;
    const clauses = [];
    const params = [];
    if (departmentId) { params.push(Number(departmentId)); clauses.push(`c.department_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(c.code ILIKE $${params.length} OR c.title ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT c.*, d.name as department_name
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      ${where}
      ORDER BY c.code ASC
    `, params);
    res.json({ courses: r.rows });
  } catch (err) {
    console.error('adminListCourses', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateCourse(req, res) {
  try {
    const { code, title, description, department_id, credits } = req.body || {};
    if (!code || !title) {
      return res.status(400).json({ error: 'code and title are required' });
    }
    const r = await pool.query(`
      INSERT INTO courses (code, title, description, department_id, credits)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [code.toUpperCase(), title, description || null, department_id ? Number(department_id) : null, credits ? Number(credits) : null]);
    res.status(201).json({ course: r.rows[0] });
  } catch (err) {
    console.error('adminCreateCourse', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminUpdateCourse(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { code, title, description, department_id, credits } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (code !== undefined) set('code', code.toUpperCase());
    if (title !== undefined) set('title', title);
    if (description !== undefined) set('description', description);
    if (department_id !== undefined) set('department_id', department_id ? Number(department_id) : null);
    if (credits !== undefined) set('credits', credits ? Number(credits) : null);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE courses SET ${fields.join(', ')}, updated_at = now() WHERE id=$${params.length} RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ course: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateCourse', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminDeleteCourse(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Check if course has offerings
    const offerings = await pool.query('SELECT COUNT(*) FROM course_offerings WHERE course_id = $1', [id]);
    if (parseInt(offerings.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete course with existing offerings' });
    }
    await pool.query('DELETE FROM courses WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteCourse', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListAssignments(req, res) {
  try {
    const { offeringId, facultyId, q } = req.query;
    const clauses = [];
    const params = [];
    if (offeringId) { params.push(Number(offeringId)); clauses.push(`a.course_offering_id = $${params.length}`); }
    if (facultyId) { params.push(Number(facultyId)); clauses.push(`co.faculty_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(a.title ILIKE $${params.length} OR a.description ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT a.*, c.code as course_code, c.title as course_title, co.term, co.section,
             u.name as faculty_name, u.email as faculty_email
      FROM assignments a
      JOIN course_offerings co ON a.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON co.faculty_id = u.id
      ${where}
      ORDER BY a.due_at DESC, a.created_at DESC
    `, params);
    res.json({ assignments: r.rows });
  } catch (err) {
    console.error('adminListAssignments', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateAssignment(req, res) {
  try {
    const { course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions } = req.body || {};
    if (!course_offering_id || !title || !assignment_type) {
      return res.status(400).json({ error: 'course_offering_id, title, and assignment_type are required' });
    }
    const r = await pool.query(`
      INSERT INTO assignments (course_offering_id, title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [Number(course_offering_id), title, description || null, assignment_type, release_at || null, due_at || null, max_score ? Number(max_score) : 100, allow_multiple_submissions || false, req.user.id]);
    res.status(201).json({ assignment: r.rows[0] });
  } catch (err) {
    console.error('adminCreateAssignment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUpdateAssignment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { title, description, assignment_type, release_at, due_at, max_score, allow_multiple_submissions } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (title !== undefined) set('title', title);
    if (description !== undefined) set('description', description);
    if (assignment_type !== undefined) set('assignment_type', assignment_type);
    if (release_at !== undefined) set('release_at', release_at);
    if (due_at !== undefined) set('due_at', due_at);
    if (max_score !== undefined) set('max_score', Number(max_score));
    if (allow_multiple_submissions !== undefined) set('allow_multiple_submissions', !!allow_multiple_submissions);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE assignments SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ assignment: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateAssignment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminDeleteAssignment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Check if assignment has submissions
    const submissions = await pool.query('SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = $1', [id]);
    if (parseInt(submissions.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete assignment with existing submissions' });
    }
    await pool.query('DELETE FROM assignments WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteAssignment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListQuizzes(req, res) {
  try {
    const { offeringId, q } = req.query;
    const clauses = [];
    const params = [];
    if (offeringId) { params.push(Number(offeringId)); clauses.push(`q.course_offering_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(q.title ILIKE $${params.length} OR q.description ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT q.*, c.code as course_code, c.title as course_title, co.term, co.section,
             u.name as faculty_name, u.email as faculty_email
      FROM quizzes q
      JOIN course_offerings co ON q.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      LEFT JOIN users u ON co.faculty_id = u.id
      ${where}
      ORDER BY q.start_at DESC, q.created_at DESC
    `, params);
    res.json({ quizzes: r.rows });
  } catch (err) {
    console.error('adminListQuizzes', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateQuiz(req, res) {
  try {
    const { course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, proctoring_config_id, allow_suspension_resume } = req.body || {};
    if (!course_offering_id) {
      return res.status(400).json({ error: 'course_offering_id is required' });
    }
    const r = await pool.query(`
      INSERT INTO quizzes (course_offering_id, title, start_at, end_at, max_score, is_proctored, time_limit, proctoring_config_id, allow_suspension_resume)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [Number(course_offering_id), title || null, start_at || null, end_at || null, max_score ? Number(max_score) : 100, is_proctored || false, time_limit || null, proctoring_config_id ? Number(proctoring_config_id) : null, allow_suspension_resume !== false]);
    res.status(201).json({ quiz: r.rows[0] });
  } catch (err) {
    console.error('adminCreateQuiz', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminUpdateQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { title, start_at, end_at, max_score, is_proctored, time_limit, proctoring_config_id, allow_suspension_resume } = req.body || {};
    const fields = [];
    const params = [];
    function set(col, val) { params.push(val); fields.push(`${col} = $${params.length}`); }
    if (title !== undefined) set('title', title);
    if (start_at !== undefined) set('start_at', start_at);
    if (end_at !== undefined) set('end_at', end_at);
    if (max_score !== undefined) set('max_score', Number(max_score));
    if (is_proctored !== undefined) set('is_proctored', !!is_proctored);
    if (time_limit !== undefined) set('time_limit', time_limit ? Number(time_limit) : null);
    if (proctoring_config_id !== undefined) set('proctoring_config_id', proctoring_config_id ? Number(proctoring_config_id) : null);
    if (allow_suspension_resume !== undefined) set('allow_suspension_resume', !!allow_suspension_resume);
    if (!fields.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE quizzes SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz: r.rows[0] });
  } catch (err) {
    console.error('adminUpdateQuiz', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminDeleteQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Check if quiz has attempts
    const attempts = await pool.query('SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1', [id]);
    if (parseInt(attempts.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete quiz with existing attempts' });
    }
    await pool.query('DELETE FROM quizzes WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteQuiz', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminListEnrollments(req, res) {
  try {
    const { offeringId, studentId, q } = req.query;
    const clauses = [];
    const params = [];
    if (offeringId) { params.push(Number(offeringId)); clauses.push(`e.course_offering_id = $${params.length}`); }
    if (studentId) { params.push(Number(studentId)); clauses.push(`e.student_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR c.code ILIKE $${params.length})`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await pool.query(`
      SELECT e.*, u.name as student_name, u.email as student_email, u.roll_number,
             c.code as course_code, c.title as course_title, co.term, co.section
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      ${where}
      ORDER BY e.enrolled_at DESC
    `, params);
    res.json({ enrollments: r.rows });
  } catch (err) {
    console.error('adminListEnrollments', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminCreateEnrollment(req, res) {
  try {
    const { course_offering_id, student_id } = req.body || {};
    if (!course_offering_id || !student_id) {
      return res.status(400).json({ error: 'course_offering_id and student_id are required' });
    }
    const r = await pool.query(`
      INSERT INTO enrollments (course_offering_id, student_id)
      VALUES ($1, $2)
      RETURNING *
    `, [Number(course_offering_id), Number(student_id)]);
    res.status(201).json({ enrollment: r.rows[0] });
  } catch (err) {
    console.error('adminCreateEnrollment', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Student is already enrolled in this offering' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function adminDeleteEnrollment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM enrollments WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminDeleteEnrollment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export async function adminGetOverview(req, res) {
  try {
    // Get total users count
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get active courses (courses with current/future offerings)
    const coursesResult = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM courses c
      JOIN course_offerings co ON c.id = co.course_id
      WHERE co.end_date >= CURRENT_DATE OR co.end_date IS NULL
    `);
    const activeCourses = parseInt(coursesResult.rows[0].count);

    // Get total assignments
    const assignmentsResult = await pool.query('SELECT COUNT(*) as count FROM assignments');
    const totalAssignments = parseInt(assignmentsResult.rows[0].count);

    // Get total submissions
    const submissionsResult = await pool.query('SELECT COUNT(*) as count FROM assignment_submissions');
    const totalSubmissions = parseInt(submissionsResult.rows[0].count);

    res.json({
      totalUsers,
      activeCourses,
      totalAssignments,
      totalSubmissions
    });
  } catch (err) {
    console.error('Error fetching overview:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch overview' });
  }
}
