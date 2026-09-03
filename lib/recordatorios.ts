import { sql, ensureSchema } from "@/lib/db";
import { hoyEnDias, diaDeFecha, fmtDiaMesAnio } from "@/lib/dates";

/** Cuantos dias antes del vencimiento se avisa. */
export const DIAS_AVISO = 7;

export type Pendiente = {
  tipo: "fase" | "tarea";
  id: number;
  titulo: string;
  /** Cronograma al que pertenece, para que el aviso se ubique. */
  etapa: string;
  empresa: string;
  companyId: number;
  vence: string;
  diasRestantes: number;
  asignadoId: number | null;
  asignadoNombre: string | null;
  asignadoEmail: string | null;
};

/**
 * Lo que vence dentro de los proximos DIAS_AVISO dias y sigue sin terminar.
 *
 * Se miran fases y tareas por separado a proposito: una fase puede vencer sin
 * que ninguna de sus tareas venza ese dia, y avisar solo de tareas dejaria
 * pasar el vencimiento de la fase entera.
 *
 * Lo ya vencido NO entra. Para eso esta el cuadrito de retraso de cada etapa,
 * que lo muestra de forma permanente; un correo diario repitiendo algo que ya
 * paso solo entrena a la gente a ignorar los correos.
 */
export async function getPendientes(companyIds: number[] | null = null): Promise<Pendiente[]> {
  await ensureSchema();
  const hoy = hoyEnDias();

  const fases = await sql!`
    SELECT p.id, p.title, p.end_date, i.title AS etapa, c.name AS empresa, c.id AS company_id,
           p.assigned_user_id, u.name AS asignado, u.email AS correo,
           COUNT(t.id) FILTER (WHERE t.done) AS hechas, COUNT(t.id) AS total
    FROM initiative_phases p
    JOIN initiatives i ON i.id = p.initiative_id
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN users u ON u.id = p.assigned_user_id
    LEFT JOIN initiative_tasks t ON t.phase_id = p.id
    WHERE p.end_date IS NOT NULL
    GROUP BY p.id, p.title, p.end_date, i.title, c.name, c.id, p.assigned_user_id, u.name, u.email`;

  const tareas = await sql!`
    SELECT t.id, t.title, t.end_date, i.title AS etapa, c.name AS empresa, c.id AS company_id,
           t.assigned_user_id, u.name AS asignado, u.email AS correo
    FROM initiative_tasks t
    JOIN initiatives i ON i.id = t.initiative_id
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN users u ON u.id = t.assigned_user_id
    WHERE t.end_date IS NOT NULL AND t.done = false`;

  const out: Pendiente[] = [];

  for (const f of fases as any[]) {
    // Una fase con todas sus tareas hechas ya no necesita aviso, aunque su
    // fecha de fin siga en el futuro. Sin tareas se considera pendiente.
    if (Number(f.total) > 0 && Number(f.hechas) === Number(f.total)) continue;
    empujar(out, "fase", f, hoy, companyIds);
  }
  for (const t of tareas as any[]) empujar(out, "tarea", t, hoy, companyIds);

  // Lo que vence antes, primero: es el orden en que hay que atenderlo.
  out.sort((a, b) => a.diasRestantes - b.diasRestantes || a.titulo.localeCompare(b.titulo));
  return out;
}

function empujar(
  out: Pendiente[], tipo: "fase" | "tarea", r: any, hoy: number, companyIds: number[] | null,
) {
  const fin = diaDeFecha(r.end_date);
  if (fin === null) return;
  const dias = fin - hoy;
  if (dias < 0 || dias > DIAS_AVISO) return;
  if (companyIds && !companyIds.includes(Number(r.company_id))) return;
  out.push({
    tipo,
    id: r.id,
    titulo: r.title,
    etapa: r.etapa,
    empresa: r.empresa,
    companyId: Number(r.company_id),
    vence: fmtDiaMesAnio(r.end_date) ?? "—",
    diasRestantes: dias,
    asignadoId: r.assigned_user_id ?? null,
    asignadoNombre: r.asignado ?? null,
    asignadoEmail: r.correo ?? null,
  });
}

/**
 * Agrupa lo pendiente por la persona a la que hay que avisar.
 *
 * Lo que no tiene a nadie asignado no se pierde: se acumula bajo la clave
 * `null`, que el envio manda a los administradores. Un vencimiento sin dueno
 * es precisamente el que mas riesgo tiene de que no lo mire nadie.
 */
export function porDestinatario(items: Pendiente[]): Map<number | null, Pendiente[]> {
  const m = new Map<number | null, Pendiente[]>();
  for (const p of items) {
    const k = p.asignadoId ?? null;
    const arr = m.get(k);
    if (arr) arr.push(p);
    else m.set(k, [p]);
  }
  return m;
}
