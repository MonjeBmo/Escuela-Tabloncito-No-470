import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';

import bcrypt from 'bcryptjs';
import { pool } from './shared/db';
import authRoutes    from './routes/auth.routes';
import cuadrosRoutes from './routes/cuadros.routes';
import alumnosRoutes from './routes/alumnos.routes';
import ocrRoutes     from './routes/ocr.routes';
import adminRoutes   from './routes/admin.routes';
import { requireAuth } from './shared/auth.middleware';
import * as dashCtrl from './controllers/dashboard.controller';
import { ensureBucket } from './shared/minio';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000');

// ─── Motor de vistas ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(fileUpload({ limits: { fileSize: 20 * 1024 * 1024 }, abortOnLimit: true }));

app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true },
}));

// ─── Variables globales para todas las vistas ─────────────────────────────────
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario ?? null;
  res.locals.flash   = req.session.flash ?? null;
  if (req.session.flash) delete req.session.flash;

  // Helper can('permission.codigo') — disponible en todas las vistas EJS
  const permisos: string[] = req.session.usuario?.permisos ?? [];
  res.locals.can = (perm: string) => permisos.includes(perm);

  next();
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/dashboard'));

app.use('/auth',      authRoutes);
app.get('/dashboard', requireAuth, dashCtrl.index);
app.use('/cuadros',   cuadrosRoutes);
app.use('/alumnos',   alumnosRoutes);
app.use('/ocr',       ocrRoutes);
app.use('/admin',     adminRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).render('error', { titulo: 'Página no encontrada', mensaje: 'La página que busca no existe.' });
});

// ─── Seed inicial ─────────────────────────────────────────────────────────────
async function seedAdmin(): Promise<void> {
  // Buscar role_id del director
  const { rows: roleRows } = await pool.query(`SELECT id FROM roles WHERE nombre = 'director'`);
  if (roleRows.length === 0) {
    console.warn('[Seed] Rol director no encontrado — ¿se ejecutó init.sql?');
    return;
  }
  const directorRoleId = roleRows[0].id;

  const { rows } = await pool.query('SELECT id FROM usuarios WHERE username = $1', ['admin']);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('Admin1234!', 12);
    await pool.query(
      `INSERT INTO usuarios (nombre, username, password, role_id) VALUES ($1,$2,$3,$4)`,
      ['Administrador', 'admin', hash, directorRoleId]
    );
    console.log('[Seed] Usuario admin creado. Contraseña inicial: Admin1234!');
    console.log('[Seed] IMPORTANTE: Cambie la contraseña desde Mi Perfil en el primer inicio.');
  }
}

async function main() {
  try {
    await ensureBucket();
  } catch (err) {
    console.warn('[MinIO] No se pudo verificar bucket:', (err as Error).message);
  }

  try {
    await seedAdmin();
  } catch (err) {
    console.warn('[Seed] No se pudo crear usuario admin:', (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`[App] Escuela El Tabloncito No. 470 — http://localhost:${PORT}`);
  });
}

main();
