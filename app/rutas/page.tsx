import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies } from "@/lib/data";
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

  let initiatives: any[], companies: any[];
  try {
    [initiatives, companies] = await Promise.all([getInitiatives(), getCompanies()]);
  } catch (e) {
    return <Setup />;
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
          <div className="sub">Proyectos y tareas por empresa — avance de los servicios clave</div>
        </div>
        <div className="push">
          <NewInitiativeDialog companies={companies} />
        </div>
      </div>

      <div className="content">
        <div className="filters">
          <FiltersCompanyClient companies={companies} />
          <span className="fcount">{rows.length} rutas</span>
        </div>

        {rows.length === 0 ? (
          <div className="card"><div className="empty"><div className="big">🧭</div>No hay rutas con este filtro.</div></div>
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
                        <InitiativeTitle id={i.id} title={i.title} />
                        <div className="init-sub">
                          {i.area ? <span className="area-tag">{i.area}</span> : null}
                          {i.owner ? <span className="mono" style={{ color: "var(--muted)" }}> · {i.owner}</span> : null}
                        </div>
                        <div className="init-due-row">
                          <InitiativeDueDate id={i.id} dueDate={i.due_date} />
                          {due ? <span className={"sla-chip " + due.cls}>{due.label}</span> : null}
                        </div>
                      </div>
                      <div className="init-actions">
                        <InitiativeStatusControl id={i.id} status={i.status} />
                        <DeleteInitiativeButton id={i.id} />
                      </div>
                    </div>

                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${i.progress}%`, background: g.color }} />
                      </div>
                      <span className="progress-label mono">{i.done}/{i.total} · {i.progress}%</span>
                    </div>

                    <TaskList initiativeId={i.id} tasks={i.tasks} />
                    <AddTaskForm initiativeId={i.id} />
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
