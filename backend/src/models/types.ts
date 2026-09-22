// ============================================================
// Tipos compartidos del dominio — v2 con RBAC y estructura académica
// ============================================================

export type Scope = 'none' | 'own' | 'assigned' | 'all';
export type OrigenCuadro = 'manual' | 'ocr';
export type EstadoOcr = 'pendiente' | 'procesando' | 'revision' | 'validado' | 'rechazado';

// ── RBAC ────────────────────────────────────────────────────

export interface Role {
  id: number;
  nombre: string;
  descripcion: string | null;
  is_system: boolean;
  created_at: Date;
}

export interface Permission {
  id: number;
  codigo: string;
  modulo: string;
  accion: string;
  label: string | null;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
  scope: Scope;
  permission_codigo?: string;
  permission_label?: string;
  permission_modulo?: string;
}

// ── Estructura académica ─────────────────────────────────────

export interface Grade {
  id: number;
  nombre: string;
  nombre_corto: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Section {
  id: number;
  grade_id: number;
  nombre: string;
  display_name: string | null;
  is_active: boolean;
  grade_nombre?: string;
  grade_sort_order?: number;
}

export interface Course {
  id: number;
  nombre: string;
  nombre_corto: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Teacher {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  user_id: number | null;
  username?: string;
  created_at: Date;
}

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  course_id: number;
  grade_id: number;
  section_id: number;
  school_year: number;
  is_active: boolean;
  teacher_name?: string;
  course_nombre?: string;
  grade_nombre?: string;
  section_display?: string;
}

// ── Usuarios ─────────────────────────────────────────────────

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  role_id: number;
  rol: string;        // nombre del rol, cargado via JOIN con roles
  activo: boolean;
  created_at: Date;
}

// ── Documentos ───────────────────────────────────────────────

export interface Cuadro {
  id: number;
  codigo: string;
  anio: number;
  section_id: number | null;
  grado_nombre?: string;       // = sections.display_name
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
  section_id: number | null;
  grado_nombre?: string;       // = sections.display_name
  anio_ingreso: number;
  municipio: string | null;
  departamento: string | null;
  nombre_encargado: string | null;
  telefono_encargado: string | null;
  registrado_por: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
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
  subido_por_nombre?: string;
  validado_por: number | null;
  notas_revision: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Sesión extendida ─────────────────────────────────────────

declare module 'express-session' {
  interface SessionData {
    usuario?: {
      id: number;
      nombre: string;
      username: string;
      rol: string;
      role_id: number;
      permisos: string[];
    };
    flash?: { tipo: string; mensaje: string };
  }
}
