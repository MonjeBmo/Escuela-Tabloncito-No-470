import { pool } from '../shared/db';
import { Alumno } from '../models/types';

const COLS = `
  a.id, a.primer_nombre, a.segundo_nombre, a.primer_apellido, a.segundo_apellido,
  a.cui, a.fecha_nacimiento, a.genero, a.section_id, s.display_name AS grado_nombre,
  a.anio_ingreso, a.municipio, a.departamento,
  a.nombre_encargado, a.telefono_encargado, a.registrado_por, a.created_at, a.updated_at, a.deleted_at
`;
const FROM = `
  FROM alumnos a
  LEFT JOIN sections s ON s.id = a.section_id
  LEFT JOIN grades  g  ON g.id = s.grade_id
`;

export async function findAll(limit = 20, offset = 0): Promise<Alumno[]> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE a.deleted_at IS NULL ORDER BY a.primer_apellido, a.primer_nombre LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function count(): Promise<number> {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM alumnos WHERE deleted_at IS NULL');
  return rows[0].n;
}

export async function findById(id: number): Promise<Alumno | null> {
  const { rows } = await pool.query(`SELECT ${COLS} ${FROM} WHERE a.id = $1 AND a.deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

export interface AlumnoSearch {
  q?: string;
  section_id?: number;
  anio_ingreso?: number;
}

export async function search(params: AlumnoSearch, limit = 20, offset = 0): Promise<Alumno[]> {
  const conds: string[] = ['a.deleted_at IS NULL'];
  const vals: unknown[] = [];
  let idx = 1;

  if (params.q) {
    conds.push(`a.tsv @@ websearch_to_tsquery('spanish', unaccent($${idx}))`);
    vals.push(params.q); idx++;
  }
  if (params.section_id) {
    conds.push(`a.section_id = $${idx}`);
    vals.push(params.section_id); idx++;
  }
  if (params.anio_ingreso) {
    conds.push(`a.anio_ingreso = $${idx}`);
    vals.push(params.anio_ingreso); idx++;
  }

  const where = `WHERE ${conds.join(' AND ')}`;
  vals.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} ${where} ORDER BY a.primer_apellido, a.primer_nombre LIMIT $${idx} OFFSET $${idx + 1}`,
    vals
  );
  return rows;
}

export async function create(data: Omit<Alumno, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'grado_nombre'>): Promise<Alumno> {
  const { rows } = await pool.query(
    `INSERT INTO alumnos
       (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, fecha_nacimiento, genero, section_id, anio_ingreso,
        municipio, departamento, nombre_encargado, telefono_encargado, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      data.primer_nombre, data.segundo_nombre, data.primer_apellido, data.segundo_apellido,
      data.cui, data.fecha_nacimiento, data.genero, data.section_id, data.anio_ingreso,
      data.municipio, data.departamento, data.nombre_encargado, data.telefono_encargado,
      data.registrado_por,
    ]
  );
  return findById(rows[0].id) as Promise<Alumno>;
}

export async function remove(id: number): Promise<void> {
  await pool.query('UPDATE alumnos SET deleted_at = NOW() WHERE id = $1', [id]);
}
