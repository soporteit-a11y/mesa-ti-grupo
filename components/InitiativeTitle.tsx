"use client";

import { useRef, useState } from "react";
import { updateInitiativeTitle } from "@/app/actions";

export function InitiativeTitle({ id, title }: { id: number; title: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(title);

  return (
    <form ref={ref} action={updateInitiativeTitle} className="init-title-form">
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() && value !== title) ref.current?.requestSubmit();
          else if (!value.trim()) setValue(title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setValue(title); (e.target as HTMLInputElement).blur(); }
        }}
        className="init-title-input"
        title="Clic para editar el título de la ruta"
      />
    </form>
  );
}
