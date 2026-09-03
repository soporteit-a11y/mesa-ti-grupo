"use client";

import { useEffect, useRef, useState } from "react";
import { reorderTasks } from "@/app/actions";
import { TaskItem } from "@/components/TaskItem";
import { type OpcionUsuario } from "@/components/Asignado";
import { hoyEnDias } from "@/lib/dates";

type Task = {
  id: number; done: boolean; title: string;
  context?: string | null; start_date?: string | null; end_date?: string | null;
  done_at?: string | null;
  owner?: string | null;
  assigned_user_id?: number | null; assigned_name?: string | null;
};

export function TaskList({
  initiativeId, tasks, locked = false, readOnly = false, responsables = [], canEditOwner = false,
  asignables = [], hoy,
}: {
  initiativeId: number; tasks: Task[];
  /**
   * Hoy en dias desde epoch, calculado UNA vez en el servidor y bajado como
   * prop. Si cada tarea lo calculara en el navegador, el valor del servidor y
   * el del cliente podrian caer en dias distintos (el servidor va en UTC) y la
   * hidratacion no cuadraria.
   */
  hoy?: number;
  /** Rol colaborador: solo marcar/desmarcar. Sin reordenar, renombrar ni borrar. */
  locked?: boolean;
  /** Colaborador sin permiso de edicion: ni siquiera puede marcar. */
  readOnly?: boolean;
  /** Responsables ya usados, para autocompletar. */
  responsables?: string[];
  canEditOwner?: boolean;
  /** Usuarios que pueden ver esta empresa, para asignar tareas. */
  asignables?: OpcionUsuario[];
}) {
  // Si nadie lo baja, se calcula aqui: peor para la hidratacion, pero mejor
  // que romperse. Ningun sitio deberia dejarlo sin pasar.
  const hoyEfectivo = hoy ?? hoyEnDias();
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

  if (locked || readOnly) {
    return (
      <div className="checklist">
        {items.map((t) => (
          <div className="task-drag-row" key={t.id}>
            <TaskItem
              id={t.id}
              done={t.done}
              title={t.title}
              context={t.context}
              coordinada={t.end_date ?? t.start_date ?? null}
              realizada={t.done_at ?? null}
              hoy={hoyEfectivo}
              owner={t.owner}
              responsables={responsables}
              canEditOwner={canEditOwner}
              asignadoId={t.assigned_user_id}
              asignadoNombre={t.assigned_name}
              asignables={asignables}
              locked
              readOnly={readOnly}
            />
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
          <TaskItem
            id={t.id}
            done={t.done}
            title={t.title}
            context={t.context}
            coordinada={t.end_date ?? t.start_date ?? null}
            realizada={t.done_at ?? null}
            hoy={hoyEfectivo}
            owner={t.owner}
            responsables={responsables}
            canEditOwner={canEditOwner}
            asignadoId={t.assigned_user_id}
            asignadoNombre={t.assigned_name}
            asignables={asignables}
          />
        </div>
      ))}
    </div>
  );
}
