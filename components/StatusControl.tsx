"use client";

import { useRef } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES, STATUS_LABEL } from "@/lib/priority";

export function StatusControl({ id, status }: { id: number; status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className={"status-pill " + status}
        style={{ cursor: "pointer", paddingRight: 22 }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
