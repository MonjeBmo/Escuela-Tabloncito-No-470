import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

export const minioClient = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT  || 'minio',
  port:      parseInt(process.env.MINIO_PORT || '9000'),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
});

export const BUCKET = process.env.MINIO_BUCKET_CUADROS || 'cuadros-prim';

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1');
    console.log(`[MinIO] Bucket "${BUCKET}" creado.`);
  }
}

export async function getPresignedUrl(key: string, expirySecs = 3600): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, key, expirySecs);
}

export async function streamObject(key: string, res: any, filename?: string, mimeType?: string, inline = true): Promise<void> {
  try {
    const stat = await minioClient.statObject(BUCKET, key);
    const contentType = mimeType || stat.metaData?.['content-type'] || 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    const disposition = inline ? 'inline' : 'attachment';
    if (filename) {
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
    } else {
      res.setHeader('Content-Disposition', disposition);
    }
    const stream = await minioClient.getObject(BUCKET, key);
    stream.pipe(res);
  } catch (err: any) {
    console.error(`[MinIO] Error al obtener objeto ${key}:`, err.message);
    if (!res.headersSent) {
      res.status(404).send('Documento no encontrado o no disponible');
    }
  }
}
