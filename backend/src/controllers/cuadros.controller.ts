import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as service from '../services/cuadros.service';

const POR_PAGINA = 20;

export async function index(req: Request, res: Response): Promise<void> {
  const pagina = parseInt(String(req.query.pagina ?? 1));
  const offset = (pagina - 1) * POR_PAGINA;
  const [cuadros, total, grados] = await Promise.all([
    service.listar(POR_PAGINA, offset),
    service.contar(),
    service.obtenerGrados(),
  ]);
  res.render('cuadros/index', {
    titulo: 'Cuadros PRIM',
    cuadros,
    grados,
    total,
    pagina,
    totalPaginas: Math.ceil(total / POR_PAGINA),
  });
}

export async function showBusqueda(req: Request, res: Response): Promise<void> {
  const { q, anio, grado_id, origen } = req.query as Record<string, string>;
  const grados = await service.obtenerGrados();
  const anios = await service.aniosDisponibles();

  let cuadros = [];
  const hayFiltros = q || anio || grado_id || origen;
  if (hayFiltros) {
    cuadros = await service.buscar({
      q: q || undefined,
      anio: anio ? parseInt(anio) : undefined,
      grado_id: grado_id ? parseInt(grado_id) : undefined,
      origen: origen || undefined,
    });
  }

  res.render('cuadros/busqueda', {
    titulo: 'Buscar cuadros',
    cuadros,
    grados,
    anios,
    filtros: { q, anio, grado_id, origen },
    hayFiltros: !!hayFiltros,
  });
}

export async function showCreate(req: Request, res: Response): Promise<void> {
  const grados = await service.obtenerGrados();
  res.render('cuadros/crear', { titulo: 'Registrar cuadro', grados });
}

export async function doCreate(req: Request, res: Response): Promise<void> {
  const { codigo, anio, grado_id, docente, total_alumnos } = req.body as Record<string, string>;
  const archivo = req.files?.documento as UploadedFile | undefined;

  try {
    const cuadro = await service.crearConDocumento({
      codigo: codigo.trim(),
      anio: parseInt(anio),
      grado_id: grado_id ? parseInt(grado_id) : null,
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

export async function show(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const cuadro = await service.obtener(id);
  if (!cuadro) { res.redirect('/cuadros'); return; }

  let urlDescarga: string | null = null;
  if (cuadro.documento_key) {
    urlDescarga = await service.urlDescarga(cuadro.documento_key);
  }

  res.render('cuadros/detalle', { titulo: `Cuadro ${cuadro.codigo}`, cuadro, urlDescarga });
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
