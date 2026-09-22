import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repository';
import * as rolesRepo from '../repositories/roles.repository';
import * as gradesRepo from '../repositories/grades.repository';
import * as coursesRepo from '../repositories/courses.repository';
import * as teachersRepo from '../repositories/teachers.repository';

// ── Usuarios ────────────────────────────────────────────────

export async function showUsuarios(req: Request, res: Response): Promise<void> {
  const [usuarios, roles] = await Promise.all([userRepo.listAll(), rolesRepo.findAll()]);
  res.render('admin/usuarios', { titulo: 'Gestión de usuarios', usuarios, roles });
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
  const [grades, sections] = await Promise.all([
    gradesRepo.findAllGrades(),
    gradesRepo.findAllSections(),
  ]);
  res.render('admin/grados', { titulo: 'Grados y secciones', grades, sections });
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

export async function toggleSeccion(req: Request, res: Response): Promise<void> {
  await gradesRepo.toggleSection(parseInt(req.params.id));
  res.redirect('/admin/grados');
}

// ── Cursos ──────────────────────────────────────────────────

export async function showCursos(req: Request, res: Response): Promise<void> {
  const courses = await coursesRepo.findAll();
  res.render('admin/cursos', { titulo: 'Cursos', courses });
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

export async function toggleCurso(req: Request, res: Response): Promise<void> {
  await coursesRepo.toggle(parseInt(req.params.id));
  res.redirect('/admin/cursos');
}

// ── Maestros ────────────────────────────────────────────────

export async function showMaestros(req: Request, res: Response): Promise<void> {
  const [teachers, grades, sections, courses] = await Promise.all([
    teachersRepo.findAll(),
    gradesRepo.findAllGrades(true),
    gradesRepo.findAllSections(true),
    coursesRepo.findAll(true),
  ]);
  res.render('admin/maestros', { titulo: 'Maestros', teachers, grades, sections, courses });
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
