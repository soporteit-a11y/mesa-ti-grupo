import type { Initiative } from "@/lib/data";
import { diaDeFecha, hoyEnDias, fmtDiaMesAnio } from "@/lib/dates";
import { GanttBar, GanttLabel, AnchoNombres, DesplegarEtapas } from "@/components/GanttInteractivo";
import { Collapsible } from "@/components/Collapsible";

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
  initiatives, company, color, vista,
}: {
  initiatives: Initiative[]; company: string; color: string;
  /** Se usa en la clave de plegado, que es distinta por vista. */
  vista: string;
}) {
  const hoy = hoyEnDias();

  const filas = initiatives
    .map((i) => {
      // Solo fases con AMBAS fechas interpretables. Una fecha ilegible se
      // descarta en vez de propagar NaN: un NaN aqui tumbaba la pagina entera.
      const fechas: [number, number][] = [];
      for (const p of i.phases) {
        const a = diaDeFecha(p.start_date);
        const b = diaDeFecha(p.end_date);
        if (a !== null && b !== null) fechas.push([a, b]);
      }
      if (fechas.length === 0) return null;
      return {
        id: i.id,
        titulo: i.title,
        ini: Math.min(...fechas.map((f) => f[0])),
        fin: Math.max(...fechas.map((f) => f[1])),
        progress: i.progress,
        done: i.done,
        total: i.total,
      };
    })
    .filter(Boolean) as {
      id: number; titulo: string; ini: number; fin: number;
      progress: number; done: number; total: number;
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
      <div className={"po-veredicto " + (atrasado ? "crit" : adelantado ? "ok" : "warn")}>
        {atrasado
          ? `Atrasado ${Math.abs(desfase)} puntos`
          : adelantado
          ? `Adelantado ${desfase} puntos`
          : "En tiempo"}
      </div>
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
          <div className="progress-fill" style={{ width: `${pctReal}%`, background: atrasado ? "var(--crit)" : color }} />
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
                          detalle={`${f.titulo} · ${f.done}/${f.total} tareas · ${f.progress}%`}
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
      </Collapsible>
    </div>
  );
}
