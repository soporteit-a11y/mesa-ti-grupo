import type { Initiative } from "@/lib/data";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** 'YYYY-MM-DD' -> dias desde epoch. Se compara como fecha pura, sin horas. */
function dia(d: string): number {
  const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86400000);
}

function hoyDia(): number {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date());
  return dia(f);
}

type Barra = {
  key: string;
  titulo: string;
  contexto: string | null;
  ini: number;
  fin: number;
  progress: number;
  done: number;
  total: number;
  color: string;
};

/**
 * Gantt hecho a mano con posicionamiento porcentual — sin librerias, igual que
 * el resto de los graficos del proyecto.
 *
 * Solo se dibujan las fases que tienen fecha de inicio Y de fin: una fase "Por
 * Definir" no se puede ubicar en una linea de tiempo, asi que se lista aparte
 * en vez de inventarle una posicion.
 */
export function GanttChart({ initiative }: { initiative: Initiative }) {
  const conFecha: Barra[] = [];
  const sinFecha: { key: string; titulo: string }[] = [];

  for (const p of initiative.phases) {
    if (p.start_date && p.end_date) {
      conFecha.push({
        key: `p${p.id}`,
        titulo: p.title,
        contexto: p.context,
        ini: dia(p.start_date),
        fin: dia(p.end_date),
        progress: p.progress,
        done: p.done,
        total: p.total,
        color: initiative.company_color,
      });
    } else {
      sinFecha.push({ key: `p${p.id}`, titulo: p.title });
    }
  }

  if (conFecha.length === 0) {
    return (
      <p className="pv-meta">
        Este cronograma no tiene fases con fecha de inicio y fin, así que no se puede dibujar una
        línea de tiempo. Agrega fechas a sus fases para verlo aquí.
      </p>
    );
  }

  const min = Math.min(...conFecha.map((b) => b.ini));
  const max = Math.max(...conFecha.map((b) => b.fin));
  const span = Math.max(1, max - min);
  const hoy = hoyDia();

  // Marcas de mes a lo largo del eje
  const marcas: { pos: number; etiqueta: string }[] = [];
  const d0 = new Date(min * 86400000);
  let y = d0.getUTCFullYear();
  let m = d0.getUTCMonth();
  for (let i = 0; i < 40; i++) {
    const t = Math.floor(Date.UTC(y, m, 1) / 86400000);
    if (t > max) break;
    if (t >= min) {
      marcas.push({
        pos: ((t - min) / span) * 100,
        etiqueta: m === 0 ? `${MESES[m]} ${String(y).slice(2)}` : MESES[m],
      });
    }
    m++;
    if (m > 11) { m = 0; y++; }
  }

  const posHoy = hoy >= min && hoy <= max ? ((hoy - min) / span) * 100 : null;

  return (
    <div className="gantt">
      <div className="gantt-scroll">
        <div className="gantt-inner">
          <div className="gantt-axis">
            {marcas.map((mk, i) => (
              <span key={i} className="gantt-mes" style={{ left: `${mk.pos}%` }}>{mk.etiqueta}</span>
            ))}
          </div>

          <div className="gantt-rows">
            {marcas.map((mk, i) => (
              <span key={"g" + i} className="gantt-grid" style={{ left: `${mk.pos}%` }} aria-hidden="true" />
            ))}
            {posHoy !== null && (
              <span className="gantt-hoy" style={{ left: `${posHoy}%` }} title="Hoy" aria-hidden="true" />
            )}

            {conFecha.map((b) => {
              const izq = ((b.ini - min) / span) * 100;
              const ancho = Math.max(0.8, ((b.fin - b.ini) / span) * 100);
              const vencida = b.fin < hoy && b.progress < 100;
              return (
                <div className="gantt-row" key={b.key}>
                  <div className="gantt-lbl" title={b.contexto ? `${b.contexto} › ${b.titulo}` : b.titulo}>
                    {b.titulo}
                  </div>
                  <div className="gantt-track">
                    <div
                      className={"gantt-bar" + (vencida ? " vencida" : "") + (b.progress === 100 ? " lista" : "")}
                      style={{ left: `${izq}%`, width: `${ancho}%`, borderColor: b.color }}
                      title={`${b.titulo} · ${b.done}/${b.total} tareas · ${b.progress}%`}
                    >
                      <span className="gantt-fill" style={{ width: `${b.progress}%`, background: b.color }} />
                      <span className="gantt-bar-txt mono">{b.progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sinFecha.length > 0 && (
        <p className="pv-meta gantt-sinfecha">
          <b>Sin fecha definida:</b> {sinFecha.map((s) => s.titulo).join(" · ")}
        </p>
      )}
    </div>
  );
}
