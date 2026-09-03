"use client";

import { useState } from "react";
import { updateInitiativeFechas } from "@/app/actions";
import { toYMD } from "@/lib/dates";

/**
 * Fechas de una etapa: inicio y fin, con calendario.
 *
 * Lo normal es no tocarlas — el rango sale solo de las fases y se mantiene al
 * dia cuando mueves una. El lapiz sirve para el caso contrario: declarar la
 * ventana de la etapa ("esto va de mayo a septiembre") aunque las fases todavia
 * no la cubran. Lo que se fija aqui manda, y es lo que dibuja el Gantt.
 *
 * Se puede fijar un solo extremo: fijas el fin y el inicio sigue saliendo de
 * las fases. Y vaciar los dos campos devuelve la etapa al calculo automatico,
 * que es la salida cuando te arrepientes.
 */
export function InitiativeFechas({
  id, startDate, dueDate, rango, derivado, desborde,
}: {
  id: number;
  /**
   * Inicio y fin fijados a mano, o null si salen del calculo.
   *
   * Se tipan como `unknown` a proposito: son columnas DATE, y el driver las
   * devuelve unas veces como texto y otras como objeto Date. Darlas por texto
   * es lo que ya tumbo /cronogramas una vez (ver toYMD en lib/dates.ts), asi
   * que aqui pasan siempre por toYMD antes de tocarlas.
   */
  startDate: unknown;
  dueDate: unknown;
  /** Rango efectivo (el fijado si lo hay, si no el calculado), ya formateado. */
  rango: string | null;
  /** Rango calculado de las fases, ya formateado. Solo para explicar. */
  derivado: string | null;
  /** Las fases se salen de la ventana declarada. */
  desborde: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const fijado = Boolean(startDate || dueDate);

  if (!editando) {
    return (
      <span className="init-due-view">
        {rango ? (
          <span
            className={"init-due-rango mono" + (fijado ? " fijado" : "")}
            title={
              fijado
                ? `Rango fijado a mano${derivado ? `. Las fases van de ${derivado}` : ""}`
                : "Rango calculado a partir de las fases"
            }
          >
            {rango}
          </span>
        ) : (
          <span className="init-due-rango mono sin">Sin fechas</span>
        )}
        {desborde && derivado ? (
          <span
            className="init-due-aviso"
            title={`Hay fases fuera de la ventana declarada: van de ${derivado}`}
          >
            fases fuera del rango
          </span>
        ) : null}
        <button
          type="button"
          className="phase-edit-btn"
          title="Fijar el inicio y el fin de esta etapa"
          onClick={() => setEditando(true)}
        >
          ✎
        </button>
      </span>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateInitiativeFechas(fd);
        setEditando(false);
      }}
      className="init-due-form"
    >
      <input type="hidden" name="id" value={id} />
      <label className="phase-date-lbl">
        Inicio
        <input type="date" name="start_date" defaultValue={toYMD(startDate) || ""} autoFocus />
      </label>
      <label className="phase-date-lbl">
        Fin
        <input type="date" name="due_date" defaultValue={toYMD(dueDate) || ""} />
      </label>
      <button type="submit" className="btn sm" title="Guardar">✓</button>
      <button type="button" className="btn sm" onClick={() => setEditando(false)}>Cancelar</button>
      <span className="init-due-hint">
        Vacíalos para volver al rango que sale de las fases
        {derivado ? ` (${derivado})` : ""}.
      </span>
    </form>
  );
}
