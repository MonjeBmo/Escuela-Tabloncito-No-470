import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import { requireAuth, requirePermission } from '../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

// Usuarios
router.get('/usuarios',             requirePermission('admin.users'), ctrl.showUsuarios);
router.post('/usuarios',            requirePermission('admin.users'), ctrl.crearUsuario);
router.post('/usuarios/:id',        requirePermission('admin.users'), ctrl.editarUsuario);
router.post('/usuarios/:id/toggle', requirePermission('admin.users'), ctrl.toggleUsuario);

// Roles y permisos
router.get('/roles',               requirePermission('admin.roles'), ctrl.showRoles);
router.post('/roles',              requirePermission('admin.roles'), ctrl.crearRol);
router.get('/roles/:id/editar',    requirePermission('admin.roles'), ctrl.showEditRole);
router.post('/roles/:id/permisos', requirePermission('admin.roles'), ctrl.saveRolePermissions);

// Grados y secciones
router.get('/grados',                    requirePermission('admin.grades'), ctrl.showGrados);
router.post('/grados/grade',             requirePermission('admin.grades'), ctrl.crearGrado);
router.post('/grados/grade/:id',         requirePermission('admin.grades'), ctrl.editarGrado);
router.post('/grados/grade/:id/toggle',  requirePermission('admin.grades'), ctrl.toggleGrado);
router.post('/grados/seccion',           requirePermission('admin.grades'), ctrl.crearSeccion);
router.post('/grados/seccion/:id',       requirePermission('admin.grades'), ctrl.editarSeccion);
router.post('/grados/seccion/:id/toggle',requirePermission('admin.grades'), ctrl.toggleSeccion);

// Cursos
router.get('/cursos',              requirePermission('admin.courses'), ctrl.showCursos);
router.post('/cursos',             requirePermission('admin.courses'), ctrl.crearCurso);
router.post('/cursos/:id',         requirePermission('admin.courses'), ctrl.editarCurso);
router.post('/cursos/:id/toggle',  requirePermission('admin.courses'), ctrl.toggleCurso);

// Maestros
router.get('/maestros',             requirePermission('admin.teachers'), ctrl.showMaestros);
router.post('/maestros/asignacion', requirePermission('admin.teachers'), ctrl.crearAsignacion);
router.post('/maestros',            requirePermission('admin.teachers'), ctrl.crearMaestro);
router.post('/maestros/:id',        requirePermission('admin.teachers'), ctrl.editarMaestro);
router.post('/maestros/:id/toggle', requirePermission('admin.teachers'), ctrl.toggleMaestro);

export default router;
