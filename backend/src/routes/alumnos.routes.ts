import { Router } from 'express';
import * as ctrl from '../controllers/alumnos.controller';
import { requireAuth, requirePermission } from '../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/',       requirePermission('students.view'),   ctrl.index);
router.get('/crear',  requirePermission('students.create'), ctrl.showCreate);
router.post('/crear', requirePermission('students.create'), ctrl.doCreate);
router.get('/:id/editar',    requirePermission('students.create'), ctrl.showEdit);
router.post('/:id/editar',   requirePermission('students.create'), ctrl.doEditar);
router.post('/:id/toggle',   requirePermission('students.create'), ctrl.doToggle);
router.get('/:id',           requirePermission('students.view'),   ctrl.show);
router.post('/:id/eliminar', requirePermission('students.delete'), ctrl.doEliminar);

export default router;
