import Link from "next/link";
import { redirect } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies, getVisibleCompanyIds } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { INITIATIVE_STATUS_LABEL } from "@/lib/priority";
import { Setup } from "@/components/Setup";
import { NewInitiativeDialog } from "@/components/NewInitiativeDialog";
import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { AddPhaseForm } from "@/components/AddPhaseForm";
import { PhaseBlock, fmtRango } from "@/components/PhaseBlock";
import { GanttChart } from "@/components/GanttChart";
import { Collapsible, ExpandirTodo } from "@/components/Collapsible";
import { InitiativeStatusControl } from "@/components/InitiativeStatusControl";
import { InitiativeTitle } from "@/components/InitiativeTitle";
import { InitiativeDueDate } from "@/components/InitiativeDueDate";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";

export const dynamic = "force-dynamic";

function dueInfo(dueDate: string | null, status: string) {
  if (!dueDate || status === "completado") return null;
  // due_date es un DATE ('2026-09-15'), no un instante: se parsea con hora local
  // para no correrlo un dia al convertir zonas (ver §5.8 de HANDOFF.md).
  const due = new Date(String(dueDate).slice(0, 10) + "T23:59:59");
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { cls: "crit", label: `Atrasado ${Math.abs(diffDays)}d` };
  if (diffDays <= 7) return { cls: "warn", label: `Vence en ${diffDays}d` };
  return { cls: "ok", label: `Vence en ${diffDays}d` };
}

export default async function CronogramasPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const esAdmin = me.role === "admin";
  const puedeMarcar = esAdmin || me.can_edit_schedule;

  let initiatives: any[], companies: any[], visibles: number[] | null;
  try {
    [initiatives, companies, visibles] = await Promise.all([
      getInitiatives(), getCompanies(), getVisibleCompanyIds(me),
    ]);
  } catch (e) {
    return <Setup />;
  }

  // El colaborador solo ve los cronogramas de las empresas que tenga asignadas
  // en /config. `visibles === null` significa admin (sin filtro).
  if (visibles !== null) {
    initiatives = initiatives.filter((i) => visibles!.includes(i.company_id));
    companies = companies.filter((c: any) => visibles!.includes(c.id));
  }

  const f = searchParams || {};
  const gantt = f.vista === "gantt";
  let rows = initiatives;
  if (f.company) rows = rows.filter((i) => i.company === f.company);

  const groups: Record<string, { color: string; items: any[] }> = {};
  for (const i of rows) {
    if (!groups[i.company]) groups[i.company] = { color: i.company_color, items: [] };
    groups[i.company].items.push(i);
  }

  const url = (vista: string | null) => {
    const p = new URLSearchParams();
    if (f.company) p.set("company", f.company);
    if (vista) p.set("vista", vista);
    const s = p.toString();
    return "/cronogramas" + (s ? "?" + s : "");
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Cronogramas</h1>
          <div className="sub">
            {esAdmin
              ? "Proyectos por empresa — fases, fechas y avance"
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
          <div className="vista-toggle">
            <Link href={url(null)} className={"btn sm" + (gantt ? "" : " active")}>Lista</Link>
            <Link href={url("gantt")} className={"btn sm" + (gantt ? " active" : "")}>Gantt</Link>
          </div>
          {!gantt && <ExpandirTodo alcance="crono." etiqueta="cronogramas" />}
          {!gantt && <ExpandirTodo alcance="fase." etiqueta="fases" />}
          <span className="fcount">{rows.length} cronograma(s)</span>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="big">🧭</div>
              {!esAdmin && companies.length === 0
                ? "Todavía no tienes ninguna empresa asignada. Pídele al administrador que te asigne una en Configuración."
                : "No hay cronogramas con este filtro."}
            </div>
          </div>
        ) : (
          Object.entries(groups).map(([company, g]) => (
            <section key={company} style={{ marginBottom: 28 }}>
              <div className="company-head">
                <span className="chip" style={{ background: g.color }}>{company}</span>
                <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
                  {g.items.length} cronograma(s)
                </span>
              </div>

              <div className={gantt ? "grid" : "grid g2"}>
                {g.items.map((i: any) => {
                  const due = dueInfo(i.due_date, i.status);
                  const rango = fmtRango(i.start_date, i.due_date);
                  const conFases = i.phases.length > 0;
                  const cabecera = (
                    <>
                      <div className="init-top">
                        <div className="init-head">
                          {esAdmin
                            ? <InitiativeTitle id={i.id} title={i.title} />
                            : <div className="init-title">{i.title}</div>}
                          <div className="init-sub">
                            {i.area ? <span className="area-tag">{i.area}</span> : null}
                            {conFases ? (
                              <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
                                {" "}· {i.phases.length} fases
                              </span>
                            ) : null}
                            {i.owner ? <span className="mono" style={{ color: "var(--muted)" }}> · {i.owner}</span> : null}
                          </div>
                          <div className="init-due-row">
                            {esAdmin ? (
                              <InitiativeDueDate id={i.id} dueDate={i.due_date} />
                            ) : rango ? (
                              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{rango}</span>
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
                    </>
                  );

                  const barra = (
                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${i.progress}%`, background: g.color }} />
                      </div>
                      <span className="progress-label mono">{i.done}/{i.total} · {i.progress}%</span>
                    </div>
                  );

                  const cuerpo = (
                    <>
                      {barra}

                      {gantt ? (
                        <GanttChart initiative={i} />
                      ) : (
                        <>
                          {i.phases.map((p: any) => (
                            <PhaseBlock
                              key={p.id}
                              initiativeId={i.id}
                              phase={p}
                              color={g.color}
                              canEdit={esAdmin}
                              canCheck={puedeMarcar}
                            />
                          ))}

                          {i.looseTasks.length > 0 && (
                            <div className={conFases ? "phase-block sinfase" : undefined}>
                              {conFases && (
                                <div className="phase-head">
                                  <div className="phase-id"><span className="phase-title">Sin fase</span></div>
                                </div>
                              )}
                              <TaskList
                                initiativeId={i.id}
                                tasks={i.looseTasks}
                                locked={!esAdmin}
                                readOnly={!puedeMarcar}
                              />
                            </div>
                          )}

                          {esAdmin && !conFases && <AddTaskForm initiativeId={i.id} />}
                          {esAdmin && <AddPhaseForm initiativeId={i.id} />}
                        </>
                      )}
                    </>
                  );

                  return (
                    <article className="card init-card" key={i.id}>
                      <Collapsible
                        storageKey={`crono.${i.id}`}
                        // Los cronogramas con fases (los de SINCO, muy largos)
                        // arrancan plegados; los planos y cortos, abiertos.
                        defaultOpen={!conFases}
                        head={cabecera}
                        meta={barra}
                      >
                        {cuerpo}
                      </Collapsible>
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
