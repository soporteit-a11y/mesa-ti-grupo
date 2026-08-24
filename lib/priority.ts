// Modelo de priorización — mismo criterio que el playbook del grupo.
// Score = Urgencia (1-5) x Impacto (1-5) x Peso del servicio (0.9-1.5)

export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { name: string; color: string; sla: number }> = {
  P1: { name: "Crítico", color: "#C0392B", sla: 4 },
  P2: { name: "Alto", color: "#B4711A", sla: 8 },
  P3: { name: "Medio", color: "#96820F", sla: 24 },
  P4: { name: "Bajo", color: "#2F855A", sla: 72 },
};

export const STATUSES = ["nuevo", "en_progreso", "en_espera", "resuelto"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  nuevo: "Nuevo",
  en_progreso: "En progreso",
  en_espera: "En espera",
  resuelto: "Resuelto",
};

// Modelo de tickets basado en el CSV real: categoria + prioridad Baja/Media/Alta.
export const TICKET_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  "Impresora",
  "Carpetas Compartidas",
  "Correo Electronico",
  "Hardware / Laptop",
  "Office / Apps",
  "Requerimiento de Compras",
  "Suministros / Cables",
  "Flota (Tablets)",
  "Red / Conectividad",
  "Otros",
];

export const INITIATIVE_STATUSES = ["planificado", "en_curso", "en_pausa", "completado"] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];

export const INITIATIVE_STATUS_LABEL: Record<InitiativeStatus, string> = {
  planificado: "Planificado",
  en_curso: "En curso",
  en_pausa: "En pausa",
  completado: "Completado",
};

export function computeScore(urgency: number, impact: number, weight: number): number {
  return Math.round(urgency * impact * Number(weight) * 10) / 10;
}

export function levelFor(score: number): Priority {
  if (score >= 20) return "P1";
  if (score >= 12) return "P2";
  if (score >= 6) return "P3";
  return "P4";
}

export function slaForLevel(level: Priority): number {
  return PRIORITY_META[level].sla;
}

/* ---------- SLA de tickets: por categoria (base) x prioridad (multiplicador) ---------- */
export const PRIORITY_SLA_MULT: Record<string, number> = { Alta: 0.5, Media: 1, Baja: 1.5 };

export type SlaInfo = {
  targetHours: number;
  closed: boolean;
  onTime: boolean;
  hoursLeft: number; // negativo si vencido/incumplido
};

export function slaInfo(
  createdAt: string,
  resolvedAt: string | null,
  status: string,
  baseHours: number,
  priority: string
): SlaInfo {
  const mult = PRIORITY_SLA_MULT[priority] ?? 1;
  const targetHours = Math.max(1, Math.round((baseHours || 24) * mult));
  const created = new Date(createdAt).getTime();
  const deadline = created + targetHours * 3600000;

  if (status === "resuelto" && resolvedAt) {
    const resolved = new Date(resolvedAt).getTime();
    const hoursLeft = (deadline - resolved) / 3600000;
    return { targetHours, closed: true, onTime: hoursLeft >= 0, hoursLeft };
  }
  const hoursLeft = (deadline - Date.now()) / 3600000;
  return { targetHours, closed: false, onTime: hoursLeft >= 0, hoursLeft };
}

export function fmtSlaHours(h: number): string {
  const abs = Math.abs(h);
  if (abs < 1) return Math.max(1, Math.round(abs * 60)) + "m";
  if (abs < 48) return Math.round(abs) + "h";
  return Math.round(abs / 24) + "d";
}
