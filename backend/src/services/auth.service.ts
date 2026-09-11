import bcrypt from 'bcrypt';
import * as userRepo from '../repositories/user.repository';
import { Usuario } from '../models/types';

export async function login(username: string, password: string): Promise<Pick<Usuario, 'id' | 'nombre' | 'username' | 'rol'> | null> {
  const user = await userRepo.findByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol };
}

export async function changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
  const user = await userRepo.findById(userId);
  if (!user) return false;
  const full = await userRepo.findByUsername(user.username);
  if (!full) return false;
  const ok = await bcrypt.compare(oldPass, full.password);
  if (!ok) return false;
  const hash = await bcrypt.hash(newPass, 12);
  await userRepo.updatePassword(userId, hash);
  return true;
}

export async function createUser(data: { nombre: string; username: string; password: string; rol: string }): Promise<Usuario> {
  const hash = await bcrypt.hash(data.password, 12);
  return userRepo.create({ ...data, passwordHash: hash });
}
