import { pool } from '../shared/db';
import { Grado } from '../models/types';

export async function findAll(): Promise<Grado[]> {
  const { rows } = await pool.query('SELECT * FROM grados ORDER BY id');
  return rows;
}
