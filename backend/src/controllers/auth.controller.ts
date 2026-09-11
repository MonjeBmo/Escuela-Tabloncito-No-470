import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as userRepo from '../repositories/user.repository';

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

export async function showUsuarios(req: Request, res: Response): Promise<void> {
  const usuarios = await userRepo.listAll();
  res.render('auth/usuarios', { titulo: 'Gestión de usuarios', usuarios });
}

export async function crearUsuario(req: Request, res: Response): Promise<void> {
  const { nombre, username, password, rol } = req.body as Record<string, string>;
  try {
    await authService.createUser({ nombre, username, password, rol });
    req.session.flash = { tipo: 'success', mensaje: 'Usuario creado exitosamente.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear el usuario. Verifique que el nombre de usuario no exista.' };
  }
  res.redirect('/auth/usuarios');
}

export function showPerfil(req: Request, res: Response): void {
  res.render('auth/perfil', { titulo: 'Mi perfil' });
}

export async function cambiarPassword(req: Request, res: Response): Promise<void> {
  const { old_password, new_password } = req.body as Record<string, string>;
  const userId = req.session.usuario!.id;
  const ok = await authService.changePassword(userId, old_password, new_password);
  if (ok) {
    req.session.flash = { tipo: 'success', mensaje: 'Contraseña actualizada.' };
  } else {
    req.session.flash = { tipo: 'danger', mensaje: 'La contraseña actual no es correcta.' };
  }
  res.redirect('/auth/perfil');
}
