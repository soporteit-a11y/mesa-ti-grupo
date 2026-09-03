import Link from "next/link";
import { redirect } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies, getVisibleCompanyIds, getAsignables } from "@/lib/data";
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
import { InitiativeFechas } from "@/components/InitiativeFechas";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";
import { AtrasoEtapa } from "@/components/AtrasoEtapa";
import { calcularAtraso } from "@/lib/atraso";
import { AvisoVencimientos } from "@/components/AvisoVencimientos";
import { getPendientes } from "@/lib/recordatorios";

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
  // Explicito por rol, no solo por el flag: un visualizador nunca marca,
  // aunque por algun motivo can_edit_schedule quedara en true en su fila.
  const puedeMarcar = esAdmin || (me.role === "agent" && me.can_edit_schedule);

  // Hoy se calcula UNA vez, en el servidor, y baja como prop a todo lo que lo
  // necesite. Si cada componente cliente lo recalculara, el navegador y el
  // servidor podrian caer en dias distintos (el servidor va en UTC) y la
  // hidratacion pintaria cosas distintas.
  const hoy = hoyEnDias();

  let initiatives: any[], companies: any[], visibles: number[] | null, asignables: any[];
  try {
    [initiatives, companies, visibles, asignables] = await Promise.all([
      getInitiatives(), getCompanies(), getVisibleCompanyIds(me),
      // Solo el admin asigna, asi que para los demas ni se consulta.
      esAdmin ? getAsignables() : Promise.resolve([]),
    ]);
  } catch (e) {
    return <Setup />;
  }

  // Lo que vence esta semana. Solo de las empresas que esta persona ve, para
  // que un colaborador no reciba avisos de proyectos que ni puede abrir.
  let pendientes: Awaited<ReturnType<typeof getPendientes>> = [];
  try {
    pendientes = await getPendientes(visibles);
  } catch (e) {
    // El aviso es un extra: si falla, la pagina sigue sirviendo para lo suyo.
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

  // Responsables ya usados en cualquier tarea, para autocompletar al asignar.
  const responsables = Array.from(
    new Set(
      initiatives.flatMap((i: any) => i.tasks.map((t: any) => t.owner).filter(Boolean))
    )
  ).sort() as string[];

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
        <AvisoVencimientos items={pendientes} mio={!esAdmin} />
        <div className="filters">
          <FiltersCompanyClient companies={companies} />
          <div className="vista-toggle">
            <Link href={url(null)} className={"btn sm" + (vista === "lista" ? " active" : "")}>Lista</Link>
            <Link href={url("gantt")} className={"btn sm" + (gantt ? " active" : "")}>Gantt</Link>
            <Link href={url("linea")} className={"btn sm" + (linea ? " active" : "")}>Línea de tiempo</Link>
          </div>
          {/* El de etapas vive en el resumen de arriba (DesplegarEtapas); aqui
              solo queda el de fases, que es de otro nivel. */}
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

              {(() => {
                const etapasGrid = (
                  <div className={compacta ? "grid" : "grid g2"}>
                    {g.items.map((i: any) => {
                  // Solo se ofrece a quien puede ver esta empresa: asignarle
                  // trabajo a alguien que no puede abrir el cronograma no
                  // serviria de nada (el servidor lo revalida igual).
                  const asignablesAqui = asignables
                    .filter((u: any) => u.role === "admin" || u.company_ids.includes(i.company_id))
                    .map((u: any) => ({ id: u.id, name: u.name }));
                  // Rango efectivo: el fijado a mano si lo hay, si no el que
                  // sale de las fases (ver Initiative.calcStart en lib/data.ts).
                  const rango = fmtRango(i.calcStart, i.calcEnd);
                  const derivado = fmtRango(i.derivStart, i.derivEnd);
                  // Aviso cuando las fases se salen de la ventana declarada: es
                  // justo el caso que hay que ver, porque significa que el plan
                  // real ya no cabe en el compromiso.
                  const desborde = Boolean(
                    (i.start_date && i.derivStart && i.derivStart < i.calcStart!) ||
                    (i.due_date && i.derivEnd && i.derivEnd > i.calcEnd!)
                  );
                  const due = dueInfo(i.calcEnd, i.status);
                  // Retraso propio de ESTA etapa: se mide contra su calendario
                  // y su avance, sin mezclarse con el de las demas.
                  const atraso = calcularAtraso(
                    i.calcStart, i.calcEnd, i.progress, hoy, i.phases, i.tasks,
                  );
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
                              <InitiativeFechas
                                id={i.id}
                                startDate={i.start_date}
                                dueDate={i.due_date}
                                rango={rango}
                                derivado={derivado}
                                desborde={desborde}
                              />
                            ) : rango ? (
                              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{rango}</span>
                            ) : null}
                            {due ? <span className={"sla-chip " + due.cls}>{due.label}</span> : null}
                            <AtrasoEtapa atraso={atraso} />
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
                              responsables={responsables}
                              asignables={asignablesAqui}
                              hoy={hoy}
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
                                responsables={responsables}
                                canEditOwner={esAdmin}
                                asignables={asignablesAqui}
                                hoy={hoy}
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
                    // El id es el destino del scroll al pulsar una barra del Gantt.
                    <article className="card init-card" id={`crono-${i.id}`} key={i.id}>
                      <Collapsible
                        // La clave incluye la vista: lo que pliegues en Lista no
                        // debe plegarse tambien en Gantt.
                        storageKey={`crono.${vista}.${i.id}`}
                        // Todo arranca cerrado: con 9 etapas y 249 tareas, abrir
                        // de entrada es justamente lo que hacia la pagina
                        // ilegible. Se entra por el Gantt de arriba o pulsando
                        // la etapa que interese.
                        defaultOpen={false}
                        head={cabecera}
                        meta={barra}
                      >
                        {cuerpo}
                      </Collapsible>
                    </article>
                  );
                    })}
                  </div>
                );

                // El resumen global solo tiene sentido si hay varios cronogramas
                // que comparar. Cuando existe, las tarjetas de etapa van DENTRO
                // de su desplegable (pedido del usuario: "dentro del despliegue
                // de resumen de proyecto van las etapas del proyecto"), no como
                // una seccion aparte debajo. Con un solo cronograma no hay nada
                // que resumir, asi que la cuadricula se muestra directa.
                return g.items.length > 1 ? (
                  <ProjectOverview initiatives={g.items} company={company} color={g.color} vista={vista}>
                    {etapasGrid}
                  </ProjectOverview>
                ) : (
                  etapasGrid
                );
              })()}
            </section>
          ))
        )}
      </div>
    </>
  );
}
