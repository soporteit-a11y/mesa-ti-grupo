import { sql, ensureSchema } from "@/lib/db";
import { hoyEnDias, diaDeFecha, fmtDiaMesAnio } from "@/lib/dates";

/** Cuantos dias antes del fin de una etapa se avisa. */
export const DIAS_AVISO = 7;

export type TipoEvento = "inicia" | "vence" | "completada";

export type Evento = {
  tipo: TipoEvento;
  initiativeId: number;
  etapa: string;
  empresa: string;
  companyId: number;
  /** Fecha del evento, ya formateada. */
  fecha: string;
  /** Dias hasta el fin. Solo tiene sentido en "vence". */
  diasRestantes: number | null;
  progreso: number;
  hechas: number;
  total: number;
  /**
   * Identidad del aviso, para no repetirlo nunca dos veces.
   *
   * Lleva la fecha dentro a proposito: si el fin de una etapa se mueve, el
   * aviso se rearma y se vuelve a mandar. La fecha nueva es informacion nueva,
   * y callarsela seria peor que repetirse.
   */
  clave: string;
};

/**
 * Los tres momentos de una etapa que merecen un aviso.
 *
 *  - **inicia**: la etapa arranca hoy. Para que el equipo sepa que ya le toca,
 *    sin depender de que alguien se acuerde de mirar.
 *  - **vence**: quedan DIAS_AVISO dias o menos para su fecha de fin y sigue sin
 *    terminarse. Es el aviso con tiempo de reaccionar.
 *  - **completada**: se termino. Cierra el ciclo, y es lo unico que se manda
 *    como noticia y no como recordatorio.
 *
 * Se trabaja al nivel de ETAPA y no de fase o tarea: un aviso por cada tarea
 * que vence seria un goteo que acaba en la papelera. La etapa es la unidad de
 * la que el equipo habla.
 *
 * Lo ya vencido no genera evento. Para eso esta el cuadrito de retraso de cada
 * etapa, visible de forma permanente; un correo diario repitiendo algo que ya
 * paso solo entrena a la gente a ignorar los correos.
 */
export async function getEventos(companyIds: number[] | null = null): Promise<Evento[]> {
  await ensureSchema();
  const hoy = hoyEnDias();

  // Rango efectivo de la etapa: el fijado a mano manda, y si no, el que sale de
  // sus fases y tareas. Es la misma regla que calcStart/calcEnd en lib/data.ts,
  // para que el aviso hable de la misma fecha que se ve en pantalla. LEAST y
  // GREATEST ignoran los NULL, asi que una etapa sin fechas no genera eventos
  // en vez de inventarse una.
  const filas = (await sql!`
    SELECT i.id, i.title, i.status, c.name AS empresa, c.id AS company_id,
           COALESCE(i.start_date, LEAST(
             (SELECT MIN(p.start_date) FROM initiative_phases p WHERE p.initiative_id = i.id),
             (SELECT MIN(t.start_date) FROM initiative_tasks t WHERE t.initiative_id = i.id)
           )) AS inicio,
           COALESCE(i.due_date, GREATEST(
             (SELECT MAX(p.end_date) FROM initiative_phases p WHERE p.initiative_id = i.id),
             (SELECT MAX(t.end_date) FROM initiative_tasks t WHERE t.initiative_id = i.id)
           )) AS fin,
           (SELECT COUNT(*) FROM initiative_tasks t WHERE t.initiative_id = i.id) AS total,
           (SELECT COUNT(*) FROM initiative_tasks t WHERE t.initiative_id = i.id AND t.done) AS hechas
    FROM initiatives i JOIN companies c ON c.id = i.company_id`) as any[];

  const out: Evento[] = [];

  for (const f of filas) {
    const companyId = Number(f.company_id);
    if (companyIds && !companyIds.includes(companyId)) continue;

    const total = Number(f.total);
    const hechas = Number(f.hechas);
    const progreso = total ? Math.round((hechas / total) * 100) : 0;
    const completada = f.status === "completado" || (total > 0 && hechas === total);

    const base = {
      initiativeId: f.id,
      etapa: f.title,
      empresa: f.empresa,
      companyId,
      progreso,
      hechas,
      total,
    };

    if (completada) {
      // Una etapa terminada ni arranca ni vence: lo unico que queda por decir
      // es que ya esta hecha.
      out.push({
        ...base,
        tipo: "completada",
        fecha: fmtDiaMesAnio(f.fin) ?? "—",
        diasRestantes: null,
        clave: `etapa:${f.id}:completada`,
      });
      continue;
    }

    const ini = diaDeFecha(f.inicio);
    if (ini !== null && ini === hoy) {
      out.push({
        ...base,
        tipo: "inicia",
        fecha: fmtDiaMesAnio(f.inicio) ?? "—",
        diasRestantes: null,
        clave: `etapa:${f.id}:inicia:${String(f.inicio).slice(0, 10)}`,
      });
    }

    const fin = diaDeFecha(f.fin);
    if (fin !== null) {
      const dias = fin - hoy;
      if (dias >= 0 && dias <= DIAS_AVISO) {
        out.push({
          ...base,
          tipo: "vence",
          fecha: fmtDiaMesAnio(f.fin) ?? "—",
          diasRestantes: dias,
          clave: `etapa:${f.id}:vence:${String(f.fin).slice(0, 10)}`,
        });
      }
    }
  }

  // Lo urgente primero, las buenas noticias al final.
  const peso: Record<TipoEvento, number> = { vence: 0, inicia: 1, completada: 2 };
  out.sort(
    (a, b) =>
      peso[a.tipo] - peso[b.tipo] ||
      (a.diasRestantes ?? 99) - (b.diasRestantes ?? 99) ||
      a.etapa.localeCompare(b.etapa),
  );
  return out;
}

export type Destinatario = { id: number; nombre: string; correo: string; eventos: Evento[] };

/**
 * Reparte los eventos entre quien tiene que enterarse.
 *
 * Una etapa no pertenece a una persona: pertenece al equipo que trabaja esa
 * empresa. Por eso el aviso va a **todo el que tenga esa empresa habilitada** —
 * quien esta dado de alta en CMG recibe los eventos de CMG — mas los
 * administradores, que ven todas.
 *
 * Cada persona recibe **un solo correo** con todo lo suyo, no uno por etapa.
 */
export async function repartir(eventos: Evento[]): Promise<Destinatario[]> {
  if (eventos.length === 0) return [];

  // Solo cuentas aprobadas y con correo: escribirle a alguien que todavia no
  // puede entrar al sistema no sirve de nada.
  const usuarios = (await sql!`
    SELECT u.id, u.name, u.email, u.role,
      COALESCE(ARRAY_AGG(uc.company_id) FILTER (WHERE uc.company_id IS NOT NULL), '{}') AS company_ids
    FROM users u LEFT JOIN user_companies uc ON uc.user_id = u.id
    WHERE u.approved = true AND u.email IS NOT NULL AND u.email <> ''
    GROUP BY u.id, u.name, u.email, u.role`) as any[];

  const empresasDe = (u: any): number[] =>
    Array.isArray(u.company_ids)
      ? u.company_ids.map(Number)
      : String(u.company_ids || "").replace(/[{}]/g, "").split(",").filter(Boolean).map(Number);

  const buzones = new Map<number, Destinatario>();
  for (const e of eventos) {
    for (const u of usuarios) {
      if (u.role !== "admin" && !empresasDe(u).includes(e.companyId)) continue;
      let d = buzones.get(u.id);
      if (!d) {
        d = { id: u.id, nombre: u.name, correo: u.email, eventos: [] };
        buzones.set(u.id, d);
      }
      d.eventos.push(e);
    }
  }
  return [...buzones.values()];
}

/**
 * De una lista de eventos, los que todavia no se han avisado.
 *
 * Sin esto, un cron diario repetiria el mismo aviso durante los siete dias
 * previos al vencimiento, que es la forma mas rapida de que alguien cree una
 * regla de correo para mandarlos todos a la papelera.
 */
export async function sinAvisar(eventos: Evento[]): Promise<Evento[]> {
  if (eventos.length === 0) return [];
  const claves = eventos.map((e) => e.clave);
  const ya = (await sql!`SELECT clave FROM avisos_enviados WHERE clave = ANY(${claves})`) as any[];
  const vistas = new Set(ya.map((r) => r.clave));
  return eventos.filter((e) => !vistas.has(e.clave));
}

/** Deja constancia de lo avisado, para que no se repita. */
export async function marcarAvisados(eventos: Evento[]) {
  for (const e of eventos) {
    await sql!`INSERT INTO avisos_enviados (clave) VALUES (${e.clave}) ON CONFLICT (clave) DO NOTHING`;
  }
}
