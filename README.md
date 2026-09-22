# Tabloncito 470 — Sistema de Gestión Escolar

Sistema web para la gestión académica de la Escuela El Tabloncito No. 470. Administra alumnos, cuadros escolares, digitalización OCR de documentos, docentes, asignaciones y control de acceso basado en roles.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + Express + TypeScript |
| Vistas | EJS + Tailwind CSS (Play CDN) + Bootstrap Icons |
| Base de datos | PostgreSQL 16 |
| Almacenamiento | MinIO (objetos / imágenes) |
| OCR | Python 3 + FastAPI + Tesseract + pdf2image |
| Proxy | Nginx |
| Contenedores | Docker Compose |

---

## Arquitectura

```
                ┌──────────┐
  Browser ──►  │  Nginx   │ :80
                └────┬─────┘
                     │
          ┌──────────┴──────────┐
          │                     │
    ┌─────▼──────┐       ┌──────▼──────┐
    │  Backend   │       │ OCR Service │
    │  (Node.js) │       │  (Python)   │
    └─────┬──────┘       └─────────────┘
          │
    ┌─────┴─────┐
    │ PostgreSQL│  +  MinIO (imágenes)
    └───────────┘
```

---

## Requisitos

- Docker y Docker Compose v2
- Git

---

## Instalación y arranque

```bash
# 1. Clonar el repositorio
git clone <url> tabloncito
cd tabloncito

# 2. Crear el archivo de variables de entorno
cp .env.example .env
# Editar .env con sus credenciales

# 3. Construir imágenes e iniciar
docker compose build
docker compose up -d

# 4. Acceder al sistema
# http://localhost
```

> La base de datos se inicializa automáticamente en el primer arranque con `infra/db/init.sql`.

---

## Variables de entorno (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_DB` | Nombre de la base de datos | `tabloncito` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `tabloncito` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `secreto` |
| `SESSION_SECRET` | Clave para firmar sesiones | `clave-larga-aleatoria` |
| `MINIO_ROOT_USER` | Usuario administrador de MinIO | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | Contraseña de MinIO | `minioadmin` |
| `MINIO_ENDPOINT` | Host interno de MinIO | `minio` |
| `MINIO_PORT` | Puerto de MinIO | `9000` |
| `MINIO_BUCKET` | Bucket para documentos | `tabloncito` |
| `OCR_SERVICE_URL` | URL interna del servicio OCR | `http://ocr-service:8000` |

---

## Estructura del proyecto

```
p/
├── backend/                  # Aplicación Node.js/Express/TypeScript
│   ├── src/
│   │   ├── controllers/      # Controladores HTTP
│   │   ├── repositories/     # Acceso directo a base de datos (pg)
│   │   ├── services/         # Lógica de negocio
│   │   ├── routes/           # Definición de rutas Express
│   │   ├── models/types.ts   # Tipos e interfaces TypeScript
│   │   └── shared/           # Middlewares, DB pool, helpers
│   ├── views/                # Plantillas EJS
│   │   ├── layout.ejs        # Layout principal
│   │   ├── partials/         # Componentes reutilizables
│   │   ├── admin/            # Vistas de administración
│   │   ├── alumnos/          # Vistas de alumnos
│   │   └── cuadros/          # Vistas de cuadros escolares
│   └── public/               # Archivos estáticos
├── ocr-service/              # Microservicio Python de OCR
│   └── app/
│       └── main.py
├── infra/
│   ├── db/init.sql           # Schema inicial de PostgreSQL
│   └── nginx.conf            # Configuración de Nginx
└── docker-compose.yml
```

---

## Módulos del sistema

### Alumnos
- Registro, edición, activar/desactivar y eliminación lógica (`deleted_at`)
- Búsqueda por nombre, CUI, grado o año de ingreso
- Importación masiva desde Excel (plantilla descargable)

### Cuadros escolares
- Registro de cuadros con docente, grado y sección
- Subida de imágenes a MinIO
- Eliminación lógica (`deleted_at`)

### OCR
- Envío de documentos PDF/imagen al servicio Python
- Extracción de texto con Tesseract (español)
- Estados: pendiente → procesando → revisión → validado / rechazado

### Administración

| Módulo | Descripción |
|--------|-------------|
| **Usuarios** | Gestión de cuentas de acceso, roles y contraseñas |
| **Roles y permisos** | RBAC completo con scopes (none/own/assigned/all) |
| **Grados y secciones** | Estructura académica; activar/desactivar |
| **Cursos** | Catálogo de asignaturas |
| **Maestros** | Registro de docentes y asignaciones por sección/año |
| **Ciclo escolar** | Promoción masiva de alumnos al siguiente grado al cambiar de ciclo |
| **Importación Excel** | Carga masiva de datos para todos los módulos |

---

## Comandos útiles

```bash
# Ver logs del backend
docker compose logs backend -f

# Ver logs del servicio OCR
docker compose logs ocr-service -f

# Acceder a PostgreSQL
docker compose exec postgres psql -U tabloncito -d tabloncito

# Reconstruir desde cero (sin caché)
docker compose build --no-cache
docker compose up -d

# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (⚠ borra datos)
docker compose down -v
```

---

## Permisos RBAC

Los permisos se agrupan por módulo y tienen un scope opcional:

| Código | Módulo | Acción |
|--------|--------|--------|
| `documents.view` | cuadros | Ver cuadros |
| `documents.create` | cuadros | Registrar cuadros |
| `documents.delete` | cuadros | Eliminar cuadros |
| `students.view` | alumnos | Ver alumnos |
| `students.create` | alumnos | Registrar/editar alumnos |
| `students.delete` | alumnos | Eliminar alumnos |
| `ocr.view` | OCR | Ver trabajos OCR |
| `ocr.run` | OCR | Enviar documentos |
| `admin.users` | admin | Gestionar usuarios y ciclo |
| `admin.roles` | admin | Gestionar roles y permisos |
| `admin.grades` | admin | Gestionar grados y secciones |
| `admin.courses` | admin | Gestionar cursos |
| `admin.teachers` | admin | Gestionar maestros |

---

## Consola MinIO

La consola web de MinIO está disponible en `http://localhost:9001` para gestionar los objetos almacenados (imágenes de cuadros, documentos OCR).
