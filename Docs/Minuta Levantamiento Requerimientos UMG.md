_Minuta de Reunión — Levantamiento de Requerimientos_ 

# **MINUTA DE REUNIÓN** 

_Levantamiento de Requerimientos — Proyecto de Seminario en Ingeniería en Sistemas UMG_ 

|**Institución:**|Escuela El tabloncito No. 470|
|---|---|
|**Entrevistado:**|Lic. Adelso Arredondo — Director de la Institución|
|**Entrevistador(es):**|Equipo de Seminario — Ingeniería en Sistemas|
|**Fecha de la reunión:**|3 de agosto de 2026|
|**Tipo de sesión:**|Primera visita — Levantamiento inicial de requerimientos|



## **1. Objetivo de la reunión** 

Realizar la primera visita de levantamiento de requerimientos con el director de la institución, Lic. Adelso Arredondo, con el fin de identificar las principales problemáticas (dolores) administrativas y académicas de la escuela, susceptibles de ser atendidas mediante una solución tecnológica como parte del proyecto de Seminario de la carrera de Ingeniería en Sistemas. 

Es importante señalar que, en esta primera sesión, el director no otorgó aún una autorización formal solo de manera verbal ("vía libre") para la implementación de una solución; el alcance de esta reunión se limitó a la identificación y documentación de necesidades. 

## **2. Contexto institucional** 

La institución es una escuela de carácter no lucrativo que actualmente gestiona sus procesos administrativos de forma manual o semi-manual en, al menos, tres áreas críticas: el resguardo histórico de documentación académica de egresados, el registro de alumnos de primer ingreso, y el uso de tecnología didáctica por parte del cuerpo docente. 

## **3. Requerimientos y problemáticas identificadas** 

### **3.1 Repositorio digital y búsqueda avanzada de "Cuadros PRIM"** 

- La escuela conserva un archivo físico de documentos denominados "Cuadros PRIM", con registros que datan desde la década de 1990 hasta la fecha. 

- Estos documentos se han ido acumulando sin un proceso de digitalización, lo que genera un riesgo constante de pérdida o deterioro del papel. 

- Diversos exalumnos requieren esta documentación para trámites personales o profesionales, pero la búsqueda y validación de existencia de un cuadro es un proceso lento y complicado. 

- Necesidad planteada por el director: migrar esta información a la nube, garantizando la integridad y disponibilidad del documento. 

- Propuesta preliminar discutida: desarrollar un módulo de repositorio documental con un portal que capture los datos según el formato de "cuadro" correspondiente a cada época/año (los formatos han variado con el tiempo), almacenando la información estructurada en una base de datos. 

- Funcionalidad clave requerida: motor de búsqueda avanzada (por nombre, año, código de cuadro, etc.) que permita ubicar un documento de forma rápida. 

Página 1 de 4 

_Minuta de Reunión — Levantamiento de Requerimientos_ 

### **3.2 Digitalización del archivo histórico (OCR / IA) — Propuesta del equipo de seminario** 

Se identificó como una de las tareas de mayor esfuerzo la digitalización del archivo histórico completo (décadas de documentos). Ante esta problemática planteada por el director, el equipo de Seminario propone evaluar el uso de herramientas de OCR o Inteligencia Artificial para leer los PDF/documentos escaneados y mapear automáticamente los datos a un formulario, con validación posterior antes de su almacenamiento en el repositorio. Esta es una propuesta técnica del equipo, pendiente de validar con el director en una próxima sesión. A continuación, se listan las consideraciones para abordar este reto: 

**Consideración crítica — valor probatorio del documento: un "Cuadro PRIM" no es únicamente un conjunto de datos, sino un documento con firma y sello que le otorgan validez para trámites de los exalumnos. Por ello, la información extraída por OCR no debe usarse para "regenerar" o sustituir el documento original. Se propone un modelo de dos capas:** 

   - Capa 1 — Documento fuente (valor legal): se almacena el escaneo/imagen o PDF fiel del cuadro original, con firma y sello visibles. Este es el archivo que se entrega ante una solicitud de trámite, no un documento generado a partir de los datos. 

   - Capa 2 — Índice de datos (solo para búsqueda): los datos extraídos por OCR (nombre, año, curso, número de cuadro, etc.) se usan únicamente como metadatos para el motor de búsqueda avanzada, es decir, para ubicar rápidamente cuál documento escaneado corresponde a cada alumno o año — nunca para reconstruir el documento oficial. 

- Escaneo masivo por lotes: definir un proceso estandarizado de digitalización (escáner con alimentador automático, resolución mínima recomendada, nomenclatura de archivos) antes de aplicar OCR, priorizando primero los cuadros más solicitados (años recientes) y luego el histórico. 

- OCR estructurado por plantilla: dado que los "Cuadros PRIM" cambian de formato según el año, se sugiere entrenar/configurar plantillas de extracción distintas por rango de años (ej. formularios OCR basados en posición de campos o "zonal OCR"), en lugar de un OCR genérico de texto libre. 

   - Herramientas a evaluar: Amazon Textract, Google Document AI, Azure Document Intelligence, o motores open source como Tesseract combinado con reglas de extracción; para documentos con estructura muy variable, un modelo de lenguaje con visión (IA multimodal) puede complementar el mapeo campo por campo. 

- Flujo de "humano en el bucle" (human-in-the-loop): toda la información extraída automáticamente debe pasar por una pantalla de revisión/validación antes de guardarse definitivamente en el repositorio, tal como el director lo sugirió, para minimizar errores de transcripción. 

- Indicador de confianza (confidence score): mostrar al validador qué campos fueron extraídos con baja certeza, para enfocar la revisión manual solo donde es necesario y agilizar el proceso. 

- Digitalización incremental y priorizada: no es necesario digitalizar todo el histórico antes de lanzar el sistema; se puede iniciar con los años más consultados y digitalizar el resto de forma progresiva (a demanda, cada vez que se solicita un cuadro antiguo aún no digitalizado). 

- Entrega ante trámites de exalumnos: el flujo de consulta debe terminar siempre en la entrega del escaneo original (Capa 1), y no en un documento generado desde el índice de datos (Capa 2), para no comprometer su validez ante terceros. 

- Certificación de copias: definir con el director si, para efectos de trámite, la escuela requiere sellar/certificar nuevamente cada copia entregada del repositorio digital ("copia fiel del original"), como se hace actualmente con el documento físico. 

Página 2 de 4 

_Minuta de Reunión — Levantamiento de Requerimientos_ 

- Control de calidad y trazabilidad: registrar quién digitalizó, quién validó y en qué fecha, para dar seguimiento y auditoría al proceso de migración del archivo. 

- **3.3 Módulo de registro de alumnos de nuevo ingreso** 

- Actualmente el registro de alumnos de primer ingreso se realiza de forma manual en un libro físico. 

- Posteriormente, esos mismos datos se transcriben nuevamente en una plataforma proporcionada por el MINEDUC. 

- Pendiente por confirmar con el MINEDUC: si dicha plataforma cuenta con alguna funcionalidad de carga masiva de datos (por ejemplo, importación vía archivo CSV) o si el registro debe hacerse estudiante por estudiante de forma manual. 

- Necesidad planteada por el director: eliminar la dependencia del libro físico como fuente primaria de registro, capturando la información directamente en una base de datos propia de la institución. 

- Esta misma información debe integrarse al motor de búsqueda avanzada, de manera similar al módulo de "Cuadros PRIM", para consultar rápidamente los datos de cualquier alumno registrado. 

- Punto que explorar en próximas sesiones: viabilidad de una integración (API o exportación/importación de archivos) entre el sistema propio de la escuela y la plataforma del MINEDUC, para evitar la doble digitación de datos. 

- **3.4 Modernización tecnológica y capacitación docente** 

- El director expresó interés en modernizar al personal docente en el uso de tecnología para impartir clases (por ejemplo, uso de proyectores/cañoneras). 

- Se identificó que buena parte del cuerpo docente presenta dificultades o resistencia al utilizar este tipo de herramientas tecnológicas. 

- Solicitud del director: que el equipo de proyecto brinde una charla, taller o programa de capacitación tecnológica, y/o proponga alguna herramienta o sistema que facilite la modernización del proceso de enseñanza-aprendizaje en la escuela. 

- Este requerimiento tiene un componente de gestión del cambio (capacitación y acompañamiento docente) además del componente puramente tecnológico. 

## **4. Puntos pendientes / preguntas abiertas** 

- Confirmar con el MINEDUC si su plataforma de registro de alumnos admite carga masiva de información (CSV u otro formato) o solo captura manual individual. 

- Definir con el director los distintos formatos que ha tenido el "Cuadro PRIM" a lo largo de los años, para diseñar las plantillas de OCR y los formularios de captura correspondientes. 

- Precisar el volumen aproximado de documentos históricos a digitalizar (cantidad de cuadros por década) para dimensionar el esfuerzo y tiempos del proyecto. 

- Determinar el equipo tecnológico actual disponible en la escuela (computadoras, conectividad a internet, proyectores existentes) para dimensionar la propuesta de modernización docente. 

- Validar con el director la propuesta de OCR/IA del equipo de seminario, así como el modelo de dos capas (documento fuente vs. índice de datos) y el proceso de certificación de copias entregadas para trámites. 

Página 3 de 4 

_Minuta de Reunión — Levantamiento de Requerimientos_ 

- Obtener la autorización formal del director para avanzar de la fase de levantamiento de requerimientos a la fase de diseño/implementación de la solución. 

**5. Acuerdos y próximos pasos** 

- El equipo de Seminario documentará formalmente los requerimientos recabados en esta sesión y los presentará al director para su validación. 

- Se solicitará una segunda sesión de trabajo para profundizar o bien el poder describir  los puntos pendientes señalados en la sección 4, dada la limitante de tiempo del director en esta primera visita. 

- Se dará seguimiento a la solicitud de autorización formal por parte del director para iniciar con el diseño de la propuesta de solución. 

## **6. Firmas** 

_______________________________ Lic. Adelso Arredondo — director de la Institución 

_______________________________ Equipo de Seminario — UMG - Ingeniería en Sistemas 

Página 4 de 4 

