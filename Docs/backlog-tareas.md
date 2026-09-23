# Backlog de Tareas — Aplicativo Web Escuela El Tabloncito No. 470

_Basado en la Minuta de Levantamiento de Requerimientos (3 de agosto de 2026)_

> Leyenda de estado: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho
> Leyenda de bloqueo: 🔒 depende de validación externa (director / MINEDUC)

---

## Sprint 1 — Fundaciones

### Épica 0. Infraestructura y arquitectura base (Docker)
- [ ] Definir stack tecnológico definitivo (ver documento técnico)
- [ ] Crear repositorio Git (monorepo: `backend/`, `frontend/`, `ocr-service/`, `infra/`)
- [ ] Escribir `Dockerfile` del backend (app MVC completa, incluye vistas)
- [ ] Escribir `Dockerfile` del servicio de OCR
- [ ] Definir `docker-compose.yml` (backend, postgres, minio, nginx, ocr-service)
- [ ] Configurar variables de entorno y manejo de secretos (`.env.example`)
- [ ] Definir volúmenes persistentes (base de datos y almacenamiento de documentos)
- [ ] Redactar `README.md` con instrucciones de levantamiento local (`docker-compose up`)
- [ ] (Opcional) Pipeline básico de CI para build de imágenes

### Épica 0.1 UI Base (layout y librerías de cliente)
- [ ] Instalar/enlazar Bootstrap 5, Bootstrap Icons, SweetAlert2, Select2 y jQuery (CDN o `public/vendor/`)
- [ ] Construir layout base en EJS (`views/layouts/main.ejs`) con header, sidebar, footer y bloque central de body
- [ ] Construir partials reutilizables: `header.ejs`, `sidebar.ejs`, `footer.ejs`
- [ ] Definir navegación del sidebar según los módulos (cuadros, alumnos, OCR, auth)
- [ ] Configurar SweetAlert2 para mensajes de éxito/error/confirmación estándar del sistema
- [ ] Configurar Select2 sobre los `<select>` de año, curso y código de cuadro

### Épica 1. Repositorio documental "Cuadros PRIM"
- [ ] Diseñar modelo de datos — Capa 2 (índice/metadatos): nombre, año, código de cuadro, curso, etc.
- [ ] Diseñar almacenamiento — Capa 1 (documento fuente: escaneo/PDF con firma y sello)
- [ ] Definir estructura de buckets/carpetas para documentos originales
- [ ] Construir controlador y servicio de carga de documentos (subida de escaneo + metadatos)
- [ ] Construir vista de captura manual según formato de cuadro (EJS + Bootstrap, layout base)
- [ ] Soportar plantillas de formulario distintas por rango de años 🔒 _(pendiente: formatos históricos con el director)_

### Épica 2. Motor de búsqueda avanzada
- [ ] Definir criterios de búsqueda (nombre, año, código de cuadro, curso)
- [ ] Implementar búsqueda con Postgres full-text search (`tsvector`)
- [ ] Construir controlador/servicio de búsqueda con filtros combinados
- [ ] Construir vista de búsqueda (EJS + Select2 en filtros) con vista previa del documento
- [ ] Implementar entrega/descarga del documento fuente original (Capa 1, nunca uno regenerado)

---

## Sprint 2 — Digitalización piloto (OCR)

> **Alcance confirmado:** solo una muestra representativa para pruebas y primeras gestiones, no el archivo histórico completo.

### Épica 3. Pipeline de digitalización y OCR (muestra piloto)
- [ ] Definir criterio de selección de la muestra piloto (años recientes/más solicitados) 🔒 _(confirmar cantidad con el director)_
- [ ] Definir proceso de escaneo estandarizado (resolución, nomenclatura de archivos)
- [ ] Prototipo de extracción "zonal OCR" con Tesseract para un formato de cuadro
- [ ] Construir microservicio de OCR (FastAPI + Tesseract) como contenedor independiente
- [ ] Construir vista de revisión/validación humana (human-in-the-loop), con SweetAlert2 para confirmaciones, antes de guardar
- [ ] Mostrar indicador de confianza por campo extraído
- [ ] Registrar trazabilidad: quién digitalizó, quién validó, fecha
- [ ] Evaluar a futuro: Amazon Textract / Google Document AI / Azure Document Intelligence

---

## Sprint 3 — Registro de alumnos

### Épica 4. Módulo de registro de alumnos de nuevo ingreso
- [ ] Diseñar modelo de datos de alumno (según campos del libro físico actual)
- [ ] Construir vista de formulario de captura de registro (EJS + Select2 para curso/año)
- [ ] Integrar registros al motor de búsqueda avanzada (Épica 2)
- [ ] 🔒 Confirmar con MINEDUC si su plataforma admite carga masiva (CSV) — **no iniciar integración hasta tener respuesta**
- [ ] Evaluar viabilidad de integración (API o import/export) con plataforma MINEDUC

---

## Transversal — Seguridad y despliegue

### Épica 5. Seguridad y control de acceso
- [ ] Definir roles (director, administrativo, validador OCR, docente)
- [ ] Implementar autenticación (JWT) y control de acceso por rol
- [ ] Definir política de respaldo (backup) de base de datos y documentos

### Épica 7. QA y despliegue
- [ ] Pruebas funcionales del flujo completo: carga → OCR → validación → búsqueda → entrega
- [ ] Prueba de despliegue en ambiente limpio (validar portabilidad de Docker)
- [ ] Documentar guía de despliegue para la institución

---

## No técnico / paralelo

### Épica 6. Modernización tecnológica y capacitación docente
- [ ] Relevar equipo tecnológico actual disponible en la escuela 🔒 _(pendiente, sección 4 de la minuta)_
- [ ] Diseñar taller/charla de introducción tecnológica para docentes
- [ ] Proponer herramienta o sistema de apoyo a la enseñanza

---

## Puntos bloqueados (requieren respuesta externa antes de avanzar)
| Punto | Depende de |
|---|---|
| Formatos históricos del "Cuadro PRIM" por época | Director |
| Volumen de documentos para la muestra piloto | Director |
| Carga masiva (CSV) en plataforma MINEDUC | MINEDUC |
| Certificación de copias digitales entregadas | Director |
| Autorización formal para pasar a diseño/implementación | Director |
