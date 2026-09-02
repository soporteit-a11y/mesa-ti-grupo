"use client";

import { useRef } from "react";
import { addTask } from "@/app/actions";

export function AddTaskForm({
  initiativeId, phaseId,
}: {
  initiativeId: number;
  /** Si viene, la tarea nueva entra directo en esa fase. */
  phaseId?: number;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addTask(fd);
        ref.current?.reset();
      }}
      className="add-task"
    >
      <input type="hidden" name="initiative_id" value={initiativeId} />
      {phaseId ? <input type="hidden" name="phase_id" value={phaseId} /> : null}
      <input type="text" name="title" placeholder="+ Agregar tarea" autoComplete="off" />
    </form>
  );
}
