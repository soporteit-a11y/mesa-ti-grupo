"use client";

import { useRef } from "react";
import { setTicketRequester } from "@/app/actions";

export function RequesterControl({ id, requester, collaborators }: { id: number; requester: string | null; collaborators: any[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const names = collaborators.map((c) => c.name);
  const cur = requester || "";
  const extra = cur && !names.includes(cur) ? [cur] : [];

  return (
    <form ref={ref} action={setTicketRequester}>
      <input type="hidden" name="id" value={id} />
      <select
        name="requester"
        defaultValue={cur}
        onChange={() => ref.current?.requestSubmit()}
        className="req-select"
      >
        <option value="">— sin asignar —</option>
        {extra.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
        {collaborators.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </form>
  );
}
