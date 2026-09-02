import { redirect } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies, getVisibleCompanyIds } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { INITIATIVE_STATUS_LABEL } from "@/lib/priority";
import { Setup } from "@/components/Setup";
import { NewInitiativeDialog } from "@/components/NewInitiativeDialog";
import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { InitiativeStatusControl } from "@/components/InitiativeStatusControl";
import { InitiativeTitle } from "@/components/InitiativeTitle";
import { InitiativeDueDate } from "@/components/InitiativeDueDate";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";

export const dynamic = "force-dynamic";

/**
 * due_date es una columna DATE ('2026-09-15'), no un instante. No se puede usar
 * fmtDateDR de lib/dates.ts: esa funcion convierte a la zona de RD, y una fecha
 * sin hora se interpreta como medianoche UTC, que en RD (UTC-4) cae el dia
 * anterior. Aqui se formatea el texto tal cual viene.
 */
function fmtDateOnly(d: string): string {
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function dueInfo(dueDate: string | null, status: string) {
  if (!dueDate || status === "completado") return null;
  const due = new Date(dueDate + "T23:59:59");
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { cls: "crit", label: `Atrasado ${Math.abs(diffDays)}d` };
  if (diffDays <= 7) return { cls: "warn", label: `Vence en ${diffDays}d` };
  return { cls: "ok", label: `Vence en ${diffDays}d` };
}

export default async function RutasPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const esAdmin = me.role === "admin";

  let initiatives: any[], companies: any[], visibles: number[] | null;
  try {
    [initiatives, companies, visibles] = await Promise.all([
      getInitiatives(), getCompanies(), getVisibleCompanyIds(me),
    ]);
  } catch (e) {
    return <Setup />;
  }

  // El colaborador solo ve las rutas de las empresas que tenga asignadas en
  // /config. `visibles === null` significa admin (sin filtro).
  if (visibles !== null) {
    initiatives = initiatives.filter((i) => visibles!.includes(i.company_id));
    companies = companies.filter((c: any) => visibles!.includes(c.id));
  }

  const f = searchParams || {};
  let rows = initiatives;
  if (f.company) rows = rows.filter((i) => i.company === f.company);

  // Agrupar por empresa
  const groups: Record<string, { color: string; items: any[] }> = {};
  for (const i of rows) {
    if (!groups[i.company]) groups[i.company] = { color: i.company_color, items: [] };
    groups[i.company].items.push(i);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Rutas de trabajo</h1>
          <div className="sub">
            {esAdmin
              ? "Proyectos y tareas por empresa — avance de los servicios clave"
              : "Avance de los proyectos de las empresas que tienes asignadas"}
          </div>
        </div>
        {esAdmin && (
          <div className="push">
            <NewInitiativeDialog companies={companies} />
          </div>
        )}
      </div>

      <div className="content">
        <div className="filters">
          <FiltersCompanyClient companies={companies} />
          <span className="fcount">{rows.length} rutas</span>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="big">🧭</div>
              {esAdmin
                ? "No hay rutas con este filtro."
                : companies.length === 0
                ? "Todavía no tienes ninguna empresa asignada. Pídele al administrador que te asigne una en Configuración."
                : "No hay rutas con este filtro."}
            </div>
          </div>
        ) : (
          Object.entries(groups).map(([company, g]) => (
            <section key={company} style={{ marginBottom: 28 }}>
              <div className="company-head">
                <span className="chip" style={{ background: g.color }}>{company}</span>
                <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{g.items.length} ruta(s)</span>
              </div>
              <div className="grid g2">
                {g.items.map((i) => {
                  const due = dueInfo(i.due_date, i.status);
                  return (
                  <article className="card init-card" key={i.id}>
                    <div className="init-top">
                      <div className="init-head">
                        {esAdmin
                          ? <InitiativeTitle id={i.id} title={i.title} />
                          : <div className="init-title">{i.title}</div>}
                        <div className="init-sub">
                          {i.area ? <span className="area-tag">{i.area}</span> : null}
                          {i.owner ? <span className="mono" style={{ color: "var(--muted)" }}> · {i.owner}</span> : null}
                        </div>
                        <div className="init-due-row">
                          {esAdmin ? (
                            <InitiativeDueDate id={i.id} dueDate={i.due_date} />
                          ) : i.due_date ? (
                            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                              Entrega {fmtDateOnly(i.due_date)}
                            </span>
                          ) : null}
                          {due ? <span className={"sla-chip " + due.cls}>{due.label}</span> : null}
                        </div>
                      </div>
                      <div className="init-actions">
                        {esAdmin ? (
                          <>
                            <InitiativeStatusControl id={i.id} status={i.status} />
                            <DeleteInitiativeButton id={i.id} />
                          </>
                        ) : (
                          <span className={"init-status " + i.status}>
                            {INITIATIVE_STATUS_LABEL[i.status as keyof typeof INITIATIVE_STATUS_LABEL] || i.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${i.progress}%`, background: g.color }} />
                      </div>
                      <span className="progress-label mono">{i.done}/{i.total} · {i.progress}%</span>
                    </div>

                    <TaskList initiativeId={i.id} tasks={i.tasks} locked={!esAdmin} />
                    {esAdmin && <AddTaskForm initiativeId={i.id} />}
                  </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
