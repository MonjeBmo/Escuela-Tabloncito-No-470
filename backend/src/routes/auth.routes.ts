import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { requireAuth, requireRol } from '../shared/auth.middleware';

const router = Router();

router.get('/login',  ctrl.showLogin);
router.post('/login', ctrl.doLogin);
router.get('/logout', ctrl.doLogout);

router.get('/perfil',  requireAuth, ctrl.showPerfil);
router.post('/perfil', requireAuth, ctrl.cambiarPassword);

router.get('/usuarios',  requireAuth, requireRol('director'), ctrl.showUsuarios);
router.post('/usuarios', requireAuth, requireRol('director'), ctrl.crearUsuario);

export default router;
