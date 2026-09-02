"use client";

import { useRef, useState } from "react";
import { updateTaskOwner } from "@/app/actions";

/**
 * Responsable de una tarea.
 *
 * Es texto libre y no un desplegable de colaboradores: los responsables que
 * trae el cronograma de SINCO son "SINCOSOFT", "MESSINA" y "SINCOSOFT -
 * MESSINA", que son empresas, no personas del sistema. El `datalist` ofrece los
 * valores ya usados para no tener que reescribirlos ni arriesgar erratas.
 */
export function TaskOwner({
  id, owner, sugerencias, canEdit,
}: {
  id: number;
  owner: string | null;
  sugerencias: string[];
  canEdit: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!canEdit) {
    return owner ? <span className="task-owner" title={`Responsable: ${owner}`}>{owner}</span> : null;
  }

  if (!editando) {
    return (
      <button
        type="button"
        className={"task-owner editable" + (owner ? "" : " vacio")}
        title={owner ? `Responsable: ${owner} — clic para cambiar` : "Asignar responsable"}
        onClick={() => setEditando(true)}
      >
        {owner || "+ responsable"}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await updateTaskOwner(fd);
        setEditando(false);
      }}
      className="task-owner-form"
    >
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="owner"
        defaultValue={owner ?? ""}
        list={`resp-${id}`}
        placeholder="Responsable"
        className="task-owner-input"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditando(false);
        }}
      />
      <datalist id={`resp-${id}`}>
        {sugerencias.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button type="submit" className="btn sm" title="Guardar">✓</button>
    </form>
  );
}
