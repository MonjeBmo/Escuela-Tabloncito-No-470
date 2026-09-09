import { Request, Response, NextFunction } from 'express';
import { Rol } from '../models/types';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.usuario) {
    req.session.flash = { tipo: 'warning', mensaje: 'Debe iniciar sesión para continuar.' };
    res.redirect('/auth/login');
    return;
  }
  next();
}

export function requireRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.session.usuario;
    if (!usuario) {
      res.redirect('/auth/login');
      return;
    }
    if (!roles.includes(usuario.rol as Rol)) {
      req.session.flash = { tipo: 'danger', mensaje: 'No tiene permisos para acceder a esta sección.' };
      res.redirect('/dashboard');
      return;
    }
    next();
  };
}
