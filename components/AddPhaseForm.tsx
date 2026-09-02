"use client";

import { useRef } from "react";
import { createPhase } from "@/app/actions";

export function AddPhaseForm({ initiativeId }: { initiativeId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await createPhase(fd);
        ref.current?.reset();
      }}
      className="add-phase"
    >
      <input type="hidden" name="initiative_id" value={initiativeId} />
      <input type="text" name="title" placeholder="+ Agregar fase" autoComplete="off" />
    </form>
  );
}
