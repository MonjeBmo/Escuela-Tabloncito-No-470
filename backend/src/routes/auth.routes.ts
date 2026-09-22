import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { requireAuth } from '../shared/auth.middleware';

const router = Router();

router.get('/login',  ctrl.showLogin);
router.post('/login', ctrl.doLogin);
router.get('/logout', ctrl.doLogout);

router.get('/perfil',  requireAuth, ctrl.showPerfil);
router.post('/perfil', requireAuth, ctrl.cambiarPassword);

// Compat: redirige al módulo admin
router.get('/usuarios', requireAuth, ctrl.showUsuarios);

export default router;
