"use client";

import { useRef } from "react";
import { updateInitiativeDueDate } from "@/app/actions";

export function InitiativeDueDate({ id, dueDate }: { id: number; dueDate: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={updateInitiativeDueDate} className="init-due-form">
      <input type="hidden" name="id" value={id} />
      <input
        type="date"
        name="due_date"
        defaultValue={dueDate ?? ""}
        onChange={() => ref.current?.requestSubmit()}
        className="init-due-input"
        title="Fecha límite de la ruta"
      />
    </form>
  );
}
