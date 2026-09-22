import { pool } from '../shared/db';
import { Grade, Section } from '../models/types';

// ── Grades ───────────────────────────────────────────────────

export async function findAllGrades(onlyActive = false): Promise<Grade[]> {
  const where = onlyActive ? 'WHERE is_active = TRUE' : '';
  const { rows } = await pool.query(`SELECT * FROM grades ${where} ORDER BY sort_order, nombre`);
  return rows;
}

export async function findGradeById(id: number): Promise<Grade | null> {
  const { rows } = await pool.query('SELECT * FROM grades WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createGrade(data: { nombre: string; nombre_corto: string; sort_order: number }): Promise<Grade> {
  const { rows } = await pool.query(
    'INSERT INTO grades (nombre, nombre_corto, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [data.nombre, data.nombre_corto, data.sort_order]
  );
  return rows[0];
}

export async function updateGrade(id: number, data: { nombre: string; nombre_corto: string; sort_order: number }): Promise<void> {
  await pool.query(
    'UPDATE grades SET nombre = $1, nombre_corto = $2, sort_order = $3 WHERE id = $4',
    [data.nombre, data.nombre_corto, data.sort_order, id]
  );
}

export async function toggleGrade(id: number): Promise<void> {
  await pool.query('UPDATE grades SET is_active = NOT is_active WHERE id = $1', [id]);
}

// ── Sections ─────────────────────────────────────────────────

export async function findAllSections(onlyActive = false): Promise<Section[]> {
  const where = onlyActive ? 'WHERE s.is_active = TRUE AND g.is_active = TRUE' : '';
  const { rows } = await pool.query(
    `SELECT s.*, g.nombre AS grade_nombre, g.sort_order AS grade_sort_order
     FROM sections s
     JOIN grades g ON g.id = s.grade_id
     ${where}
     ORDER BY g.sort_order, s.nombre`
  );
  return rows;
}

export async function findSectionsByGrade(gradeId: number): Promise<Section[]> {
  const { rows } = await pool.query(
    'SELECT * FROM sections WHERE grade_id = $1 ORDER BY nombre',
    [gradeId]
  );
  return rows;
}

export async function findSectionById(id: number): Promise<Section | null> {
  const { rows } = await pool.query(
    `SELECT s.*, g.nombre AS grade_nombre FROM sections s JOIN grades g ON g.id = s.grade_id WHERE s.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createSection(data: { grade_id: number; nombre: string; display_name: string }): Promise<Section> {
  const { rows } = await pool.query(
    'INSERT INTO sections (grade_id, nombre, display_name) VALUES ($1, $2, $3) RETURNING *',
    [data.grade_id, data.nombre, data.display_name]
  );
  return rows[0];
}

export async function updateSection(id: number, data: { nombre: string; display_name: string }): Promise<void> {
  await pool.query(
    'UPDATE sections SET nombre = $1, display_name = $2 WHERE id = $3',
    [data.nombre, data.display_name, id]
  );
}

export async function toggleSection(id: number): Promise<void> {
  await pool.query('UPDATE sections SET is_active = NOT is_active WHERE id = $1', [id]);
}
