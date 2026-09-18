import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as service from '../services/ocr.service';
import * as gradosRepo from '../repositories/grados.repository';

export async function index(req: Request, res: Response): Promise<void> {
  const [jobs, conteo] = await Promise.all([
    service.listar(50, 0),
    service.conteoEstados(),
  ]);
  res.render('ocr/index', { titulo: 'Digitalización OCR', jobs, conteo });
}

export async function showUpload(req: Request, res: Response): Promise<void> {
  res.render('ocr/subir', { titulo: 'Subir documento para OCR' });
}

export async function doUpload(req: Request, res: Response): Promise<void> {
  const archivo = req.files?.documento as UploadedFile | undefined;
  if (!archivo) {
    req.session.flash = { tipo: 'danger', mensaje: 'Debe seleccionar un archivo.' };
    res.redirect('/ocr/subir');
    return;
  }
  try {
    const job = await service.subirYProcesar(archivo, req.session.usuario!.id);
    req.session.flash = { tipo: 'info', mensaje: `Documento enviado al procesamiento OCR. Job #${job.id}. Revise en unos momentos.` };
    res.redirect('/ocr');
  } catch (err) {
    console.error('[OCR] Error al subir:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al procesar el documento.' };
    res.redirect('/ocr/subir');
  }
}

export async function showRevision(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const [job, grados] = await Promise.all([
    service.obtener(id),
    gradosRepo.findAll(),
  ]);
  if (!job || job.estado !== 'revision') {
    req.session.flash = { tipo: 'warning', mensaje: 'Este documento no está disponible para revisión.' };
    res.redirect('/ocr');
    return;
  }
  res.render('ocr/revision', { titulo: 'Revisar extracción OCR', job, grados });
}

export async function doValidar(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const b = req.body as Record<string, string>;
  try {
    await service.validarJob(
      id,
      req.session.usuario!.id,
      {
        codigo: b.codigo,
        anio: parseInt(b.anio),
        grado_id: b.grado_id ? parseInt(b.grado_id) : null,
        docente: b.docente,
        total_alumnos: b.total_alumnos ? parseInt(b.total_alumnos) : null,
        datos_extra: {},
      },
      b.notas ?? ''
    );
    req.session.flash = { tipo: 'success', mensaje: 'Documento validado y cuadro creado exitosamente.' };
    res.redirect('/ocr');
  } catch (err) {
    console.error('[OCR] Error al validar:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al validar el documento.' };
    res.redirect(`/ocr/revision/${id}`);
  }
}

export async function doRechazar(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const { notas } = req.body as { notas: string };
  await service.rechazarJob(id, req.session.usuario!.id, notas ?? '');
  req.session.flash = { tipo: 'warning', mensaje: 'Documento rechazado.' };
  res.redirect('/ocr');
}

// Endpoint interno llamado por el servicio OCR (Python)
export async function recibirResultado(req: Request, res: Response): Promise<void> {
  const { job_id, campos, confianza } = req.body as {
    job_id: number;
    campos: Record<string, string>;
    confianza: Record<string, number>;
  };
  await service.recibirResultadoOcr(job_id, campos, confianza);
  res.json({ ok: true });
}
