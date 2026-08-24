"use client";

import { useRef } from "react";
import { toggleTask } from "@/app/actions";

export function TaskToggle({ id, done, title }: { id: number; done: boolean; title: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={toggleTask} className="task-row">
      <input type="hidden" name="id" value={id} />
      <label className={"task-check" + (done ? " done" : "")}>
        <input
          type="checkbox"
          defaultChecked={done}
          onChange={() => ref.current?.requestSubmit()}
        />
        <span className="box" aria-hidden="true" />
        <span className="task-title">{title}</span>
      </label>
    </form>
  );
}
