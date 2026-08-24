"use client";

import { useRef, useState } from "react";
import { createCollaborator } from "@/app/actions";

export function CollaboratorsDialog({ collaborators, companies }: { collaborators: any[]; companies: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  const companyName = (id: number | null) => companies.find((c) => c.id === id)?.name || "";

  return (
    <>
      <button className="btn" onClick={() => ref.current?.showModal()}>
        Colaboradores
      </button>
      <dialog ref={ref}>
        <div className="dialog-head">
          <h3>Colaboradores</h3>
          <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
        </div>
        <div className="dialog-body">
          <form
            ref={formRef}
            action={async (fd) => {
              setBusy(true);
              await createCollaborator(fd);
              setBusy(false);
              formRef.current?.reset();
            }}
            className="collab-add"
          >
            <input type="text" name="name" placeholder="Nombre del colaborador" required />
            <select name="company_id" defaultValue="">
              <option value="">Empresa (opcional)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn primary sm" type="submit" disabled={busy}>{busy ? "..." : "Agregar"}</button>
          </form>
          <div className="collab-list">
            {collaborators.length === 0 ? (
              <p className="pv-meta">Aún no hay colaboradores.</p>
            ) : (
              collaborators.map((c) => (
                <div className="collab-item" key={c.id}>
                  <span>{c.name}</span>
                  {c.company_id ? <span className="pv-meta">{companyName(c.company_id)}</span> : null}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="dialog-foot">
          <span className="pv-meta mono">{collaborators.length} colaboradores</span>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>Cerrar</button>
        </div>
      </dialog>
    </>
  );
}
