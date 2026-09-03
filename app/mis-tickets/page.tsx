import { redirect } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getTicketsByUser, getCompanies, getCollaborators, getCategories, getTicketDetail, getCanned } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { Setup } from "@/components/Setup";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { TicketOpenLink } from "@/components/TicketOpenLink";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";
import { STATUS_LABEL } from "@/lib/priority";
import { fmtDateDR as fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MisTicketsPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const me = await getCurrentUser();
  if (!me) redirect("/login");
  // Defensa en profundidad: el middleware ya redirige al visualizador, pero la
  // pagina no debe depender solo de eso. Un visualizador nunca reporta
  // tickets, asi que esta pantalla no le sirve de nada.
  if (me.role === "viewer") redirect("/cronogramas");

  let tickets: any[], companies: any[], collaborators: any[], cats: any[], canned: any[];
  try {
    [tickets, companies, collaborators, cats, canned] = await Promise.all([
      getTicketsByUser(me.id), getCompanies(), getCollaborators(), getCategories(), getCanned(),
    ]);
  } catch (e) {
    return <Setup />;
  }

  // El detalle solo se abre si el ticket es suyo: sin esta comprobacion,
  // cambiar el ?ticket= en la URL mostraria el de cualquier otra persona.
  let detail: any = null;
  if (searchParams?.ticket) {
    try {
      const d = await getTicketDetail(Number(searchParams.ticket));
      if (d && d.created_by === me.id) detail = d;
    } catch (e) {}
  }

  const abiertos = tickets.filter((t) => t.status !== "resuelto").length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mis reportes</h1>
          <div className="sub">Los tickets que has reportado a soporte</div>
        </div>
        <div className="push">
          <NewTicketDialog companies={companies} categories={cats.map((c) => c.name)} collaborators={collaborators} />
        </div>
      </div>

      <div className="content">
        <div className="filters">
          <span className="fcount">{tickets.length} reporte(s) · {abiertos} sin resolver</span>
        </div>

        {tickets.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="big">📝</div>
              Todavía no has reportado ningún ticket.<br />
              Usa el botón <b>Nuevo ticket</b> de arriba para crear el primero.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Asunto</th>
                  <th>Empresa</th>
                  <th>Categoría</th>
                  <th>Prioridad</th>
                  <th>Creado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td data-label="#" className="mono" style={{ color: "var(--muted)" }}>{t.id}</td>
                    <td data-label="Asunto"><TicketOpenLink id={t.id} title={t.title} /></td>
                    <td data-label="Empresa"><span className="chip" style={{ background: t.company_color }}>{t.company}</span></td>
                    <td data-label="Categoría" className="cat-tag">{t.category || "Otros"}</td>
                    <td data-label="Prioridad"><span className={"pri " + (t.priority || "Baja")}>{t.priority || "Baja"}</span></td>
                    <td data-label="Creado" className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(t.created_at)}</td>
                    <td data-label="Estado">
                      <span className={"status-pill " + t.status}>
                        {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <TicketDetailDialog
          ticket={detail}
          companies={companies}
          categories={cats}
          collaborators={collaborators}
          canned={canned}
          readOnly
        />
      )}
    </>
  );
}
