import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as service from '../services/cuadros.service';
import * as teachersRepo from '../repositories/teachers.repository';

const LIMITES_VALIDOS = [10, 20];

export async function index(req: Request, res: Response): Promise<void> {
  const limit = LIMITES_VALIDOS.includes(parseInt(String(req.query.limit))) ? parseInt(String(req.query.limit)) : 20;
  const pagina = Math.max(1, parseInt(String(req.query.pagina ?? 1)));
  const offset = (pagina - 1) * limit;
  const [cuadros, total, secciones] = await Promise.all([
    service.listar(limit, offset),
    service.contar(),
    service.obtenerSecciones(),
  ]);
  res.render('cuadros/index', {
    titulo: 'Cuadros PRIM',
    cuadros,
    secciones,
    total,
    pagina,
    limit,
    totalPaginas: Math.ceil(total / limit),
  });
}

export async function showBusqueda(req: Request, res: Response): Promise<void> {
  const { q, anio, section_id, origen } = req.query as Record<string, string>;
  const [secciones, anios] = await Promise.all([
    service.obtenerSecciones(),
    service.aniosDisponibles(),
  ]);

  let cuadros: Awaited<ReturnType<typeof service.buscar>> = [];
  const hayFiltros = q || anio || section_id || origen;
  if (hayFiltros) {
    cuadros = await service.buscar({
      q: q || undefined,
      anio: anio ? parseInt(anio) : undefined,
      section_id: section_id ? parseInt(section_id) : undefined,
      origen: origen || undefined,
    });
  }

  res.render('cuadros/busqueda', {
    titulo: 'Buscar cuadros',
    cuadros,
    secciones,
    anios,
    filtros: { q, anio, section_id, origen },
    hayFiltros: !!hayFiltros,
  });
}

export async function showCreate(req: Request, res: Response): Promise<void> {
  const [{ grades, sections }, teachers] = await Promise.all([
    service.obtenerGradesYSecciones(),
    teachersRepo.findAll(true),
  ]);
  res.render('cuadros/crear', { titulo: 'Registrar cuadro', grades, sections, teachers });
}

export async function doCreate(req: Request, res: Response): Promise<void> {
  const { codigo, anio, section_id, docente, total_alumnos } = req.body as Record<string, string>;
  const archivo = req.files?.documento as UploadedFile | undefined;

  try {
    const cuadro = await service.crearConDocumento({
      codigo: codigo.trim(),
      anio: parseInt(anio),
      section_id: section_id ? parseInt(section_id) : null,
      docente: docente?.trim() ?? '',
      total_alumnos: total_alumnos ? parseInt(total_alumnos) : null,
      datos_extra: {},
      subido_por: req.session.usuario!.id,
      archivo,
    });
    req.session.flash = { tipo: 'success', mensaje: `Cuadro ${cuadro.codigo} registrado exitosamente.` };
    res.redirect(`/cuadros/${cuadro.id}`);
  } catch (err) {
    console.error('[Cuadros] Error al crear:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al registrar el cuadro. Intente de nuevo.' };
    res.redirect('/cuadros/crear');
  }
}

import { streamObject } from '../shared/minio';

export async function show(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const cuadro = await service.obtener(id);
  if (!cuadro) { res.redirect('/cuadros'); return; }

  let urlDescarga: string | null = null;
  if (cuadro.documento_key) {
    urlDescarga = `/cuadros/${cuadro.id}/documento`;
  }

  res.render('cuadros/detalle', { titulo: `Cuadro ${cuadro.codigo}`, cuadro, urlDescarga });
}

export async function showDocumento(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const cuadro = await service.obtener(id);
  if (!cuadro || !cuadro.documento_key) {
    res.status(404).send('Documento no encontrado');
    return;
  }
  const isDownload = req.query.download === '1';
  await streamObject(
    cuadro.documento_key,
    res,
    cuadro.documento_nombre || `cuadro-${cuadro.codigo}.pdf`,
    cuadro.documento_mime || undefined,
    !isDownload
  );
}

export async function doValidar(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  await service.validar(id, req.session.usuario!.id);
  req.session.flash = { tipo: 'success', mensaje: 'Cuadro validado correctamente.' };
  res.redirect(`/cuadros/${id}`);
}

export async function doEliminar(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  await service.eliminar(id);
  req.session.flash = { tipo: 'success', mensaje: 'Cuadro eliminado.' };
  res.redirect('/cuadros');
}
