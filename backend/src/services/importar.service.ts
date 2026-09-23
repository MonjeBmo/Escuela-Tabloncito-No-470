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
    headers: ['nombre_completo*', 'correo', 'telefono'],
    ejemplo: ['Ana López', 'alopez@escuela.gt', '5555-9876'],
    widths: [28, 28, 14],
  },
  usuarios: {
    nombre: 'Usuarios',
    headers: ['nombre_completo*', 'usuario*', 'password*', 'rol*'],
    ejemplo: ['María González', 'mgonzalez', 'Contraseña123!', 'docente'],
    widths: [24, 18, 20, 16],
  },
  grados: {
    nombre: 'Grados',
    headers: ['nombre_grado*', 'nombre_corto', 'orden'],
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
    headers: ['nombre_curso*', 'nombre_corto', 'orden'],
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
    ['INSTRUCCIONES DE IMPORTACIÓN'],
    [''],
    ['1. Ingrese los registros a partir de la fila 2 (la fila 2 contiene un ejemplo editable).'],
    ['2. Las columnas marcadas con asterisco (*) son obligatorias.'],
    ['3. No modifique ni elimine los nombres de las columnas en la fila 1.'],
    ['4. Las fechas deben tener el formato DD/MM/AAAA (ej. 15/03/2012).'],
    ['5. El campo género acepta "M" (Masculino) o "F" (Femenino).'],
    ['6. Los nombres de grados, secciones, maestros y cursos deben coincidir con los existentes en el sistema.'],
    ['7. Guarde el archivo en formato .xlsx antes de cargarlo al sistema.'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInfo['!cols'] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(wb, ws, cfg.nombre);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ── Parse uploaded Excel with intelligent normalization ──────────────────────

function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[\*\(\)\.\:\-\_\/]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, '_')
    .trim()
    .replace(/^_+|_+$/g, '');
}

function leerExcel(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: false });

  return rawRows.map(row => {
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (key) {
        const normKey = normalizeKey(key);
        const strVal = val == null ? '' : String(val).trim();
        normalized[normKey] = strVal;
        normalized[key.toLowerCase().trim()] = strVal;
      }
    }
    return normalized;
  });
}

function getVal(r: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const norm = normalizeKey(a);
    if (r[norm] !== undefined && r[norm] !== '') return r[norm];
    const raw = a.toLowerCase().trim();
    if (r[raw] !== undefined && r[raw] !== '') return r[raw];
  }
  return '';
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''));
  return isNaN(n) ? null : n;
}

function parseFecha(val: string): string | null {
  if (!val) return null;
  val = val.trim();
  // Format DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Format YYYY-MM-DD
  const isoMatch = val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Numeric serial from Excel
  const serial = parseFloat(val);
  if (!isNaN(serial) && serial > 1000 && serial < 80000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  return null;
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

    const pNombre = getVal(r, 'primer_nombre', 'primer_nombre_del_alumno', 'nombre1', 'nombre');
    const pApellido = getVal(r, 'primer_apellido', 'primer_apellido_del_alumno', 'apellido1', 'apellido');

    if (!pNombre || !pApellido) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue; // Skip empty row
      result.errores.push({ fila, mensaje: 'El primer nombre y primer apellido son campos obligatorios.' });
      result.omitidos++;
      continue;
    }

    const sNombre = getVal(r, 'segundo_nombre', 'nombre2', 'otros_nombres') || null;
    const sApellido = getVal(r, 'segundo_apellido', 'apellido2') || null;
    const cui = getVal(r, 'cui', 'cui_del_alumno', 'identificacion') || null;

    const gradoNombre = getVal(r, 'grado', 'nombre_del_grado').toLowerCase();
    const seccionNombre = getVal(r, 'seccion', 'nombre_seccion').toLowerCase();
    const sectionId = gradoNombre && seccionNombre ? (sectionMap[`${gradoNombre}:${seccionNombre}`] ?? null) : null;
    if (gradoNombre && seccionNombre && !sectionId) {
      result.errores.push({ fila, mensaje: `Grado/sección "${gradoNombre} ${seccionNombre}" no encontrado en el catálogo escolar.` });
    }

    const fechaNacimiento = parseFecha(getVal(r, 'fecha_nacimiento_dd_mm_aaaa', 'fecha_nacimiento', 'fecha_de_nacimiento', 'nacimiento'));
    const generoVal = getVal(r, 'genero_m_f', 'genero', 'sexo').toUpperCase();
    const genero = (generoVal === 'M' || generoVal === 'F') ? generoVal : null;

    const anioIngreso = num(getVal(r, 'anio_ingreso', 'anio')) ?? new Date().getFullYear();
    const municipio = getVal(r, 'municipio') || null;
    const departamento = getVal(r, 'departamento') || null;
    const nombreEncargado = getVal(r, 'nombre_encargado', 'encargado', 'tutor') || null;
    const telefonoEncargado = getVal(r, 'telefono_encargado', 'telefono', 'contacto') || null;

    try {
      await pool.query(
        `INSERT INTO alumnos (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
           cui, fecha_nacimiento, genero, section_id, anio_ingreso,
           municipio, departamento, nombre_encargado, telefono_encargado, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          pNombre,
          sNombre,
          pApellido,
          sApellido,
          cui,
          fechaNacimiento,
          genero,
          sectionId,
          anioIngreso,
          municipio,
          departamento,
          nombreEncargado,
          telefonoEncargado,
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
    const fullName = getVal(r, 'nombre_completo', 'full_name', 'nombre', 'docente', 'maestro', 'profesor');
    if (!fullName) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue; // Skip empty row
      result.errores.push({ fila, mensaje: 'El nombre completo del maestro es obligatorio.' });
      result.omitidos++;
      continue;
    }
    const email = getVal(r, 'correo', 'email', 'correo_electronico') || null;
    const phone = getVal(r, 'telefono', 'phone', 'celular', 'tel') || null;

    try {
      await pool.query(
        'INSERT INTO teachers (full_name, email, phone) VALUES ($1,$2,$3)',
        [fullName, email, phone]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
  }
  return result;
}

export async function importarUsuarios(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const roles = await rolesRepo.findAll();
  const roleMap: Record<string, number> = {};
  roles.forEach(r => { roleMap[r.nombre.toLowerCase().trim()] = r.id; });

  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = getVal(r, 'nombre_completo', 'nombre', 'full_name');
    const username = getVal(r, 'usuario', 'username', 'user');
    const password = getVal(r, 'password', 'clave', 'contrasena');
    const rolNombre = getVal(r, 'rol', 'role', 'perfil').toLowerCase();

    if (!nombre || !username || !password) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue; // Skip empty row
      result.errores.push({ fila, mensaje: 'Nombre, usuario y contraseña son campos obligatorios.' });
      result.omitidos++;
      continue;
    }
    const roleId = roleMap[rolNombre];
    if (!roleId) {
      result.errores.push({ fila, mensaje: `El rol "${rolNombre}" no existe en el sistema.` });
      result.omitidos++;
      continue;
    }
    try {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        'INSERT INTO usuarios (nombre, username, password, role_id) VALUES ($1,$2,$3,$4)',
        [nombre, username, hash, roleId]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
  }
  return result;
}

export async function importarGrados(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = getVal(r, 'nombre_grado', 'nombre', 'grado');
    if (!nombre) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue;
      result.errores.push({ fila, mensaje: 'El nombre del grado es obligatorio.' });
      result.omitidos++;
      continue;
    }
    const nombreCorto = getVal(r, 'nombre_corto', 'corto', 'abreviatura') || null;
    const sortOrder = num(getVal(r, 'orden', 'sort_order', 'posicion')) ?? 0;

    try {
      await pool.query(
        'INSERT INTO grades (nombre, nombre_corto, sort_order) VALUES ($1,$2,$3)',
        [nombre, nombreCorto, sortOrder]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
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
    const gradoNombre = getVal(r, 'grado', 'nombre_del_grado').toLowerCase();
    const seccionNombre = getVal(r, 'nombre_seccion', 'seccion', 'nombre');
    if (!gradoNombre || !seccionNombre) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue;
      result.errores.push({ fila, mensaje: 'Grado y nombre de sección son campos obligatorios.' });
      result.omitidos++;
      continue;
    }
    const gradeId = gradeMap[gradoNombre];
    if (!gradeId) {
      result.errores.push({ fila, mensaje: `Grado "${gradoNombre}" no encontrado.` });
      result.omitidos++;
      continue;
    }
    const grade = grades.find(g => g.id === gradeId)!;
    try {
      await pool.query(
        'INSERT INTO sections (grade_id, nombre, display_name) VALUES ($1,$2,$3)',
        [gradeId, seccionNombre, `${grade.nombre} ${seccionNombre}`]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
  }
  return result;
}

export async function importarCursos(buffer: Buffer): Promise<ImportResult> {
  const rows = leerExcel(buffer);
  const result: ImportResult = { insertados: 0, omitidos: 0, errores: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = getVal(r, 'nombre_curso', 'nombre', 'curso', 'materia', 'asignatura');
    if (!nombre) {
      const hasAny = Object.values(r).some(v => v !== '');
      if (!hasAny) continue;
      result.errores.push({ fila, mensaje: 'El nombre del curso es obligatorio.' });
      result.omitidos++;
      continue;
    }
    const nombreCorto = getVal(r, 'nombre_corto', 'corto', 'codigo') || null;
    const sortOrder = num(getVal(r, 'orden', 'sort_order')) ?? 0;

    try {
      await pool.query(
        'INSERT INTO courses (nombre, nombre_corto, sort_order) VALUES ($1,$2,$3)',
        [nombre, nombreCorto, sortOrder]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
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
    const maestroNombre  = getVal(r, 'maestro', 'docente', 'profesor', 'full_name').toLowerCase();
    const cursoNombre    = getVal(r, 'curso', 'materia', 'asignatura').toLowerCase();
    const gradoNombre    = getVal(r, 'grado').toLowerCase();
    const seccionNombre  = getVal(r, 'seccion').toLowerCase();
    const anio           = num(getVal(r, 'anio_escolar', 'anio', 'ciclo')) ?? new Date().getFullYear();

    if (!maestroNombre && !cursoNombre && !gradoNombre && !seccionNombre) {
      continue; // Skip empty row
    }

    const teacherId  = teacherMap[maestroNombre];
    const courseId   = courseMap[cursoNombre];
    const gradeId    = gradeMap[gradoNombre];
    const sectionId  = sectionMap[`${gradoNombre}:${seccionNombre}`];

    const missing = [];
    if (!teacherId) missing.push(`maestro "${maestroNombre}"`);
    if (!courseId)  missing.push(`curso "${cursoNombre}"`);
    if (!sectionId) missing.push(`sección "${gradoNombre} ${seccionNombre}"`);
    if (missing.length) {
      result.errores.push({ fila, mensaje: `No encontrado en el sistema: ${missing.join(', ')}.` });
      result.omitidos++;
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO teacher_assignments (teacher_id, course_id, grade_id, section_id, school_year)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [teacherId, courseId, gradeId, sectionId, anio]
      );
      result.insertados++;
    } catch (e: unknown) {
      result.errores.push({ fila, mensaje: (e as Error).message });
      result.omitidos++;
    }
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
    SELECT
      g.nombre AS grade_nombre,
      s.nombre AS section_nombre,
      s.id     AS section_id,
      COUNT(a.id)::int AS count
    FROM sections s
    JOIN grades g ON g.id = s.grade_id
    LEFT JOIN alumnos a ON a.section_id = s.id AND a.is_active = TRUE
    GROUP BY g.nombre, g.sort_order, s.nombre, s.id
    ORDER BY g.sort_order, s.nombre
  `);

  const { rows: sinSecRows } = await pool.query(`
    SELECT COUNT(*)::int AS count FROM alumnos WHERE section_id IS NULL AND is_active = TRUE
  `);

  const porGrado = rows.map(r => ({
    grade_nombre:   r.grade_nombre,
    section_nombre: r.section_nombre,
    count:          r.count,
    siguiente:      nextSectionMap[r.section_id] ?? null,
  }));

  const total = porGrado.reduce((acc, r) => acc + r.count, 0) + (sinSecRows[0]?.count ?? 0);
  return { total, porGrado, sinSeccion: sinSecRows[0]?.count ?? 0 };
}

export async function ejecutarRollover(): Promise<{ promovidos: number; egresados: number; sinSeccion: number }> {
  const grades = await gradesRepo.findAllGrades(true);
  const gradeByOrder: Record<number, typeof grades[0]> = {};
  grades.forEach(g => { gradeByOrder[g.sort_order] = g; });

  const sections = await gradesRepo.findAllSections();
  const nextSectionMap: Record<number, number | 'egresado' | null> = {};

  sections.forEach(s => {
    const currGrade = grades.find(g => g.id === s.grade_id);
    if (!currGrade) return;
    const nextGrade = gradeByOrder[currGrade.sort_order + 1];
    if (!nextGrade) {
      nextSectionMap[s.id] = 'egresado';
      return;
    }
    const nextSec = sections.find(ns => ns.grade_id === nextGrade.id && ns.nombre === s.nombre);
    nextSectionMap[s.id] = nextSec ? nextSec.id : null;
  });

  const client = await pool.connect();
  let promovidos = 0;
  let egresados  = 0;

  try {
    await client.query('BEGIN');

    for (const [currSecId, nextAction] of Object.entries(nextSectionMap)) {
      if (nextAction === 'egresado') {
        const res = await client.query(
          `UPDATE alumnos SET is_active = FALSE, updated_at = NOW()
           WHERE section_id = $1 AND is_active = TRUE`,
          [currSecId]
        );
        egresados += res.rowCount ?? 0;
      } else if (typeof nextAction === 'number') {
        const res = await client.query(
          `UPDATE alumnos SET section_id = $1, updated_at = NOW()
           WHERE section_id = $2 AND is_active = TRUE`,
          [nextAction, currSecId]
        );
        promovidos += res.rowCount ?? 0;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows: sinSecRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM alumnos WHERE section_id IS NULL AND is_active = TRUE`
  );

  return { promovidos, egresados, sinSeccion: sinSecRows[0]?.count ?? 0 };
}
