// Compatibilidad: retorna secciones con display_name como "nombre" para selectores planos.
// Para CRUD completo de grados/secciones usar grades.repository.ts
import { pool } from '../shared/db';
import { Section } from '../models/types';

export async function findAll(): Promise<Section[]> {
  const { rows } = await pool.query(
    `SELECT s.id, s.grade_id, s.nombre, s.display_name, s.is_active,
            g.nombre AS grade_nombre, g.sort_order AS grade_sort_order
     FROM sections s
     JOIN grades g ON g.id = s.grade_id
     WHERE s.is_active = TRUE AND g.is_active = TRUE
     ORDER BY g.sort_order, s.nombre`
  );
  return rows;
}
