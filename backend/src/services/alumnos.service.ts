import * as repo from '../repositories/alumnos.repository';
import * as gradosRepo from '../repositories/grados.repository';
import * as gradesRepo from '../repositories/grades.repository';
import { Alumno, Section, Grade } from '../models/types';

export async function listar(limit = 20, offset = 0) {
  return repo.findAll(limit, offset);
}

export async function contar() {
  return repo.count();
}

export async function buscar(params: repo.AlumnoSearch, limit = 20, offset = 0) {
  return repo.search(params, limit, offset);
}

export async function obtener(id: number): Promise<Alumno | null> {
  return repo.findById(id);
}

export async function crear(data: Omit<Alumno, 'id' | 'created_at' | 'updated_at' | 'grado_nombre' | 'is_active' | 'deleted_at'>): Promise<Alumno> {
  return repo.create(data);
}

export async function eliminar(id: number): Promise<void> {
  return repo.remove(id);
}

export async function toggleActivo(id: number): Promise<void> {
  return repo.toggle(id);
}

export async function editar(id: number, data: Parameters<typeof repo.update>[1]): Promise<void> {
  return repo.update(id, data);
}

// Para selectores planos (filtros de listado)
export async function obtenerSecciones(): Promise<Section[]> {
  return gradosRepo.findAll();
}

// Para formulario de creación con select dependiente
export async function obtenerGradesYSecciones(): Promise<{ grades: Grade[]; sections: Section[] }> {
  const [grades, sections] = await Promise.all([
    gradesRepo.findAllGrades(true),
    gradesRepo.findAllSections(true),
  ]);
  return { grades, sections };
}
