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
