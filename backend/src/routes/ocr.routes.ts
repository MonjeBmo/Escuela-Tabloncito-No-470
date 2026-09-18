import { Router } from 'express';
import * as ctrl from '../controllers/ocr.controller';
import { requireAuth, requireRol } from '../shared/auth.middleware';

const router = Router();

// Callback interno del servicio OCR (sin autenticación de sesión)
router.post('/callback', ctrl.recibirResultado);

router.use(requireAuth);

router.get('/',              ctrl.index);
router.get('/subir',         requireRol('director', 'administrativo', 'validador_ocr'), ctrl.showUpload);
router.post('/subir',        requireRol('director', 'administrativo', 'validador_ocr'), ctrl.doUpload);
router.get('/revision/:id',  requireRol('director', 'administrativo', 'validador_ocr'), ctrl.showRevision);
router.post('/revision/:id/validar',  requireRol('director', 'administrativo', 'validador_ocr'), ctrl.doValidar);
router.post('/revision/:id/rechazar', requireRol('director', 'administrativo', 'validador_ocr'), ctrl.doRechazar);

export default router;
