// ============================================================
// Tipos compartidos del dominio
// ============================================================

export type Rol = 'director' | 'administrativo' | 'validador_ocr' | 'docente';
export type OrigenCuadro = 'manual' | 'ocr';
export type EstadoOcr = 'pendiente' | 'procesando' | 'revision' | 'validado' | 'rechazado';

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  created_at: Date;
}

export interface Grado {
  id: number;
  nombre: string;
}

export interface Cuadro {
  id: number;
  codigo: string;
  anio: number;
  grado_id: number | null;
  grado_nombre?: string;
  docente: string | null;
  total_alumnos: number | null;
  documento_key: string | null;
  documento_nombre: string | null;
  documento_mime: string | null;
  datos_extra: Record<string, unknown>;
  subido_por: number | null;
  subido_por_nombre?: string;
  validado_por: number | null;
  validado_en: Date | null;
  origen: OrigenCuadro;
  created_at: Date;
  updated_at: Date;
}

export interface Alumno {
  id: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  cui: string | null;
  fecha_nacimiento: Date | null;
  genero: 'M' | 'F' | null;
  grado_id: number | null;
  grado_nombre?: string;
  anio_ingreso: number;
  municipio: string | null;
  departamento: string | null;
  nombre_encargado: string | null;
  telefono_encargado: string | null;
  registrado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface OcrJob {
  id: number;
  estado: EstadoOcr;
  documento_key: string;
  documento_nombre: string | null;
  campos_extraidos: Record<string, string>;
  confianza: Record<string, number>;
  cuadro_id: number | null;
  subido_por: number | null;
  validado_por: number | null;
  notas_revision: string | null;
  created_at: Date;
  updated_at: Date;
}

// Sesión extendida
declare module 'express-session' {
  interface SessionData {
    usuario?: Pick<Usuario, 'id' | 'nombre' | 'username' | 'rol'>;
    flash?: { tipo: string; mensaje: string };
  }
}
