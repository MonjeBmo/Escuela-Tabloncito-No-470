import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as userRepo from '../repositories/user.repository';
import * as rolesRepo from '../repositories/roles.repository';

export function showLogin(req: Request, res: Response): void {
  if (req.session.usuario) { res.redirect('/dashboard'); return; }
  res.render('auth/login', { titulo: 'Iniciar sesión', layout: 'layouts/auth' });
}

export async function doLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    req.session.flash = { tipo: 'danger', mensaje: 'Complete usuario y contraseña.' };
    res.redirect('/auth/login');
    return;
  }
  const usuario = await authService.login(username.trim(), password);
  if (!usuario) {
    req.session.flash = { tipo: 'danger', mensaje: 'Usuario o contraseña incorrectos.' };
    res.redirect('/auth/login');
    return;
  }
  req.session.usuario = usuario;
  res.redirect('/dashboard');
}

export function doLogout(req: Request, res: Response): void {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
}

export function showPerfil(req: Request, res: Response): void {
  res.render('auth/perfil', { titulo: 'Mi perfil' });
}

export async function cambiarPassword(req: Request, res: Response): Promise<void> {
  const { old_password, new_password, new_password_confirm } = req.body as Record<string, string>;
  if (!new_password || new_password !== new_password_confirm) {
    req.session.flash = { tipo: 'danger', mensaje: 'La nueva contraseña y su confirmación no coinciden.' };
    res.redirect('/auth/perfil');
    return;
  }
  if (new_password.length < 8) {
    req.session.flash = { tipo: 'danger', mensaje: 'La nueva contraseña debe tener un mínimo de 8 caracteres.' };
    res.redirect('/auth/perfil');
    return;
  }
  const userId = req.session.usuario!.id;
  const ok = await authService.changePassword(userId, old_password, new_password);
  if (ok) {
    req.session.flash = { tipo: 'success', mensaje: 'Contraseña actualizada exitosamente.' };
  } else {
    req.session.flash = { tipo: 'danger', mensaje: 'La contraseña actual no es correcta.' };
  }
  res.redirect('/auth/perfil');
}

// Redirige al módulo admin de usuarios
export function showUsuarios(req: Request, res: Response): void {
  res.redirect('/admin/usuarios');
}
