import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as svc from '../services/importar.service';

const MODULOS: Record<string, string> = {
  alumnos: 'Alumnos',
  maestros: 'Maestros',
  usuarios: 'Usuarios',
  grados: 'Grados',
  secciones: 'Secciones',
  cursos: 'Cursos',
  asignaciones: 'Asignaciones',
};

export async function descargarPlantilla(req: Request, res: Response): Promise<void> {
  const modulo = req.params.modulo;
  if (!MODULOS[modulo]) { res.redirect('/admin'); return; }
  try {
    const buffer = svc.generarPlantilla(modulo);
    res.setHeader('Content-Disposition', `attachment; filename="plantilla_${modulo}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch {
    res.redirect('/admin');
  }
}

export async function procesarImport(req: Request, res: Response): Promise<void> {
  const modulo = req.params.modulo;
  if (!MODULOS[modulo]) { res.redirect('/admin'); return; }

  const archivo = req.files?.archivo as UploadedFile | undefined;
  if (!archivo) {
    req.session.flash = { tipo: 'danger', mensaje: 'Debe seleccionar un archivo Excel (.xlsx).' };
    res.redirect(redirectUrl(modulo));
    return;
  }

  try {
    const buffer = archivo.data;
    let result: Awaited<ReturnType<typeof svc.importarAlumnos>>;

    switch (modulo) {
      case 'alumnos':      result = await svc.importarAlumnos(buffer, req.session.usuario!.id); break;
      case 'maestros':     result = await svc.importarMaestros(buffer); break;
      case 'usuarios':     result = await svc.importarUsuarios(buffer); break;
      case 'grados':       result = await svc.importarGrados(buffer); break;
      case 'secciones':    result = await svc.importarSecciones(buffer); break;
      case 'cursos':       result = await svc.importarCursos(buffer); break;
      case 'asignaciones': result = await svc.importarAsignaciones(buffer); break;
      default: res.redirect('/admin'); return;
    }

    const errMsg = result.errores.length
      ? ` | Errores (${result.errores.length}): ` + result.errores.slice(0, 3).map(e => `Fila ${e.fila}: ${e.mensaje}`).join('; ') + (result.errores.length > 3 ? '...' : '')
      : '';

    req.session.flash = {
      tipo: result.insertados > 0 ? 'success' : 'warning',
      mensaje: `Importación ${MODULOS[modulo]}: ${result.insertados} registros insertados, ${result.omitidos} omitidos.${errMsg}`,
    };
  } catch (err) {
    console.error('[Import] Error:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al procesar el archivo. Verifique que sea un Excel válido basado en la plantilla.' };
  }

  res.redirect(redirectUrl(modulo));
}

function redirectUrl(modulo: string): string {
  const map: Record<string, string> = {
    alumnos: '/alumnos',
    maestros: '/admin/maestros',
    usuarios: '/admin/usuarios',
    grados: '/admin/grados',
    secciones: '/admin/grados',
    cursos: '/admin/cursos',
    asignaciones: '/admin/maestros',
  };
  return map[modulo] ?? '/admin';
}

// ── Ciclo escolar / rollover ──────────────────────────────────────────────

export async function showCiclo(req: Request, res: Response): Promise<void> {
  const preview = await svc.previewRollover();
  res.render('admin/ciclo', { titulo: 'Ciclo escolar', preview });
}

export async function ejecutarPromocion(req: Request, res: Response): Promise<void> {
  try {
    const result = await svc.ejecutarRollover();
    req.session.flash = {
      tipo: 'success',
      mensaje: `Promoción completada: ${result.promovidos} alumnos promovidos, ${result.egresados} egresados, ${result.sinSeccion} sin sección asignada.`,
    };
  } catch (err) {
    console.error('[Rollover] Error:', err);
    req.session.flash = { tipo: 'danger', mensaje: 'Error al ejecutar la promoción de ciclo.' };
  }
  res.redirect('/admin/ciclo');
}
