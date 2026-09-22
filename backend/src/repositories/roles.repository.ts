import { pool } from '../shared/db';
import { Role, Permission } from '../models/types';

export async function findPermissionsByRoleId(roleId: number): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT p.codigo
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return rows.map((r: { codigo: string }) => r.codigo);
}

export async function findAll(): Promise<Role[]> {
  const { rows } = await pool.query('SELECT * FROM roles ORDER BY id');
  return rows;
}

export async function findById(id: number): Promise<Role | null> {
  const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findAllPermissions(): Promise<Permission[]> {
  const { rows } = await pool.query('SELECT * FROM permissions ORDER BY modulo, accion');
  return rows;
}

export async function findPermissionsForRole(roleId: number): Promise<(Permission & { scope: string })[]> {
  const { rows } = await pool.query(
    `SELECT p.*, rp.scope
     FROM permissions p
     LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = $1
     ORDER BY p.modulo, p.accion`,
    [roleId]
  );
  return rows;
}

export async function create(data: { nombre: string; descripcion: string }): Promise<Role> {
  const { rows } = await pool.query(
    'INSERT INTO roles (nombre, descripcion) VALUES ($1, $2) RETURNING *',
    [data.nombre, data.descripcion]
  );
  return rows[0];
}

export async function updatePermissions(roleId: number, entries: { permission_id: number; scope: string }[]): Promise<void> {
  await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  for (const e of entries) {
    await pool.query(
      'INSERT INTO role_permissions (role_id, permission_id, scope) VALUES ($1, $2, $3)',
      [roleId, e.permission_id, e.scope]
    );
  }
}

export async function remove(id: number): Promise<void> {
  await pool.query('DELETE FROM roles WHERE id = $1 AND is_system = FALSE', [id]);
}
