"use client";

import { useState } from "react";
import { setTaskDoneAt } from "@/app/actions";
import { toYMD, fmtDiaMes } from "@/lib/dates";

/**
 * Las dos fechas de una tarea: la **coordinada** (cuando se acordo que estaria)
 * y la **realizada** (cuando se hizo de verdad). Tenerlas juntas es lo que
 * convierte "hecho" en "hecho a tiempo" o "hecho con 12 dias de retraso".
 *
 * Reglas de lectura, en orden:
 *  - sin fecha coordinada  -> no hay contra que medir, solo se muestra lo que haya
 *  - hecha a tiempo        -> se dice, en verde, sin numeros que no aportan
 *  - hecha tarde           -> los dias de mas, que es el dato que importa
 *  - sin hacer y vencida   -> los dias que lleva vencida, contra hoy
 *  - hecha sin fecha real  -> "sin fecha": son las tareas que ya estaban
 *    marcadas antes de que el sistema guardara esto. No se inventa nada.
 */
export function TaskFechas({
  id, coordinada, realizada, done, hoy, canEdit,
}: {
  id: number;
  /** Fecha comprometida (end_date de la tarea). */
  coordinada: unknown;
  /** Fecha real de ejecucion (done_at). */
  realizada: unknown;
  done: boolean;
  /** Hoy en dias desde epoch, calculado en el servidor para no discrepar. */
  hoy: number;
  canEdit: boolean;
}) {
  const [editando, setEditando] = useState(false);

  const coordYMD = toYMD(coordinada);
  const realYMD = toYMD(realizada);
  const enDias = (ymd: string | null) => {
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };
  const dCoord = enDias(coordYMD);
  const dReal = enDias(realYMD);

  // Dias de desvio: contra la fecha real si ya se hizo, contra hoy si no.
  let desvio: number | null = null;
  if (dCoord !== null) desvio = (done ? dReal : hoy) !== null ? ((done ? dReal! : hoy) - dCoord) : null;

  let estado: { cls: string; txt: string } | null = null;
  if (dCoord === null) {
    estado = null;
  } else if (done && dReal === null) {
    estado = { cls: "nd", txt: "sin fecha" };
  } else if (desvio !== null && desvio > 0) {
    estado = { cls: "tarde", txt: `+${desvio} d` };
  } else if (done) {
    estado = { cls: "ok", txt: "a tiempo" };
  } else if (desvio !== null && desvio < 0) {
    estado = null; // aun no vence: no hay nada que reportar
  }

  if (editando && canEdit) {
    return (
      <form
        action={async (fd) => {
          await setTaskDoneAt(fd);
          setEditando(false);
        }}
        className="tf-form"
      >
        <input type="hidden" name="id" value={id} />
        <label className="tf-lbl">
          Realizada
          <input type="date" name="done_at" defaultValue={realYMD || ""} autoFocus />
        </label>
        <button type="submit" className="btn sm" title="Guardar">✓</button>
        <button type="button" className="btn sm" onClick={() => setEditando(false)}>Cancelar</button>
      </form>
    );
  }

  const cuerpo = (
    <>
      {coordYMD ? (
        <span className="tf-coord mono" title="Fecha coordinada">{fmtDiaMes(coordYMD)}</span>
      ) : (
        <span className="tf-coord mono sin" title="Sin fecha coordinada">—</span>
      )}
      {done && realYMD ? (
        <span className="tf-real mono" title="Fecha en que se realizó">→ {fmtDiaMes(realYMD)}</span>
      ) : null}
      {estado ? <span className={"tf-estado " + estado.cls}>{estado.txt}</span> : null}
    </>
  );

  // Solo se puede corregir la fecha real de algo que ya esta hecho: en una
  // tarea sin marcar no hay ninguna fecha real que corregir.
  if (!canEdit || !done) return <span className="tf">{cuerpo}</span>;

  return (
    <button
      type="button"
      className="tf editable"
      onClick={() => setEditando(true)}
      title="Corregir la fecha en que se realizó"
    >
      {cuerpo}
    </button>
  );
}
