# DERCAS — Especificación de requisitos de software
## Tabloncito 470 — Sistema de Gestión Escolar

| Control documental | Valor |
|---|---|
| Versión | 1.1 — consolidación en 16 procesos; borrador técnico basado en el repositorio |
| Fecha de revisión | 30 de septiembre de 2026 |
| Institución | Escuela El Tabloncito No. 470 |
| Estado | Pendiente de revisión y aprobación institucional |
| Autor y responsables de aprobación | Por completar por el equipo del proyecto |
| Fuente | Código, esquema SQL, vistas y configuración de despliegue del repositorio |

Se conserva **DERCAS** como nombre solicitado para el entregable. No se recibió una plantilla institucional ni una definición de esa sigla; este documento desarrolla una **Especificación de Requisitos de Software (ERS)** sin atribuirle una expansión o certificación normativa. Si la institución exige otro índice, puede trasladarse el contenido a ese formato.

El documento distingue **implementación observada**, **limitaciones verificadas por lectura del código** y **requisitos propuestos pendientes**. La revisión es estática: no certifica pruebas de ejecución, rendimiento ni puesta en producción. Los pasos de aceptación aquí descritos son pruebas por realizar, no resultados ya obtenidos.

Documento complementario: [Diagramas de procesos, arquitectura y despliegue](DIAGRAMAS_APP.md).

## Índice

1. Preparación y aprobación del DERCAS.
2. Propósito, problema y alcance.
3. Actores y acceso.
4. Entorno e interfaces.
5. Datos y reglas del negocio.
6. Requisitos funcionales y procesos paso a paso.
7. Importaciones: campos y dependencias.
8. Requisitos no funcionales.
9. Brechas del estado actual.
10. Instalación y operación paso a paso.
11. Aceptación, trazabilidad y aprobación.

## 1. Preparación y aprobación del DERCAS

1. **Identificar responsables:** completar autor, director responsable, representante administrativo, docentes consultados y responsable técnico.
2. **Validar el problema:** confirmar con la escuela cómo registra alumnos, conserva cuadros PRIM y revisa documentación digitalizada. La necesidad de centralización se infiere del propósito del proyecto; no se simulan entrevistas realizadas.
3. **Acordar alcance:** revisar los módulos de la sección 2 y separar funcionalidades actuales de ampliaciones.
4. **Aprobar actores y permisos:** usar la sección 3 y resolver las brechas de scopes y OCR antes de afirmar que el acceso está restringido por propietario o asignación.
5. **Revisar cada proceso:** validar entradas, pasos, excepciones y resultados de P-01 a P-16 con el personal que realizará la tarea.
6. **Acordar reglas de datos:** definir duplicidad de CUI y cuadros, obligatoriedad de campos, conservación documental y criterios reales de egreso.
7. **Acordar calidad medible:** completar usuarios concurrentes, volumen documental, tiempos de respuesta y recuperación. Los valores no acordados no se presentan como requisitos institucionales.
8. **Revisar diagramas:** contrastar los flujos con este documento y el despliegue con Docker Compose.
9. **Ejecutar aceptación:** preparar datos ficticios, probar cada criterio funcional y documentar resultado, evidencia, fecha y responsable.
10. **Resolver pendientes y aprobar:** registrar decisiones, versión final y firmas; cualquier cambio posterior debe actualizar requisitos, diagramas y pruebas relacionadas.

## 2. Propósito, problema y alcance

### 2.1 Propósito

Centralizar el registro de alumnos, la organización de cuadros escolares PRIM y la digitalización asistida por OCR, junto con los catálogos académicos y el control de acceso del personal de la escuela.

### 2.2 Objetivos verificables

- Mantener fichas de alumnos consultables, editables y con eliminación lógica.
- Registrar cuadros manuales y obtener cuadros a partir de documentos revisados por una persona.
- Buscar registros con filtros de texto, sección y año según el módulo.
- Organizar grados, secciones, cursos, maestros y asignaciones por año escolar.
- Administrar cuentas y permisos, importar datos y ejecutar la promoción disponible.
- Conservar metadatos en PostgreSQL y documentos en MinIO.

### 2.3 Alcance actual

Incluye autenticación, perfil, panel, alumnos, cuadros, OCR, usuarios, roles, grados, secciones, cursos, maestros, asignaciones, plantillas, importación y promoción. La aplicación genera HTML en el servidor con EJS; no es una aplicación móvil ni una SPA independiente.

No se encontraron procesos de calificaciones, asistencia, pagos, mensajería, inscripción pública, portal de padres, recuperación de contraseña por correo, exportación de expedientes o historial de matrículas por año. Estos elementos no forman parte de los requisitos implementados.

### 2.4 Glosario

| Término | Significado en este proyecto |
|---|---|
| Cuadro PRIM | Registro documental escolar con código, año, sección, docente y adjunto opcional |
| OCR | Reconocimiento de texto de un PDF o imagen para sugerir campos |
| Job | Trabajo OCR almacenado en ocr_jobs |
| RBAC | Acceso mediante roles y códigos de permiso |
| Scope | Alcance almacenado de un permiso; no aplicado al filtrado actual de registros |
| Sección | Grupo perteneciente a un grado académico |
| Eliminación lógica | Fecha deleted_at que excluye la fila de consultas habituales |
| URL prefirmada | Enlace temporal generado para consultar un objeto en MinIO |
| Promoción | Sustitución de sección actual por una del siguiente orden académico |

## 3. Actores y acceso

### 3.1 Actores

| Actor | Responsabilidad prevista |
|---|---|
| Director | Administración general, permisos y supervisión escolar |
| Administrativo | Registro de alumnos, cuadros y operación documental |
| Validador OCR | Revisión humana de documentos y corrección de extracción |
| Docente | Consulta de información académica autorizada |
| Responsable técnico | Preparación del entorno, respaldos y operación; no es un rol de aplicación predefinido |
| Servicio OCR | Extraer campos y notificar resultados al backend |

Los alumnos y encargados son entidades registradas; no tienen un portal ni un rol de acceso implementado.

### 3.2 Acceso inicial observado

Esta tabla describe los roles sembrados en una base nueva. La administración puede modificar asociaciones; OCR conserva comprobaciones por nombre de rol.

| Función | Director | Administrativo | Validador OCR | Docente |
|---|---|---|---|---|
| Panel y listado OCR | Sí, por sesión | Sí, por sesión | Sí, por sesión | Sí, por sesión |
| Ver cuadros | Sí | Sí | Sí | Sí; own no se aplica |
| Crear y validar cuadros manuales | Sí | Sí | No | No |
| Eliminar cuadros | Sí | No | No | No |
| Ver alumnos | Sí | Sí | No | Sí; assigned no se aplica |
| Crear, editar y alternar alumnos | Sí | Sí | No | No |
| Eliminar alumnos | Sí | No | No | No |
| Subir, revisar, aprobar, rechazar y reprocesar OCR | Sí | Sí | Sí | No |
| Administrar catálogos, usuarios, roles, importación y ciclo | Sí | No | No | No |

Reglas observadas:

1. Sesión ausente: redirección al login.
2. Permiso o rol insuficiente: redirección al panel con mensaje.
3. Los permisos se cargan al iniciar sesión; cambiar el rol no actualiza automáticamente una sesión existente.
4. El middleware compara códigos; no interpreta none, own, assigned o all.
5. Las rutas OCR operativas verifican nombres de rol, aunque exista un catálogo de permisos ocr.*.
6. /ocr/callback se declara antes del middleware de sesión y no incorpora autenticación de servicio.

## 4. Entorno e interfaces

| Componente | Función e interfaz observada |
|---|---|
| Navegador | Formularios y HTML EJS; CSS, JavaScript y recursos visuales |
| Nginx | HTTP 80; /public/ sirve archivos; otras rutas pasan al backend |
| Backend | Node.js 20, Express y TypeScript; puerto interno 3000 por defecto |
| PostgreSQL | Versión 16; persistencia relacional y búsqueda de texto en español |
| MinIO | API interna 9000; consola publicada en 9001; bucket MINIO_BUCKET_CUADROS |
| OCR | Python 3.12, FastAPI, Tesseract español y Poppler; puerto interno 8000 |
| Docker Compose | Cinco servicios en red bridge tabloncito; volúmenes pgdata y miniodata |

Las operaciones web utilizan GET y POST, formularios URL-encoded o multipart y respuestas HTML/redirecciones. El intercambio backend–OCR usa JSON con job_id, documento_key y bucket; el callback devuelve job_id, campos y confianza. GET /health pertenece al servicio OCR.

Nginx admite cuerpos de hasta 20M y Express limita cada archivo a 20 MiB. Un multipart agrega bytes al archivo, por lo que el máximo útil observado a través del proxy puede ser menor. La carga completa pasa por memoria en el backend.

## 5. Datos y reglas del negocio

### 5.1 Diccionario resumido

| Entidad | Datos y relaciones relevantes |
|---|---|
| roles | id, nombre único, descripción, is_system |
| permissions | código único, módulo, acción y etiqueta |
| role_permissions | role_id + permission_id como PK compuesta; scope |
| usuarios | nombre, username único, hash de contraseña, role_id, activo |
| grades | nombre único, nombre_corto, sort_order, is_active |
| sections | grade_id, nombre, display_name; único por grado y nombre |
| courses | nombre único, abreviatura, orden y estado |
| teachers | nombre completo, correo, teléfono, user_id opcional, estado |
| teacher_assignments | maestro, curso, grado, sección, año y estado; combinación única maestro/curso/sección/año |
| alumnos | nombres y apellidos, CUI, nacimiento, género, sección, año de ingreso, ubicación, encargado, creador y fechas |
| cuadros | código, año, sección, docente en texto, total, clave/nombre/MIME de documento, origen, autores, fechas y datos_extra |
| ocr_jobs | estado, documento, campos_extraidos, confianza, cuadro vinculado, autor, validador y notas |

### 5.2 Reglas observadas y límites

- Primer nombre y primer apellido del alumno son NOT NULL; esta restricción no impide cadenas vacías. CUI es opcional y no único.
- El código del cuadro es obligatorio a nivel NOT NULL, pero no tiene restricción de unicidad.
- El maestro del cuadro es un texto; no hay FK de cuadros hacia teachers.
- Grado y sección se relacionan mediante sections.grade_id; alumnos y cuadros guardan section_id.
- El estado activo y la eliminación lógica son distintos. Desactivar no equivale a eliminar.
- Eliminar alumno conserva la fila; eliminar cuadro también intenta borrar físicamente su objeto MinIO.
- La búsqueda utiliza TSVECTOR, índices GIN, configuración spanish y eliminación de acentos.
- OCR analiza únicamente la primera página. Sus confianzas son constantes heurísticas por campo encontrado, no probabilidades medidas por Tesseract.
- Aprobar OCR crea un cuadro; el documento se comparte por clave, no se duplica.
- Los estados efectivamente escritos son pendiente, revision, validado y rechazado. No se encontró actualización a procesando.
- La promoción busca sort_order + 1 y conserva el nombre de sección; no usa calificaciones, aprobación académica ni año de matrícula.
- Si falta el siguiente grado o la sección homónima, la ejecución deja section_id nulo y cuenta egreso.

## 6. Requisitos funcionales y procesos paso a paso

La aplicación se organiza en **16 procesos principales**, cada uno con un requisito RF-nn y tres diagramas F-nn, A-nn y S-nn. Las operaciones relacionadas se documentan como subactividades del mismo proceso; se conserva su detalle y sus permisos particulares. Los criterios CA-nn.m identifican cada subactividad. La agrupación documental no cambia las rutas ni la aplicación.

Estado: implementación observada por lectura de código, con las limitaciones indicadas. El reprocesamiento de P-08 está bloqueado por la incompatibilidad SQL descrita.

| Proceso | Nombre | Operaciones incluidas |
|---|---|---|
| P-01 | Autenticación y cierre de sesión | Iniciar sesión; Cerrar sesión |
| P-02 | Gestión de contraseña personal | Cambiar contraseña propia |
| P-03 | Consulta del panel principal | Consultar panel principal |
| P-04 | Gestión de alumnos | Consultar y buscar alumnos; Registrar alumno; Editar alumno; Activar o desactivar alumno; Eliminar alumno |
| P-05 | Gestión de cuadros PRIM | Consultar, buscar y abrir cuadros PRIM; Registrar cuadro manual; Validar cuadro PRIM; Eliminar cuadro y adjunto |
| P-06 | Consulta y revisión de trabajos OCR | Consultar trabajos OCR; Revisar extracción OCR |
| P-07 | Carga y procesamiento OCR | Subir y procesar documento OCR |
| P-08 | Resolución y reprocesamiento OCR | Aprobar OCR y crear cuadro; Rechazar OCR; Reprocesar OCR |
| P-09 | Administración de usuarios | Administrar usuarios |
| P-10 | Administración de roles y permisos | Administrar roles y permisos |
| P-11 | Administración de grados y secciones | Administrar grados; Administrar secciones |
| P-12 | Administración de cursos | Administrar cursos |
| P-13 | Administración de maestros | Administrar maestros |
| P-14 | Asignación docente | Asignar maestro a curso y sección |
| P-15 | Importación masiva de datos | Descargar plantilla de importación; Importar registros desde Excel |
| P-16 | Promoción de ciclo escolar | Previsualizar promoción de ciclo; Ejecutar promoción de ciclo |

### RF-01 / P-01. Autenticación y cierre de sesión

**Requisito:** el sistema debe permitir las operaciones de autenticación y cierre de sesión detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-01, A-01 y S-01 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 1.1. Iniciar sesión

**Actor y precondición de acceso:** Acceso público.

**Rutas:** `GET y POST /auth/login`.

**Entradas:** username y password.

**Flujo paso a paso:**

1. **Persona usuaria:** Escribir usuario y contraseña.
2. **Backend:** Comprobar que ambos campos estén presentes.
3. **PostgreSQL:** Buscar usuario activo por username.
4. **Backend:** Comparar contraseña con bcrypt.
5. **PostgreSQL:** Consultar códigos de permisos del rol.
6. **Backend:** Guardar identidad y permisos en la sesión.
7. **Persona usuaria:** Acceder al panel.

**Resultado / postcondición:** Sesión creada y redirección a /dashboard.

**Alternativas y limitaciones:** Campos vacíos, usuario inactivo o contraseña incorrecta: mensaje y retorno al login; si ya existe sesión, GET redirige al panel.

**Criterio de aceptación CA-01.1:** Una cuenta activa con contraseña correcta entra; una inactiva o una clave incorrecta no entra.

**Trazabilidad:** `controllers/auth.controller.ts; services/auth.service.ts; repositories/user.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 1.2. Cerrar sesión

**Actor y precondición de acceso:** Sin middleware de autenticación en esta ruta.

**Rutas:** `GET /auth/logout`.

**Entradas:** Sesión actual.

**Flujo paso a paso:**

1. **Persona usuaria:** Seleccionar cerrar sesión.
2. **Backend:** Destruir la sesión del servidor.
3. **Persona usuaria:** Recibir redirección al login.

**Resultado / postcondición:** Sesión destruida.

**Alternativas y limitaciones:** La función redirige desde el callback de destrucción; no presenta un manejo específico de error.

**Criterio de aceptación CA-01.2:** Después de salir, una ruta protegida solicita iniciar sesión.

**Trazabilidad:** `controllers/auth.controller.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-02 / P-02. Gestión de contraseña personal

**Requisito:** el sistema debe permitir las operaciones de gestión de contraseña personal detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-02, A-02 y S-02 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 2.1. Cambiar contraseña propia

**Actor y precondición de acceso:** Sesión autenticada.

**Rutas:** `GET y POST /auth/perfil`.

**Entradas:** old_password y new_password.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir perfil e ingresar contraseñas.
2. **PostgreSQL:** Obtener usuario y hash vigente.
3. **Backend:** Comparar contraseña actual.
4. **Backend:** Generar hash bcrypt con costo 12.
5. **PostgreSQL:** Actualizar contraseña.
6. **Persona usuaria:** Leer resultado en el perfil.

**Resultado / postcondición:** Contraseña sustituida si la actual coincide.

**Alternativas y limitaciones:** Contraseña actual incorrecta: no actualizar; no hay política de complejidad implementada en el servicio.

**Criterio de aceptación CA-02.1:** La clave anterior deja de permitir un nuevo login y la nueva sí lo permite.

**Trazabilidad:** `controllers/auth.controller.ts; services/auth.service.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-03 / P-03. Consulta del panel principal

**Requisito:** el sistema debe permitir las operaciones de consulta del panel principal detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-03, A-03 y S-03 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 3.1. Consultar panel principal

**Actor y precondición de acceso:** Sesión autenticada.

**Rutas:** `GET /dashboard`.

**Entradas:** Sesión.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir panel principal.
2. **Backend:** Solicitar cuatro consultas en paralelo.
3. **PostgreSQL:** Contar cuadros y alumnos no eliminados.
4. **PostgreSQL:** Agrupar trabajos OCR por estado y consultar cinco cuadros recientes.
5. **Backend:** Renderizar dashboard con EJS.
6. **Persona usuaria:** Consultar indicadores.

**Resultado / postcondición:** Indicadores y cuadros recientes visibles.

**Alternativas y limitaciones:** La ruta no comprueba dashboard.view; los contadores de alumnos incluyen inactivos no eliminados.

**Criterio de aceptación CA-03.1:** Los totales coinciden con registros cuyo deleted_at es nulo.

**Trazabilidad:** `controllers/dashboard.controller.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-04 / P-04. Gestión de alumnos

**Requisito:** el sistema debe permitir las operaciones de gestión de alumnos detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-04, A-04 y S-04 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 4.1. Consultar y buscar alumnos

**Actor y precondición de acceso:** students.view.

**Rutas:** `GET /alumnos; GET /alumnos/:id`.

**Entradas:** q, section_id, anio_ingreso, pagina y limit; id para detalle.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir listado o aplicar filtros.
2. **Backend:** Calcular límite y desplazamiento.
3. **PostgreSQL:** Consultar alumnos no eliminados con búsqueda de texto en español.
4. **Backend:** Renderizar listado o detalle solicitado.
5. **Persona usuaria:** Consultar datos personales y encargado.

**Resultado / postcondición:** Lista de 10 o 20 registros por página, o detalle del alumno.

**Alternativas y limitaciones:** Un detalle inexistente redirige al listado. Con filtros, el total se calcula con la página devuelta y puede subestimar resultados.

**Criterio de aceptación CA-04.1:** Buscar por nombre o CUI y por sección devuelve coincidencias; un eliminado no aparece.

**Trazabilidad:** `controllers/alumnos.controller.ts; repositories/alumnos.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 4.2. Registrar alumno

**Actor y precondición de acceso:** students.create.

**Rutas:** `GET y POST /alumnos/crear`.

**Entradas:** Nombres, apellidos, CUI, nacimiento, género, sección, año de ingreso, municipio, departamento y encargado.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir registro de alumno.
2. **PostgreSQL:** Cargar grados y secciones activos.
3. **Persona usuaria:** Completar datos y enviar.
4. **Backend:** Normalizar textos, fecha, sección y año.
5. **PostgreSQL:** Insertar alumno con registrado_por.
6. **Persona usuaria:** Recibir confirmación en el listado.

**Resultado / postcondición:** Alumno registrado con is_active verdadero por defecto.

**Alternativas y limitaciones:** Si falla la inserción, mostrar error y volver al formulario; CUI no tiene restricción UNIQUE.

**Criterio de aceptación CA-04.2:** El registro conserva datos y usuario creador; puede registrarse sin sección.

**Trazabilidad:** `controllers/alumnos.controller.ts; repositories/alumnos.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 4.3. Editar alumno

**Actor y precondición de acceso:** students.create.

**Rutas:** `GET y POST /alumnos/:id/editar`.

**Entradas:** id y datos del alumno.

**Flujo paso a paso:**

1. **Persona usuaria:** Seleccionar editar.
2. **PostgreSQL:** Obtener alumno y catálogos activos.
3. **Persona usuaria:** Modificar datos y enviar.
4. **Backend:** Normalizar campos.
5. **PostgreSQL:** Actualizar alumno y updated_at.
6. **Persona usuaria:** Recibir confirmación.

**Resultado / postcondición:** Datos actualizados.

**Alternativas y limitaciones:** GET de alumno inexistente redirige al listado; error de escritura regresa a edición.

**Criterio de aceptación CA-04.3:** Cambiar encargado o sección se refleja al consultar el detalle.

**Trazabilidad:** `controllers/alumnos.controller.ts; repositories/alumnos.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 4.4. Activar o desactivar alumno

**Actor y precondición de acceso:** students.create.

**Rutas:** `POST /alumnos/:id/toggle`.

**Entradas:** id.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar cambio de estado.
2. **PostgreSQL:** Invertir is_active del alumno.
3. **Backend:** Redirigir al listado.
4. **Persona usuaria:** Consultar nuevo estado.

**Resultado / postcondición:** Estado activo invertido sin eliminar datos.

**Alternativas y limitaciones:** La consulta SQL no verifica filas afectadas; los alumnos inactivos siguen en listados y en la promoción actual.

**Criterio de aceptación CA-04.4:** Dos cambios consecutivos restauran el estado original sin borrar el alumno.

**Trazabilidad:** `controllers/alumnos.controller.ts; repositories/alumnos.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 4.5. Eliminar alumno

**Actor y precondición de acceso:** students.delete.

**Rutas:** `POST /alumnos/:id/eliminar`.

**Entradas:** id.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar eliminación.
2. **PostgreSQL:** Asignar fecha actual a deleted_at.
3. **Backend:** Mostrar confirmación y redirigir.
4. **Persona usuaria:** Consultar listado sin el alumno eliminado.

**Resultado / postcondición:** Eliminación lógica; la fila permanece en PostgreSQL.

**Alternativas y limitaciones:** No existe ruta de restauración; no se verifica el número de filas modificadas.

**Criterio de aceptación CA-04.5:** La fila conserva sus datos y desaparece del listado y del detalle público del módulo.

**Trazabilidad:** `controllers/alumnos.controller.ts; repositories/alumnos.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-05 / P-05. Gestión de cuadros PRIM

**Requisito:** el sistema debe permitir las operaciones de gestión de cuadros prim detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-05, A-05 y S-05 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 5.1. Consultar, buscar y abrir cuadros PRIM

**Actor y precondición de acceso:** documents.view.

**Rutas:** `GET /cuadros; GET /cuadros/busqueda; GET /cuadros/:id`.

**Entradas:** q, anio, section_id, origen; id del cuadro.

**Flujo paso a paso:**

1. **Persona usuaria:** Consultar listado o búsqueda.
2. **PostgreSQL:** Buscar cuadros no eliminados y catálogos.
3. **Persona usuaria:** Abrir detalle.
4. **PostgreSQL:** Obtener cuadro por id.
5. **Backend:** Generar URL prefirmada si tiene documento.
6. **Persona usuaria:** Abrir documento mediante URL temporal.

**Resultado / postcondición:** Listado, resultados y detalle; URL de cuadro con vigencia de 1800 segundos.

**Alternativas y limitaciones:** Sin filtros, la vista de búsqueda no ejecuta consulta de cuadros. Id inexistente redirige. El host interno de MinIO puede impedir abrir el enlace desde el navegador.

**Criterio de aceptación CA-05.1:** Filtrar por año y origen encuentra el cuadro; comprobar acceso real a su documento desde el equipo cliente.

**Trazabilidad:** `controllers/cuadros.controller.ts; services/cuadros.service.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 5.2. Registrar cuadro manual

**Actor y precondición de acceso:** documents.create.

**Rutas:** `GET y POST /cuadros/crear`.

**Entradas:** codigo, anio, section_id, docente, total_alumnos y documento opcional.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir formulario y completar metadatos.
2. **Backend:** Normalizar datos y generar clave si hay archivo.
3. **MinIO:** Guardar documento opcional en cuadros por año y UUID.
4. **PostgreSQL:** Insertar cuadro con origen manual y subido_por.
5. **Persona usuaria:** Consultar detalle del cuadro creado.

**Resultado / postcondición:** Cuadro manual con o sin adjunto.

**Alternativas y limitaciones:** Fallo devuelve al formulario. Si MinIO guarda y PostgreSQL falla, no existe limpieza compensatoria. codigo no es único en la base.

**Criterio de aceptación CA-05.2:** Crear un cuadro sin archivo y otro con archivo; verificar metadatos y asociación del objeto.

**Trazabilidad:** `controllers/cuadros.controller.ts; services/cuadros.service.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 5.3. Validar cuadro PRIM

**Actor y precondición de acceso:** documents.validate.

**Rutas:** `POST /cuadros/:id/validar`.

**Entradas:** id y usuario en sesión.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar validación del cuadro.
2. **PostgreSQL:** Actualizar validado_por y validado_en si no está eliminado.
3. **Backend:** Mostrar confirmación.
4. **Persona usuaria:** Consultar detalle.

**Resultado / postcondición:** Cuadro marcado con responsable y fecha de validación.

**Alternativas y limitaciones:** No se comprueba que el UPDATE afecte una fila ni se impide validar nuevamente.

**Criterio de aceptación CA-05.3:** El cuadro muestra el identificador del validador y la fecha guardada.

**Trazabilidad:** `controllers/cuadros.controller.ts; repositories/cuadros.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 5.4. Eliminar cuadro y adjunto

**Actor y precondición de acceso:** documents.delete.

**Rutas:** `POST /cuadros/:id/eliminar`.

**Entradas:** id.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar eliminación del cuadro.
2. **PostgreSQL:** Obtener cuadro.
3. **MinIO:** Eliminar objeto si existe documento_key.
4. **PostgreSQL:** Asignar deleted_at al cuadro.
5. **Persona usuaria:** Recibir confirmación en el listado.

**Resultado / postcondición:** Fila eliminada lógicamente y archivo eliminado físicamente.

**Alternativas y limitaciones:** Si falla MinIO, no se alcanza el borrado lógico; si un job OCR comparte la clave, pierde también su documento original.

**Criterio de aceptación CA-05.4:** El cuadro deja de aparecer y el archivo deja de estar disponible; comprobar referencias OCR antes de usar datos reales.

**Trazabilidad:** `services/cuadros.service.ts; repositories/cuadros.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-06 / P-06. Consulta y revisión de trabajos OCR

**Requisito:** el sistema debe permitir las operaciones de consulta y revisión de trabajos ocr detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-06, A-06 y S-06 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 6.1. Consultar trabajos OCR

**Actor y precondición de acceso:** Sesión autenticada.

**Rutas:** `GET /ocr`.

**Entradas:** pagina y limit.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir módulo OCR.
2. **PostgreSQL:** Consultar trabajos, total y conteo por estado.
3. **Backend:** Renderizar lista paginada.
4. **Persona usuaria:** Consultar estados y acciones disponibles.

**Resultado / postcondición:** Trabajos visibles en páginas de 10 o 20.

**Alternativas y limitaciones:** La ruta no exige ocr.view; el listado no filtra por propietario.

**Criterio de aceptación CA-06.1:** Los conteos por estado concuerdan con ocr_jobs.

**Trazabilidad:** `controllers/ocr.controller.ts; routes/ocr.routes.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 6.2. Revisar extracción OCR

**Actor y precondición de acceso:** Rol director, administrativo o validador_ocr.

**Rutas:** `GET /ocr/revision/:id`.

**Entradas:** id del trabajo.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir revisión del trabajo.
2. **PostgreSQL:** Obtener trabajo y secciones.
3. **Backend:** Comprobar que el estado sea revision.
4. **Backend:** Generar URL del documento por 3600 segundos.
5. **Persona usuaria:** Comparar documento con campos y corregir formulario.

**Resultado / postcondición:** Formulario de revisión con campos extraídos, confianza y documento si se obtiene URL.

**Alternativas y limitaciones:** Si no existe el trabajo o no está en revision, redirigir al listado. Fallo al firmar URL permite renderizar sin documento.

**Criterio de aceptación CA-06.2:** Solo un trabajo en revision abre el formulario; corregir campos antes de validar.

**Trazabilidad:** `controllers/ocr.controller.ts; views/ocr/revision.ejs`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-07 / P-07. Carga y procesamiento OCR

**Requisito:** el sistema debe permitir las operaciones de carga y procesamiento ocr detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-07, A-07 y S-07 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 7.1. Subir y procesar documento OCR

**Actor y precondición de acceso:** Rol director, administrativo o validador_ocr.

**Rutas:** `GET y POST /ocr/subir; POST interno /procesar; POST /ocr/callback`.

**Entradas:** documento PDF o imagen.

**Flujo paso a paso:**

1. **Persona usuaria:** Seleccionar documento y enviar.
2. **MinIO:** Guardar archivo con clave OCR y UUID.
3. **PostgreSQL:** Crear trabajo pendiente.
4. **Backend:** Iniciar llamada HTTP al servicio y devolver control al usuario.
5. **Servicio OCR:** Recibir job_id, documento_key y bucket.
6. **MinIO:** Entregar documento al servicio OCR.
7. **Servicio OCR:** Convertir PDF a imágenes o abrir imagen.
8. **Servicio OCR:** Reconocer primera página con Tesseract en español.
9. **Servicio OCR:** Extraer campos y confianza mediante expresiones regulares.
10. **Backend:** Recibir callback con job_id, campos y confianza.
11. **PostgreSQL:** Guardar resultado y estado revision.

**Resultado / postcondición:** Trabajo disponible para revisión humana.

**Alternativas y limitaciones:** Archivo ausente devuelve al formulario. Error HTTP o de conexión intenta marcar rechazado. No existe cola persistente ni transición implementada a procesando.

**Criterio de aceptación CA-07.1:** Un PDF legible genera campos editables; una falla del servicio registra rechazo con nota de procesamiento.

**Trazabilidad:** `services/ocr.service.ts; controllers/ocr.controller.ts; ocr-service/app/main.py`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-08 / P-08. Resolución y reprocesamiento OCR

**Requisito:** el sistema debe permitir las operaciones de resolución y reprocesamiento ocr detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-08, A-08 y S-08 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 8.1. Aprobar OCR y crear cuadro

**Actor y precondición de acceso:** Rol director, administrativo o validador_ocr.

**Rutas:** `POST /ocr/revision/:id/validar`.

**Entradas:** Código, año, sección, docente, total de alumnos y notas corregidos.

**Flujo paso a paso:**

1. **Persona usuaria:** Enviar campos revisados y notas.
2. **PostgreSQL:** Obtener trabajo por id.
3. **PostgreSQL:** Crear cuadro de origen OCR con la misma clave de documento.
4. **PostgreSQL:** Marcar trabajo validado y asociar cuadro y validador.
5. **Persona usuaria:** Recibir confirmación y volver a OCR.

**Resultado / postcondición:** Cuadro creado y job validado; la validación del job no llena validado_en del cuadro.

**Alternativas y limitaciones:** No hay transacción conjunta ni comprobación del estado anterior; repetir POST puede crear cuadros adicionales. El MIME del cuadro se fija a application/pdf incluso para imágenes.

**Criterio de aceptación CA-08.1:** El job referencia el cuadro creado y conserva las notas; evaluar la repetición como brecha, no como comportamiento aceptado.

**Trazabilidad:** `services/ocr.service.ts; repositories/ocr.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 8.2. Rechazar OCR

**Actor y precondición de acceso:** Rol director, administrativo o validador_ocr.

**Rutas:** `POST /ocr/revision/:id/rechazar`.

**Entradas:** id y notas.

**Flujo paso a paso:**

1. **Persona usuaria:** Escribir notas y rechazar.
2. **PostgreSQL:** Actualizar estado rechazado, validador y notas.
3. **Backend:** Mostrar mensaje y redirigir.
4. **Persona usuaria:** Consultar trabajo rechazado.

**Resultado / postcondición:** Job rechazado sin crear cuadro.

**Alternativas y limitaciones:** Las notas pueden estar vacías; el POST no verifica estado previo ni filas afectadas.

**Criterio de aceptación CA-08.2:** El rechazo conserva el archivo y no crea un cuadro nuevo.

**Trazabilidad:** `controllers/ocr.controller.ts; repositories/ocr.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 8.3. Reprocesar OCR

**Actor y precondición de acceso:** Rol director, administrativo o validador_ocr.

**Rutas:** `POST /ocr/revision/:id/reprocesar`.

**Entradas:** id del trabajo.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar reprocesamiento.
2. **PostgreSQL:** Obtener trabajo.
3. **PostgreSQL:** Intentar fijar pendiente y limpiar campos con NULL.
4. **Backend:** Si el reinicio tiene éxito, enviar nuevamente al servicio OCR.
5. **Persona usuaria:** Recibir resultado de la solicitud.

**Resultado / postcondición:** Intención: reutilizar documento y repetir P-07. Con el esquema actual, el reinicio falla.

**Alternativas y limitaciones:** campos_extraidos y confianza son NOT NULL; resetToPendiente intenta escribir NULL. El controlador muestra error antes del nuevo envío.

**Criterio de aceptación CA-08.3:** Con esquema inicial, reproducir el error; para aceptar la función debe corregirse el reinicio y verificarse un nuevo callback.

**Trazabilidad:** `services/ocr.service.ts; repositories/ocr.repository.ts; infra/db/init.sql`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-09 / P-09. Administración de usuarios

**Requisito:** el sistema debe permitir las operaciones de administración de usuarios detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-09, A-09 y S-09 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 9.1. Administrar usuarios

**Actor y precondición de acceso:** admin.users.

**Rutas:** `GET y POST /admin/usuarios; POST /admin/usuarios/:id; POST /admin/usuarios/:id/toggle`.

**Entradas:** nombre, username al crear, password, role_id e id al modificar.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir usuarios y elegir crear, editar o cambiar estado.
2. **PostgreSQL:** Cargar usuarios y roles.
3. **Backend:** Para creación o nueva contraseña generar hash bcrypt.
4. **PostgreSQL:** Insertar usuario, actualizar nombre y rol, o invertir activo según acción.
5. **Persona usuaria:** Consultar listado y resultado.

**Resultado / postcondición:** Cuenta creada, editada o activada/desactivada; username no se edita mediante el controlador.

**Alternativas y limitaciones:** Username duplicado produce error. Cambio de rol o desactivación no invalida sesiones ya existentes automáticamente.

**Criterio de aceptación CA-09.1:** Crear cuenta, editar rol, restablecer clave y desactivar; un nuevo login de cuenta inactiva falla.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/user.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-10 / P-10. Administración de roles y permisos

**Requisito:** el sistema debe permitir las operaciones de administración de roles y permisos detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-10, A-10 y S-10 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 10.1. Administrar roles y permisos

**Actor y precondición de acceso:** admin.roles.

**Rutas:** `GET y POST /admin/roles; GET /admin/roles/:id/editar; POST /admin/roles/:id/permisos`.

**Entradas:** nombre, descripción, permisos seleccionados y scopes.

**Flujo paso a paso:**

1. **Persona usuaria:** Consultar roles y crear rol o abrir edición de permisos.
2. **PostgreSQL:** Consultar catálogo y permisos del rol.
3. **Persona usuaria:** Definir permisos y alcances.
4. **Backend:** Convertir selección a identificadores y scopes.
5. **PostgreSQL:** Crear rol o reemplazar sus asociaciones de permisos.
6. **Persona usuaria:** Consultar confirmación.

**Resultado / postcondición:** Rol disponible y asociaciones actualizadas.

**Alternativas y limitaciones:** Reemplazo hace DELETE y luego INSERT sin transacción. Los scopes se almacenan pero no limitan consultas; permisos de sesiones vigentes no se recargan.

**Criterio de aceptación CA-10.1:** Asignar permiso, iniciar sesión nuevamente y comprobar acceso por código; no dar por cumplido own o assigned.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/roles.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-11 / P-11. Administración de grados y secciones

**Requisito:** el sistema debe permitir las operaciones de administración de grados y secciones detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-11, A-11 y S-11 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 11.1. Administrar grados

**Actor y precondición de acceso:** admin.grades.

**Rutas:** `GET /admin/grados; POST /admin/grados/grade; POST /admin/grados/grade/:id; POST /admin/grados/grade/:id/toggle`.

**Entradas:** nombre, nombre_corto, sort_order e id.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir grados y elegir operación.
2. **PostgreSQL:** Consultar grados y secciones.
3. **Persona usuaria:** Enviar datos o cambio de estado.
4. **Backend:** Normalizar nombre y orden.
5. **PostgreSQL:** Crear, actualizar o invertir is_active del grado.
6. **Persona usuaria:** Consultar resultado.

**Resultado / postcondición:** Catálogo de grados actualizado; sort_order participa en promoción.

**Alternativas y limitaciones:** Nombre repetido viola UNIQUE. Desactivar un grado no elimina sus secciones ni alumnos.

**Criterio de aceptación CA-11.1:** Crear grado, cambiar orden y desactivar; deja de aparecer en selectores de grados activos.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/grades.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 11.2. Administrar secciones

**Actor y precondición de acceso:** admin.grades.

**Rutas:** `GET /admin/grados; POST /admin/grados/seccion; POST /admin/grados/seccion/:id; POST /admin/grados/seccion/:id/toggle`.

**Entradas:** grade_id al crear, nombre, display_name e id.

**Flujo paso a paso:**

1. **Persona usuaria:** Elegir crear, editar o cambiar estado de sección.
2. **PostgreSQL:** Consultar grado asociado cuando se crea.
3. **Backend:** Preparar nombre y etiqueta visible.
4. **PostgreSQL:** Insertar sección, editar nombres o invertir is_active.
5. **Persona usuaria:** Consultar secciones del catálogo.

**Resultado / postcondición:** Sección vinculada a grado; la edición no cambia grade_id.

**Alternativas y limitaciones:** No puede repetirse el nombre de sección dentro del mismo grado. La desactivación no desvincula alumnos.

**Criterio de aceptación CA-11.2:** Dos grados pueden tener sección A; dos secciones A del mismo grado no se crean.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/grades.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-12 / P-12. Administración de cursos

**Requisito:** el sistema debe permitir las operaciones de administración de cursos detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-12, A-12 y S-12 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 12.1. Administrar cursos

**Actor y precondición de acceso:** admin.courses.

**Rutas:** `GET y POST /admin/cursos; POST /admin/cursos/:id; POST /admin/cursos/:id/toggle`.

**Entradas:** q, nombre, nombre_corto, sort_order e id.

**Flujo paso a paso:**

1. **Persona usuaria:** Consultar o buscar cursos y elegir operación.
2. **PostgreSQL:** Obtener catálogo de cursos.
3. **Backend:** Filtrar nombre o abreviatura y paginar en memoria.
4. **Persona usuaria:** Enviar creación, edición o cambio de estado.
5. **PostgreSQL:** Insertar, actualizar o invertir is_active.
6. **Persona usuaria:** Consultar resultado.

**Resultado / postcondición:** Cursos disponibles para asignaciones cuando están activos.

**Alternativas y limitaciones:** Nombre de curso único; no existe gestión de notas ni calificaciones asociada a este catálogo.

**Criterio de aceptación CA-12.1:** Buscar por abreviatura y crear, editar y desactivar un curso.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/courses.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-13 / P-13. Administración de maestros

**Requisito:** el sistema debe permitir las operaciones de administración de maestros detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-13, A-13 y S-13 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 13.1. Administrar maestros

**Actor y precondición de acceso:** admin.teachers.

**Rutas:** `GET y POST /admin/maestros; POST /admin/maestros/:id; POST /admin/maestros/:id/toggle`.

**Entradas:** q, full_name, email, phone; user_id opcional al crear.

**Flujo paso a paso:**

1. **Persona usuaria:** Consultar maestros y elegir operación.
2. **PostgreSQL:** Cargar maestros, asignaciones y catálogos activos.
3. **Backend:** Filtrar por nombre, correo o teléfono y paginar.
4. **Persona usuaria:** Enviar datos o cambio de estado.
5. **PostgreSQL:** Crear, editar contacto o invertir is_active del maestro.
6. **Persona usuaria:** Consultar resultado.

**Resultado / postcondición:** Ficha docente actualizada, separada de la cuenta de acceso.

**Alternativas y limitaciones:** La edición no modifica user_id; desactivar maestro no desactiva automáticamente su usuario o asignaciones.

**Criterio de aceptación CA-13.1:** Registrar maestro sin usuario, editar contacto y cambiar su estado.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/teachers.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-14 / P-14. Asignación docente

**Requisito:** el sistema debe permitir las operaciones de asignación docente detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-14, A-14 y S-14 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 14.1. Asignar maestro a curso y sección

**Actor y precondición de acceso:** admin.teachers.

**Rutas:** `POST /admin/maestros/asignacion; consulta en GET /admin/maestros`.

**Entradas:** teacher_id, course_id, grade_id, section_id, school_year.

**Flujo paso a paso:**

1. **Persona usuaria:** Seleccionar maestro, curso, grado, sección y año.
2. **Backend:** Convertir identificadores y año a números.
3. **PostgreSQL:** Insertar asignación con ON CONFLICT DO NOTHING.
4. **Backend:** Mostrar confirmación y redirigir.
5. **Persona usuaria:** Consultar asignaciones.

**Resultado / postcondición:** Asignación por docente, curso, sección y año; duplicados se omiten.

**Alternativas y limitaciones:** La confirmación no distingue duplicado. Las FK no garantizan que grade_id corresponda al grado de section_id. No hay ruta para editar o desactivar asignaciones.

**Criterio de aceptación CA-14.1:** Crear una asignación y repetirla: permanece una sola combinación en base.

**Trazabilidad:** `controllers/admin.controller.ts; repositories/teachers.repository.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-15 / P-15. Importación masiva de datos

**Requisito:** el sistema debe permitir las operaciones de importación masiva de datos detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-15, A-15 y S-15 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 15.1. Descargar plantilla de importación

**Actor y precondición de acceso:** admin.users.

**Rutas:** `GET /admin/importar/plantilla/:modulo`.

**Entradas:** alumnos, maestros, usuarios, grados, secciones, cursos o asignaciones.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar plantilla del módulo.
2. **Backend:** Verificar módulo permitido.
3. **Backend:** Crear libro XLSX con encabezados, ejemplo e instrucciones.
4. **Persona usuaria:** Descargar plantilla y reemplazar fila de ejemplo.

**Resultado / postcondición:** Archivo plantilla_modulo.xlsx.

**Alternativas y limitaciones:** Módulo no admitido redirige a /admin, que no tiene una página raíz implementada.

**Criterio de aceptación CA-15.1:** Abrir el archivo y verificar hoja de datos e instrucciones; no importar accidentalmente el ejemplo.

**Trazabilidad:** `controllers/importar.controller.ts; services/importar.service.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 15.2. Importar registros desde Excel

**Actor y precondición de acceso:** admin.users para todos los módulos.

**Rutas:** `POST /admin/importar/:modulo`.

**Entradas:** archivo y módulo; datos en primera hoja.

**Flujo paso a paso:**

1. **Persona usuaria:** Completar plantilla y subir archivo.
2. **Backend:** Verificar módulo y presencia del archivo.
3. **Backend:** Leer primera hoja y cargar referencias necesarias.
4. **Backend:** Recorrer filas y validar campos del módulo.
5. **PostgreSQL:** Insertar fila válida o informar restricción SQL.
6. **Backend:** Acumular insertados, omitidos y errores por fila.
7. **Persona usuaria:** Consultar resumen y corregir filas fallidas.

**Resultado / postcondición:** Importación parcial: filas válidas persistidas; mensaje muestra hasta tres errores.

**Alternativas y limitaciones:** No es una operación atómica. En alumnos una sección no encontrada registra error pero puede insertar sin sección. Asignaciones duplicadas pueden contabilizarse como insertadas aunque ON CONFLICT no inserte.

**Criterio de aceptación CA-15.2:** Importar un archivo con una fila válida y otra inválida; comprobar persistencia parcial y números reales en base.

**Trazabilidad:** `services/importar.service.ts; controllers/importar.controller.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.


### RF-16 / P-16. Promoción de ciclo escolar

**Requisito:** el sistema debe permitir las operaciones de promoción de ciclo escolar detalladas a continuación, respetando el control de acceso de cada una.

**Diagramas:** F-16, A-16 y S-16 en el documento complementario. Las variantes se realizan en solicitudes separadas según la acción elegida.

#### 16.1. Previsualizar promoción de ciclo

**Actor y precondición de acceso:** admin.users.

**Rutas:** `GET /admin/ciclo`.

**Entradas:** Catálogos y alumnos existentes.

**Flujo paso a paso:**

1. **Persona usuaria:** Abrir ciclo escolar.
2. **PostgreSQL:** Consultar grados activos, secciones y alumnos no eliminados.
3. **Backend:** Calcular siguiente grado según sort_order más uno.
4. **Backend:** Agrupar cantidades y contar alumnos sin sección.
5. **Persona usuaria:** Revisar vista previa por grado y sección.

**Resultado / postcondición:** Resumen de destinos previstos y alumnos sin sección.

**Alternativas y limitaciones:** No comprueba existencia de sección destino en la vista previa; puede diferir de ejecución. No filtra alumnos inactivos.

**Criterio de aceptación CA-16.1:** Comparar cada destino sugerido contra secciones realmente existentes antes de ejecutar.

**Trazabilidad:** `services/importar.service.ts; controllers/importar.controller.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

#### 16.2. Ejecutar promoción de ciclo

**Actor y precondición de acceso:** admin.users.

**Rutas:** `POST /admin/ciclo/promover`.

**Entradas:** Catálogos y alumnos no eliminados con sección.

**Flujo paso a paso:**

1. **Persona usuaria:** Solicitar promoción tras revisar vista previa.
2. **PostgreSQL:** Obtener grados activos, secciones y alumnos con sección.
3. **Backend:** Construir mapa al grado con sort_order más uno y misma sección.
4. **Backend:** Para cada alumno resolver sección destino o NULL.
5. **PostgreSQL:** Actualizar section_id de cada alumno.
6. **PostgreSQL:** Contar todos los alumnos que quedan sin sección.
7. **Persona usuaria:** Consultar promovidos, egresados y sin sección.

**Resultado / postcondición:** Sección actual sustituida; destino NULL se contabiliza como egreso.

**Alternativas y limitaciones:** No hay transacción global, historial por ciclo ni protección contra repetición. Una sección destino ausente también produce NULL. Alumnos de grados inactivos pueden omitirse.

**Criterio de aceptación CA-16.2:** Con datos de prueba verificar promoción, último grado y sección faltante; repetir la solicitud evidencia ausencia de control por ciclo.

**Trazabilidad:** `services/importar.service.ts; controllers/importar.controller.ts`. Las rutas de controllers, services, repositories y routes son relativas a `backend/src`; views es relativa a `backend`.

## 7. Importaciones: campos y dependencias

| Módulo | Columnas obligatorias de la plantilla | Dependencias |
|---|---|---|
| alumnos | primer_nombre*, primer_apellido* | Grado y sección si se desea asignarlos |
| maestros | full_name* | Ninguna; email y phone opcionales |
| usuarios | nombre*, username*, password*, rol* | Rol existente por nombre |
| grados | nombre* | nombre_corto y sort_order opcionales |
| secciones | grado*, nombre_seccion* | Grado existente |
| cursos | nombre* | nombre_corto y sort_order opcionales |
| asignaciones | maestro*, curso*, grado*, seccion*, anio_escolar* | Maestro, curso y sección existentes |

Pasos de carga inicial:

1. Descargar la plantilla correspondiente; conservar encabezados.
2. Reemplazar o eliminar la fila de ejemplo.
3. Registrar primero grados y cursos; después secciones y maestros; finalmente asignaciones y alumnos. Crear roles antes de importar usuarios.
4. Completar fechas como DD/MM/AAAA y género como M o F, de acuerdo con las instrucciones de plantilla. La base no tiene un CHECK que restrinja género.
5. Colocar datos en la primera hoja; las instrucciones se entregan en una hoja adicional.
6. Subir el archivo mediante el módulo. Las plantillas mencionan XLSX o CSV; el flujo principal de la interfaz se presenta como Excel.
7. Revisar filas insertadas, omitidas y errores. Los nombres de referencia se resuelven normalmente en minúsculas; no se elimina acentuación para estas correspondencias.
8. Corregir únicamente filas fallidas y comprobar duplicados antes de repetir. No existe una garantía general de importación idempotente.

En asignaciones, aunque la plantilla marca año obligatorio, el servicio usa el año actual si no logra leerlo. La interfaz muestra como máximo tres errores en el mensaje; no genera un informe descargable completo.

## 8. Requisitos no funcionales

**O** = mecanismo observado, sin certificación de prueba. **P** = propuesta pendiente de implementar o acordar.

| ID | Requisito y verificación | Estado |
|---|---|---|
| RNF-01 | Guardar contraseñas con bcrypt costo 12; verificar que no se almacenen en texto plano | O |
| RNF-02 | Proteger las rutas según permisos; probar acceso directo con cada rol y completar scopes, OCR y callback | O parcial / P completar |
| RNF-03 | Sesiones con cookie httpOnly y maxAge de ocho horas; comprobar expiración y salida | O; almacenamiento en memoria |
| RNF-04 | Usar HTTPS, cookies adecuadas al despliegue, protección CSRF y autenticación del callback | P |
| RNF-05 | Aplicar transacciones e idempotencia en aprobación OCR, permisos y promoción; probar fallos parciales y doble envío | P |
| RNF-06 | Persistir datos y documentos en volúmenes; probar reinicio sin pérdida | O en configuración; prueba pendiente |
| RNF-07 | Definir respaldos de PostgreSQL y MinIO y demostrar restauración conjunta | P; frecuencia, retención, RPO y RTO por acordar |
| RNF-08 | Establecer tiempos de respuesta y concurrencia con un conjunto de datos acordado; medir percentiles y OCR por tamaño | P; no hay cifras de rendimiento verificadas |
| RNF-09 | Dar mensajes comprensibles y permitir completar tareas con teclado y en pantallas acordadas | O parcial; auditoría de accesibilidad pendiente |
| RNF-10 | Mantener separación de rutas, controladores, servicios y repositorios; validar compilación TypeScript en cambios de código | O; algunos controladores llaman repositorios directamente |
| RNF-11 | Desplegar con Compose y variables de entorno sin versionar secretos | O; .env está ignorado |
| RNF-12 | Registrar autor y fechas; ampliar a bitácora de acciones críticas con actor, acción y resultado | O parcial / P bitácora |
| RNF-13 | Validar tipo real, tamaño, estructura y campos de cargas en servidor; probar archivos inválidos | Límite de tamaño O; validación completa P |
| RNF-14 | Definir retención, exportación autorizada y tratamiento de datos de alumnos y encargados | P; decisión institucional pendiente |

No se fijan cifras arbitrarias de disponibilidad, precisión OCR, capacidad de servidor o concurrencia como si estuvieran aprobadas.

## 9. Brechas del estado actual

Estas observaciones documentan el código revisado; no se modificó su comportamiento al preparar el DERCAS.

| ID | Hallazgo y efecto | Resolución necesaria |
|---|---|---|
| B-01 | Se guardan scopes pero solo se leen códigos; un permiso own o assigned no filtra registros | Definir consultas por propietario/asignación y casos de autorización |
| B-02 | Panel y lista OCR solo exigen sesión; operaciones OCR usan nombres de rol | Unificar política y verificar permisos contra cada ruta |
| B-03 | Callback sin autenticación; Nginx reenvía también /ocr/callback al backend | Autenticar servicio y restringir exposición conforme al diseño aprobado |
| B-04 | Reprocesamiento escribe NULL en dos columnas NOT NULL | Reiniciar con valores válidos y probar el ciclo completo |
| B-05 | OCR no escribe procesando, no tiene cola durable ni reintento persistente; callback no verifica respuesta HTTP de error | Definir estados, confirmación y recuperación de trabajos |
| B-06 | Validación OCR no verifica estado ni es transaccional; MIME fijo a PDF | Evitar doble creación, conservar MIME y guardar todo atómicamente |
| B-07 | Promoción puede repetirse y avanzar alumnos otra vez; no guarda historial | Modelar ciclo, elegibilidad e idempotencia |
| B-08 | Falta de sección destino se trata como egreso; preview puede anunciar un destino inexistente | Distinguir egreso real de configuración incompleta |
| B-09 | Borrado de cuadro elimina objeto compartido con un trabajo OCR | Definir conservación y referencias antes de borrar físicamente |
| B-10 | URLs prefirmadas usan endpoint interno minio:9000, no publicado al navegador | Configurar ruta externa accesible y firma compatible; probar desde cliente |
| B-11 | Sesiones en memoria; cambios de rol o estado no revocan sesiones existentes | Almacén compartido e invalidación según necesidades |
| B-12 | Búsqueda de alumnos usa tamaño de página como total; búsqueda de cuadros tiene límite predeterminado 20 | Calcular total filtrado y definir paginación completa |
| B-13 | Importación parcial, duplicados no siempre detectados y conteo de asignaciones impreciso | Definir reglas de duplicidad y contar filas efectivamente insertadas |
| B-14 | Datos iniciales incluyen una cuenta administrativa con clave fija en el código y registro en logs | Sustituir aprovisionamiento y cambiar clave antes de uso real |
| B-15 | No se encontró TLS, respaldos automatizados ni observabilidad central en Compose | Completar operación de producción y comprobar recuperación |

## 10. Instalación y operación paso a paso

Procedimiento documental para el entorno definido en el repositorio; no se ejecutó un despliegue para generar estos archivos.

1. Disponer de Git, Docker y Docker Compose; reservar puertos 80 y 9001. El dimensionamiento depende del volumen y procesamiento OCR y está pendiente de medición.
2. Obtener el repositorio y ubicarse en su raíz.
3. Crear `.env` a partir de `.env.example` solo si aún no existe; configurar secretos propios. No incluir ese archivo en entregas públicas.
4. Hacer coincidir POSTGRES_DB, POSTGRES_USER y POSTGRES_PASSWORD con DATABASE_URL.
5. Configurar MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL, credenciales MinIO y **MINIO_BUCKET_CUADROS**; este es el nombre usado en el código, aunque el README mencione otro.
6. Configurar SESSION_SECRET, PORT=3000 y OCR_SERVICE_URL. El servicio OCR usa BACKEND_INTERNAL_URL para el callback. Cambiar puertos requiere ajustar también Nginx y URLs internas.
7. Construir y levantar servicios desde la raíz:

```bash
docker compose build
docker compose up -d
docker compose ps
```

8. PostgreSQL ejecuta `infra/db/init.sql` únicamente al inicializar un directorio de datos vacío. Editar ese archivo no migra una base existente.
9. El backend intenta crear el bucket y la cuenta administrativa inicial. Revisar logs si esos pasos fallan: el código puede seguir escuchando aunque fallen.
10. Abrir `http://localhost` o el host configurado. Cambiar la contraseña de la cuenta inicial desde el perfil y revisar roles antes de cargar datos institucionales.
11. Configurar catálogos, docentes, asignaciones y alumnos siguiendo la sección 7.
12. Probar un cuadro manual y un documento OCR con datos ficticios; verificar la descarga desde el navegador. La conectividad interna a MinIO no garantiza que sus enlaces funcionen externamente.
13. Antes de promoción, obtener respaldo conjunto y verificar secciones destino. Ejecutar pruebas con una copia de datos, dadas las brechas descritas.
14. Para detener conservando volúmenes, usar `docker compose down`. La eliminación de volúmenes no forma parte de este procedimiento.

Comandos de diagnóstico:

```bash
docker compose logs backend --tail=100
docker compose logs ocr-service --tail=100
docker compose logs nginx --tail=100
```

La consola MinIO se publica en `http://localhost:9001`. Backend, PostgreSQL, API MinIO y OCR no publican puertos al host en el Compose actual. El backend usa `npm ci` y compila TypeScript durante la construcción; OCR instala Tesseract español y Poppler en su imagen.

## 11. Aceptación, trazabilidad y aprobación

### 11.1 Ejecución de aceptación

1. Preparar una base de prueba con los cuatro roles iniciales y datos ficticios.
2. Ejecutar los criterios CA-01.1 a CA-16.2 de las subactividades; comprobar persistencia además del mensaje visual.
3. Probar acceso sin sesión y sin permiso para cada ruta protegida.
4. Introducir errores de archivo, duplicados, referencias faltantes y fallos de servicios.
5. Registrar cada brecha reproducida, corregir según prioridad acordada y repetir los casos afectados.
6. Verificar reinicio, conservación de volúmenes y restauración antes de aprobar operación institucional.
7. Obtener aprobación de responsables funcionales y técnicos.

Plantilla de evidencia:

| Caso | Datos de prueba | Resultado esperado | Resultado obtenido | Evidencia | Responsable / fecha | Estado |
|---|---|---|---|---|---|---|
| CA-nn.m | Por completar | Ver RF-nn | Pendiente | Captura o registro controlado | Por completar | No ejecutado |

### 11.2 Matriz de trazabilidad

| Requisito | Proceso | Diagramas | Criterios de aceptación |
|---|---|---|---|
| RF-01 | P-01 — Autenticación y cierre de sesión | F-01, A-01, S-01 | CA-01.1, CA-01.2 |
| RF-02 | P-02 — Gestión de contraseña personal | F-02, A-02, S-02 | CA-02.1 |
| RF-03 | P-03 — Consulta del panel principal | F-03, A-03, S-03 | CA-03.1 |
| RF-04 | P-04 — Gestión de alumnos | F-04, A-04, S-04 | CA-04.1, CA-04.2, CA-04.3, CA-04.4, CA-04.5 |
| RF-05 | P-05 — Gestión de cuadros PRIM | F-05, A-05, S-05 | CA-05.1, CA-05.2, CA-05.3, CA-05.4 |
| RF-06 | P-06 — Consulta y revisión de trabajos OCR | F-06, A-06, S-06 | CA-06.1, CA-06.2 |
| RF-07 | P-07 — Carga y procesamiento OCR | F-07, A-07, S-07 | CA-07.1 |
| RF-08 | P-08 — Resolución y reprocesamiento OCR | F-08, A-08, S-08 | CA-08.1, CA-08.2, CA-08.3 |
| RF-09 | P-09 — Administración de usuarios | F-09, A-09, S-09 | CA-09.1 |
| RF-10 | P-10 — Administración de roles y permisos | F-10, A-10, S-10 | CA-10.1 |
| RF-11 | P-11 — Administración de grados y secciones | F-11, A-11, S-11 | CA-11.1, CA-11.2 |
| RF-12 | P-12 — Administración de cursos | F-12, A-12, S-12 | CA-12.1 |
| RF-13 | P-13 — Administración de maestros | F-13, A-13, S-13 | CA-13.1 |
| RF-14 | P-14 — Asignación docente | F-14, A-14, S-14 | CA-14.1 |
| RF-15 | P-15 — Importación masiva de datos | F-15, A-15, S-15 | CA-15.1, CA-15.2 |
| RF-16 | P-16 — Promoción de ciclo escolar | F-16, A-16, S-16 | CA-16.1, CA-16.2 |

### 11.3 Decisiones pendientes de aprobación

- Formato institucional y significado oficial de DERCAS.
- Unicidad y obligatoriedad de CUI, código de cuadro y otros datos.
- Restricciones reales de docentes y validadores sobre registros.
- Criterio de promoción, repitencia, egreso e historial académico.
- Conservación de documentos y respaldos, responsables y recuperación.
- Capacidad, concurrencia, tiempos de respuesta y precisión OCR aceptables.
- Fecha, responsables y alcance de la aceptación final.

| Aprobación | Nombre | Fecha | Observaciones / firma |
|---|---|---|---|
| Dirección de la escuela | Pendiente | Pendiente | Pendiente |
| Representante administrativo | Pendiente | Pendiente | Pendiente |
| Responsable técnico | Pendiente | Pendiente | Pendiente |

### 11.4 Fuentes internas

- [README del proyecto](../README.md).
- [Rutas](../backend/src/routes/) y [controladores](../backend/src/controllers/).
- [Servicios](../backend/src/services/) y [repositorios](../backend/src/repositories/).
- [Esquema y datos iniciales](../infra/db/init.sql).
- [Servicio OCR](../ocr-service/app/main.py).
- [Docker Compose](../docker-compose.yml), [Nginx](../infra/nginx.conf) y [variables de ejemplo](../.env.example).

En discrepancias se tomó el código como evidencia del comportamiento implementado. Este documento debe actualizarse cuando cambien esas fuentes.
