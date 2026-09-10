import { pool } from '../shared/db';
import { Usuario } from '../models/types';

export async function findByUsername(username: string): Promise<(Usuario & { password: string }) | null> {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
    [username]
  );
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<Usuario | null> {
  const { rows } = await pool.query(
    'SELECT id, nombre, username, rol, activo, created_at FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function listAll(): Promise<Usuario[]> {
  const { rows } = await pool.query(
    'SELECT id, nombre, username, rol, activo, created_at FROM usuarios ORDER BY nombre'
  );
  return rows;
}

export async function create(data: {
  nombre: string;
  username: string;
  passwordHash: string;
  rol: string;
}): Promise<Usuario> {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, username, password, rol)
     VALUES ($1, $2, $3, $4) RETURNING id, nombre, username, rol, activo, created_at`,
    [data.nombre, data.username, data.passwordHash, data.rol]
  );
  return rows[0];
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [passwordHash, id]);
}
