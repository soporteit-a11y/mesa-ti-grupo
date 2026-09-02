"use client";

import { useRef, useState } from "react";
import { updatePhase, deletePhase } from "@/app/actions";
import type { Phase } from "@/lib/data";

/**
 * Cabecera de una fase. Para el admin se despliega en un pequeño editor con
 * titulo y fechas; para todos los demas es texto plano. Se abre con un clic en
 * el lapiz y no al hacer clic en el titulo, para no disparar el editor sin
 * querer al leer un cronograma largo.
 */
export function PhaseHeader({
  phase, rango, canEdit, numero,
}: {
  phase: Phase; rango: string | null; canEdit: boolean;
  /** Posicion de la fase dentro del cronograma, empezando en 1. */
  numero: number;
}) {
  const [editando, setEditando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!canEdit || !editando) {
    return (
      <div className="phase-head">
        <div className="phase-id">
          <span className="phase-title">
            <span className="phase-num">Fase {numero}</span>
            {phase.title}
          </span>
          {phase.context ? <span className="phase-ctx" title={phase.context}>{phase.context}</span> : null}
        </div>
        <div className="phase-meta">
          {rango ? <span className="phase-dates mono">{rango}</span> : <span className="phase-dates mono sin">Por definir</span>}
          <span className="phase-pct mono">{phase.progress}%</span>
          {canEdit && (
            <button type="button" className="phase-edit-btn" title="Editar fase" onClick={() => setEditando(true)}>
              ✎
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="phase-head editando">
      <form
        ref={formRef}
        action={async (fd) => {
          await updatePhase(fd);
          setEditando(false);
        }}
        className="phase-edit-form"
      >
        <input type="hidden" name="id" value={phase.id} />
        <input type="text" name="title" defaultValue={phase.title} className="phase-title-input" required />
        <label className="phase-date-lbl">
          Inicio
          <input type="date" name="start_date" defaultValue={phase.start_date?.slice(0, 10) || ""} />
        </label>
        <label className="phase-date-lbl">
          Fin
          <input type="date" name="end_date" defaultValue={phase.end_date?.slice(0, 10) || ""} />
        </label>
        <button type="submit" className="btn sm" title="Guardar">✓</button>
        <button type="button" className="btn sm" onClick={() => setEditando(false)}>Cancelar</button>
      </form>
      <form action={deletePhase}>
        <input type="hidden" name="id" value={phase.id} />
        <button
          type="submit"
          className="btn sm danger"
          title="Eliminar la fase (las tareas no se borran, quedan sin fase)"
          onClick={(e) => {
            if (!confirm("¿Eliminar esta fase?\n\nLas tareas NO se borran: quedan agrupadas en «Sin fase».")) {
              e.preventDefault();
            }
          }}
        >
          ✕
        </button>
      </form>
    </div>
  );
}
