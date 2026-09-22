import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { pool } from '../shared/db';
import * as gradesRepo from '../repositories/grades.repository';
import * as coursesRepo from '../repositories/courses.repository';
import * as teachersRepo from '../repositories/teachers.repository';
import * as rolesRepo from '../repositories/roles.repository';

// ── Template definitions ────────────────────────────────────────────────────

interface PlantillaConfig {
  nombre: string;
  headers: string[];
  ejemplo: (string | number | null)[];
  widths: number[];
}

const PLANTILLAS: Record<string, PlantillaConfig> = {
  alumnos: {
    nombre: 'Alumnos',
    headers: ['primer_nombre*', 'segundo_nombre', 'primer_apellido*', 'segundo_apellido', 'cui', 'fecha_nacimiento (DD/MM/AAAA)', 'genero (M/F)', 'grado', 'seccion', 'anio_ingreso', 'municipio', 'departamento', 'nombre_encargado', 'telefono_encargado'],
    ejemplo: ['Juan', 'Carlos', 'Pérez', 'García', '2901234567890', '15/03/2010', 'M', 'Primero', 'A', new Date().getFullYear(), 'Guatemala', 'Guatemala', 'María García', '5555-1234'],
    widths: [16, 15, 16, 15, 20, 24, 12, 14, 10, 13, 14, 14, 20, 14],
  },
  maestros: {
    nombre: 'Maestros',
    headers: ['full_name*', 'email', 'phone'],
    ejemplo: ['Ana López', 'alopez@escuela.gt', '5555-9876'],
    widths: [28, 28, 14],
  },
  usuarios: {
    nombre: 'Usuarios',
    headers: ['nombre*', 'username*', 'password*', 'rol*'],
    ejemplo: ['María González', 'mgonzalez', 'Contraseña123!', 'docente'],
    widths: [24, 18, 20, 16],
  },
  grados: {
    nombre: 'Grados',
    headers: ['nombre*', 'nombre_corto', 'sort_order'],
    ejemplo: ['Séptimo', '7°', 7],
    widths: [20, 14, 12],
  },
  secciones: {
    nombre: 'Secciones',
    headers: ['grado*', 'nombre_seccion*'],
    ejemplo: ['Primero', 'C'],
    widths: [20, 14],
  },
  cursos: {
    nombre: 'Cursos',
    headers: ['nombre*', 'nombre_corto', 'sort_order'],
    ejemplo: ['Matemáticas', 'MATE', 1],
    widths: [24, 14, 12],
  },
  asignaciones: {
    nombre: 'Asignaciones Docentes',
    headers: ['maestro*', 'curso*', 'grado*', 'seccion*', 'anio_escolar*'],
    ejemplo: ['Ana López', 'Matemáticas', 'Primero', 'A', new Date().getFullYear()],
    widths: [24, 20, 14, 10, 14],
  },
};

export function generarPlantilla(modulo: string): Buffer {
  const cfg = PLANTILLAS[modulo];
  if (!cfg) throw new Error(`Módulo desconocido: ${modulo}`);

  const wb = XLSX.utils.book_new();

  // Sheet 1: data template
  const ws = XLSX.utils.aoa_to_sheet([cfg.headers, cfg.ejemplo]);
  ws['!cols'] = cfg.widths.map(w => ({ wch: w }));

  // Sheet 2: instructions
  const instrucciones = [
    ['INSTRUCCIONES'],
    [''],
    ['1. Llene los datos a partir de la fila 2 (la fila 2 es un ejemplo, puede borrarla o sobreescribirla).'],
    ['2. Las columnas marcadas con * son obligatorias.'],
    ['3. No modifique los nombres de las columnas de la fila 1.'],
    ['4. Las fechas deben tener el formato DD/MM/AAAA.'],
    ['5. El campo genero acepta únicamente M o F.'],
    ['6. Los valores de grado/sección/maestro/curso deben coincidir exactamente con los registrados en el sistema.'],
    ['7. Guarde el archivo en formato .xlsx o .csv antes de subirlo.'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInfo['!cols'] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(wb, ws, cfg.nombre);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ── Parse uploaded Excel ────────────────────────────────────────────────────

type RawRow = Record<string, string | number | null | undefined>;

function leerExcel(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: false });
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''));
  return isNaN(n) ? null : n;
}

// ── Import logic per module ─────────────────────────────────────────────────

export interface ImportResult {
  insertados: number;
  omitidos: number;
  errores: { fila: number; mensaje: string }[];
}

export async function importarAlumnos(buffer: Buffer, registradoPor: number): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const sections = await gradesRepo.findAllSections();
  const sectionMap: Record<string, number> = {};
  sections.forEach(s => {
    const key = `${(s.grade_nombre ?? '').toLowerCase().trim()}:${s.nombre.toLowerCase().trim()}`;
    sectionMap[key] = s.id;
  });

  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const pNombre = str(r['primer_nombre*'] ?? r['primer_nombre']);
    const pApellido = str(r['primer_apellido*'] ?? r['primer_apellido']);
    if (!pNombre || !pApellido) {
      result.errores.push({ fila, mensaje: 'primer_nombre y primer_apellido son obligatorios.' });
      result.omitidos++;
      continue;
    }

    const gradoNombre = str(r['grado']).toLowerCase();
    const seccionNombre = str(r['seccion']).toLowerCase();
    const sectionId = gradoNombre && seccionNombre ? (sectionMap[`${gradoNombre}:${seccionNombre}`] ?? null) : null;
    if (gradoNombre && seccionNombre && !sectionId) {
      result.errores.push({ fila, mensaje: `Grado/sección "${str(r['grado'])} ${str(r['seccion'])}" no encontrado.` });
    }

    const fechaStr = str(r['fecha_nacimiento (DD/MM/AAAA)'] ?? r['fecha_nacimiento']);
    let fechaNacimiento: string | null = null;
    if (fechaStr) {
      const parts = fechaStr.split('/');
      if (parts.length === 3) {
        fechaNacimiento = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
    }

    try {
      await pool.query(
        `INSERT INTO alumnos (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
           cui, fecha_nacimiento, genero, section_id, anio_ingreso,
           municipio, departamento, nombre_encargado, telefono_encargado, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          pNombre,
          str(r['segundo_nombre']) || null,
          pApellido,
          str(r['segundo_apellido']) || null,
          str(r['cui']) || null,
          fechaNacimiento,
          str(r['genero (M/F)'] ?? r['genero']) || null,
          sectionId,
          num(r['anio_ingreso']) ?? new Date().getFullYear(),
          str(r['municipio']) || null,
          str(r['departamento']) || null,
          str(r['nombre_encargado']) || null,
          str(r['telefono_encargado']) || null,
          registradoPor,
        ]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
  }
  return result;
}

export async function importarMaestros(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const fullName = str(r['full_name*'] ?? r['full_name']);
    if (!fullName) { result.errores.push({ fila, mensaje: 'full_name es obligatorio.' }); result.omitidos++; continue; }
    try {
      await pool.query('INSERT INTO teachers (full_name, email, phone) VALUES ($1,$2,$3)',
        [fullName, str(r['email']) || null, str(r['phone']) || null]);
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

export async function importarUsuarios(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const roles = await rolesRepo.findAll();
  const roleMap: Record<string, number> = {};
  roles.forEach(r => { roleMap[r.nombre.toLowerCase()] = r.id; });

  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = str(r['nombre*'] ?? r['nombre']);
    const username = str(r['username*'] ?? r['username']);
    const password = str(r['password*'] ?? r['password']);
    const rolNombre = str(r['rol*'] ?? r['rol']).toLowerCase();
    if (!nombre || !username || !password) {
      result.errores.push({ fila, mensaje: 'nombre, username y password son obligatorios.' }); result.omitidos++; continue;
    }
    const roleId = roleMap[rolNombre];
    if (!roleId) { result.errores.push({ fila, mensaje: `Rol "${rolNombre}" no encontrado.` }); result.omitidos++; continue; }
    try {
      const hash = await bcrypt.hash(password, 12);
      await pool.query('INSERT INTO usuarios (nombre, username, password, role_id) VALUES ($1,$2,$3,$4)',
        [nombre, username, hash, roleId]);
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

export async function importarGrados(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = str(r['nombre*'] ?? r['nombre']);
    if (!nombre) { result.errores.push({ fila, mensaje: 'nombre es obligatorio.' }); result.omitidos++; continue; }
    try {
      await pool.query('INSERT INTO grades (nombre, nombre_corto, sort_order) VALUES ($1,$2,$3)',
        [nombre, str(r['nombre_corto']) || null, num(r['sort_order']) ?? 0]);
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

export async function importarSecciones(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const grades = await gradesRepo.findAllGrades();
  const gradeMap: Record<string, number> = {};
  grades.forEach(g => { gradeMap[g.nombre.toLowerCase().trim()] = g.id; });

  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const gradoNombre = str(r['grado*'] ?? r['grado']).toLowerCase();
    const seccionNombre = str(r['nombre_seccion*'] ?? r['nombre_seccion']);
    if (!gradoNombre || !seccionNombre) { result.errores.push({ fila, mensaje: 'grado y nombre_seccion son obligatorios.' }); result.omitidos++; continue; }
    const gradeId = gradeMap[gradoNombre];
    if (!gradeId) { result.errores.push({ fila, mensaje: `Grado "${str(r['grado*'] ?? r['grado'])}" no encontrado.` }); result.omitidos++; continue; }
    const grade = grades.find(g => g.id === gradeId)!;
    try {
      await pool.query('INSERT INTO sections (grade_id, nombre, display_name) VALUES ($1,$2,$3)',
        [gradeId, seccionNombre, `${grade.nombre} ${seccionNombre}`]);
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

export async function importarCursos(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = str(r['nombre*'] ?? r['nombre']);
    if (!nombre) { result.errores.push({ fila, mensaje: 'nombre es obligatorio.' }); result.omitidos++; continue; }
    try {
      await pool.query('INSERT INTO courses (nombre, nombre_corto, sort_order) VALUES ($1,$2,$3)',
        [nombre, str(r['nombre_corto']) || null, num(r['sort_order']) ?? 0]);
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

export async function importarAsignaciones(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const [allTeachers, allCourses, allSections] = await Promise.all([
    teachersRepo.findAll(), coursesRepo.findAll(), gradesRepo.findAllSections(),
  ]);
  const teacherMap: Record<string, number> = {};
  allTeachers.forEach(t => { teacherMap[t.full_name.toLowerCase().trim()] = t.id; });
  const courseMap: Record<string, number> = {};
  allCourses.forEach(c => { courseMap[c.nombre.toLowerCase().trim()] = c.id; });
  const gradeMap: Record<string, number> = {};
  allSections.forEach(s => {
    if (s.grade_nombre) gradeMap[s.grade_nombre.toLowerCase().trim()] = s.grade_id;
  });
  const sectionMap: Record<string, number> = {};
  allSections.forEach(s => {
    const key = `${(s.grade_nombre ?? '').toLowerCase().trim()}:${s.nombre.toLowerCase().trim()}`;
    sectionMap[key] = s.id;
  });

  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const maestroNombre  = str(r['maestro*'] ?? r['maestro']).toLowerCase();
    const cursoNombre    = str(r['curso*']   ?? r['curso']).toLowerCase();
    const gradoNombre    = str(r['grado*']   ?? r['grado']).toLowerCase();
    const seccionNombre  = str(r['seccion*'] ?? r['seccion']).toLowerCase();
    const anio           = num(r['anio_escolar*'] ?? r['anio_escolar']) ?? new Date().getFullYear();

    const teacherId  = teacherMap[maestroNombre];
    const courseId   = courseMap[cursoNombre];
    const gradeId    = gradeMap[gradoNombre];
    const sectionId  = sectionMap[`${gradoNombre}:${seccionNombre}`];

    const missing = [];
    if (!teacherId) missing.push(`maestro "${str(r['maestro*'] ?? r['maestro'])}"`);
    if (!courseId)  missing.push(`curso "${str(r['curso*'] ?? r['curso'])}"`);
    if (!sectionId) missing.push(`sección "${str(r['grado*'] ?? r['grado'])} ${str(r['seccion*'] ?? r['seccion'])}"`);
    if (missing.length) { result.errores.push({ fila, mensaje: `No encontrado: ${missing.join(', ')}.` }); result.omitidos++; continue; }

    try {
      await pool.query(
        `INSERT INTO teacher_assignments (teacher_id, course_id, grade_id, section_id, school_year)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [teacherId, courseId, gradeId, sectionId, anio]
      );
      result.insertados++;
    } catch (e: unknown) { result.errores.push({ fila, mensaje: (e as Error).message }); result.omitidos++; }
  }
  return result;
}

// ── Academic year rollover ──────────────────────────────────────────────────

export interface RolloverPreview {
  total: number;
  porGrado: { grade_nombre: string; section_nombre: string; count: number; siguiente: string | null }[];
  sinSeccion: number;
}

export async function previewRollover(): Promise<RolloverPreview> {
  const grades = await gradesRepo.findAllGrades(true);
  const gradeByOrder: Record<number, typeof grades[0]> = {};
  grades.forEach(g => { gradeByOrder[g.sort_order] = g; });

  const sections = await gradesRepo.findAllSections();
  const nextSectionMap: Record<number, string | null> = {};
  sections.forEach(s => {
    const currGrade = grades.find(g => g.id === s.grade_id);
    if (!currGrade) return;
    const nextGrade = gradeByOrder[currGrade.sort_order + 1];
    nextSectionMap[s.id] = nextGrade ? `${nextGrade.nombre} ${s.nombre}` : 'Egresado';
  });

  const { rows } = await pool.query(`
    SELECT s.id AS section_id, g.nombre AS grade_nombre, s.nombre AS section_nombre,
           COUNT(a.id)::int AS count
    FROM alumnos a
    JOIN sections s ON s.id = a.section_id
    JOIN grades   g ON g.id = s.grade_id
    WHERE a.deleted_at IS NULL
    GROUP BY s.id, g.sort_order, g.nombre, s.nombre
    ORDER BY g.sort_order, s.nombre
  `);

  const { rows: sinSecRows } = await pool.query(`
    SELECT COUNT(*)::int AS n FROM alumnos WHERE deleted_at IS NULL AND section_id IS NULL
  `);
  const total = rows.reduce((s: number, r: { count: number }) => s + r.count, 0) + sinSecRows[0].n;

  return {
    total,
    sinSeccion: sinSecRows[0].n,
    porGrado: rows.map((r: { section_id: number; grade_nombre: string; section_nombre: string; count: number }) => ({
      grade_nombre: r.grade_nombre,
      section_nombre: r.section_nombre,
      count: r.count,
      siguiente: nextSectionMap[r.section_id] ?? null,
    })),
  };
}

export async function ejecutarRollover(): Promise<{ promovidos: number; egresados: number; sinSeccion: number }> {
  const grades = await gradesRepo.findAllGrades(true);
  const sections = await gradesRepo.findAllSections();
  const gradeByOrder: Record<number, typeof grades[0]> = {};
  grades.forEach(g => { gradeByOrder[g.sort_order] = g; });

  // Map: current section_id → next section_id (or null = egresado)
  const nextSectionId: Record<number, number | null> = {};
  sections.forEach(s => {
    const currGrade = grades.find(g => g.id === s.grade_id);
    if (!currGrade) return;
    const nextGrade = gradeByOrder[currGrade.sort_order + 1];
    if (!nextGrade) { nextSectionId[s.id] = null; return; }
    const nextSection = sections.find(ns => ns.grade_id === nextGrade.id && ns.nombre === s.nombre);
    nextSectionId[s.id] = nextSection?.id ?? null;
  });

  const { rows: alumnos } = await pool.query(
    'SELECT id, section_id FROM alumnos WHERE deleted_at IS NULL AND section_id IS NOT NULL'
  );

  let promovidos = 0, egresados = 0;
  for (const a of alumnos) {
    if (!(a.section_id in nextSectionId)) continue;
    const next = nextSectionId[a.section_id];
    await pool.query('UPDATE alumnos SET section_id = $1 WHERE id = $2', [next, a.id]);
    if (next === null) egresados++; else promovidos++;
  }

  const { rows: sinSec } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM alumnos WHERE deleted_at IS NULL AND section_id IS NULL'
  );

  return { promovidos, egresados, sinSeccion: sinSec[0].n };
}
