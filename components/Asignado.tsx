"use client";

import { useRef, useState } from "react";
import { assignTask, assignPhase } from "@/app/actions";

export type OpcionUsuario = { id: number; name: string };

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/**
 * Responsable interno de una fase o de una tarea.
 *
 * Es una cuenta del sistema, no el texto libre `owner` que viene del Excel del
 * proveedor: ese dice qué empresa responde ("SINCOSOFT - MESSINA"), este dice
 * qué persona de aquí lo tiene asignado. Por eso conviven los dos.
 *
 * Solo se ofrecen usuarios que pueden ver esa empresa (la lista ya llega
 * filtrada; el servidor lo vuelve a comprobar en assignTask/assignPhase).
 */
export function Asignado({
  tipo, id, asignadoId, asignadoNombre, opciones, canEdit,
}: {
  tipo: "fase" | "tarea";
  id: number;
  asignadoId: number | null;
  asignadoNombre: string | null;
  opciones: OpcionUsuario[];
  canEdit: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const accion = tipo === "fase" ? assignPhase : assignTask;

  if (!canEdit || !editando) {
    const chip = asignadoNombre ? (
      <span className="asig" title={`Asignado a ${asignadoNombre}`}>
        <span className="asig-ini">{iniciales(asignadoNombre)}</span>
        <span className="asig-nom">{asignadoNombre}</span>
      </span>
    ) : null;

    if (!canEdit) return chip;

    return (
      <button
        type="button"
        className={"asig editable" + (asignadoNombre ? "" : " vacio")}
        onClick={() => setEditando(true)}
        title={asignadoNombre ? `Asignado a ${asignadoNombre} — clic para cambiar` : "Asignar a alguien"}
      >
        {asignadoNombre ? (
          <>
            <span className="asig-ini">{iniciales(asignadoNombre)}</span>
            <span className="asig-nom">{asignadoNombre}</span>
          </>
        ) : (
          "+ asignar"
        )}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await accion(fd);
        setEditando(false);
      }}
      className="asig-form"
    >
      <input type="hidden" name="id" value={id} />
      <select
        name="user_id"
        defaultValue={asignadoId ?? ""}
        className="asig-select"
        autoFocus
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">— sin asignar —</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <button type="button" className="btn sm" onClick={() => setEditando(false)}>Cancelar</button>
    </form>
  );
}
