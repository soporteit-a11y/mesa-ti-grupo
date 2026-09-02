import { sql, ensureSchema } from "./db";

export async function getCompanies() {
  await ensureSchema();
  return sql!`SELECT id, name, color FROM companies ORDER BY name`;
}

export async function getCollaborators() {
  await ensureSchema();
  return sql!`SELECT id, name, company_id, email, phone FROM collaborators ORDER BY name`;
}

export async function getCategories() {
  await ensureSchema();
  return sql!`SELECT id, name, sla_hours FROM categories ORDER BY name`;
}

/**
 * Usuarios del sistema con las empresas que tiene asignadas cada uno.
 * `company_ids` viene como arreglo para poder marcar las casillas en /config
 * sin hacer una consulta por usuario.
 */
export async function getUsers() {
  await ensureSchema();
  const rows = await sql!`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
      u.approved, u.can_edit_schedule, u.can_create_tickets,
      COALESCE(ARRAY_AGG(uc.company_id) FILTER (WHERE uc.company_id IS NOT NULL), '{}') AS company_ids
    FROM users u LEFT JOIN user_companies uc ON uc.user_id = u.id
    GROUP BY u.id ORDER BY u.approved, u.role, u.name`;
  // company_ids puede llegar como arreglo real o como texto '{1,2}' segun como
  // el driver interprete el tipo; se normaliza aqui para que la pagina no tenga
  // que preocuparse por eso.
  return (rows as any[]).map((r) => ({
    ...r,
    company_ids: Array.isArray(r.company_ids)
      ? r.company_ids.map(Number)
      : String(r.company_ids || "").replace(/[{}]/g, "").split(",").filter(Boolean).map(Number),
  }));
}

/**
 * Si el auto-registro publico esta habilitado. Sin fila en `meta` se considera
 * abierto: las cuentas nacen sin aprobar de todos modos, asi que lo peor que
 * puede pasar es que se acumulen solicitudes. Se apaga desde /config.
 */
export async function getRegistroAbierto(): Promise<boolean> {
  await ensureSchema();
  const rows = await sql!`SELECT v FROM meta WHERE k = 'registro_abierto'`;
  return rows.length === 0 ? true : rows[0].v === "1";
}

/**
 * IDs de empresa que un usuario puede ver. El admin ve todas (devuelve null,
 * que los llamadores interpretan como "sin filtro"); el agente ve solo las
 * asignadas en /config.
 */
export async function getVisibleCompanyIds(user: { id: number; role: string } | null): Promise<number[] | null> {
  if (!user) return [];
  if (user.role === "admin") return null;
  await ensureSchema();
  const rows = await sql!`SELECT company_id FROM user_companies WHERE user_id = ${user.id}`;
  return (rows as any[]).map((r) => r.company_id);
}

export async function getCanned() {
  await ensureSchema();
  return sql!`SELECT id, title, text FROM canned_responses ORDER BY title`;
}

/* ---------- Avisos de SLA (contador del menu lateral) ---------- */
export type AlertCounts = {
  breached: number;  // tickets abiertos que ya pasaron su fecha limite
  dueSoon: number;   // tickets abiertos que vencen en las proximas 2 horas
};

// Misma formula de SLA que slaInfo() en lib/priority.ts, calculada aqui via la
// funcion SQL ticket_sla_deadline() (definida en ensureSchema, lib/db.ts) para
// no repetir el CASE de multiplicadores en cada consulta.
export async function getAlertCounts(): Promise<AlertCounts> {
  await ensureSchema();
  const rows = await sql!`
    WITH abiertos AS (
      SELECT ticket_sla_deadline(t.created_at, cat.sla_hours, t.priority) AS vence
      FROM tickets t
      LEFT JOIN categories cat ON cat.name = t.category
      WHERE t.status <> 'resuelto'
    )
    SELECT
      COUNT(*) FILTER (WHERE now() > vence)::int AS breached,
      COUNT(*) FILTER (WHERE now() <= vence AND vence <= now() + interval '2 hour')::int AS due_soon
    FROM abiertos`;
  return { breached: rows[0]?.breached || 0, dueSoon: rows[0]?.due_soon || 0 };
}

export type TicketRow = {
  id: number;
  title: string;
  company: string;
  company_color: string;
  category: string;
  priority: string;
  status: string;
  requester: string | null;
  created_at: string;
  resolved_at: string | null;
  cat_sla: number | null;
  created_by: number | null;
};

export async function getTickets(): Promise<TicketRow[]> {
  await ensureSchema();
  const rows = await sql!`
    SELECT t.id, t.title, t.category, t.priority, t.status, t.requester, t.created_at, t.resolved_at,
           t.created_by, c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    ORDER BY t.created_at DESC, t.id DESC`;
  return rows as TicketRow[];
}

/** Tickets creados por un usuario concreto (pantalla del rol colaborador). */
export async function getTicketsByUser(userId: number): Promise<TicketRow[]> {
  await ensureSchema();
  const rows = await sql!`
    SELECT t.id, t.title, t.category, t.priority, t.status, t.requester, t.created_at, t.resolved_at,
           t.created_by, c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    WHERE t.created_by = ${userId}
    ORDER BY t.created_at DESC, t.id DESC`;
  return rows as TicketRow[];
}

export async function getTicketDetail(id: number): Promise<any> {
  await ensureSchema();
  const q = sql!;
  const rows = await q`
    SELECT t.*, c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    WHERE t.id = ${id}`;
  if (!rows[0]) return null;
  const comments = await q`
    SELECT id, author, text, created_at FROM ticket_comments
    WHERE ticket_id = ${id} ORDER BY created_at ASC`;
  return { ...rows[0], comments: comments as any[] };
}

export type SupportDashboard = {
  total: number;
  closed: number;
  open: number;
  breached: number;
  minDate: string | null;
  maxDate: string | null;
  byCategory: { category: string; n: number; pct: number; isCurrent: boolean }[];
  byCompany: any[];
  timeByCompany: { name: string; color: string; n: number; total_minutes: number; avg_minutes: number }[];
  byDay: number[]; // Lun..Dom
  recent: any[];
};

export async function getSupportDashboard(from?: string | null, to?: string | null): Promise<SupportDashboard> {
  await ensureSchema();
  const q = sql!;
  const f = from || null;
  const t2 = to || null;

  const totals = await q`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'resuelto')::int AS closed,
      COUNT(*) FILTER (WHERE t.status <> 'resuelto')::int AS open,
      COUNT(*) FILTER (
        WHERE t.status <> 'resuelto'
          AND now() > ticket_sla_deadline(t.created_at, cat.sla_hours, t.priority)
      )::int AS breached,
      MIN(t.created_at) AS minc, MAX(t.created_at) AS maxc
    FROM tickets t
    LEFT JOIN categories cat ON cat.name = t.category
    WHERE (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))`;

  const cat = await q`
    SELECT COALESCE(NULLIF(t.category, ''), 'Otros') AS category, COUNT(*)::int AS n,
      BOOL_OR(c2.id IS NOT NULL) AS is_current
    FROM tickets t
    LEFT JOIN categories c2 ON c2.name = t.category
    WHERE (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY 1 ORDER BY n DESC, category`;

  const byCompany = await q`
    SELECT c.name, c.color, COUNT(t.id)::int AS n
    FROM companies c LEFT JOIN tickets t ON t.company_id = c.id
      AND (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY c.id, c.name, c.color HAVING COUNT(t.id) > 0 ORDER BY n DESC`;

  // Tiempo de soporte por empresa: solo tickets resueltos (son los que tienen
  // un tiempo de resolucion, automatico o manual, que tenga sentido sumar).
  // resolution_minutes manual pisa el calculo automatico (resolved_at - created_at),
  // igual que autoResolutionMinutes() en lib/dates.ts.
  const timeByCompany = await q`
    SELECT c.name, c.color, COUNT(t.id)::int AS n,
      COALESCE(SUM(COALESCE(t.resolution_minutes, EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60)), 0)::int AS total_minutes,
      COALESCE(AVG(COALESCE(t.resolution_minutes, EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60)), 0)::int AS avg_minutes
    FROM companies c
    JOIN tickets t ON t.company_id = c.id AND t.status = 'resuelto'
      AND (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY c.id, c.name, c.color
    HAVING COUNT(t.id) > 0
    ORDER BY total_minutes DESC`;

  const dow = await q`
    SELECT EXTRACT(ISODOW FROM created_at)::int AS d, COUNT(*)::int AS n
    FROM tickets
    WHERE (${f}::timestamptz IS NULL OR created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY 1 ORDER BY 1`;

  const recent = await q`
    SELECT t.id, t.title, t.status, t.created_at, t.category, c.name AS company
    FROM tickets t LEFT JOIN companies c ON c.id = t.company_id
    WHERE (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    ORDER BY t.created_at DESC, t.id DESC LIMIT 6`;

  const t = totals[0];
  const total = t.total || 0;
  const byCategory = (cat as any[]).map((r) => ({
    category: r.category,
    n: r.n,
    pct: total ? Math.round((r.n / total) * 100) : 0,
    isCurrent: !!r.is_current,
  }));

  const byDay = [0, 0, 0, 0, 0, 0, 0]; // ISODOW 1=Lun .. 7=Dom
  for (const r of dow as any[]) byDay[r.d - 1] = r.n;

  return {
    total,
    closed: t.closed || 0,
    open: t.open || 0,
    breached: t.breached || 0,
    minDate: t.minc,
    maxDate: t.maxc,
    byCategory,
    byCompany: byCompany as any[],
    timeByCompany: timeByCompany as any[],
    byDay,
    recent: recent as any[],
  };
}

/* ---------- Cronogramas (modulo aparte; antes "Rutas de trabajo") ---------- */
export type Task = {
  id: number; title: string; done: boolean;
  phase_id: number | null;
  start_date: string | null; end_date: string | null;
  owner: string | null; context: string | null;
};

export type Phase = {
  id: number; title: string; stage: string | null; context: string | null;
  start_date: string | null; end_date: string | null;
  tasks: Task[];
  total: number; done: number; progress: number;
};

export type Initiative = {
  id: number;
  title: string;
  area: string;
  status: string;
  owner: string | null;
  start_date: string | null;
  due_date: string | null;
  company_id: number;
  company: string;
  company_color: string;
  /** Todas las tareas del cronograma, con fase o sin ella. */
  tasks: Task[];
  /** Fases ordenadas. Vacio en cronogramas que no usan fases. */
  phases: Phase[];
  /** Tareas que no pertenecen a ninguna fase (modelo antiguo, plano). */
  looseTasks: Task[];
  total: number;
  done: number;
  progress: number;
};

function avance(tasks: Task[]) {
  const done = tasks.filter((t) => t.done).length;
  return { total: tasks.length, done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export async function getInitiatives(): Promise<Initiative[]> {
  await ensureSchema();
  const q = sql!;
  // Tres consultas planas que se unen en JS, igual que antes: es mas simple de
  // leer que un JSON agregado en SQL y el volumen aqui es pequeno.
  const inits = await q`
    SELECT i.id, i.title, i.area, i.status, i.owner, i.start_date, i.due_date, i.company_id,
           c.name AS company, c.color AS company_color
    FROM initiatives i JOIN companies c ON c.id = i.company_id
    ORDER BY c.name, i.id`;
  const phases = await q`
    SELECT id, initiative_id, title, stage, context, start_date, end_date
    FROM initiative_phases ORDER BY position, id`;
  const tasks = await q`
    SELECT id, initiative_id, phase_id, title, done, start_date, end_date, owner, context
    FROM initiative_tasks ORDER BY position, id`;

  return (inits as any[]).map((i) => {
    const t = (tasks as any[]).filter((x) => x.initiative_id === i.id) as Task[];
    const ph = (phases as any[])
      .filter((p) => p.initiative_id === i.id)
      .map((p) => {
        const pt = t.filter((x) => x.phase_id === p.id);
        return { ...p, tasks: pt, ...avance(pt) } as Phase;
      });
    return {
      ...i,
      tasks: t,
      phases: ph,
      looseTasks: t.filter((x) => x.phase_id == null),
      ...avance(t),
    } as Initiative;
  });
}

export async function getInitiativeSummary() {
  await ensureSchema();
  return sql!`
    SELECT c.name, c.color,
      COUNT(DISTINCT i.id)::int AS initiatives,
      COUNT(t.id)::int AS total_tasks,
      COUNT(t.id) FILTER (WHERE t.done)::int AS done_tasks
    FROM companies c
    LEFT JOIN initiatives i ON i.company_id = c.id
    LEFT JOIN initiative_tasks t ON t.initiative_id = i.id
    GROUP BY c.id, c.name, c.color
    HAVING COUNT(DISTINCT i.id) > 0
    ORDER BY c.name`;
}
