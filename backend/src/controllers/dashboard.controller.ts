import { Request, Response } from 'express';
import * as cuadrosService from '../services/cuadros.service';
import * as alumnosService from '../services/alumnos.service';
import * as ocrService from '../services/ocr.service';

export async function index(req: Request, res: Response): Promise<void> {
  const [totalCuadros, totalAlumnos, ocrEstados, ultimosCuadros] = await Promise.all([
    cuadrosService.contar(),
    alumnosService.contar(),
    ocrService.conteoEstados(),
    cuadrosService.listar(5, 0),
  ]);

  res.render('dashboard/index', {
    titulo: 'Panel principal',
    totalCuadros,
    totalAlumnos,
    ocrEstados,
    ultimosCuadros,
  });
}
