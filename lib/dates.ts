// Todas las fechas se guardan en Postgres como TIMESTAMPTZ (UTC real). Esta es
// la UNICA fuente de conversion a hora de Republica Dominicana (UTC-4, sin
// horario de verano) — antes cada pantalla llamaba getUTCHours()/getUTCDate()
// directamente, que muestra la hora UTC como si fuera local (4 horas adelantada).
const DR_TZ = "America/Santo_Domingo";

/**
 * Normaliza una columna DATE a 'YYYY-MM-DD', venga como venga.
 *
 * Existe porque el driver puede devolver una columna DATE como texto o como
 * objeto Date segun el caso, y el codigo que las pintaba asumia siempre texto:
 * `String(valor).slice(0,10).split("-")` sobre un objeto Date da NaN en
 * silencio, y ese NaN termino tumbando /cronogramas entero en produccion
 * (MESES[NaN] -> undefined -> .toLowerCase() explota).
 *
 * Una fecha DATE no lleva hora ni zona: NO se convierte a la zona de RD. Si se
 * hiciera, '2026-09-15' pasaria a ser el 14 por la noche (§5.8).
 */
export function toYMD(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Ultimo recurso: cualquier otro formato que Date sepa leer.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : toYMD(d);
}

/** Dias desde epoch de una fecha DATE, o null si no se pudo interpretar. */
export function diaDeFecha(v: unknown): number | null {
  const ymd = toYMD(v);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  return Number.isNaN(t) ? null : Math.floor(t / 86400000);
}

/**
 * Hoy como 'YYYY-MM-DD' en la zona de Republica Dominicana.
 *
 * En UTC no vale: el servidor corre en UTC y RD va cuatro horas por detras, asi
 * que todo lo que se marque despues de las 8 de la noche quedaria fechado al
 * dia siguiente. Se usa 'en-CA' porque su formato corto ya es YYYY-MM-DD.
 */
export function hoyEnRD(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DR_TZ }).format(new Date());
}

/** Hoy, en dias desde epoch, segun la zona de Republica Dominicana. */
export function hoyEnDias(): number {
  return diaDeFecha(hoyEnRD())!;
}

const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** '2026-09-15' -> '15 sep'. Devuelve null si la fecha no es interpretable. */
export function fmtDiaMes(v: unknown): string | null {
  const ymd = toYMD(v);
  if (!ymd) return null;
  const [, m, d] = ymd.split("-");
  return `${Number(d)} ${MES_CORTO[Number(m) - 1]}`;
}

/** '2026-09-15' -> '15 sep 2026'. */
export function fmtDiaMesAnio(v: unknown): string | null {
  const ymd = toYMD(v);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-");
  return `${Number(d)} ${MES_CORTO[Number(m) - 1]} ${y}`;
}

/** Rango corto: '26 may – 11 jun'. */
export function fmtRangoFechas(ini: unknown, fin: unknown): string | null {
  const a = toYMD(ini);
  const b = toYMD(fin);
  if (!a && !b) return null;
  if (a && b) return a === b ? fmtDiaMes(a) : `${fmtDiaMes(a)} – ${fmtDiaMes(b)}`;
  return fmtDiaMes(a || b);
}

function drParts(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DR_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // Intl con hour12:false a veces da "24" para medianoche
  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute") };
}

export function fmtDateDR(iso: string): string {
  const p = drParts(iso);
  return `${p.day}/${p.month}/${p.year}`;
}

export function fmtDateTimeDR(iso: string): string {
  const p = drParts(iso);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function drDayMonth(iso: string, meses: string[]): string {
  const p = drParts(iso);
  return `${Number(p.day)} ${meses[Number(p.month) - 1]}`;
}

export function drYear(iso: string): number {
  return Number(drParts(iso).year);
}

/* ---------- Tiempo de resolucion (duracion creado -> resuelto) ---------- */

export function autoResolutionMinutes(createdAt: string, resolvedAt: string | null): number | null {
  if (!resolvedAt) return null;
  const mins = Math.round((new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000);
  return Math.max(0, mins);
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && mins) parts.push(`${mins}m`);
  return parts.join(" ") || "0m";
}
