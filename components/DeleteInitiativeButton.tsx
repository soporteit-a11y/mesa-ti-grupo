"use client";

import { deleteInitiative } from "@/app/actions";

export function DeleteInitiativeButton({ id }: { id: number }) {
  return (
    <form action={deleteInitiative}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="init-del"
        title="Eliminar cronograma"
        onClick={(e) => {
          if (!confirm("¿Eliminar este cronograma y todas sus tareas?")) e.preventDefault();
        }}
      >
        ✕
      </button>
    </form>
  );
}
