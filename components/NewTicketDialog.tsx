"use client";

import { useRef, useState } from "react";
import { createTicket } from "@/app/actions";
import { TICKET_CATEGORIES } from "@/lib/priority";

export function NewTicketDialog({ companies, categories, collaborators }: { companies: any[]; categories: string[]; collaborators: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  const catOptions = Array.from(new Set([...(categories || []), ...TICKET_CATEGORIES]));

  return (
    <>
      <button className="btn primary" onClick={() => ref.current?.showModal()}>
        + Nuevo ticket
      </button>
      <dialog ref={ref}>
        <form
          action={async (fd) => {
            setBusy(true);
            await createTicket(fd);
            setBusy(false);
            ref.current?.close();
          }}
        >
          <div className="dialog-head">
            <h3>Nuevo ticket</h3>
            <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
          </div>
          <div className="dialog-body form-grid">
            <div className="field">
              <label>Asunto *</label>
              <input type="text" name="title" required placeholder="Describe el requerimiento en una línea" />
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea name="description" placeholder="Detalle del caso..." />
            </div>
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
                <label>Categoría</label>
                <select name="category" defaultValue="Otros">
                  {catOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Prioridad</label>
                <select name="priority" defaultValue="Baja">
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="field">
                <label>Solicitante</label>
                <select name="requester" defaultValue="">
                  <option value="">— sin asignar —</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="dialog-foot">
            <span className="pv-meta mono">Entra como "Nuevo" en la bandeja</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={() => ref.current?.close()}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "Creando..." : "Crear ticket"}</button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
