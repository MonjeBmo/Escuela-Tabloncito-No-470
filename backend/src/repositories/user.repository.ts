import { pool } from '../shared/db';
import { Usuario } from '../models/types';

const COLS = `u.id, u.nombre, u.username, u.role_id, r.nombre AS rol, u.activo, u.created_at`;
const FROM  = `FROM usuarios u LEFT JOIN roles r ON r.id = u.role_id`;

export async function findByUsername(username: string): Promise<(Usuario & { password: string }) | null> {
  const { rows } = await pool.query(
    `SELECT ${COLS}, u.password ${FROM} WHERE u.username = $1 AND u.activo = TRUE`,
    [username]
  );
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<Usuario | null> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE u.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listAll(): Promise<Usuario[]> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} ORDER BY u.nombre`
  );
  return rows;
}

export async function create(data: {
  nombre: string;
  username: string;
  passwordHash: string;
  role_id: number;
}): Promise<Usuario> {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, username, password, role_id) VALUES ($1,$2,$3,$4) RETURNING id`,
    [data.nombre, data.username, data.passwordHash, data.role_id]
  );
  return findById(rows[0].id) as Promise<Usuario>;
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [passwordHash, id]);
}

export async function updateRole(id: number, roleId: number): Promise<void> {
  await pool.query('UPDATE usuarios SET role_id = $1 WHERE id = $2', [roleId, id]);
}

export async function toggleActive(id: number): Promise<void> {
  await pool.query('UPDATE usuarios SET activo = NOT activo WHERE id = $1', [id]);
}
