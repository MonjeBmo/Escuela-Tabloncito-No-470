import { Router } from 'express';
import * as ctrl from '../controllers/cuadros.controller';
import { requireAuth, requirePermission } from '../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/',          requirePermission('documents.view'),     ctrl.index);
router.get('/busqueda',  requirePermission('documents.view'),     ctrl.showBusqueda);
router.get('/crear',     requirePermission('documents.create'),   ctrl.showCreate);
router.post('/crear',    requirePermission('documents.create'),   ctrl.doCreate);
router.get('/:id',       requirePermission('documents.view'),     ctrl.show);
router.post('/:id/validar',  requirePermission('documents.validate'), ctrl.doValidar);
router.post('/:id/eliminar', requirePermission('documents.delete'),   ctrl.doEliminar);

export default router;
