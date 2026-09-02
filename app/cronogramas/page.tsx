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
import { Timeline } from "@/components/Timeline";
import { ProjectOverview } from "@/components/ProjectOverview";
import { Collapsible, ExpandirTodo } from "@/components/Collapsible";
import { diaDeFecha, hoyEnDias } from "@/lib/dates";
import { InitiativeStatusControl } from "@/components/InitiativeStatusControl";
import { InitiativeTitle } from "@/components/InitiativeTitle";
import { InitiativeDueDate } from "@/components/InitiativeDueDate";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";

export const dynamic = "force-dynamic";

function dueInfo(dueDate: unknown, status: string) {
  if (!dueDate || status === "completado") return null;
  // Se compara en dias enteros, no en milisegundos: due_date es un DATE sin
  // hora y mezclarlo con Date.now() daba resultados que bailaban segun la hora.
  const fin = diaDeFecha(dueDate);
  if (fin === null) return null;
  const diffDays = fin - hoyEnDias();
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
  const vista = f.vista === "gantt" || f.vista === "linea" ? f.vista : "lista";
  const gantt = vista === "gantt";
  const linea = vista === "linea";
  const compacta = gantt || linea;
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
            <Link href={url(null)} className={"btn sm" + (vista === "lista" ? " active" : "")}>Lista</Link>
            <Link href={url("gantt")} className={"btn sm" + (gantt ? " active" : "")}>Gantt</Link>
            <Link href={url("linea")} className={"btn sm" + (linea ? " active" : "")}>Línea de tiempo</Link>
          </div>
          {!compacta && <ExpandirTodo alcance="crono." etiqueta="cronogramas" />}
          {!compacta && <ExpandirTodo alcance="fase." etiqueta="fases" />}
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

              {/* Resumen global: solo tiene sentido si hay varios cronogramas
                  que comparar dentro de la misma empresa. */}
              {g.items.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <ProjectOverview initiatives={g.items} company={company} color={g.color} />
                </div>
              )}

              <div className={compacta ? "grid" : "grid g2"}>
                {g.items.map((i: any) => {
                  // El rango sale de las fases (calcStart/calcEnd), no de las
                  // columnas guardadas: esas se quedan viejas al mover una fase.
                  const rango = fmtRango(i.calcStart, i.calcEnd);
                  // Para el chip de vencimiento manda la fecha limite manual si
                  // existe; si no, el fin real del cronograma.
                  const due = dueInfo(i.due_date || i.calcEnd, i.status);
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
                              <InitiativeDueDate id={i.id} dueDate={i.due_date} rango={rango} />
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
                      ) : linea ? (
                        <Timeline initiative={i} />
                      ) : (
                        <>
                          {i.phases.map((p: any, idx: number) => (
                            <PhaseBlock
                              key={p.id}
                              initiativeId={i.id}
                              phase={p}
                              numero={idx + 1}
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
                        // La clave incluye la vista: lo que pliegues en Lista no
                        // debe plegarse tambien en Gantt, donde el grafico es
                        // justamente lo que quieres ver.
                        storageKey={`crono.${vista}.${i.id}`}
                        // En Gantt y Linea de tiempo el contenido es el grafico,
                        // asi que se abren. En Lista, los cronogramas con fases
                        // (los de SINCO, muy largos) arrancan plegados y los
                        // planos y cortos, abiertos.
                        defaultOpen={compacta || !conFases}
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
