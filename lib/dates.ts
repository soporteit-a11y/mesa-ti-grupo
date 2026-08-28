// Todas las fechas se guardan en Postgres como TIMESTAMPTZ (UTC real). Esta es
// la UNICA fuente de conversion a hora de Republica Dominicana (UTC-4, sin
// horario de verano) — antes cada pantalla llamaba getUTCHours()/getUTCDate()
// directamente, que muestra la hora UTC como si fuera local (4 horas adelantada).
const DR_TZ = "America/Santo_Domingo";

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
