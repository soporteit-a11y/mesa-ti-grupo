"use client";

import { useRef, useState } from "react";
import { createInitiative } from "@/app/actions";

export function NewInitiativeDialog({ companies }: { companies: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button className="btn primary" onClick={() => ref.current?.showModal()}>
        + Nuevo cronograma
      </button>
      <dialog ref={ref}>
        <form
          action={async (fd) => {
            setBusy(true);
            await createInitiative(fd);
            setBusy(false);
            ref.current?.close();
          }}
        >
          <div className="dialog-head">
            <h3>Nuevo cronograma</h3>
            <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
          </div>
          <div className="dialog-body form-grid">
            <div className="row2">
              <div className="field">
                <label>Empresa *</label>
                <select name="company_id" required defaultValue="">
                  <option value="" disabled>Selecciona...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area / servicio</label>
                <input type="text" name="area" placeholder="Ej: Fortinet, SINCO ERP, Cisco..." />
              </div>
            </div>
            <div className="field">
              <label>Titulo del cronograma *</label>
              <input type="text" name="title" required placeholder="Ej: Aseguramiento perimetral FortiGate" />
            </div>
            <div className="row2">
              <div className="field">
                <label>Responsable</label>
                <input type="text" name="owner" placeholder="Quien lidera" />
              </div>
              <div className="field">
                <label>Fecha límite</label>
                <input type="date" name="due_date" />
              </div>
            </div>
            <div className="field">
              <label>Tareas (una por linea)</label>
              <textarea name="tasks" rows={5} placeholder={"Inventario de equipos\nRevisar politicas\nPlan de actualizacion"} />
            </div>
          </div>
          <div className="dialog-foot">
            <span className="pv-meta mono">Las tareas se convierten en checklist con avance</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={() => ref.current?.close()}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "Creando..." : "Crear cronograma"}</button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
