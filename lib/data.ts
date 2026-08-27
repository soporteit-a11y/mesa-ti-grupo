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
};

export async function getTickets(): Promise<TicketRow[]> {
  await ensureSchema();
  const rows = await sql!`
    SELECT t.id, t.title, t.category, t.priority, t.status, t.requester, t.created_at, t.resolved_at,
           c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    ORDER BY t.created_at DESC, t.id DESC`;
  return rows as TicketRow[];
}

export async function getTicketDetail(id: number) {
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
  byCategory: { category: string; n: number; pct: number }[];
  byCompany: any[];
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
    SELECT COALESCE(NULLIF(category, ''), 'Otros') AS category, COUNT(*)::int AS n
    FROM tickets
    WHERE (${f}::timestamptz IS NULL OR created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY 1 ORDER BY n DESC, category`;

  const byCompany = await q`
    SELECT c.name, c.color, COUNT(t.id)::int AS n
    FROM companies c LEFT JOIN tickets t ON t.company_id = c.id
      AND (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY c.id, c.name, c.color HAVING COUNT(t.id) > 0 ORDER BY n DESC`;

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
    byDay,
    recent: recent as any[],
  };
}

/* ---------- Rutas de trabajo (modulo aparte) ---------- */
export type Initiative = {
  id: number;
  title: string;
  area: string;
  status: string;
  owner: string | null;
  due_date: string | null;
  company: string;
  company_color: string;
  tasks: { id: number; title: string; done: boolean }[];
  total: number;
  done: number;
  progress: number;
};

export async function getInitiatives(): Promise<Initiative[]> {
  await ensureSchema();
  const q = sql!;
  const inits = await q`
    SELECT i.id, i.title, i.area, i.status, i.owner, i.due_date, c.name AS company, c.color AS company_color
    FROM initiatives i JOIN companies c ON c.id = i.company_id
    ORDER BY c.name, i.id`;
  const tasks = await q`SELECT id, initiative_id, title, done FROM initiative_tasks ORDER BY position, id`;
  return (inits as any[]).map((i) => {
    const t = (tasks as any[]).filter((x) => x.initiative_id === i.id);
    const done = t.filter((x) => x.done).length;
    return {
      ...i,
      tasks: t.map((x) => ({ id: x.id, title: x.title, done: x.done })),
      total: t.length,
      done,
      progress: t.length ? Math.round((done / t.length) * 100) : 0,
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
