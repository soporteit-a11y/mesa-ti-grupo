"use client";

import { useEffect, useRef, useState } from "react";
import { reorderTasks } from "@/app/actions";
import { TaskItem } from "@/components/TaskItem";

type Task = { id: number; done: boolean; title: string };

export function TaskList({
  initiativeId, tasks, locked = false,
}: {
  initiativeId: number; tasks: Task[];
  /** Rol colaborador: solo marcar/desmarcar. Sin reordenar, renombrar ni borrar. */
  locked?: boolean;
}) {
  const [items, setItems] = useState<Task[]>(tasks);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const persist = (next: Task[]) => {
    const fd = new FormData();
    fd.set("initiative_id", String(initiativeId));
    fd.set("order", next.map((t) => t.id).join(","));
    reorderTasks(fd);
  };

  // El arrastrar-soltar de HTML5 no existe en pantallas tactiles:
  // en movil se reordena con estos botones (ver .task-move en globals.css).
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persist(next);
  };

  const onDrop = (index: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === index) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setItems(next);
    persist(next);
  };

  if (locked) {
    return (
      <div className="checklist">
        {items.map((t) => (
          <div className="task-drag-row" key={t.id}>
            <TaskItem id={t.id} done={t.done} title={t.title} locked />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="checklist">
      {items.map((t, i) => (
        <div
          key={t.id}
          draggable
          onDragStart={() => (dragIndex.current = i)}
          onDragOver={(e) => {
            e.preventDefault();
            if (overIndex !== i) setOverIndex(i);
          }}
          onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
          onDrop={() => onDrop(i)}
          onDragEnd={() => {
            dragIndex.current = null;
            setOverIndex(null);
          }}
          className={"task-drag-row" + (overIndex === i ? " over" : "")}
        >
          <span className="task-handle" aria-hidden="true" title="Arrastrar para reordenar">⠿</span>
          <div className="task-move">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir tarea">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar tarea">▼</button>
          </div>
          <TaskItem id={t.id} done={t.done} title={t.title} />
        </div>
      ))}
    </div>
  );
}
