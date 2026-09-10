import { pool } from '../shared/db';
import { OcrJob } from '../models/types';

const COLS = `
  j.id, j.estado, j.documento_key, j.documento_nombre,
  j.campos_extraidos, j.confianza, j.cuadro_id, j.subido_por,
  u.nombre AS subido_por_nombre, j.validado_por, j.notas_revision,
  j.created_at, j.updated_at
`;
const FROM = `FROM ocr_jobs j LEFT JOIN usuarios u ON u.id = j.subido_por`;

export async function findAll(limit = 50, offset = 0): Promise<OcrJob[]> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} ORDER BY j.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function findById(id: number): Promise<OcrJob | null> {
  const { rows } = await pool.query(`SELECT ${COLS} ${FROM} WHERE j.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findPendingReview(): Promise<OcrJob[]> {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE j.estado = 'revision' ORDER BY j.created_at ASC`
  );
  return rows;
}

export async function create(data: {
  documento_key: string;
  documento_nombre: string;
  subido_por: number;
}): Promise<OcrJob> {
  const { rows } = await pool.query(
    `INSERT INTO ocr_jobs (documento_key, documento_nombre, subido_por, estado)
     VALUES ($1, $2, $3, 'pendiente') RETURNING id`,
    [data.documento_key, data.documento_nombre, data.subido_por]
  );
  return findById(rows[0].id) as Promise<OcrJob>;
}

export async function updateFromOcr(id: number, campos: Record<string, string>, confianza: Record<string, number>): Promise<void> {
  await pool.query(
    `UPDATE ocr_jobs SET estado='revision', campos_extraidos=$1, confianza=$2 WHERE id=$3`,
    [JSON.stringify(campos), JSON.stringify(confianza), id]
  );
}

export async function validate(id: number, usuarioId: number, cuadroId: number, notas: string): Promise<void> {
  await pool.query(
    `UPDATE ocr_jobs SET estado='validado', validado_por=$1, cuadro_id=$2, notas_revision=$3 WHERE id=$4`,
    [usuarioId, cuadroId, notas, id]
  );
}

export async function reject(id: number, usuarioId: number, notas: string): Promise<void> {
  await pool.query(
    `UPDATE ocr_jobs SET estado='rechazado', validado_por=$1, notas_revision=$2 WHERE id=$3`,
    [usuarioId, notas, id]
  );
}

export async function countByEstado(): Promise<Record<string, number>> {
  const { rows } = await pool.query(
    `SELECT estado, COUNT(*)::int AS n FROM ocr_jobs GROUP BY estado`
  );
  const result: Record<string, number> = {};
  rows.forEach((r: { estado: string; n: number }) => { result[r.estado] = r.n; });
  return result;
}
