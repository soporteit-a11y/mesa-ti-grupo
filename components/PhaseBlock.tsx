import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PhaseHeader } from "@/components/PhaseHeader";
import { Collapsible } from "@/components/Collapsible";
import { fmtRangoFechas } from "@/lib/dates";
import type { Phase } from "@/lib/data";

/** Rango de fechas en formato corto: "26 may – 11 jun". */
export { fmtRangoFechas as fmtRango } from "@/lib/dates";

export function PhaseBlock({
  initiativeId, phase, color, canEdit, canCheck, numero, responsables = [], asignables = [], hoy,
}: {
  initiativeId: number;
  phase: Phase;
  color: string;
  /** Posicion de la fase dentro del cronograma, empezando en 1. */
  numero: number;
  /** Responsables ya usados en el sistema, para autocompletar. */
  responsables?: string[];
  /** Usuarios que pueden ver esta empresa, para asignar fase y tareas. */
  asignables?: { id: number; name: string }[];
  /** Hoy en dias desde epoch, calculado en el servidor. */
  hoy?: number;
  /** Admin: puede renombrar la fase, cambiar fechas, agregar y borrar tareas. */
  canEdit: boolean;
  /** Puede marcar tareas como completadas. */
  canCheck: boolean;
}) {
  const rango = fmtRangoFechas(phase.start_date, phase.end_date);
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
      head={<PhaseHeader phase={phase} rango={rango} canEdit={canEdit} numero={numero} asignables={asignables} />}
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
          responsables={responsables}
          canEditOwner={canEdit}
          asignables={asignables}
          hoy={hoy}
        />
      )}
      {canEdit && <AddTaskForm initiativeId={initiativeId} phaseId={phase.id} />}
    </Collapsible>
  );
}
