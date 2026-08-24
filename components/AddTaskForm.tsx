"use client";

import { useRef } from "react";
import { addTask } from "@/app/actions";

export function AddTaskForm({ initiativeId }: { initiativeId: number }) {
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
      <input type="text" name="title" placeholder="+ Agregar tarea" autoComplete="off" />
    </form>
  );
}
