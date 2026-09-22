import { pool } from '../shared/db';
import { Cuadro } from '../models/types';

const COLS = `
  c.id, c.codigo, c.anio, c.section_id, s.display_name AS grado_nombre,
  c.docente, c.total_alumnos,
  c.documento_key, c.documento_nombre, c.documento_mime,
  c.datos_extra, c.subido_por, u.nombre AS subido_por_nombre,
  c.validado_por, c.validado_en, c.origen, c.created_at, c.updated_at, c.deleted_at
`;

const FROM = `
  FROM cuadros c
  LEFT JOIN sections s  ON s.id = c.section_id
  LEFT JOIN grades  gr  ON gr.id = s.grade_id
  LEFT JOIN usuarios u  ON u.id = c.subido_por
`;

export async function findAll(limit = 20, offset = 0): Promise<Cuadro[]> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE c.deleted_at IS NULL ORDER BY c.anio DESC, c.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function count(): Promise<number> {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM cuadros WHERE deleted_at IS NULL');
  return rows[0].n;
}

export async function findById(id: number): Promise<Cuadro | null> {
  const { rows } = await pool.query(`SELECT ${COLS} ${FROM} WHERE c.id = $1 AND c.deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

export interface SearchParams {
  q?: string;
  anio?: number;
  section_id?: number;
  origen?: string;
}

export async function search(params: SearchParams, limit = 20, offset = 0): Promise<Cuadro[]> {
  const conditions: string[] = ['c.deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.q) {
    conditions.push(`c.tsv @@ websearch_to_tsquery('spanish', unaccent($${idx}))`);
    values.push(params.q); idx++;
  }
  if (params.anio) {
    conditions.push(`c.anio = $${idx}`);
    values.push(params.anio); idx++;
  }
  if (params.section_id) {
    conditions.push(`c.section_id = $${idx}`);
    values.push(params.section_id); idx++;
  }
  if (params.origen) {
    conditions.push(`c.origen = $${idx}`);
    values.push(params.origen); idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} ${where} ORDER BY c.anio DESC, c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );
  return rows;
}

export async function create(data: {
  codigo: string;
  anio: number;
  section_id: number | null;
  docente: string | null;
  total_alumnos: number | null;
  documento_key: string | null;
  documento_nombre: string | null;
  documento_mime: string | null;
  datos_extra: Record<string, unknown>;
  subido_por: number;
  origen: string;
}): Promise<Cuadro> {
  const { rows } = await pool.query(
    `INSERT INTO cuadros
       (codigo, anio, section_id, docente, total_alumnos, documento_key,
        documento_nombre, documento_mime, datos_extra, subido_por, origen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      data.codigo, data.anio, data.section_id, data.docente,
      data.total_alumnos, data.documento_key, data.documento_nombre,
      data.documento_mime, JSON.stringify(data.datos_extra),
      data.subido_por, data.origen,
    ]
  );
  return findById(rows[0].id) as Promise<Cuadro>;
}

export async function validate(id: number, usuarioId: number): Promise<void> {
  await pool.query(
    'UPDATE cuadros SET validado_por=$1, validado_en=NOW() WHERE id=$2 AND deleted_at IS NULL',
    [usuarioId, id]
  );
}

export async function remove(id: number): Promise<void> {
  await pool.query('UPDATE cuadros SET deleted_at = NOW() WHERE id = $1', [id]);
}

export async function recentYears(): Promise<number[]> {
  const { rows } = await pool.query(
    'SELECT DISTINCT anio FROM cuadros WHERE deleted_at IS NULL ORDER BY anio DESC LIMIT 10'
  );
  return rows.map((r: { anio: number }) => r.anio);
}
