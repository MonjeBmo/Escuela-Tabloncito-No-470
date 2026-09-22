"""
Servicio OCR — Escuela El Tabloncito No. 470
FastAPI + Tesseract (español)
"""
import os
import io
import re
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
from minio import Minio
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ocr-service")

app = FastAPI(title="OCR Service — Tabloncito 470")

# ─── Configuración ────────────────────────────────────────────────────────────
MINIO_ENDPOINT  = os.getenv("MINIO_ENDPOINT", "minio")
MINIO_PORT      = int(os.getenv("MINIO_PORT", "9000"))
MINIO_USE_SSL   = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
MINIO_USER      = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_PASSWORD  = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
BACKEND_URL     = os.getenv("BACKEND_INTERNAL_URL", "http://backend:3000")

minio_client = Minio(
    f"{MINIO_ENDPOINT}:{MINIO_PORT}",
    access_key=MINIO_USER,
    secret_key=MINIO_PASSWORD,
    secure=MINIO_USE_SSL,
)


class ProcesarRequest(BaseModel):
    job_id: int
    documento_key: str
    bucket: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/procesar")
async def procesar(req: ProcesarRequest):
    logger.info(f"Procesando job {req.job_id} — {req.documento_key}")
    try:
        # 1. Descargar archivo de MinIO
        response = minio_client.get_object(req.bucket, req.documento_key)
        data = response.read()
        response.close()

        # 2. Convertir a imagen(s)
        images = _to_images(req.documento_key, data)
        if not images:
            raise HTTPException(status_code=400, detail="No se pudo convertir el documento a imagen.")

        # 3. OCR — usar primera página
        texto = pytesseract.image_to_string(images[0], lang="spa")

        # 4. Extracción zonal de campos
        campos, confianza = _extraer_campos(texto)
        logger.info(f"Job {req.job_id} extraído: {campos}")

        # 5. Notificar al backend
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{BACKEND_URL}/ocr/callback",
                json={"job_id": req.job_id, "campos": campos, "confianza": confianza},
            )

        return {"ok": True, "campos": campos}

    except Exception as exc:
        logger.error(f"Error en job {req.job_id}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


def _to_images(key: str, data: bytes) -> list:
    """Convierte PDF o imagen a lista de PIL.Image."""
    ext = key.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return convert_from_bytes(data, dpi=300)
    else:
        return [Image.open(io.BytesIO(data))]


def _extraer_campos(texto: str) -> tuple[dict, dict]:
    """
    Extracción básica de campos del Cuadro PRIM mediante regex.
    Devuelve (campos, confianza) donde confianza está entre 0 y 1.
    """
    campos: dict[str, str] = {}
    confianza: dict[str, float] = {}

    # Código de cuadro (formato: PRIM-YYYY-NNN o similar)
    m = re.search(r'(PRIM[\-_]\d{4}[\-_]\d+)', texto, re.IGNORECASE)
    if m:
        campos["codigo"] = m.group(1).upper()
        confianza["codigo"] = 0.90
    else:
        campos["codigo"] = ""
        confianza["codigo"] = 0.0

    # Año
    m_anio = re.search(r'\b(20\d{2}|19\d{2})\b', texto)
    if m_anio:
        campos["anio"] = m_anio.group(1)
        confianza["anio"] = 0.85
    else:
        campos["anio"] = ""
        confianza["anio"] = 0.0

    # Grado (busca "Primero", "Segundo", etc.)
    grados_patron = (
        r'(primer[ao]?|segund[ao]?|tercer[ao]?|cuart[ao]?|quint[ao]?|sext[ao]?)'
        r'[\s\-–]*(A|B|C)?'
    )
    m_grado = re.search(grados_patron, texto, re.IGNORECASE)
    if m_grado:
        campos["grado"] = m_grado.group(0).strip()
        confianza["grado"] = 0.75
    else:
        campos["grado"] = ""
        confianza["grado"] = 0.0

    # Docente
    m_doc = re.search(
        r'(?:docente|maestr[ao]|profesor[a]?)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){1,4})',
        texto, re.IGNORECASE
    )
    if m_doc:
        campos["docente"] = m_doc.group(1).strip()
        confianza["docente"] = 0.70
    else:
        campos["docente"] = ""
        confianza["docente"] = 0.0

    # Total de alumnos
    m_tot = re.search(r'(?:total|inscritos?|alumnos?)\s*[:\-]?\s*(\d{1,3})', texto, re.IGNORECASE)
    if m_tot:
        campos["total_alumnos"] = m_tot.group(1)
        confianza["total_alumnos"] = 0.80
    else:
        campos["total_alumnos"] = ""
        confianza["total_alumnos"] = 0.0

    return campos, confianza
