import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.usuario) {
    req.session.flash = { tipo: 'warning', mensaje: 'Debe iniciar sesión para continuar.' };
    res.redirect('/auth/login');
    return;
  }
  next();
}

export function requirePermission(perm: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.usuario) {
      res.redirect('/auth/login');
      return;
    }
    if (!req.session.usuario.permisos.includes(perm)) {
      req.session.flash = { tipo: 'danger', mensaje: 'No tiene permisos para acceder a esta sección.' };
      res.redirect('/dashboard');
      return;
    }
    next();
  };
}

// Compat: comprueba por nombre de rol (útil durante transición)
export function requireRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.session.usuario;
    if (!usuario) {
      res.redirect('/auth/login');
      return;
    }
    if (!roles.includes(usuario.rol)) {
      req.session.flash = { tipo: 'danger', mensaje: 'No tiene permisos para acceder a esta sección.' };
      res.redirect('/dashboard');
      return;
    }
    next();
  };
}
