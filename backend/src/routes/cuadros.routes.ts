import { Router } from 'express';
import * as ctrl from '../controllers/cuadros.controller';
import { requireAuth, requireRol } from '../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/',           ctrl.index);
router.get('/busqueda',   ctrl.showBusqueda);
router.get('/crear',      requireRol('director', 'administrativo'), ctrl.showCreate);
router.post('/crear',     requireRol('director', 'administrativo'), ctrl.doCreate);
router.get('/:id',        ctrl.show);
router.post('/:id/validar',  requireRol('director', 'administrativo', 'validador_ocr'), ctrl.doValidar);
router.post('/:id/eliminar', requireRol('director'), ctrl.doEliminar);

export default router;
