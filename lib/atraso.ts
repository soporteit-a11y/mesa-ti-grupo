import { diaDeFecha } from "@/lib/dates";

/**
 * Calculo del atraso de UNA etapa, mirando solo lo suyo.
 *
 * Cada etapa se mide contra su propio calendario y su propio avance: que
 * Preparar vaya perfecta no compensa que ADPRO vaya tarde, ni al reves. Antes
 * el unico veredicto era el de toda la empresa, que promediaba etapas sanas con
 * etapas enfermas y escondia justo lo que hay que ver.
 *
 * Se calculan dos cosas distintas, y conviene no confundirlas:
 *
 *  - **desfase**: puntos porcentuales entre el calendario consumido y el avance
 *    real. Responde "¿voy al ritmo que deberia?". Es una regla de tres sobre el
 *    tiempo, no una curva ponderada por esfuerzo: aproximacion honesta y
 *    suficiente, no una linea base de valor ganado.
 *  - **diasVencida**: dias desde que la etapa debio terminar. Solo existe si la
 *    fecha de fin ya paso y la etapa no esta al 100%.
 *
 * Una etapa puede tener desfase sin estar vencida (va lenta, pero aun tiene
 * plazo) y puede estar vencida sin desfase aparente (el plazo era corto). Por
 * eso se devuelven las dos y la interfaz muestra la que aplique.
 */
export type Atraso = {
  /** Puntos porcentuales de retraso. Positivo = va por detras. */
  desfase: number;
  pctTiempo: number;
  pctReal: number;
  /** Dias vencida, o null si aun no vence o ya esta completa. */
  diasVencida: number | null;
  /** Fases cuya fecha de fin paso y siguen incompletas. */
  fasesVencidas: number;
  /** Tareas hechas despues de su fecha coordinada. */
  tareasTarde: number;
  /** Etiqueta corta para el cuadrito, o null si no hay nada que reportar. */
  etiqueta: string | null;
  /** Severidad: "crit" (atrasada), "high" (en riesgo), "ok" (al dia). */
  nivel: "crit" | "high" | "ok";
};

type FaseMin = { end_date: unknown; progress: number };
type TareaMin = { done: boolean; end_date: unknown; done_at: unknown };

export function calcularAtraso(
  inicio: unknown,
  fin: unknown,
  progress: number,
  hoy: number,
  fases: FaseMin[] = [],
  tareas: TareaMin[] = [],
): Atraso {
  const ini = diaDeFecha(inicio);
  const finD = diaDeFecha(fin);

  // Sin un calendario que consumir no hay nada contra que medir el avance.
  let pctTiempo = 0;
  if (ini !== null && finD !== null && finD >= ini) {
    const total = finD - ini + 1;
    pctTiempo = Math.round((Math.min(total, Math.max(0, hoy - ini + 1)) / total) * 100);
  }
  const pctReal = Math.round(progress);
  const desfase = pctTiempo - pctReal;

  const diasVencida = finD !== null && finD < hoy && progress < 100 ? hoy - finD : null;

  let fasesVencidas = 0;
  for (const f of fases) {
    const ff = diaDeFecha(f.end_date);
    if (ff !== null && ff < hoy && f.progress < 100) fasesVencidas++;
  }

  let tareasTarde = 0;
  for (const t of tareas) {
    const coord = diaDeFecha(t.end_date);
    if (coord === null) continue;
    // Hecha: cuenta si se hizo despues. Sin hacer: cuenta si ya vencio.
    // Una tarea marcada sin fecha real no se puede juzgar y no cuenta.
    if (t.done) {
      const real = diaDeFecha(t.done_at);
      if (real !== null && real > coord) tareasTarde++;
    } else if (coord < hoy) {
      tareasTarde++;
    }
  }

  // La etiqueta prioriza el hecho duro (vencida, con dias contados) sobre la
  // estimacion (desfase en puntos): "vencida hace 12 dias" se entiende sin
  // explicacion, "atrasada 9 puntos" no.
  let etiqueta: string | null = null;
  let nivel: Atraso["nivel"] = "ok";
  if (progress >= 100) {
    etiqueta = null;
  } else if (diasVencida !== null) {
    etiqueta = `Vencida hace ${diasVencida} d`;
    nivel = "crit";
  } else if (desfase > 15) {
    etiqueta = `Atrasada ${desfase} puntos`;
    nivel = "crit";
  } else if (desfase > 5) {
    etiqueta = `En riesgo · ${desfase} puntos`;
    nivel = "high";
  }

  return { desfase, pctTiempo, pctReal, diasVencida, fasesVencidas, tareasTarde, etiqueta, nivel };
}
