-- ============================================================
-- Escuela El Tabloncito No. 470 — Esquema inicial
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- Tabla de usuarios / roles
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  username    VARCHAR(60)  NOT NULL UNIQUE,
  password    TEXT         NOT NULL,          -- bcrypt hash
  rol         VARCHAR(30)  NOT NULL DEFAULT 'docente',  -- director | administrativo | validador_ocr | docente
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- El usuario administrador inicial se crea desde la app al primer arranque (ver main.ts → seedAdmin)

-- ============================================================
-- Tabla de grados / cursos
-- ============================================================
CREATE TABLE IF NOT EXISTS grados (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE   -- "Primero A", "Segundo B", etc.
);

INSERT INTO grados (nombre) VALUES
  ('Primero A'), ('Primero B'),
  ('Segundo A'), ('Segundo B'),
  ('Tercero A'), ('Tercero B'),
  ('Cuarto A'),  ('Cuarto B'),
  ('Quinto A'),  ('Quinto B'),
  ('Sexto A'),   ('Sexto B')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Tabla principal: Cuadros PRIM (índice / metadatos — Capa 2)
-- El documento fuente (Capa 1) se almacena en MinIO.
-- ============================================================
CREATE TABLE IF NOT EXISTS cuadros (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(30)  NOT NULL,          -- código de cuadro (ej. "PRIM-2024-001")
  anio            SMALLINT     NOT NULL,
  grado_id        INTEGER      REFERENCES grados(id) ON DELETE SET NULL,
  docente         VARCHAR(120),
  total_alumnos   SMALLINT,
  -- Capa 1: referencia al objeto en MinIO
  documento_key   TEXT,                           -- ej. "cuadros/2024/PRIM-2024-001.pdf"
  documento_nombre VARCHAR(200),                  -- nombre original del archivo
  documento_mime  VARCHAR(80),
  -- Metadatos variables por época (campos que cambian con el formato del año)
  datos_extra     JSONB        NOT NULL DEFAULT '{}',
  -- Trazabilidad
  subido_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_por    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_en     TIMESTAMPTZ,
  origen          VARCHAR(20)  NOT NULL DEFAULT 'manual',  -- 'manual' | 'ocr'
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Full-text search
  tsv             TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('spanish',
      unaccent(coalesce(codigo, '')) || ' ' ||
      unaccent(coalesce(docente, '')) || ' ' ||
      coalesce(anio::text, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_cuadros_tsv     ON cuadros USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_cuadros_anio    ON cuadros(anio);
CREATE INDEX IF NOT EXISTS idx_cuadros_grado   ON cuadros(grado_id);
CREATE INDEX IF NOT EXISTS idx_cuadros_codigo  ON cuadros(codigo);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cuadros_updated_at
  BEFORE UPDATE ON cuadros
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Tabla de alumnos de nuevo ingreso
-- ============================================================
CREATE TABLE IF NOT EXISTS alumnos (
  id              SERIAL PRIMARY KEY,
  primer_nombre   VARCHAR(60)  NOT NULL,
  segundo_nombre  VARCHAR(60),
  primer_apellido VARCHAR(60)  NOT NULL,
  segundo_apellido VARCHAR(60),
  cui             VARCHAR(20),                    -- Código Único de Identificación
  fecha_nacimiento DATE,
  genero          VARCHAR(10),                    -- 'M' | 'F'
  grado_id        INTEGER      REFERENCES grados(id) ON DELETE SET NULL,
  anio_ingreso    SMALLINT     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::SMALLINT,
  municipio       VARCHAR(80),
  departamento    VARCHAR(80),
  nombre_encargado VARCHAR(120),
  telefono_encargado VARCHAR(20),
  registrado_por  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  tsv             TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('spanish',
      unaccent(coalesce(primer_nombre, '')) || ' ' ||
      unaccent(coalesce(segundo_nombre, '')) || ' ' ||
      unaccent(coalesce(primer_apellido, '')) || ' ' ||
      unaccent(coalesce(segundo_apellido, '')) || ' ' ||
      coalesce(cui, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_alumnos_tsv     ON alumnos USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_alumnos_grado   ON alumnos(grado_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_anio    ON alumnos(anio_ingreso);

CREATE TRIGGER trg_alumnos_updated_at
  BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Tabla de cola / resultados OCR
-- ============================================================
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id              SERIAL PRIMARY KEY,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente',  -- pendiente | procesando | revision | validado | rechazado
  documento_key   TEXT         NOT NULL,
  documento_nombre VARCHAR(200),
  campos_extraidos JSONB       NOT NULL DEFAULT '{}',
  confianza       JSONB        NOT NULL DEFAULT '{}',         -- confianza por campo
  cuadro_id       INTEGER      REFERENCES cuadros(id) ON DELETE SET NULL,
  subido_por      INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_por    INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  notas_revision  TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ocr_jobs_updated_at
  BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
