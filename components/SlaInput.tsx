"use client";

import { useRef } from "react";
import { updateCategorySla } from "@/app/actions";

export function SlaInput({ id, hours }: { id: number; hours: number | null }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={updateCategorySla} className="cfg-sla-form" title="SLA objetivo (horas, prioridad Media)">
      <input type="hidden" name="id" value={id} />
      <input
        type="number"
        name="sla_hours"
        defaultValue={hours ?? 24}
        min={1}
        onBlur={() => ref.current?.requestSubmit()}
        className="cfg-sla-input"
      />
      <span className="cfg-sla-suffix">h</span>
    </form>
  );
}
