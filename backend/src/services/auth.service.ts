import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repository';
import * as rolesRepo from '../repositories/roles.repository';
import { Usuario } from '../models/types';

export async function login(username: string, password: string): Promise<{
  id: number; nombre: string; username: string; rol: string; role_id: number; permisos: string[];
} | null> {
  const user = await userRepo.findByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  const permisos = await rolesRepo.findPermissionsByRoleId(user.role_id);

  return {
    id: user.id,
    nombre: user.nombre,
    username: user.username,
    rol: user.rol ?? '',
    role_id: user.role_id,
    permisos,
  };
}

export async function changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
  const user = await userRepo.findById(userId);
  if (!user) return false;
  const full = await userRepo.findByUsername(user.username);
  if (!full) return false;
  const ok = await bcrypt.compare(oldPass, (full as unknown as { password: string }).password);
  if (!ok) return false;
  const hash = await bcrypt.hash(newPass, 12);
  await userRepo.updatePassword(userId, hash);
  return true;
}

export async function createUser(data: {
  nombre: string;
  username: string;
  password: string;
  role_id: number;
}): Promise<Usuario> {
  const hash = await bcrypt.hash(data.password, 12);
  return userRepo.create({ nombre: data.nombre, username: data.username, passwordHash: hash, role_id: data.role_id });
}
