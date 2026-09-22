import { pool } from '../shared/db';
import { Teacher, TeacherAssignment } from '../models/types';

export async function findAll(onlyActive = false): Promise<Teacher[]> {
  const where = onlyActive ? 'WHERE t.is_active = TRUE' : '';
  const { rows } = await pool.query(
    `SELECT t.*, u.username
     FROM teachers t
     LEFT JOIN usuarios u ON u.id = t.user_id
     ${where}
     ORDER BY t.full_name`
  );
  return rows;
}

export async function findById(id: number): Promise<Teacher | null> {
  const { rows } = await pool.query(
    `SELECT t.*, u.username FROM teachers t LEFT JOIN usuarios u ON u.id = t.user_id WHERE t.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function create(data: { full_name: string; email: string | null; phone: string | null; user_id: number | null }): Promise<Teacher> {
  const { rows } = await pool.query(
    'INSERT INTO teachers (full_name, email, phone, user_id) VALUES ($1,$2,$3,$4) RETURNING id',
    [data.full_name, data.email, data.phone, data.user_id]
  );
  return findById(rows[0].id) as Promise<Teacher>;
}

export async function update(id: number, data: { full_name: string; email: string | null; phone: string | null }): Promise<void> {
  await pool.query(
    'UPDATE teachers SET full_name = $1, email = $2, phone = $3 WHERE id = $4',
    [data.full_name, data.email, data.phone, id]
  );
}

export async function toggle(id: number): Promise<void> {
  await pool.query('UPDATE teachers SET is_active = NOT is_active WHERE id = $1', [id]);
}

export async function findAllAssignments(): Promise<TeacherAssignment[]> {
  const { rows } = await pool.query(
    `SELECT ta.*, t.full_name AS teacher_name, c.nombre AS course_nombre,
            g.nombre AS grade_nombre, s.display_name AS section_display
     FROM teacher_assignments ta
     JOIN teachers t ON t.id = ta.teacher_id
     JOIN courses c  ON c.id = ta.course_id
     JOIN grades g   ON g.id = ta.grade_id
     JOIN sections s ON s.id = ta.section_id
     ORDER BY g.sort_order, s.nombre, t.full_name, c.nombre`
  );
  return rows;
}

export async function findAssignments(teacherId: number): Promise<TeacherAssignment[]> {
  const { rows } = await pool.query(
    `SELECT ta.*, t.full_name AS teacher_name, c.nombre AS course_nombre,
            g.nombre AS grade_nombre, s.display_name AS section_display
     FROM teacher_assignments ta
     JOIN teachers t ON t.id = ta.teacher_id
     JOIN courses c  ON c.id = ta.course_id
     JOIN grades g   ON g.id = ta.grade_id
     JOIN sections s ON s.id = ta.section_id
     WHERE ta.teacher_id = $1
     ORDER BY ta.school_year DESC, g.sort_order, s.nombre`,
    [teacherId]
  );
  return rows;
}

export async function createAssignment(data: {
  teacher_id: number;
  course_id: number;
  grade_id: number;
  section_id: number;
  school_year: number;
}): Promise<void> {
  await pool.query(
    `INSERT INTO teacher_assignments (teacher_id, course_id, grade_id, section_id, school_year)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING`,
    [data.teacher_id, data.course_id, data.grade_id, data.section_id, data.school_year]
  );
}

export async function toggleAssignment(id: number): Promise<void> {
  await pool.query('UPDATE teacher_assignments SET is_active = NOT is_active WHERE id = $1', [id]);
}
