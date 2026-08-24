import { hasDb } from "@/lib/db";
import { getTickets, getCompanies, getCollaborators, getCategories, getTicketDetail, getCanned } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { CollaboratorsDialog } from "@/components/CollaboratorsDialog";
import { Filters } from "@/components/Filters";
import { StatusControl } from "@/components/StatusControl";
import { RequesterControl } from "@/components/RequesterControl";
import { TicketOpenLink } from "@/components/TicketOpenLink";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";
import { slaInfo, fmtSlaHours } from "@/lib/priority";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function SlaCell({ t }: { t: any }) {
  const s = slaInfo(t.created_at, t.resolved_at, t.status, t.cat_sla ?? 24, t.priority || "Baja");
  if (s.closed) {
    return s.onTime
      ? <span className="sla-chip ok">Cumplido</span>
      : <span className="sla-chip crit">Fuera de SLA</span>;
  }
  if (!s.onTime) return <span className="sla-chip crit">Vencido {fmtSlaHours(s.hoursLeft)}</span>;
  if (s.hoursLeft <= 2) return <span className="sla-chip warn">Vence en {fmtSlaHours(s.hoursLeft)}</span>;
  return <span className="sla-chip">Vence en {fmtSlaHours(s.hoursLeft)}</span>;
}

export default async function TicketsPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  let tickets: any[], companies: any[], collaborators: any[], cats: any[], canned: any[];
  try {
    [tickets, companies, collaborators, cats, canned] = await Promise.all([
      getTickets(), getCompanies(), getCollaborators(), getCategories(), getCanned(),
    ]);
  } catch (e) {
    return <Setup />;
  }

  const categories = Array.from(
    new Set([...cats.map((c) => c.name), ...tickets.map((t) => t.category).filter(Boolean)])
  ).sort();

  const f = searchParams || {};
  let rows = tickets;
  if (f.company) rows = rows.filter((t) => t.company === f.company);
  if (f.category) rows = rows.filter((t) => t.category === f.category);
  if (f.priority) rows = rows.filter((t) => t.priority === f.priority);
  if (f.requester) rows = rows.filter((t) => t.requester === f.requester);
  if (f.status === "abiertos") rows = rows.filter((t) => t.status !== "resuelto");
  else if (f.status) rows = rows.filter((t) => t.status === f.status);

  let detail: any = null;
  if (f.ticket) {
    try {
      detail = await getTicketDetail(Number(f.ticket));
    } catch (e) {}
  }

  // Aviso de SLA. Se calcula sobre TODOS los tickets, no sobre los filtrados:
  // es una alerta global, no debe cambiar segun lo que estes mirando.
  // Reutiliza los tickets ya cargados, sin consulta extra.
  const vencidos = tickets.filter((t) => {
    const s = slaInfo(t.created_at, t.resolved_at, t.status, t.cat_sla ?? 24, t.priority || "Baja");
    return !s.closed && !s.onTime;
  }).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mesa de ayuda</h1>
          <div className="sub">Tickets de soporte de todas las empresas</div>
        </div>
        <div className="push">
          <CollaboratorsDialog collaborators={collaborators} companies={companies} />
          <NewTicketDialog companies={companies} categories={categories} collaborators={collaborators} />
        </div>
      </div>

      <div className="content">
        {vencidos > 0 && (
          <a href="/tickets?status=abiertos" className="alert-bar">
            <span className="ab-ic" aria-hidden="true">!</span>
            <span className="ab-txt">
              <b>{vencidos}</b>{" "}
              {vencidos === 1
                ? "ticket abierto está fuera de SLA"
                : "tickets abiertos están fuera de SLA"}
            </span>
            <span className="ab-cta">Ver abiertos →</span>
          </a>
        )}

        <Filters companies={companies} categories={categories} collaborators={collaborators} count={rows.length} />

        {rows.length === 0 ? (
          <div className="card"><div className="empty"><div className="big">🗂️</div>No hay tickets con estos filtros.</div></div>
        ) : (
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Asunto</th>
                  <th>Solicitante</th>
                  <th>Empresa</th>
                  <th>Categoría</th>
                  <th>Prioridad</th>
                  <th>SLA</th>
                  <th>Creado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td data-label="#" className="mono" style={{ color: "var(--muted)" }}>{t.id}</td>
                    <td data-label="Asunto"><TicketOpenLink id={t.id} title={t.title} /></td>
                    <td data-label="Solicitante"><RequesterControl id={t.id} requester={t.requester} collaborators={collaborators} /></td>
                    <td data-label="Empresa"><span className="chip" style={{ background: t.company_color }}>{t.company}</span></td>
                    <td data-label="Categoría" className="cat-tag">{t.category || "Otros"}</td>
                    <td data-label="Prioridad"><span className={"pri " + (t.priority || "Baja")}>{t.priority || "Baja"}</span></td>
                    <td data-label="SLA"><SlaCell t={t} /></td>
                    <td data-label="Creado" className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(t.created_at)}</td>
                    <td data-label="Estado"><StatusControl id={t.id} status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <TicketDetailDialog ticket={detail} companies={companies} categories={cats} collaborators={collaborators} canned={canned} />
      )}
    </>
  );
}
