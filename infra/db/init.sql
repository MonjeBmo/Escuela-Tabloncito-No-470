-- ============================================================
-- Escuela El Tabloncito No. 470 — Esquema v2
-- RBAC completo + estructura académica normalizada
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT unaccent($1) $$;

-- ============================================================
-- RBAC: roles, permisos y asignaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(60)  NOT NULL UNIQUE,
  descripcion TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id      SERIAL PRIMARY KEY,
  codigo  VARCHAR(80)  NOT NULL UNIQUE,
  modulo  VARCHAR(40)  NOT NULL,
  accion  VARCHAR(40)  NOT NULL,
  label   VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope         VARCHAR(20) NOT NULL DEFAULT 'all',
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- Usuarios (role_id FK — sin columna rol de texto libre)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  username    VARCHAR(60)  NOT NULL UNIQUE,
  password    TEXT         NOT NULL,
  role_id     INTEGER      REFERENCES roles(id) ON DELETE SET NULL,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- El usuario admin se crea desde la app al primer arranque (main.ts → seedAdmin)

-- ============================================================
-- Estructura académica: grados y secciones
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(60)  NOT NULL UNIQUE,
  nombre_corto VARCHAR(10),
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sections (
  id           SERIAL PRIMARY KEY,
  grade_id     INTEGER      NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  nombre       VARCHAR(20)  NOT NULL,
  display_name VARCHAR(80),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  UNIQUE (grade_id, nombre)
);

-- ============================================================
-- Cursos (asignaturas)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  nombre_corto VARCHAR(20),
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================
-- Maestros (entidad separada de usuarios)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(120) NOT NULL,
  email      VARCHAR(120),
  phone      VARCHAR(20),
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  user_id    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id          SERIAL PRIMARY KEY,
  teacher_id  INTEGER  NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  course_id   INTEGER  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  grade_id    INTEGER  NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  section_id  INTEGER  NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  school_year SMALLINT NOT NULL,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
  UNIQUE(teacher_id, course_id, section_id, school_year)
);

-- ============================================================
-- Trigger helper: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Cuadros PRIM (section_id en lugar de grado_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS cuadros (
  id               SERIAL PRIMARY KEY,
  codigo           VARCHAR(30)   NOT NULL,
  anio             SMALLINT      NOT NULL,
  section_id       INTEGER       REFERENCES sections(id) ON DELETE SET NULL,
  docente          VARCHAR(120),
  total_alumnos    SMALLINT,
  documento_key    TEXT,
  documento_nombre VARCHAR(200),
  documento_mime   VARCHAR(80),
  datos_extra      JSONB         NOT NULL DEFAULT '{}',
  subido_por       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_por     INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_en      TIMESTAMPTZ,
  origen           VARCHAR(20)   NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  tsv              TSVECTOR
);

CREATE INDEX IF NOT EXISTS idx_cuadros_tsv     ON cuadros USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_cuadros_anio    ON cuadros(anio);
CREATE INDEX IF NOT EXISTS idx_cuadros_section ON cuadros(section_id);
CREATE INDEX IF NOT EXISTS idx_cuadros_codigo  ON cuadros(codigo);

CREATE OR REPLACE FUNCTION trg_cuadros_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.tsv = to_tsvector('spanish',
    unaccent_immutable(coalesce(NEW.codigo,  '')) || ' ' ||
    unaccent_immutable(coalesce(NEW.docente, '')) || ' ' ||
    coalesce(NEW.anio::text, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cuadros
  BEFORE INSERT OR UPDATE ON cuadros
  FOR EACH ROW EXECUTE FUNCTION trg_cuadros_fn();

-- ============================================================
-- Alumnos (section_id en lugar de grado_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS alumnos (
  id                 SERIAL PRIMARY KEY,
  primer_nombre      VARCHAR(60)  NOT NULL,
  segundo_nombre     VARCHAR(60),
  primer_apellido    VARCHAR(60)  NOT NULL,
  segundo_apellido   VARCHAR(60),
  cui                VARCHAR(20),
  fecha_nacimiento   DATE,
  genero             VARCHAR(10),
  section_id         INTEGER      REFERENCES sections(id) ON DELETE SET NULL,
  anio_ingreso       SMALLINT     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::SMALLINT,
  municipio          VARCHAR(80),
  departamento       VARCHAR(80),
  nombre_encargado   VARCHAR(120),
  telefono_encargado VARCHAR(20),
  registrado_por     INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  tsv                TSVECTOR
);

CREATE INDEX IF NOT EXISTS idx_alumnos_tsv     ON alumnos USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_alumnos_section ON alumnos(section_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_anio    ON alumnos(anio_ingreso);

CREATE OR REPLACE FUNCTION trg_alumnos_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.tsv = to_tsvector('spanish',
    unaccent_immutable(coalesce(NEW.primer_nombre,    '')) || ' ' ||
    unaccent_immutable(coalesce(NEW.segundo_nombre,   '')) || ' ' ||
    unaccent_immutable(coalesce(NEW.primer_apellido,  '')) || ' ' ||
    unaccent_immutable(coalesce(NEW.segundo_apellido, '')) || ' ' ||
    coalesce(NEW.cui, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alumnos
  BEFORE INSERT OR UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION trg_alumnos_fn();

-- ============================================================
-- Cola OCR
-- ============================================================
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id               SERIAL PRIMARY KEY,
  estado           VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  documento_key    TEXT         NOT NULL,
  documento_nombre VARCHAR(200),
  campos_extraidos JSONB        NOT NULL DEFAULT '{}',
  confianza        JSONB        NOT NULL DEFAULT '{}',
  cuadro_id        INTEGER      REFERENCES cuadros(id) ON DELETE SET NULL,
  subido_por       INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_por     INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  notas_revision   TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_ocr_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ocr_jobs
  BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_ocr_fn();

-- ============================================================
-- Datos iniciales
-- ============================================================

-- Roles del sistema
INSERT INTO roles (nombre, descripcion, is_system) VALUES
  ('director',       'Director del establecimiento',  TRUE),
  ('administrativo', 'Personal administrativo',       TRUE),
  ('validador_ocr',  'Validador de documentos OCR',   TRUE),
  ('docente',        'Docente del establecimiento',   TRUE)
ON CONFLICT DO NOTHING;

-- Catálogo de permisos
INSERT INTO permissions (codigo, modulo, accion, label) VALUES
  ('dashboard.view',    'dashboard','view',     'Ver panel principal'),
  ('documents.view',    'documents','view',     'Ver cuadros PRIM'),
  ('documents.create',  'documents','create',   'Registrar cuadros'),
  ('documents.validate','documents','validate', 'Validar cuadros'),
  ('documents.delete',  'documents','delete',   'Eliminar cuadros'),
  ('students.view',     'students', 'view',     'Ver alumnos'),
  ('students.create',   'students', 'create',   'Registrar alumnos'),
  ('students.delete',   'students', 'delete',   'Eliminar alumnos'),
  ('ocr.view',          'ocr',      'view',     'Ver trabajos OCR'),
  ('ocr.run',           'ocr',      'run',      'Subir documentos OCR'),
  ('ocr.validate',      'ocr',      'validate', 'Validar resultados OCR'),
  ('admin.users',       'admin',    'users',    'Gestionar usuarios'),
  ('admin.roles',       'admin',    'roles',    'Gestionar roles y permisos'),
  ('admin.grades',      'admin',    'grades',   'Gestionar grados y secciones'),
  ('admin.courses',     'admin',    'courses',  'Gestionar cursos'),
  ('admin.teachers',    'admin',    'teachers', 'Gestionar maestros')
ON CONFLICT DO NOTHING;

-- Director: todos los permisos (scope all)
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.nombre = 'director'
ON CONFLICT DO NOTHING;

-- Administrativo
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.nombre = 'administrativo'
  AND p.codigo IN (
    'dashboard.view','documents.view','documents.create','documents.validate',
    'students.view','students.create','ocr.view','ocr.run'
  )
ON CONFLICT DO NOTHING;

-- Validador OCR
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.nombre = 'validador_ocr'
  AND p.codigo IN ('dashboard.view','documents.view','ocr.view','ocr.validate')
ON CONFLICT DO NOTHING;

-- Docente (scopes mixtos)
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id,
  CASE p.codigo
    WHEN 'documents.view' THEN 'own'
    WHEN 'students.view'  THEN 'assigned'
    ELSE 'all'
  END
FROM roles r, permissions p
WHERE r.nombre = 'docente'
  AND p.codigo IN ('dashboard.view','documents.view','students.view')
ON CONFLICT DO NOTHING;

-- Grados académicos
INSERT INTO grades (nombre, nombre_corto, sort_order) VALUES
  ('Primero', '1°', 1),
  ('Segundo', '2°', 2),
  ('Tercero', '3°', 3),
  ('Cuarto',  '4°', 4),
  ('Quinto',  '5°', 5),
  ('Sexto',   '6°', 6)
ON CONFLICT DO NOTHING;

-- Secciones (A y B por grado)
INSERT INTO sections (grade_id, nombre, display_name)
SELECT g.id, s.nombre, g.nombre || ' ' || s.nombre
FROM grades g, (VALUES ('A'), ('B')) AS s(nombre)
ORDER BY g.sort_order, s.nombre
ON CONFLICT DO NOTHING;

-- Cursos
INSERT INTO courses (nombre, nombre_corto, sort_order) VALUES
  ('Matemática',                 'MAT',  1),
  ('Comunicación y Lenguaje',    'COML', 2),
  ('Ciencias Naturales',         'CCNN', 3),
  ('Ciencias Sociales',          'CCSS', 4),
  ('Educación Física',           'EDF',  5),
  ('Educación Artística',        'EDA',  6),
  ('Productividad y Desarrollo', 'PD',   7)
ON CONFLICT DO NOTHING;
