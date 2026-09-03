"use client";

import { useRef, useState } from "react";
import { toggleTask, updateTaskTitle, deleteTask } from "@/app/actions";
import { TaskOwner } from "@/components/TaskOwner";
import { Asignado, type OpcionUsuario } from "@/components/Asignado";
import { TaskFechas } from "@/components/TaskFechas";

export function TaskItem({
  id, done, title, locked = false, readOnly = false, context, owner, responsables = [], canEditOwner = false,
  asignadoId = null, asignadoNombre = null, asignables = [],
  coordinada = null, realizada = null, hoy,
}: {
  id: number; done: boolean; title: string;
  /** Sub-grupo del Excel del que venia la tarea. Solo informativo. */
  context?: string | null;
  /** Fecha coordinada (comprometida) de la tarea, sin formatear. */
  coordinada?: unknown;
  /** Fecha en que se realizo de verdad, sin formatear. */
  realizada?: unknown;
  /** Hoy en dias desde epoch, calculado en el servidor. */
  hoy: number;
  /** Responsable de la tarea. */
  owner?: string | null;
  /** Valores de responsable ya usados, para el autocompletado. */
  responsables?: string[];
  canEditOwner?: boolean;
  /** Usuario del sistema asignado a esta tarea. */
  asignadoId?: number | null;
  asignadoNombre?: string | null;
  /** Usuarios que pueden ver esta empresa, para el desplegable. */
  asignables?: OpcionUsuario[];
  /**
   * Rol colaborador: puede marcar la tarea como hecha, pero no renombrarla ni
   * eliminarla. Por defecto false, asi la vista del admin no cambia.
   */
  locked?: boolean;
  /** Sin permiso de edicion: la casilla se ve pero no se puede tocar. */
  readOnly?: boolean;
}) {
  const toggleRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLFormElement>(null);
  const deleteRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(title);

  return (
    <div className={"task-item" + (done ? " done" : "")}>
      {readOnly ? (
        <span className="task-check-box ro" title="No tienes permiso para marcar tareas">
          <span className="box" aria-hidden="true" />
        </span>
      ) : (
        <form ref={toggleRef} action={toggleTask}>
          <input type="hidden" name="id" value={id} />
          <label className="task-check-box">
            <input type="checkbox" defaultChecked={done} onChange={() => toggleRef.current?.requestSubmit()} />
            <span className="box" aria-hidden="true" />
          </label>
        </form>
      )}

      {locked ? (
        <span className="task-title-static">
          {context ? <span className="task-ctx">{context}</span> : null}
          {title}
        </span>
      ) : (
      <form ref={titleRef} action={updateTaskTitle} className="task-title-form">
        <input type="hidden" name="id" value={id} />
        <input
          type="text"
          name="title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim() && value !== title) titleRef.current?.requestSubmit();
            else if (!value.trim()) setValue(title);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setValue(title); (e.target as HTMLInputElement).blur(); }
          }}
          className="task-title-input"
        />
      </form>
      )}

      <Asignado
        tipo="tarea"
        id={id}
        asignadoId={asignadoId}
        asignadoNombre={asignadoNombre}
        opciones={asignables}
        canEdit={canEditOwner}
      />

      <TaskOwner id={id} owner={owner ?? null} sugerencias={responsables} canEdit={canEditOwner} />

      <TaskFechas
        id={id}
        coordinada={coordinada}
        realizada={realizada}
        done={done}
        hoy={hoy}
        canEdit={canEditOwner}
      />

      {!locked && (
        <form ref={deleteRef} action={deleteTask}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="task-del"
            title="Eliminar tarea"
            onClick={(e) => { if (!confirm("¿Eliminar esta tarea?")) e.preventDefault(); }}
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}
