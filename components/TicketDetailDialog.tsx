"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { updateTicket, addComment } from "@/app/actions";
import { StatusControl } from "@/components/StatusControl";
import { slaInfo, fmtSlaHours } from "@/lib/priority";

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function SlaBadge({ ticket }: { ticket: any }) {
  const s = slaInfo(ticket.created_at, ticket.resolved_at, ticket.status, ticket.cat_sla ?? 24, ticket.priority || "Baja");
  if (s.closed) {
    return s.onTime
      ? <span className="sla-chip ok">Cumplido en {s.targetHours}h objetivo</span>
      : <span className="sla-chip crit">Fuera de SLA (objetivo {s.targetHours}h)</span>;
  }
  if (!s.onTime) return <span className="sla-chip crit">Vencido hace {fmtSlaHours(s.hoursLeft)} · objetivo {s.targetHours}h</span>;
  return <span className={"sla-chip" + (s.hoursLeft <= 2 ? " warn" : "")}>Vence en {fmtSlaHours(s.hoursLeft)} · objetivo {s.targetHours}h</span>;
}

export function TicketDetailDialog({
  ticket, companies, categories, collaborators, canned,
}: {
  ticket: any; companies: any[]; categories: any[]; collaborators: any[]; canned: any[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const commentFormRef = useRef<HTMLFormElement>(null);
  const commentTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, [ticket.id]);

  const close = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("ticket");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <dialog
      ref={ref}
      className="ticket-detail"
      onClose={close}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="dialog-head">
        <div>
          <h3>Ticket #{ticket.id}</h3>
          <div className="ticket-meta-row">
            <span className="pv-meta">Creado {fmtDateTime(ticket.created_at)}</span>
            <StatusControl id={ticket.id} status={ticket.status} />
          </div>
          <div className="ticket-meta-row" style={{ marginTop: 6 }}>
            <SlaBadge ticket={ticket} />
          </div>
        </div>
        <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
      </div>

      <div className="dialog-body">
        <form
          action={async (fd) => {
            setSavingTicket(true);
            await updateTicket(fd);
            setSavingTicket(false);
          }}
          className="form-grid"
        >
          <input type="hidden" name="id" value={ticket.id} />
          <div className="field">
            <label>Asunto *</label>
            <input type="text" name="title" defaultValue={ticket.title} required />
          </div>
          <div className="field">
            <label>Descripción / comentario original</label>
            <textarea name="description" defaultValue={ticket.description || ""} rows={4} placeholder="Sin descripción" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Empresa *</label>
              <select name="company_id" defaultValue={ticket.company_id} required>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select name="category" defaultValue={ticket.category || "Otros"}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Prioridad</label>
              <select name="priority" defaultValue={ticket.priority || "Baja"}>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div className="field">
              <label>Solicitante</label>
              <select name="requester" defaultValue={ticket.requester || ""}>
                <option value="">— sin asignar —</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn primary" disabled={savingTicket}>
            {savingTicket ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        <div className="comments-block">
          <div className="cfg-head">Comentarios <span className="cfg-count">{ticket.comments.length}</span></div>
          <div className="comments-list">
            {ticket.comments.length === 0 ? (
              <p className="pv-meta">Sin comentarios aún. Agrega el primero abajo.</p>
            ) : (
              ticket.comments.map((c: any) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-top">
                    <b>{c.author || "Sin nombre"}</b>
                    <span className="pv-meta">{fmtDateTime(c.created_at)}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))
            )}
          </div>

          {canned.length > 0 && (
            <select
              className="canned-select"
              defaultValue=""
              onChange={(e) => {
                const chosen = canned.find((c) => String(c.id) === e.target.value);
                if (chosen && commentTextRef.current) {
                  commentTextRef.current.value = chosen.text;
                  commentTextRef.current.focus();
                }
                e.target.value = "";
              }}
            >
              <option value="" disabled>💬 Insertar respuesta rápida...</option>
              {canned.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}

          <form
            ref={commentFormRef}
            action={async (fd) => {
              setSavingComment(true);
              await addComment(fd);
              setSavingComment(false);
              commentFormRef.current?.reset();
            }}
            className="comment-add"
          >
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <input type="text" name="author" placeholder="Tu nombre" />
            <textarea ref={commentTextRef} name="text" placeholder="Agregar comentario..." required rows={2} />
            <button type="submit" className="btn primary sm" disabled={savingComment}>
              {savingComment ? "..." : "Comentar"}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
