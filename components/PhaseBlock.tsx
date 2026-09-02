import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PhaseHeader } from "@/components/PhaseHeader";
import { Collapsible } from "@/components/Collapsible";
import type { Phase } from "@/lib/data";

/** Rango de fechas en formato corto: "26 may – 11 jun". */
export function fmtRango(ini: string | null, fin: string | null): string | null {
  const M = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const corta = (d: string) => {
    const [, m, dd] = String(d).slice(0, 10).split("-");
    return `${Number(dd)} ${M[Number(m) - 1]}`;
  };
  if (!ini && !fin) return null;
  if (ini && fin) return ini === fin ? corta(ini) : `${corta(ini)} – ${corta(fin)}`;
  return corta((ini || fin)!);
}

export function PhaseBlock({
  initiativeId, phase, color, canEdit, canCheck,
}: {
  initiativeId: number;
  phase: Phase;
  color: string;
  /** Admin: puede renombrar la fase, cambiar fechas, agregar y borrar tareas. */
  canEdit: boolean;
  /** Puede marcar tareas como completadas. */
  canCheck: boolean;
}) {
  const rango = fmtRango(phase.start_date, phase.end_date);
  const completa = phase.total > 0 && phase.done === phase.total;

  const barra = (
    <div className="phase-progress">
      <div className="progress-track sm">
        <div className="progress-fill" style={{ width: `${phase.progress}%`, background: color }} />
      </div>
      <span className="progress-label mono">{phase.done}/{phase.total}</span>
    </div>
  );

  return (
    <Collapsible
      storageKey={`fase.${phase.id}`}
      className={"phase-block" + (completa ? " completa" : "")}
      head={<PhaseHeader phase={phase} rango={rango} canEdit={canEdit} />}
      meta={barra}
    >
      {barra}
      {phase.tasks.length === 0 ? (
        <p className="pv-meta phase-empty">Sin tareas en esta fase.</p>
      ) : (
        <TaskList
          initiativeId={initiativeId}
          tasks={phase.tasks}
          locked={!canEdit}
          readOnly={!canCheck}
        />
      )}
      {canEdit && <AddTaskForm initiativeId={initiativeId} phaseId={phase.id} />}
    </Collapsible>
  );
}
