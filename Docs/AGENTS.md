# AGENTS.md — Software Design Document (SDD)

> Este archivo es la fuente de verdad para cualquier agente de IA (Claude Code, Cursor, Copilot, etc.) que trabaje en este repositorio. Léelo completo antes de generar o modificar código. Si una instrucción del usuario entra en conflicto con este documento, prioriza la consistencia arquitectónica descrita aquí y señala la discrepancia antes de proceder.

## 1. Contexto del proyecto

Aplicativo web para la **Escuela El Tabloncito No. 470**, desarrollado como proyecto de Seminario de Ingeniería en Sistemas (UMG). Resuelve tres problemáticas:

1. Repositorio digital y búsqueda avanzada de documentos históricos ("Cuadros PRIM").
2. Registro de alumnos de nuevo ingreso (reemplaza libro físico).
3. Apoyo a la modernización tecnológica docente (fuera del alcance de código, es gestión del cambio).

Fuente de requerimientos: `Minuta_Levantamiento_Requerimientos_UMG.md`. Fuente de tareas: `backlog-tareas.md`. Fuente de arquitectura detallada: `arquitectura-tecnica.md`. Este archivo resume y opera sobre ambos — ante cualquier duda de detalle, consulta esos documentos.

## 2. Regla de negocio no negociable (léela antes de tocar el módulo de cuadros)

Un "Cuadro PRIM" tiene valor legal por su firma y sello. El sistema opera con **dos capas separadas** y un agente **nunca debe fusionarlas ni generar una a partir de la otra**:

- **Capa 1 — Documento fuente:** el escaneo/PDF original. Es lo único que se entrega ante un trámite. Se guarda en MinIO, nunca en la base de datos como blob.
- **Capa 2 — Índice de datos:** metadatos extraídos (nombre, año, código, curso) usados **solo** para búsqueda. Nunca se usa esta capa para reconstruir o regenerar el documento oficial.

Cualquier endpoint o vista que "entregue" un cuadro a un usuario final debe servir el archivo de Capa 1, nunca un documento generado desde Capa 2.

## 3. Arquitectura

**Patrón:** MVC + N capas, monolito server-rendered (sin SPA).

```
Vista (EJS) ⇄ Controller ⇄ Service ⇄ Repository ⇄ PostgreSQL / MinIO
```

- **Controller:** solo recibe request, valida input básico, llama al Service, decide qué vista o respuesta renderizar. Sin lógica de negocio aquí.
- **Service:** toda la lógica de negocio (reglas, validaciones complejas, orquestación entre repositorios y el servicio de OCR).
- **Repository:** único lugar que habla con la base de datos (queries SQL / ORM). Ningún Controller o Service debe hacer queries directas.
- **Views (EJS):** solo presentación. Sin lógica de negocio embebida más allá de condicionales de despliegue (`if`, `each`).

El servicio de OCR (Python/FastAPI) es un microservicio aparte, se comunica con el backend vía HTTP interno. No exponerlo directamente a internet.

## 4. Stack (no cambiar sin aprobación explícita del usuario)

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Vistas | EJS (layouts + partials) |
| UI | Bootstrap 5, Bootstrap Icons, CSS propio |
| Mensajes al usuario | SweetAlert2 |
| Selects | Select2 (requiere jQuery) |
| Base de datos | PostgreSQL (usar JSONB para campos variables por época del cuadro) |
| Búsqueda | Postgres full-text search (`tsvector`) |
| Archivos | MinIO (S3-compatible) |
| OCR | Python + FastAPI + Tesseract, contenedor separado |
| Proxy | Nginx |
| Auth | Sesión de servidor o JWT, roles: `admin`, `validador`, `docente` |
| Infraestructura | Docker + Docker Compose |

## 5. Estructura de carpetas esperada

```
backend/
  public/{css,js,vendor}
  views/{layouts,partials,cuadros,alumnos,auth}
  src/{controllers,services,repositories,models,routes,shared}
ocr-service/
  app/{extractor,review}
infra/nginx.conf
docker-compose.yml
.env.example
```

Un agente que crea un módulo nuevo debe replicar esta estructura: `routes/` → `controllers/` → `services/` → `repositories/`, más su carpeta correspondiente en `views/`.

## 6. Convenciones de código

- **TypeScript estricto** en el backend Node; evitar `any` salvo justificación en comentario.
- **Nombrado de archivos:** `kebab-case` para archivos, `PascalCase` para clases/tipos, `camelCase` para funciones y variables.
- **Un archivo, una responsabilidad:** no mezclar controllers de distintos módulos en un mismo archivo.
- **Layout único:** toda vista nueva debe extender `views/layouts/main.ejs` (header + sidebar + footer + body). No crear layouts alternativos sin justificación.
- **Componentes de cliente:** usar Bootstrap para maquetado, SweetAlert2 para cualquier alerta/confirmación (nunca `alert()`/`confirm()` nativos), Select2 en todo `<select>` con más de ~8 opciones.
- **Variables sensibles:** nunca hardcodear credenciales, tokens o URLs de servicios; usar variables de entorno (`.env`, documentadas en `.env.example`).
- **Comentarios:** en español, igual que la documentación del proyecto y la minuta original.

## 7. Reglas específicas por módulo

- **`cuadros`:** todo endpoint de escritura que reciba datos por OCR debe pasar por un estado `pendiente_validacion` antes de marcarse como `validado`. Nunca guardar directo como definitivo.
- **`alumnos`:** no implementar integración automática con la plataforma de MINEDUC hasta que el backlog confirme que ese bloqueo (🔒) fue levantado. Si el agente detecta esa tarea, debe señalarlo como bloqueado en vez de construir la integración.
- **`ocr`:** el pipeline se diseña para una muestra piloto (no para digitalizar el archivo histórico completo). No crear procesos batch masivos sin que el backlog lo indique explícitamente.
- **`auth`:** los tres roles (`admin`, `validador`, `docente`) deben poder extenderse sin reescribir el middleware de autorización — usar un array/enum de permisos, no `if` anidados por rol.

## 8. Entorno de desarrollo

```bash
docker-compose up --build      # levanta todo el entorno
docker-compose logs -f backend # logs del backend
```

Un agente nunca debe asumir que hay dependencias instaladas fuera de los contenedores. Cualquier nueva dependencia de Node o Python debe agregarse a `package.json` / `requirements.txt` **y** reconstruir la imagen correspondiente, no instalarse "a mano" en el contenedor corriendo.

## 9. Qué hacer ante ambigüedad

Si una tarea del backlog no especifica un detalle técnico (ej. formato exacto de un campo, validación específica), el agente debe:
1. Revisar `Minuta_Levantamiento_Requerimientos_UMG.md` primero.
2. Revisar `arquitectura-tecnica.md` y `backlog-tareas.md`.
3. Si sigue sin estar claro, tomar la decisión más simple y consistente con las secciones 2 a 7 de este documento, dejar un comentario `// TODO: confirmar con el director` si aplica, y continuar — no bloquear el desarrollo por una duda menor.

## 10. Referencias del proyecto

- `Minuta_Levantamiento_Requerimientos_UMG.md` — requerimientos originales del director.
- `backlog-tareas.md` — backlog de tareas por épica y sprint.
- `arquitectura-tecnica.md` — detalle extendido de arquitectura, diagrama y stack.
