import { Request, Response } from 'express';
import * as service from '../services/alumnos.service';

const LIMITES_VALIDOS = [10, 20];

export async function index(req: Request, res: Response): Promise<void> {
  const limit = LIMITES_VALIDOS.includes(parseInt(String(req.query.limit))) ? parseInt(String(req.query.limit)) : 20;
  const pagina = Math.max(1, parseInt(String(req.query.pagina ?? 1)));
  const offset = (pagina - 1) * limit;
  const { q, section_id, anio_ingreso } = req.query as Record<string, string>;
  const secciones = await service.obtenerSecciones();

  const hayFiltros = q || section_id || anio_ingreso;
  let alumnos;
  let total;

  if (hayFiltros) {
    alumnos = await service.buscar({
      q: q || undefined,
      section_id: section_id ? parseInt(section_id) : undefined,
      anio_ingreso: anio_ingreso ? parseInt(anio_ingreso) : undefined,
    }, limit, offset);
    total = alumnos.length;
  } else {
    [alumnos, total] = await Promise.all([
      service.listar(limit, offset),
      service.contar(),
    ]);
  }

  res.render('alumnos/index', {
    titulo: 'Registro de alumnos',
    alumnos,
    secciones,
    total,
    pagina,
    limit,
    totalPaginas: Math.ceil(total / limit),
    filtros: { q, section_id, anio_ingreso },
  });
}

export async function showCreate(req: Request, res: Response): Promise<void> {
  const { grades, sections } = await service.obtenerGradesYSecciones();
  res.render('alumnos/crear', { titulo: 'Registrar alumno', grades, sections });
}

export async function doCreate(req: Request, res: Response): Promise<void> {
  const b = req.body as Record<string, string>;
  try {
    const alumno = await service.crear({
      primer_nombre: b.primer_nombre.trim(),
      segundo_nombre: b.segundo_nombre?.trim() || null,
      primer_apellido: b.primer_apellido.trim(),
      segundo_apellido: b.segundo_apellido?.trim() || null,
      cui: b.cui?.trim() || null,
      fecha_nacimiento: b.fecha_nacimiento ? new Date(b.fecha_nacimiento) : null,
      genero: (b.genero as 'M' | 'F') || null,
      section_id: b.section_id ? parseInt(b.section_id) : null,
      anio_ingreso: parseInt(b.anio_ingreso) || new Date().getFullYear(),
      municipio: b.municipio?.trim() || null,
      departamento: b.departamento?.trim() || null,
      nombre_encargado: b.nombre_encargado?.trim() || null,
      telefono_encargado: b.telefono_encargado?.trim() || null,
      registrado_por: req.session.usuario!.id,
    });
    req.session.flash = { tipo: 'success', mensaje: `Alumno ${alumno.primer_nombre} ${alumno.primer_apellido} registrado.` };
    res.redirect('/alumnos');
  } catch (err) {
    console.error('[Alumnos] Error al crear:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al registrar el alumno.' };
    res.redirect('/alumnos/crear');
  }
}

export async function show(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const alumno = await service.obtener(id);
  if (!alumno) { res.redirect('/alumnos'); return; }
  res.render('alumnos/detalle', { titulo: 'Detalle de alumno', alumno });
}

export async function doEliminar(req: Request, res: Response): Promise<void> {
  await service.eliminar(parseInt(req.params.id));
  req.session.flash = { tipo: 'success', mensaje: 'Alumno eliminado.' };
  res.redirect('/alumnos');
}
