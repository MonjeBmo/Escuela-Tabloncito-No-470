import { pool } from '../shared/db';
import { Course } from '../models/types';

export async function findAll(onlyActive = false): Promise<Course[]> {
  const where = onlyActive ? 'WHERE is_active = TRUE' : '';
  const { rows } = await pool.query(`SELECT * FROM courses ${where} ORDER BY sort_order, nombre`);
  return rows;
}

export async function findById(id: number): Promise<Course | null> {
  const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function create(data: { nombre: string; nombre_corto: string; sort_order: number }): Promise<Course> {
  const { rows } = await pool.query(
    'INSERT INTO courses (nombre, nombre_corto, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [data.nombre, data.nombre_corto, data.sort_order]
  );
  return rows[0];
}

export async function toggle(id: number): Promise<void> {
  await pool.query('UPDATE courses SET is_active = NOT is_active WHERE id = $1', [id]);
}
