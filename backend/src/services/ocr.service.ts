import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import { Readable } from 'stream';
import * as http from 'node:http';
import * as repo from '../repositories/ocr.repository';
import * as cuadrosRepo from '../repositories/cuadros.repository';
import { minioClient, BUCKET } from '../shared/minio';
import { OcrJob } from '../models/types';

export async function listar(limit = 50, offset = 0) {
  return repo.findAll(limit, offset);
}

export async function pendientesRevision(): Promise<OcrJob[]> {
  return repo.findPendingReview();
}

export async function obtener(id: number): Promise<OcrJob | null> {
  return repo.findById(id);
}

export async function conteoEstados() {
  return repo.countByEstado();
}

export async function subirYProcesar(archivo: UploadedFile, usuarioId: number): Promise<OcrJob> {
  const ext = archivo.name.split('.').pop() ?? 'bin';
  const key = `ocr/${uuidv4()}.${ext}`;

  const stream = Readable.from(archivo.data);
  await minioClient.putObject(BUCKET, key, stream, archivo.size, {
    'Content-Type': archivo.mimetype,
  });

  const job = await repo.create({
    documento_key: key,
    documento_nombre: archivo.name,
    subido_por: usuarioId,
  });

  // Llamar al servicio OCR de forma asíncrona
  enviarAOcr(job.id, key).catch((err) => {
    console.error(`[OCR] Error enviando job ${job.id}:`, err.message);
  });

  return job;
}

async function enviarAOcr(jobId: number, documentoKey: string): Promise<void> {
  const ocrUrl = process.env.OCR_SERVICE_URL || 'http://ocr-service:8000';
  const body = JSON.stringify({ job_id: jobId, documento_key: documentoKey, bucket: BUCKET });

  await new Promise<void>((resolve, reject) => {
    const url = new URL(`${ocrUrl}/procesar`);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 8000, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        res.resume();
        res.on('end', () => resolve());
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function validarJob(
  jobId: number,
  usuarioId: number,
  datosCuadro: {
    codigo: string; anio: number; grado_id: number | null;
    docente: string; total_alumnos: number | null;
    datos_extra: Record<string, unknown>;
  },
  notas: string
): Promise<void> {
  const job = await repo.findById(jobId);
  if (!job) throw new Error('Job no encontrado');

  const cuadro = await cuadrosRepo.create({
    ...datosCuadro,
    documento_key: job.documento_key,
    documento_nombre: job.documento_nombre,
    documento_mime: 'application/pdf',
    subido_por: usuarioId,
    origen: 'ocr',
  });

  await repo.validate(jobId, usuarioId, cuadro.id, notas);
}

export async function rechazarJob(jobId: number, usuarioId: number, notas: string): Promise<void> {
  await repo.reject(jobId, usuarioId, notas);
}

// Callback que llama el servicio OCR cuando termina
export async function recibirResultadoOcr(
  jobId: number,
  campos: Record<string, string>,
  confianza: Record<string, number>
): Promise<void> {
  await repo.updateFromOcr(jobId, campos, confianza);
}
