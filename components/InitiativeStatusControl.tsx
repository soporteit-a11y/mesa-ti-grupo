"use client";

import { useRef } from "react";
import { setInitiativeStatus } from "@/app/actions";
import { INITIATIVE_STATUSES, INITIATIVE_STATUS_LABEL } from "@/lib/priority";

export function InitiativeStatusControl({ id, status }: { id: number; status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setInitiativeStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className={"init-status " + status}
        style={{ cursor: "pointer" }}
      >
        {INITIATIVE_STATUSES.map((s) => (
          <option key={s} value={s}>{INITIATIVE_STATUS_LABEL[s]}</option>
        ))}
      </select>
    </form>
  );
}
