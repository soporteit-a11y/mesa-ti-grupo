import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

export const hasDb = Boolean(connectionString);
export const sql = connectionString ? neon(connectionString) : null;

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
    resolved_at TIMESTAMPTZ
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiatives (
    id SERIAL PRIMARY KEY, company_id INT REFERENCES companies(id),
    title TEXT NOT NULL, area TEXT, status TEXT NOT NULL DEFAULT 'planificado', owner TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiative_tasks (
    id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT false, position INT NOT NULL DEFAULT 0
  )`;
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

  // Migracion para BD existente (tickets antiguos con columnas NOT NULL)
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category TEXT`;
  await q`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 24`;
  await q`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS due_date DATE`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS email TEXT`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS phone TEXT`;
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
