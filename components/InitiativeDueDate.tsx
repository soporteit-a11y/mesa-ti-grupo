"use client";

import { useRef, useState } from "react";
import { updateInitiativeDueDate } from "@/app/actions";

/**
 * Fecha del cronograma.
 *
 * Por defecto muestra el **rango calculado a partir de sus fases** (`rango`),
 * que es el dato correcto y que se actualiza solo cuando mueves una fase. El
 * campo editable solo aparece al pulsar el lapiz, y sirve para fijar una fecha
 * limite distinta a la que sale del cronograma — por ejemplo un compromiso con
 * el cliente anterior al fin real de las tareas.
 *
 * Antes se mostraba directamente el input vacio con "mm/dd/yyyy", que no decia
 * nada y hacia parecer que el cronograma no tenia fechas cuando sus fases si.
 */
export function InitiativeDueDate({
  id, dueDate, rango,
}: {
  id: number;
  dueDate: string | null;
  /** Rango real derivado de las fases, ya formateado. */
  rango: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  if (!editando) {
    return (
      <span className="init-due-view">
        {rango ? (
          <span className="init-due-rango mono" title="Rango calculado a partir de las fases">{rango}</span>
        ) : (
          <span className="init-due-rango mono sin">Sin fechas</span>
        )}
        {dueDate ? (
          <span className="init-due-limite mono" title="Fecha límite fijada a mano">
            límite {String(dueDate).slice(0, 10).split("-").reverse().join("/")}
          </span>
        ) : null}
        <button
          type="button"
          className="phase-edit-btn"
          title="Fijar una fecha límite distinta"
          onClick={() => setEditando(true)}
        >
          ✎
        </button>
      </span>
    );
  }

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await updateInitiativeDueDate(fd);
        setEditando(false);
      }}
      className="init-due-form"
    >
      <input type="hidden" name="id" value={id} />
      <input
        type="date"
        name="due_date"
        defaultValue={dueDate ? String(dueDate).slice(0, 10) : ""}
        className="init-due-input"
        title="Fecha límite del cronograma"
        autoFocus
      />
      <button type="submit" className="btn sm" title="Guardar">✓</button>
      <button type="button" className="btn sm" onClick={() => setEditando(false)}>Cancelar</button>
    </form>
  );
}
