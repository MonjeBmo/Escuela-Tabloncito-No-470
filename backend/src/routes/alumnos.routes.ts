import { Router } from 'express';
import * as ctrl from '../controllers/alumnos.controller';
import { requireAuth, requireRol } from '../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/',         ctrl.index);
router.get('/crear',    requireRol('director', 'administrativo'), ctrl.showCreate);
router.post('/crear',   requireRol('director', 'administrativo'), ctrl.doCreate);
router.get('/:id',      ctrl.show);
router.post('/:id/eliminar', requireRol('director'), ctrl.doEliminar);

export default router;
