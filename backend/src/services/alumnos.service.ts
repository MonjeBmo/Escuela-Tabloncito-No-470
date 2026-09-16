import * as repo from '../repositories/alumnos.repository';
import * as gradosRepo from '../repositories/grados.repository';
import { Alumno, Grado } from '../models/types';

export async function listar(limit = 50, offset = 0) {
  return repo.findAll(limit, offset);
}

export async function contar() {
  return repo.count();
}

export async function buscar(params: repo.AlumnoSearch, limit = 50, offset = 0) {
  return repo.search(params, limit, offset);
}

export async function obtener(id: number): Promise<Alumno | null> {
  return repo.findById(id);
}

export async function crear(data: Omit<Alumno, 'id' | 'created_at' | 'updated_at' | 'grado_nombre'>): Promise<Alumno> {
  return repo.create(data);
}

export async function eliminar(id: number): Promise<void> {
  return repo.remove(id);
}

export async function obtenerGrados(): Promise<Grado[]> {
  return gradosRepo.findAll();
}
