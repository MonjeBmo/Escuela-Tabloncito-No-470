import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import { minioClient, BUCKET } from '../shared/minio';
import * as repo from '../repositories/cuadros.repository';
import * as gradosRepo from '../repositories/grados.repository';
import { Cuadro, Grado } from '../models/types';
import { Readable } from 'stream';

export async function listar(limit = 50, offset = 0) {
  return repo.findAll(limit, offset);
}

export async function contar() {
  return repo.count();
}

export async function buscar(params: repo.SearchParams, limit = 50, offset = 0) {
  return repo.search(params, limit, offset);
}

export async function obtener(id: number): Promise<Cuadro | null> {
  return repo.findById(id);
}

export async function crearConDocumento(data: {
  codigo: string;
  anio: number;
  grado_id: number | null;
  docente: string;
  total_alumnos: number | null;
  datos_extra: Record<string, unknown>;
  subido_por: number;
  archivo?: UploadedFile;
}): Promise<Cuadro> {
  let documento_key: string | null = null;
  let documento_nombre: string | null = null;
  let documento_mime: string | null = null;

  if (data.archivo) {
    const ext = data.archivo.name.split('.').pop() ?? 'bin';
    documento_key = `cuadros/${data.anio}/${uuidv4()}.${ext}`;
    documento_nombre = data.archivo.name;
    documento_mime = data.archivo.mimetype;

    const stream = Readable.from(data.archivo.data);
    await minioClient.putObject(BUCKET, documento_key, stream, data.archivo.size, {
      'Content-Type': data.archivo.mimetype,
    });
  }

  return repo.create({
    codigo: data.codigo,
    anio: data.anio,
    grado_id: data.grado_id,
    docente: data.docente || null,
    total_alumnos: data.total_alumnos,
    documento_key,
    documento_nombre,
    documento_mime,
    datos_extra: data.datos_extra,
    subido_por: data.subido_por,
    origen: 'manual',
  });
}

export async function eliminar(id: number): Promise<void> {
  const cuadro = await repo.findById(id);
  if (cuadro?.documento_key) {
    await minioClient.removeObject(BUCKET, cuadro.documento_key);
  }
  await repo.remove(id);
}

export async function validar(id: number, usuarioId: number): Promise<void> {
  return repo.validate(id, usuarioId);
}

export async function aniosDisponibles(): Promise<number[]> {
  return repo.recentYears();
}

export async function obtenerGrados(): Promise<Grado[]> {
  return gradosRepo.findAll();
}

export async function urlDescarga(key: string): Promise<string> {
  const { getPresignedUrl } = await import('../shared/minio');
  return getPresignedUrl(key, 1800); // 30 min
}
