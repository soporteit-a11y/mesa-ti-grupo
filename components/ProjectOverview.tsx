import type { Initiative } from "@/lib/data";
import { diaDeFecha, hoyEnDias, fmtDiaMesAnio } from "@/lib/dates";
import { GanttBar, GanttLabel, AnchoNombres, DesplegarEtapas } from "@/components/GanttInteractivo";
import { Collapsible } from "@/components/Collapsible";
import { VeredictoDesfase, type FaseAtrasada } from "@/components/VeredictoDesfase";
import { fmtDiaMesAnio as fmtFecha } from "@/lib/dates";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** Dias desde epoch -> '15 sep 2026'. */
function fechaLarga(n: number): string {
  const d = new Date(n * 86400000);
  return fmtDiaMesAnio(d) ?? "—";
}

/**
 * Resumen de todo el proyecto de una empresa: una sola linea de tiempo con
 * todos los cronogramas, y el dato que de verdad importa — si el avance real
 * va por delante o por detras del tiempo consumido.
 *
 * El "% esperado" es una regla de tres simple sobre el calendario, no una curva
 * ponderada por esfuerzo. Es una aproximacion honesta y suficiente para
 * responder "vamos atrasados?"; no pretende ser una linea base de valor ganado.
 */
export function ProjectOverview({
  initiatives, company, color, vista, children,
}: {
  initiatives: Initiative[]; company: string; color: string;
  /** Se usa en la clave de plegado, que es distinta por vista. */
  vista: string;
  /**
   * Las tarjetas de cada etapa. Van DENTRO de este mismo desplegable, no
   * como una seccion aparte debajo: el resumen es la puerta de entrada al
   * proyecto completo, y las etapas son su detalle, no otra cosa distinta.
   */
  children?: React.ReactNode;
}) {
  const hoy = hoyEnDias();

  const filas = initiatives
    .map((i) => {
      // El rango de la barra es el rango EFECTIVO de la etapa: el que el admin
      // fijo a mano si lo hizo, y si no el que sale de sus fases (la mezcla la
      // resuelve calcStart/calcEnd en lib/data.ts). Asi, fijar las fechas de una
      // etapa mueve su barra aqui — que es justo para lo que sirve fijarlas.
      //
      // Una fecha ilegible se descarta en vez de propagar NaN: un NaN aqui
      // tumbaba la pagina entera.
      const ini = diaDeFecha(i.calcStart);
      const fin = diaDeFecha(i.calcEnd);
      if (ini === null || fin === null) return null;
      return {
        id: i.id,
        titulo: i.title,
        // Un rango invertido no se puede dibujar; se voltea en vez de perder la
        // fila, que es lo unico util que se puede hacer con el.
        ini: Math.min(ini, fin),
        fin: Math.max(ini, fin),
        progress: i.progress,
        done: i.done,
        total: i.total,
        // La etapa declara una ventana que sus fases ya no respetan.
        desborde:
          (Boolean(i.start_date) && i.derivStart !== null && i.derivStart < i.calcStart!) ||
          (Boolean(i.due_date) && i.derivEnd !== null && i.derivEnd > i.calcEnd!),
      };
    })
    .filter(Boolean) as {
      id: number; titulo: string; ini: number; fin: number;
      progress: number; done: number; total: number; desborde: boolean;
    }[];

  if (filas.length === 0) return null;

  const min = Math.min(...filas.map((f) => f.ini));
  const max = Math.max(...filas.map((f) => f.fin));
  const span = Math.max(1, max - min);

  const totalDias = max - min + 1;
  const transcurridos = Math.min(totalDias, Math.max(0, hoy - min + 1));
  const restantes = Math.max(0, max - hoy);
  const pctTiempo = Math.round((transcurridos / totalDias) * 100);

  // Avance real agregado: tareas hechas sobre tareas totales de toda la empresa.
  const tareas = initiatives.reduce((a, i) => a + i.total, 0);
  const hechas = initiatives.reduce((a, i) => a + i.done, 0);
  const pctReal = tareas ? Math.round((hechas / tareas) * 100) : 0;

  const desfase = pctReal - pctTiempo;
  const atrasado = desfase < -5;
  const adelantado = desfase > 5;

  // Fases cuya fecha de fin ya pasó y siguen incompletas: es la respuesta
  // concreta a "¿atrasado en qué?". El número de fase es su posición dentro de
  // su cronograma, igual que se muestra en la lista.
  const atrasadas: FaseAtrasada[] = [];
  for (const i of initiatives) {
    i.phases.forEach((p, idx) => {
      const fin = diaDeFecha(p.end_date);
      if (fin === null || fin >= hoy || p.progress === 100) return;
      atrasadas.push({
        cronoId: i.id,
        cronoTitulo: i.title,
        fase: p.title,
        numero: idx + 1,
        finTexto: fmtFecha(p.end_date) ?? "—",
        diasAtraso: hoy - fin,
        done: p.done,
        total: p.total,
        progress: p.progress,
      });
    });
  }
  atrasadas.sort((a, b) => b.diasAtraso - a.diasAtraso);

  const marcas: { pos: number; etiqueta: string }[] = [];
  const d0 = new Date(min * 86400000);
  let y = d0.getUTCFullYear();
  let m = d0.getUTCMonth();
  for (let k = 0; k < 40; k++) {
    const t = Math.floor(Date.UTC(y, m, 1) / 86400000);
    if (t > max) break;
    if (t >= min) {
      marcas.push({ pos: ((t - min) / span) * 100, etiqueta: m === 0 ? `${MESES[m]} ${String(y).slice(2)}` : MESES[m] });
    }
    m++;
    if (m > 11) { m = 0; y++; }
  }

  const posHoy = hoy >= min && hoy <= max ? ((hoy - min) / span) * 100 : null;

  const cabecera = (
    <div className="po-head">
      <div>
        <div className="po-title">
          Resumen del proyecto <span className="chip" style={{ background: color }}>{company}</span>
        </div>
        <div className="po-rango mono">{fechaLarga(min)} → {fechaLarga(max)} · {totalDias} días</div>
      </div>
      <VeredictoDesfase
        cls={atrasado ? "crit" : adelantado ? "ok" : "warn"}
        texto={
          atrasado
            ? `Atrasado ${Math.abs(desfase)} puntos`
            : adelantado
            ? `Adelantado ${desfase} puntos`
            : "En tiempo"
        }
        pctTiempo={pctTiempo}
        pctReal={pctReal}
        atrasadas={atrasadas}
        vista={vista}
      />
    </div>
  );

  // Vista comprimida: las mismas dos barras comparativas, sin los KPIs
  // detallados ni el Gantt. Es lo mismo que una tarjeta de cronograma
  // colapsada muestra su barra de avance — un vistazo, no el detalle.
  const comparativa = (
    <div className="po-comp">
      <div className="po-comp-row">
        <span className="po-comp-lbl mono">Tiempo</span>
        <div className="progress-track"><div className="progress-fill tiempo" style={{ width: `${pctTiempo}%` }} /></div>
        <span className="progress-label mono">{pctTiempo}%</span>
      </div>
      <div className="po-comp-row">
        <span className="po-comp-lbl mono">Avance</span>
        <div className="progress-track">
          <div
            className={
              // desfase = avance - tiempo, asi que negativo es ir por detras.
              // Tres tramos, no dos: entre 5 y 15 puntos por detras todavia se
              // recupera, y pintarlo de rojo igual que un desfase de 40 haria
              // que el rojo dejara de significar nada.
              "progress-fill " +
              (desfase <= -15 ? "avance-mal" : desfase < -5 ? "avance-riesgo" : "avance-ok")
            }
            style={{ width: `${pctReal}%` }}
          />
        </div>
        <span className="progress-label mono">{pctReal}%</span>
      </div>
    </div>
  );

  return (
    <div className="card po">
      <Collapsible
        storageKey={`resumen.${vista}.${company}`}
        // Arranca cerrado, igual que las tarjetas de cronograma: es un resumen
        // que se abre para ver el Gantt, no algo que deba ocupar la pantalla
        // de entrada.
        defaultOpen={false}
        head={cabecera}
        meta={comparativa}
      >
        <div className="po-kpis">
          <div className="po-kpi">
            <span className="po-k">Tiempo transcurrido</span>
            <span className="po-v mono">{transcurridos} de {totalDias} d</span>
            <span className="po-pct mono">{pctTiempo}%</span>
          </div>
          <div className="po-kpi">
            <span className="po-k">Avance real</span>
            <span className="po-v mono">{hechas} de {tareas} tareas</span>
            <span className={"po-pct mono " + (atrasado ? "crit" : "")}>{pctReal}%</span>
          </div>
          <div className="po-kpi">
            <span className="po-k">Días restantes</span>
            <span className="po-v mono">{restantes} d</span>
            <span className="po-pct mono">{Math.max(0, 100 - pctTiempo)}%</span>
          </div>
        </div>

        {comparativa}

        <div className="po-acciones">
          <DesplegarEtapas />
        </div>

        <AnchoNombres>
          <div className="gantt-scroll">
            <div className="gantt-inner po-gantt">
              <div className="gantt-axis">
                {marcas.map((mk, k) => (
                  <span key={k} className="gantt-mes" style={{ left: `${mk.pos}%` }}>{mk.etiqueta}</span>
                ))}
              </div>
              <div className="gantt-rows">
                {marcas.map((mk, k) => (
                  <span key={"g" + k} className="gantt-grid" style={{ left: `${mk.pos}%` }} aria-hidden="true" />
                ))}
                {posHoy !== null && (
                  <span className="gantt-hoy" style={{ left: `${posHoy}%` }} title="Hoy">
                    <span className="gantt-hoy-lbl mono">HOY</span>
                  </span>
                )}
                {filas.map((f) => {
                  const izq = ((f.ini - min) / span) * 100;
                  const ancho = Math.max(0.8, ((f.fin - f.ini) / span) * 100);
                  const vencida = f.fin < hoy && f.progress < 100;
                  const clave = `crono.${vista}.${f.id}`;
                  const ancla = `crono-${f.id}`;
                  return (
                    <div className="gantt-row" key={f.id}>
                      <GanttLabel storageKey={clave} anchorId={ancla} titulo={f.titulo} />
                      <div className="gantt-track">
                        <GanttBar
                          storageKey={clave}
                          anchorId={ancla}
                          titulo={f.titulo}
                          izq={izq}
                          ancho={ancho}
                          progress={f.progress}
                          color={color}
                          vencida={vencida}
                          lista={f.progress === 100}
                          detalle={
                            `${f.titulo} · ${f.done}/${f.total} tareas · ${f.progress}%` +
                            (f.desborde ? "\n\nOJO: hay fases fuera del rango fijado para esta etapa" : "")
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AnchoNombres>

        <p className="pv-meta po-nota">
          Pulsa cualquier barra o nombre para saltar al desglose de esa etapa. El <b>% de avance</b> son
          tareas marcadas como completadas sobre el total; si va por debajo del <b>% de tiempo</b>, el
          proyecto está consumiendo calendario más rápido de lo que avanza.
        </p>

        {children && (
          <div className="po-etapas">
            <div className="po-etapas-title">Etapas del proyecto</div>
            {children}
          </div>
        )}
      </Collapsible>
    </div>
  );
}
