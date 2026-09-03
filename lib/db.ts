import { hashPassword } from "./password";
import { sql, hasDb } from "./sql";
import { SINCO_CRONOGRAMAS } from "./sinco-seed";

// La conexion vive en lib/sql.ts para que el middleware (Edge Runtime) pueda
// usarla sin arrastrar este archivo, que importa `crypto` de Node. Se
// re-exporta aqui para no tocar los ~15 archivos que ya importan de "@/lib/db".
export { sql, hasDb };

let schemaPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) return Promise.reject(new Error("NO_DB"));
  if (!schemaPromise) schemaPromise = init(sql);
  return schemaPromise;
}

async function init(q: NonNullable<typeof sql>) {
  await q`CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT, color TEXT
  )`;
  await q`CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    company_id INT REFERENCES companies(id),
    category TEXT,
    priority TEXT,
    status TEXT NOT NULL DEFAULT 'resuelto',
    requester TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution_minutes INT
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiatives (
    id SERIAL PRIMARY KEY, company_id INT REFERENCES companies(id),
    title TEXT NOT NULL, area TEXT, status TEXT NOT NULL DEFAULT 'planificado', owner TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  // Fases de un cronograma. Es el nivel intermedio entre la iniciativa y sus
  // tareas: cada fase tiene su propio rango de fechas y su propio avance.
  // `stage` guarda la etapa macro de origen (PREPARAR / HABILITAR / ...) para
  // poder agrupar sin perder el contexto del cronograma original.
  await q`CREATE TABLE IF NOT EXISTS initiative_phases (
    id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL, stage TEXT, context TEXT,
    start_date DATE, end_date DATE,
    position INT NOT NULL DEFAULT 0
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiative_tasks (
    id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT false, position INT NOT NULL DEFAULT 0
  )`;
  // phase_id nullable a proposito: las iniciativas que no usan fases (las de
  // Droppett/Shazam/Gilligan) siguen funcionando igual que antes, con sus
  // tareas colgando directo del cronograma.
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS phase_id INT REFERENCES initiative_phases(id) ON DELETE SET NULL`;
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS start_date DATE`;
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS end_date DATE`;
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS owner TEXT`;
  // Sub-grupo del que venia la tarea en el Excel original, cuando la fase la
  // absorbio de un nivel mas profundo. Se muestra como etiqueta pequena en vez
  // de meterlo en el titulo, que ya de por si es largo.
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS context TEXT`;
  await q`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date DATE`;
  await q`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`;
  await q`CREATE TABLE IF NOT EXISTS collaborators (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, company_id INT REFERENCES companies(id),
    email TEXT, phone TEXT
  )`;
  await q`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sla_hours INT DEFAULT 24
  )`;
  await q`CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
    author TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS canned_responses (
    id SERIAL PRIMARY KEY,
    title TEXT UNIQUE NOT NULL,
    text TEXT NOT NULL
  )`;
  await q`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'agent',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
  )`;
  // Token de un solo uso para restablecer contraseña, por correo o disparado
  // por el admin desde /config. Solo hay una fila viva por usuario a la vez
  // (se borra la anterior antes de crear una nueva) y se borra al usarse.
  await q`CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
  )`;
  // Empresas visibles para cada usuario. Solo aplica al rol 'agent': el admin
  // siempre ve las cuatro. Sin filas para un agente = no ve ninguna ruta.
  await q`CREATE TABLE IF NOT EXISTS user_companies (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, company_id)
  )`;

  // Migracion para BD existente (tickets antiguos con columnas NOT NULL)
  // Fecha en que la tarea se hizo DE VERDAD, frente a end_date, que es la fecha
  // en que se coordino. Tener las dos es lo que permite medir el atraso real:
  // sin done_at solo se sabe que algo esta hecho, no si llego tarde.
  //
  // Se rellena sola al marcar la tarea (ver toggleTask) y se puede corregir a
  // mano, porque marcar en el sistema y hacer el trabajo no siempre pasan el
  // mismo dia.
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS done_at DATE`;
  // Las tareas que ya estaban marcadas antes de existir esta columna no tienen
  // fecha real y no se la puede inventar: quedan en NULL y se muestran como
  // "sin fecha" en vez de mentir con la fecha de hoy o con la coordinada.

  // Usuario del sistema asignado. Va aqui abajo, separado del resto de
  // columnas de initiative_*, porque apunta a users(id) y esa tabla se crea
  // despues: una FK no puede referenciar una tabla que todavia no existe.
  // Es distinto de `owner`, que es texto libre y viene del Excel del proveedor
  // ("SINCOSOFT", "MESSINA"): eso dice que empresa responde, esto dice que
  // persona de aqui lo tiene asignado.
  // ON DELETE SET NULL: borrar una cuenta no puede borrar trabajo.
  await q`ALTER TABLE initiative_tasks ADD COLUMN IF NOT EXISTS assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL`;
  await q`ALTER TABLE initiative_phases ADD COLUMN IF NOT EXISTS assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL`;
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category TEXT`;
  await q`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 24`;
  await q`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS due_date DATE`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS email TEXT`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS phone TEXT`;
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_minutes INT`;
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id)`;
  // Permisos por cuenta. Por defecto en true/aprobado para no cambiarle nada a
  // las cuentas que ya existen; el auto-registro los pone explicitamente en
  // false (ver registerUser en app/actions.ts).
  await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit_schedule BOOLEAN NOT NULL DEFAULT true`;
  await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_tickets BOOLEAN NOT NULL DEFAULT true`;
  await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true`;
  try { await q`ALTER TABLE tickets ALTER COLUMN priority DROP NOT NULL`; } catch (e) {}

  // Limpieza de columnas y tabla del modelo de priorizacion P1-P4, ya sin uso (2026-08-25).
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS urgency`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS impact`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS weight`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS score`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS service_id`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS assignee`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS sla_hours`;
  await q`DROP TABLE IF EXISTS services`;

  // Formula unica de SLA (antes triplicada: aqui, en getSupportDashboard y en
  // getAlertCounts). Cambiar los multiplicadores aqui Y en PRIORITY_SLA_MULT
  // (lib/priority.ts), que es la version usada para pintar cada ticket en el cliente.
  await q`
    CREATE OR REPLACE FUNCTION ticket_sla_deadline(p_created_at TIMESTAMPTZ, p_sla_hours INT, p_priority TEXT)
    RETURNS TIMESTAMPTZ AS $$
      SELECT p_created_at + (
        COALESCE(p_sla_hours, 24) * (CASE p_priority WHEN 'Alta' THEN 0.5 WHEN 'Baja' THEN 1.5 ELSE 1 END)
      ) * INTERVAL '1 hour'
    $$ LANGUAGE sql IMMUTABLE`;

  const c = await q`SELECT COUNT(*)::int AS n FROM companies`;
  if (c[0].n === 0) await seedCompanies(q);

  const i = await q`SELECT COUNT(*)::int AS n FROM initiatives`;
  if (i[0].n === 0) await seedInitiatives(q);

  const cc = await q`SELECT COUNT(*)::int AS n FROM collaborators`;
  if (cc[0].n === 0) await seedCollaborators(q);

  const cat = await q`SELECT COUNT(*)::int AS n FROM categories`;
  if (cat[0].n === 0) await seedCategories(q);

  const cr = await q`SELECT COUNT(*)::int AS n FROM canned_responses`;
  if (cr[0].n === 0) await seedCanned(q);

  const us = await q`SELECT COUNT(*)::int AS n FROM users`;
  if (us[0].n === 0) await seedAdmin(q);

  // SLA por defecto por categoria (una sola vez; luego editable en Configuracion).
  const slaVer = await q`SELECT v FROM meta WHERE k = 'category_sla_v1'`;
  if (slaVer.length === 0) {
    const defaults: [string, number][] = [
      ["Impresora", 8],
      ["Carpetas Compartidas", 8],
      ["Correo Electronico", 8],
      ["Hardware / Laptop", 24],
      ["Office / Apps", 24],
      ["Requerimiento de Compras", 72],
      ["Suministros / Cables", 24],
      ["Flota (Tablets)", 24],
      ["Red / Conectividad", 8],
      ["Camaras / CCTV", 24],
      ["Accesos / Permisos", 8],
      ["Otros", 24],
    ];
    for (const [name, h] of defaults) {
      await q`UPDATE categories SET sla_hours = ${h} WHERE name = ${name}`;
    }
    await q`INSERT INTO meta (k, v) VALUES ('category_sla_v1', '1') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }

  // Importa el cronograma real de SINCO ERP (CMG) desde lib/sinco-seed.ts, una
  // sola vez. Si el usuario luego borra o edita esos cronogramas, no se vuelven
  // a crear: la clave en `meta` ya quedo puesta.
  const sinco = await q`SELECT v FROM meta WHERE k = 'sinco_seed'`;
  const sincoVer = sinco[0]?.v;
  if (sincoVer !== "v2") {
    await reimportarSinco(q, sincoVer);
    await q`INSERT INTO meta (k, v) VALUES ('sinco_seed', 'v2') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }

  // Fechas tentativas para las fases que el Excel dejo en "Por Definir".
  // Va aparte del seed y solo con UPDATE, no borra nada: asi se puede aplicar
  // aunque Eddy ya haya marcado avance.
  const fechas = await q`SELECT v FROM meta WHERE k = 'sinco_fechas'`;
  if (fechas[0]?.v !== "v2") {
    await fecharFasesPendientes(q);
    await q`INSERT INTO meta (k, v) VALUES ('sinco_fechas', 'v2') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }

  // Las columnas initiatives.start_date/due_date pasan a significar "rango que
  // una persona declaro a mano", y mandan sobre el que se calcula de las fases.
  // Hasta ahora no significaban eso: las escribio el import de SINCO y despues
  // nadie las mantuvo, asi que arrastran los valores de aquel dia.
  //
  // Se limpian una sola vez (autorizado por Eddy) para no convertir ese arrastre
  // en la autoridad — mostraria rangos viejos en cronogramas que nadie toco.
  // Tras esto cada etapa arranca con su rango calculado, que es el correcto, y
  // quien quiera declarar una ventana distinta la fija con el lapiz.
  const rangos = await q`SELECT v FROM meta WHERE k = 'rango_manual'`;
  if (rangos[0]?.v !== "v1") {
    await q`UPDATE initiatives SET start_date = NULL, due_date = NULL`;
    await q`INSERT INTO meta (k, v) VALUES ('rango_manual', 'v1') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }

  // Reemplaza los tickets de ejemplo por los tickets reales del CSV (una sola vez).
  const ver = await q`SELECT v FROM meta WHERE k = 'tickets_seed'`;
  if (ver.length === 0 || ver[0].v !== "csv-v1") {
    await q`DELETE FROM tickets`;
    await seedRealTickets(q);
    await q`INSERT INTO meta (k, v) VALUES ('tickets_seed', 'csv-v1') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }
}

async function seedCompanies(q: NonNullable<typeof sql>) {
  const companies: [string, string, string][] = [
    ["Droppett", "droppett", "#5A6BE0"],
    ["Gilligan", "gilligan", "#2AB6A4"],
    ["CMG", "cmg", "#E0A94A"],
    ["Shazam", "shazam", "#E0698A"],
  ];
  for (const [name, slug, color] of companies) {
    await q`INSERT INTO companies (name, slug, color) VALUES (${name}, ${slug}, ${color}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedCategories(q: NonNullable<typeof sql>) {
  const cats = [
    "Impresora",
    "Carpetas Compartidas",
    "Correo Electronico",
    "Hardware / Laptop",
    "Office / Apps",
    "Requerimiento de Compras",
    "Suministros / Cables",
    "Flota (Tablets)",
    "Red / Conectividad",
    "Camaras / CCTV",
    "Accesos / Permisos",
    "Otros",
  ];
  for (const name of cats) {
    await q`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedCanned(q: NonNullable<typeof sql>) {
  const list: [string, string][] = [
    ["Impresora sin papel/tinta", "Se verifico la impresora y se repuso el insumo (papel/tinta). Quedo operativa."],
    ["Reinicio de equipo", "Se realizo reinicio del equipo para liberar recursos y aplicar actualizaciones pendientes. Por favor confirmar si el problema persiste."],
    ["Carpeta compartida - reconectar", "Se verifico la sincronizacion de la carpeta compartida. Se recomienda cerrar sesion en la app de Drive/OneDrive y volver a iniciar sesion."],
    ["Acceso otorgado", "Se otorgo el acceso solicitado. Por favor validar que ya pueda ingresar correctamente."],
    ["Requerimiento enviado a compras", "Se genero la solicitud de compra correspondiente y se envio al area encargada para cotizacion."],
    ["Pendiente de repuesto/proveedor", "El caso esta en espera de repuesto o respuesta del proveedor. Se dara seguimiento y se notificara cualquier actualizacion."],
  ];
  for (const [title, text] of list) {
    await q`INSERT INTO canned_responses (title, text) VALUES (${title}, ${text}) ON CONFLICT (title) DO NOTHING`;
  }
}

async function seedRealTickets(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id;
  if (!cId("CMG")) return;

  // [titulo, empresa, categoria, prioridad, creado, cerrado]
  const rows: [string, string, string, string, string, string][] = [
    ["Ayuda configuracion de Google Chat", "Shazam", "Flota (Tablets)", "Baja", "2026-05-25 10:26", "2026-06-01 10:07"],
    ["Asistencia con AI", "Shazam", "Otros", "Baja", "2026-05-26 12:48", "2026-05-26 12:48"],
    ["Registrar en Control de Asistencia", "CMG", "Otros", "Baja", "2026-05-26 15:14", "2026-05-26 15:14"],
    ["Actualizacion de correo del ing Luis Lara CMG", "CMG", "Correo Electronico", "Baja", "2026-05-28 11:28", "2026-05-28 14:33"],
    ["Crear correo y carpeta compartida", "CMG", "Correo Electronico", "Media", "2026-05-25 16:30", "2026-05-25 16:32"],
    ["Control de TV", "CMG", "Otros", "Baja", "2026-05-26 10:03", "2026-06-25 10:36"],
    ["Papel para la impresora", "CMG", "Impresora", "Baja", "2026-05-27 15:38", "2026-05-27 15:40"],
    ["Asistencia con cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-05-29 11:52", "2026-05-29 11:52"],
    ["Mouse ergonomico", "CMG", "Requerimiento de Compras", "Baja", "2026-05-26 14:53", "2026-05-27 15:41"],
    ["Ayuda con desencriptar correo", "Droppett", "Otros", "Alta", "2026-05-27 15:39", "2026-05-27 15:41"],
    ["Gestionar 3 Tablet Dials 10", "Shazam", "Requerimiento de Compras", "Baja", "2026-05-27 16:38", "2026-05-28 14:29"],
    ["Configurar carpeta compartida", "CMG", "Otros", "Alta", "2026-05-28 16:07", "2026-05-28 16:16"],
    ["Quiere acceso a camaras del proyecto", "CMG", "Otros", "Baja", "2026-05-29 14:18", "2026-06-17 16:35"],
    ["Audio de la laptop", "Shazam", "Hardware / Laptop", "Baja", "2026-05-28 11:23", "2026-06-01 14:27"],
    ["Cotizar laptop e impresora con scanner", "Droppett", "Requerimiento de Compras", "Baja", "2026-05-28 14:38", "2026-06-05 10:33"],
    ["Cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-06-01 10:10", "2026-06-01 14:27"],
    ["Cotizar equipo nuevo", "CMG", "Requerimiento de Compras", "Baja", "2026-06-03 14:01", "2026-06-08 09:40"],
    ["Ayuda con Excel", "CMG", "Office / Apps", "Baja", "2026-06-08 14:19", "2026-06-08 14:19"],
    ["Cable HDMI", "Shazam", "Otros", "Baja", "2026-06-05 11:16", "2026-06-05 11:16"],
    ["Cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-06-08 09:36", "2026-06-08 09:36"],
    ["Facturas Gilligan Google y Deliverect", "Gilligan", "Otros", "Baja", "2026-06-09 09:26", "2026-06-09 09:26"],
    ["Pantalla en negro", "CMG", "Hardware / Laptop", "Baja", "2026-06-09 11:46", "2026-06-09 11:46"],
    ["No puedo utilizar scanner", "Gilligan", "Impresora", "Alta", "2026-06-10 09:52", "2026-06-10 09:52"],
    ["Compra de 3 cable HDMI", "Shazam", "Requerimiento de Compras", "Baja", "2026-06-10 10:14", "2026-06-10 10:15"],
    ["Impresora no funciona", "CMG", "Impresora", "Media", "2026-06-10 16:57", "2026-06-10 16:57"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-06-11 09:06", "2026-06-12 14:55"],
    ["Acceso camaras de Azua", "CMG", "Otros", "Media", "2026-06-12 14:54", "2026-06-12 14:55"],
    ["Gestion de doc del correo y carpeta compartida", "CMG", "Correo Electronico", "Baja", "2026-06-12 14:57", "2026-06-12 14:57"],
    ["Inconvenientes con Excel", "CMG", "Office / Apps", "Baja", "2026-06-12 14:56", "2026-06-12 14:56"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-06-15 09:15", "2026-06-15 09:15"],
    ["Ayuda con Teams", "Shazam", "Office / Apps", "Baja", "2026-06-15 15:35", "2026-06-16 17:26"],
    ["Configurar tablets del equipo ventas Shazam", "Shazam", "Flota (Tablets)", "Baja", "2026-06-16 14:31", "2026-06-16 17:26"],
    ["Asistencia con reunion Teams", "CMG", "Office / Apps", "Baja", "2026-06-16 17:27", "2026-06-16 17:27"],
    ["Asistencia con reunion Teams", "CMG", "Otros", "Alta", "2026-06-16 17:26", "2026-06-16 17:26"],
    ["Cambio de tinta Plotter T250", "CMG", "Impresora", "Alta", "2026-06-18 16:25", "2026-06-18 16:25"],
    ["Apps en tablet", "Shazam", "Office / Apps", "Baja", "2026-06-23 09:25", "2026-06-23 15:44"],
    ["Asistencia con AI", "CMG", "Otros", "Baja", "2026-06-23 09:32", "2026-06-23 14:50"],
    ["No funciona la impresora", "CMG", "Impresora", "Baja", "2026-06-23 12:07", "2026-06-23 12:07"],
    ["Cotizacion camaras Guerra", "CMG", "Requerimiento de Compras", "Baja", "2026-06-24 10:07", "2026-06-29 10:52"],
    ["Registro de impresora y escaner", "CMG", "Impresora", "Baja", "2026-06-24 12:47", "2026-06-24 12:50"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Baja", "2026-06-24 16:32", "2026-06-24 16:32"],
    ["Compra e instalacion de camara oficina Fernando", "CMG", "Requerimiento de Compras", "Media", "2026-06-25 10:31", "2026-06-25 10:34"],
    ["Camaras centro de distribucion de Plaza Lama", "CMG", "Requerimiento de Compras", "Baja", "2026-06-25 10:33", "2026-06-25 10:34"],
    ["WiFi no funciona", "CMG", "Hardware / Laptop", "Media", "2026-06-29 10:51", "2026-06-29 10:51"],
    ["Configuracion Plotter", "CMG", "Impresora", "Baja", "2026-06-30 11:06", "2026-06-30 11:06"],
    ["Configuracion Plotter", "CMG", "Impresora", "Baja", "2026-06-30 11:07", "2026-06-30 11:07"],
    ["No tengo conexion de internet", "CMG", "Red / Conectividad", "Media", "2026-07-01 10:15", "2026-07-02 10:22"],
    ["No funciona Excel", "Shazam", "Office / Apps", "Baja", "2026-07-07 11:34", "2026-07-07 11:34"],
    ["Asistencia con flota (tablet) a vendedores", "Shazam", "Flota (Tablets)", "Baja", "2026-07-03 15:38", "2026-07-03 15:38"],
    ["No funciona la impresora", "CMG", "Impresora", "Baja", "2026-07-03 16:58", "2026-07-03 16:58"],
    ["Configuracion de pass WiFi", "CMG", "Red / Conectividad", "Baja", "2026-07-06 11:07", "2026-07-06 11:07"],
    ["Impresora con inconvenientes", "Gilligan", "Hardware / Laptop", "Baja", "2026-07-07 10:13", "2026-07-07 16:27"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Baja", "2026-07-06 11:36", "2026-07-06 11:42"],
    ["Configuracion de impresora", "Gilligan", "Impresora", "Baja", "2026-07-06 14:15", "2026-07-06 15:15"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Media", "2026-07-07 10:23", "2026-07-07 10:23"],
    ["Problemas con el Office", "Shazam", "Office / Apps", "Media", "2026-07-07 16:16", "2026-07-07 16:16"],
    ["Problemas con la impresora", "Shazam", "Impresora", "Baja", "2026-07-07 16:15", "2026-07-07 16:16"],
    ["Configuracion de impresora nueva", "Gilligan", "Impresora", "Baja", "2026-07-08 09:12", "2026-07-08 15:02"],
    ["No puedo acceder a la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-07-09 10:08", "2026-07-09 16:22"],
    ["No puede acceder a carpeta compartida", "CMG", "Carpetas Compartidas", "Baja", "2026-07-09 16:22", "2026-07-09 16:23"],
    ["Impresora sin hoja", "CMG", "Impresora", "Media", "2026-07-09 16:23", "2026-07-09 16:23"],
    ["Problemas con el equipo", "Shazam", "Hardware / Laptop", "Alta", "2026-07-10 11:12", "2026-07-10 11:12"],
    ["Problemas de impresora", "CMG", "Impresora", "Baja", "2026-07-13 16:14", "2026-07-13 16:15"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Baja", "2026-07-15 15:26", "2026-07-15 15:26"],
    ["Configuracion de equipo nuevo", "CMG", "Hardware / Laptop", "Baja", "2026-07-15 15:27", "2026-07-15 15:28"],
    ["Crear correo para nuevo ing", "CMG", "Correo Electronico", "Media", "2026-07-15 15:27", "2026-07-15 15:28"],
    ["Configurar nueva carpeta compartida", "Droppett", "Carpetas Compartidas", "Media", "2026-07-15 15:28", "2026-07-15 15:28"],
    ["Problemas de Office", "CMG", "Office / Apps", "Baja", "2026-07-16 14:32", "2026-07-16 14:33"],
  ];

  for (const [title, company, category, priority, created, closed] of rows) {
    await q`INSERT INTO tickets (title, description, company_id, category, priority, status, created_at, updated_at, resolved_at)
      VALUES (${title}, ${""}, ${cId(company)}, ${category}, ${priority}, 'resuelto', ${created}, ${closed}, ${closed})`;
  }
}

/**
 * Importa los cronogramas de SINCO ERP (CMG) desde lib/sinco-seed.ts.
 *
 * La v1 agrupaba las fases por "el nodo mas profundo del Excel", lo que partia
 * secciones que van juntas (p.ej. "Parametrizacion Ambiente de Produccion"
 * quedaba rota en tres fases sueltas) y resultaba incomprensible. La v2 usa los
 * hijos directos del contenedor, que es la seccion tal cual la escribio el
 * proveedor. Ver HANDOFF.md §5.12.
 *
 * Al pasar de v1 a v2 hay que reemplazar lo ya importado, pero **solo si nadie
 * ha marcado nada todavia**: si Eddy ya registro avance real, borrarlo para
 * reorganizar seria destruir trabajo suyo. En ese caso no se toca nada y se
 * queda la estructura vieja.
 *
 * Ninguna tarea se importa marcada como completada: el Excel solo trae fechas,
 * no lleva columna de avance, y dar por hecho lo que ya paso seria inventarse un
 * progreso que no consta en ningun lado.
 */
async function reimportarSinco(q: NonNullable<typeof sql>, versionPrevia: string | undefined) {
  const cs = await q`SELECT id, name FROM companies WHERE name = 'CMG'`;
  const cmg = cs[0]?.id;
  if (!cmg) return;

  if (versionPrevia) {
    const marcadas = await q`
      SELECT COUNT(*)::int AS n FROM initiative_tasks t
      JOIN initiatives i ON i.id = t.initiative_id
      WHERE i.company_id = ${cmg} AND i.title LIKE 'SINCO%' AND t.done = true`;
    if (marcadas[0].n > 0) {
      console.warn(
        "[sinco] Hay avance marcado en los cronogramas de SINCO: se conserva la " +
        "estructura anterior y NO se reimporta. Reorganizalos a mano o borralos " +
        "desde /cronogramas si quieres la estructura nueva."
      );
      return;
    }
    await q`DELETE FROM initiatives WHERE company_id = ${cmg} AND title LIKE 'SINCO%'`;
  }

  for (const c of SINCO_CRONOGRAMAS) {
    // Guarda contra duplicados si dos instancias corrieran esto a la vez.
    const dup = await q`SELECT id FROM initiatives WHERE company_id = ${cmg} AND title = ${c.titulo}`;
    if (dup.length > 0) continue;

    // Sin start_date/due_date a proposito: esas columnas son ahora el rango que
    // una persona declara a mano, y un import no declara nada. El rango de cada
    // cronograma sale de las fechas de sus fases, que si se importan abajo.
    const ini = await q`INSERT INTO initiatives (company_id, title, area, status, owner)
      VALUES (${cmg}, ${c.titulo}, 'SINCO ERP', 'en_curso', 'SINCOSOFT - MESSINA')
      RETURNING id`;
    const iniId = ini[0].id;

    let posFase = 0;
    let posTarea = 0;
    for (const f of c.fases) {
      const ph = await q`INSERT INTO initiative_phases (initiative_id, title, stage, context, start_date, end_date, position)
        VALUES (${iniId}, ${f.titulo}, ${c.etapa}, ${f.contexto || null}, ${f.inicio}, ${f.fin}, ${posFase})
        RETURNING id`;
      const faseId = ph[0].id;
      posFase++;

      for (const t of f.tareas) {
        await q`INSERT INTO initiative_tasks (initiative_id, phase_id, title, done, position, start_date, end_date, owner, context)
          VALUES (${iniId}, ${faseId}, ${t.t}, false, ${posTarea}, ${t.ini}, ${t.fin}, ${t.resp || null}, ${t.ctx || null})`;
        posTarea++;
      }
    }
  }
}

/**
 * Pone fecha tentativa a las fases que el Excel dejo en "Por Definir".
 *
 * No son inventadas: el propio Excel dice de que dependen en su columna de
 * observaciones ("Se programa una vez se finalice la migracion de historicos",
 * "...despues de la salida a produccion", etc.). De ahi salen estas fechas,
 * encajadas ademas dentro del limite de la etapa HABILITAR (8-feb-2027) y
 * evitando el periodo navideno.
 *
 * Quedan marcadas con `context` para que en pantalla se vea que son estimadas y
 * no fechas confirmadas por el proveedor. Cuando SINCOSOFT confirme las reales,
 * se editan desde /cronogramas.
 */
async function fecharFasesPendientes(q: NonNullable<typeof sql>) {
  const NOTA = "fecha estimada — el Excel dice «Por Definir»";

  const cs = await q`SELECT id FROM companies WHERE name = 'CMG'`;
  const cmg = cs[0]?.id;
  if (!cmg) return;

  // Se busca por el NOMBRE DE LA FASE, no por el del cronograma: el usuario
  // renombra los cronogramas ("SINCO 1 · Preparar" -> "ETAPA 1 - SINCO ·
  // Preparar") y la version anterior de esta funcion comparaba `i.title` con un
  // titulo fijo, asi que no encontraba nada y no hacia absolutamente nada, en
  // silencio. El filtro `p.start_date IS NULL` evita pisar fechas ya puestas —
  // importante porque "Migración de Activos Fijos a Producción" tambien existe,
  // ya con fecha, en las tres BD secundarias.
  const est: [string, string, string, string][] = [
    ["Migración de Activos Fijos a Producción",
     "2027-01-05", "2027-01-12", "tras Activos Fijos en Pruebas (fin 24-dic)"],
    ["Capacitaciones Segundo Nivel",
     "2027-01-07", "2027-01-29", "tras Migración de Históricos (10-dic) y Activos Fijos en Pruebas (24-dic)"],
    ["Consultoría Final A&F",
     "2027-02-03", "2027-02-04", "cierre del módulo, antes del fin de HABILITAR (8-feb)"],
    ["Capacitaciones y Acompañamientos Segundo Nivel ADPRO",
     "2026-11-25", "2026-12-18", "tras la Salida a Producción de ADPRO (19-nov)"],
    ["Consultoría Final ADPRO",
     "2027-01-21", "2027-01-22", "cierre del módulo ADPRO"],
  ];

  for (const [fase, ini, fin, porque] of est) {
    await q`
      UPDATE initiative_phases p
      SET start_date = ${ini}, end_date = ${fin}, context = ${NOTA + " · " + porque}
      FROM initiatives i
      WHERE p.initiative_id = i.id
        AND i.company_id = ${cmg} AND i.area = 'SINCO ERP'
        AND p.title = ${fase} AND p.start_date IS NULL`;
  }

  // No se tocan initiatives.start_date/due_date: el rango que se muestra sale
  // de las fases en cada lectura (calcStart/calcEnd en lib/data.ts), y esas dos
  // columnas quedan solo para el rango que alguien fije a mano con el lapiz.
  // Escribirlas aqui volveria a llenarlas de valores que nadie mantiene, que es
  // justo el problema que limpio la migracion 'rango_manual'.
}

async function seedAdmin(q: NonNullable<typeof sql>) {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const hash = hashPassword(password);
  await q`INSERT INTO users (name, email, password_hash, role) VALUES (${name}, ${email}, ${hash}, 'admin') ON CONFLICT (email) DO NOTHING`;
}

async function seedCollaborators(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id ?? null;
  const list: [string, string | null][] = [
    ["Fernando Silva", "CMG"],
    ["Carlos Martinez", "CMG"],
    ["Glenda", "CMG"],
    ["Luis Lara", "CMG"],
    ["Nikaury Reyes", "CMG"],
    ["Marcos Mora", "Shazam"],
    ["Misael Collado", "Shazam"],
    ["Contabilidad Gilligan", "Gilligan"],
  ];
  for (const [name, co] of list) {
    await q`INSERT INTO collaborators (name, company_id) VALUES (${name}, ${co ? cId(co) : null}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedInitiatives(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id;
  if (!cId("Droppett")) return;

  type Task = [string, boolean];
  type Init = { company: string; title: string; area: string; status: string; owner: string; tasks: Task[] };

  const inits: Init[] = [
    { company: "Droppett", title: "Aseguramiento perimetral FortiGate", area: "Fortinet", status: "en_curso", owner: "Eddy V.", tasks: [["Inventario de FortiGate y firmware; confirmar FortiCare", true], ["Revisar politicas y perfiles (AV, IPS, Web Filter)", true], ["Evaluar SD-WAN: rutas, SLA de enlaces y failover", false], ["Auditar accesos admin, MFA y logging a FortiAnalyzer", false], ["Plan de actualizacion de firmware por ventana controlada", false]] },
    { company: "Droppett", title: "Hardening Check Point", area: "Check Point", status: "planificado", owner: "", tasks: [["Inventario de gateways y version de Gaia", false], ["Auditar rulebase: reglas any-any y shadowing", false], ["Verificar blades IPS/AV/Anti-Bot y firmas", false], ["Revisar VPN site-to-site", false], ["Definir baseline de respaldo de politica", false]] },
    { company: "Droppett", title: "Estandarizacion de red (Cisco)", area: "Cisco", status: "en_curso", owner: "Eddy V.", tasks: [["Levantar topologia por sitio (switches, routers, APs)", true], ["Normalizar VLANs y direccionamiento", false], ["Auditar respaldos de config y versiones IOS", false], ["Estandarizar acceso de gestion (SSH, AAA, syslog)", false]] },
    { company: "Shazam", title: "VPN y Threat Prevention (Check Point)", area: "Check Point", status: "en_curso", owner: "Eddy V.", tasks: [["Inventario de gateways y estado de blades", true], ["Revisar tuneles VPN con proveedores", true], ["Verificar IPS / Threat Prevention y firmas", false], ["Respaldo de configuracion y ventana de cambios", false]] },
    { company: "CMG", title: "Gobierno de SINCO ERP", area: "SINCO ERP", status: "planificado", owner: "", tasks: [["Relevar modulos en uso y quien los opera", false], ["Mapear roles y permisos (segregacion de funciones)", false], ["Documentar calendario de cierres y reportes clave", false], ["Revisar integraciones (bancos, factura) y respaldos DB", false], ["Backlog de mejoras y capacitacion", false]] },
    { company: "Gilligan", title: "Integracion Deliverect", area: "Deliverect", status: "en_curso", owner: "Eddy V.", tasks: [["Mapear canales (Uber Eats, Rappi, PedidosYa) y POS", true], ["Revisar sincronizacion de menus (precios, disponibilidad)", true], ["Diagnosticar ordenes perdidas o duplicadas", false], ["Configurar alertas de caida de canal", false], ["Documentar alta de nueva sucursal o canal", false]] },
    { company: "Gilligan", title: "Red y conectividad de sucursales (Cisco)", area: "Cisco", status: "planificado", owner: "", tasks: [["Inventario de equipos por sucursal", false], ["Estandarizar VLANs y Wi-Fi", false], ["Respaldo centralizado de configuraciones", false]] },
  ];

  for (const it of inits) {
    const r = await q`INSERT INTO initiatives (company_id, title, area, status, owner) VALUES (${cId(it.company)}, ${it.title}, ${it.area}, ${it.status}, ${it.owner}) RETURNING id`;
    const initId = r[0].id;
    let pos = 0;
    for (const [title, done] of it.tasks) {
      await q`INSERT INTO initiative_tasks (initiative_id, title, done, position) VALUES (${initId}, ${title}, ${done}, ${pos})`;
      pos++;
    }
  }
}
