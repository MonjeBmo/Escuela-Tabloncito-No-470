import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repository';
import * as rolesRepo from '../repositories/roles.repository';
import * as gradesRepo from '../repositories/grades.repository';
import * as coursesRepo from '../repositories/courses.repository';
import * as teachersRepo from '../repositories/teachers.repository';

const LIMITES_ADMIN = [5, 10];
function getPage(req: Request): { pagina: number; limit: number } {
  const limit = LIMITES_ADMIN.includes(parseInt(String(req.query.limit))) ? parseInt(String(req.query.limit)) : 10;
  const pagina = Math.max(1, parseInt(String(req.query.pagina ?? 1)) || 1);
  return { pagina, limit };
}
function paginar<T>(arr: T[], pagina: number, limit: number) {
  const total = arr.length;
  const totalPaginas = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(pagina, totalPaginas);
  return { items: arr.slice((p - 1) * limit, p * limit), total, totalPaginas, pagina: p };
}

// ── Usuarios ────────────────────────────────────────────────

export async function showUsuarios(req: Request, res: Response): Promise<void> {
  const { pagina, limit } = getPage(req);
  const [all, roles] = await Promise.all([userRepo.listAll(), rolesRepo.findAll()]);
  const { items: usuarios, total, totalPaginas } = paginar(all, pagina, limit);
  res.render('admin/usuarios', { titulo: 'Gestión de usuarios', usuarios, roles, pagina, limit, total, totalPaginas });
}

export async function crearUsuario(req: Request, res: Response): Promise<void> {
  const { nombre, username, password, role_id } = req.body as Record<string, string>;
  try {
    const hash = await bcrypt.hash(password, 12);
    await userRepo.create({ nombre, username, passwordHash: hash, role_id: parseInt(role_id) });
    req.session.flash = { tipo: 'success', mensaje: 'Usuario creado exitosamente.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear el usuario. Verifique que el nombre de usuario no exista.' };
  }
  res.redirect('/admin/usuarios');
}

export async function editarUsuario(req: Request, res: Response): Promise<void> {
  const { nombre, role_id, password } = req.body as Record<string, string>;
  try {
    await userRepo.update(parseInt(req.params.id), {
      nombre: nombre.trim(),
      role_id: parseInt(role_id),
      passwordHash: password?.trim() ? await bcrypt.hash(password.trim(), 12) : undefined,
    });
    req.session.flash = { tipo: 'success', mensaje: 'Usuario actualizado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al actualizar el usuario.' };
  }
  res.redirect('/admin/usuarios');
}

export async function toggleUsuario(req: Request, res: Response): Promise<void> {
  await userRepo.toggleActive(parseInt(req.params.id));
  res.redirect('/admin/usuarios');
}

// ── Roles y permisos ────────────────────────────────────────

export async function showRoles(req: Request, res: Response): Promise<void> {
  const [roles, allPerms] = await Promise.all([
    rolesRepo.findAll(),
    rolesRepo.findAllPermissions(),
  ]);
  res.render('admin/roles', { titulo: 'Roles y permisos', roles, allPerms });
}

export async function showEditRole(req: Request, res: Response): Promise<void> {
  const roleId = parseInt(req.params.id);
  const [role, permisos] = await Promise.all([
    rolesRepo.findById(roleId),
    rolesRepo.findPermissionsForRole(roleId),
  ]);
  if (!role) { res.redirect('/admin/roles'); return; }
  res.render('admin/roles-editar', { titulo: `Editar rol: ${role.nombre}`, role, permisos });
}

export async function saveRolePermissions(req: Request, res: Response): Promise<void> {
  const roleId = parseInt(req.params.id);
  const { perms, scopes } = req.body as { perms?: string | string[]; scopes?: Record<string, string> };
  const permIds = Array.isArray(perms) ? perms : perms ? [perms] : [];
  const scopesMap = scopes ?? {};
  const entries = permIds.map(id => ({
    permission_id: parseInt(id),
    scope: scopesMap[id] ?? 'all',
  }));
  await rolesRepo.updatePermissions(roleId, entries);
  req.session.flash = { tipo: 'success', mensaje: 'Permisos actualizados.' };
  res.redirect('/admin/roles');
}

export async function crearRol(req: Request, res: Response): Promise<void> {
  const { nombre, descripcion } = req.body as Record<string, string>;
  try {
    await rolesRepo.create({ nombre: nombre.trim(), descripcion: descripcion?.trim() ?? '' });
    req.session.flash = { tipo: 'success', mensaje: 'Rol creado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear el rol.' };
  }
  res.redirect('/admin/roles');
}

// ── Grados y secciones ──────────────────────────────────────

export async function showGrados(req: Request, res: Response): Promise<void> {
  const { limit } = getPage(req);
  const pg = Math.max(1, parseInt(String(req.query.pg ?? 1)) || 1);
  const ps = Math.max(1, parseInt(String(req.query.ps ?? 1)) || 1);
  const [allGrades, allSections] = await Promise.all([gradesRepo.findAllGrades(), gradesRepo.findAllSections()]);
  const { items: grades, total: totalGrades, totalPaginas: totalPaginasG, pagina: paginaG } = paginar(allGrades, pg, limit);
  const { items: sections, total: totalSections, totalPaginas: totalPaginasS, pagina: paginaS } = paginar(allSections, ps, limit);
  res.render('admin/grados', { titulo: 'Grados y secciones', grades, sections, limit, paginaG, paginaS, totalGrades, totalSections, totalPaginasG, totalPaginasS });
}

export async function crearGrado(req: Request, res: Response): Promise<void> {
  const { nombre, nombre_corto, sort_order } = req.body as Record<string, string>;
  try {
    await gradesRepo.createGrade({ nombre: nombre.trim(), nombre_corto: nombre_corto?.trim() ?? '', sort_order: parseInt(sort_order) || 0 });
    req.session.flash = { tipo: 'success', mensaje: 'Grado creado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear el grado.' };
  }
  res.redirect('/admin/grados');
}

export async function editarGrado(req: Request, res: Response): Promise<void> {
  const { nombre, nombre_corto, sort_order } = req.body as Record<string, string>;
  try {
    await gradesRepo.updateGrade(parseInt(req.params.id), { nombre: nombre.trim(), nombre_corto: nombre_corto?.trim() ?? '', sort_order: parseInt(sort_order) || 0 });
    req.session.flash = { tipo: 'success', mensaje: 'Grado actualizado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al actualizar el grado.' };
  }
  res.redirect('/admin/grados');
}

export async function toggleGrado(req: Request, res: Response): Promise<void> {
  await gradesRepo.toggleGrade(parseInt(req.params.id));
  res.redirect('/admin/grados');
}

export async function crearSeccion(req: Request, res: Response): Promise<void> {
  const { grade_id, nombre } = req.body as Record<string, string>;
  try {
    const grade = await gradesRepo.findGradeById(parseInt(grade_id));
    const display = grade ? `${grade.nombre} ${nombre.trim()}` : nombre.trim();
    await gradesRepo.createSection({ grade_id: parseInt(grade_id), nombre: nombre.trim(), display_name: display });
    req.session.flash = { tipo: 'success', mensaje: 'Sección creada.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear la sección (¿ya existe?).' };
  }
  res.redirect('/admin/grados');
}

export async function editarSeccion(req: Request, res: Response): Promise<void> {
  const { nombre, display_name } = req.body as Record<string, string>;
  try {
    await gradesRepo.updateSection(parseInt(req.params.id), { nombre: nombre.trim(), display_name: display_name?.trim() ?? nombre.trim() });
    req.session.flash = { tipo: 'success', mensaje: 'Sección actualizada.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al actualizar la sección.' };
  }
  res.redirect('/admin/grados');
}

export async function toggleSeccion(req: Request, res: Response): Promise<void> {
  await gradesRepo.toggleSection(parseInt(req.params.id));
  res.redirect('/admin/grados');
}

// ── Cursos ──────────────────────────────────────────────────

export async function showCursos(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const { pagina, limit } = getPage(req);
  const all = await coursesRepo.findAll();
  const filtered = q ? all.filter(c => c.nombre.toLowerCase().includes(q) || (c.nombre_corto ?? '').toLowerCase().includes(q)) : all;
  const { items: courses, total, totalPaginas } = paginar(filtered, pagina, limit);
  res.render('admin/cursos', { titulo: 'Cursos', courses, q, pagina, limit, total, totalPaginas, allCount: all.length });
}

export async function crearCurso(req: Request, res: Response): Promise<void> {
  const { nombre, nombre_corto, sort_order } = req.body as Record<string, string>;
  try {
    await coursesRepo.create({ nombre: nombre.trim(), nombre_corto: nombre_corto?.trim() ?? '', sort_order: parseInt(sort_order) || 0 });
    req.session.flash = { tipo: 'success', mensaje: 'Curso creado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear el curso.' };
  }
  res.redirect('/admin/cursos');
}

export async function editarCurso(req: Request, res: Response): Promise<void> {
  const { nombre, nombre_corto, sort_order } = req.body as Record<string, string>;
  try {
    await coursesRepo.update(parseInt(req.params.id), { nombre: nombre.trim(), nombre_corto: nombre_corto?.trim() ?? '', sort_order: parseInt(sort_order) || 0 });
    req.session.flash = { tipo: 'success', mensaje: 'Curso actualizado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al actualizar el curso.' };
  }
  res.redirect('/admin/cursos');
}

export async function toggleCurso(req: Request, res: Response): Promise<void> {
  await coursesRepo.toggle(parseInt(req.params.id));
  res.redirect('/admin/cursos');
}

// ── Maestros ────────────────────────────────────────────────

export async function showMaestros(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const { limit } = getPage(req);
  const pt = Math.max(1, parseInt(String(req.query.pt ?? 1)) || 1);
  const pa = Math.max(1, parseInt(String(req.query.pa ?? 1)) || 1);
  const [allTeachers, grades, sections, courses, allAssignments] = await Promise.all([
    teachersRepo.findAll(),
    gradesRepo.findAllGrades(true),
    gradesRepo.findAllSections(true),
    coursesRepo.findAll(true),
    teachersRepo.findAllAssignments(),
  ]);
  const filtered = q
    ? allTeachers.filter(t =>
        t.full_name.toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        (t.phone ?? '').includes(q)
      )
    : allTeachers;
  const { items: teachers, total: totalTeachers, totalPaginas: totalPaginasT, pagina: paginaT } = paginar(filtered, pt, limit);
  const { items: assignments, total: totalAssignments, totalPaginas: totalPaginasA, pagina: paginaA } = paginar(allAssignments, pa, limit);
  res.render('admin/maestros', { titulo: 'Maestros', teachers, grades, sections, courses, assignments, q, limit, paginaT, paginaA, totalTeachers, totalAssignments, totalPaginasT, totalPaginasA });
}

export async function crearMaestro(req: Request, res: Response): Promise<void> {
  const { full_name, email, phone, user_id } = req.body as Record<string, string>;
  try {
    await teachersRepo.create({
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      user_id: user_id ? parseInt(user_id) : null,
    });
    req.session.flash = { tipo: 'success', mensaje: 'Maestro registrado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al registrar el maestro.' };
  }
  res.redirect('/admin/maestros');
}

export async function editarMaestro(req: Request, res: Response): Promise<void> {
  const { full_name, email, phone } = req.body as Record<string, string>;
  try {
    await teachersRepo.update(parseInt(req.params.id), {
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    });
    req.session.flash = { tipo: 'success', mensaje: 'Maestro actualizado.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al actualizar el maestro.' };
  }
  res.redirect('/admin/maestros');
}

export async function toggleMaestro(req: Request, res: Response): Promise<void> {
  await teachersRepo.toggle(parseInt(req.params.id));
  res.redirect('/admin/maestros');
}

export async function crearAsignacion(req: Request, res: Response): Promise<void> {
  const { teacher_id, course_id, grade_id, section_id, school_year } = req.body as Record<string, string>;
  try {
    await teachersRepo.createAssignment({
      teacher_id: parseInt(teacher_id),
      course_id: parseInt(course_id),
      grade_id: parseInt(grade_id),
      section_id: parseInt(section_id),
      school_year: parseInt(school_year),
    });
    req.session.flash = { tipo: 'success', mensaje: 'Asignación creada.' };
  } catch {
    req.session.flash = { tipo: 'danger', mensaje: 'Error al crear la asignación.' };
  }
  res.redirect('/admin/maestros');
}
