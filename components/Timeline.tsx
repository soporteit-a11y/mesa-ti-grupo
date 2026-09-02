import type { Initiative, Phase } from "@/lib/data";
import { diaDeFecha, hoyEnDias, fmtDiaMesAnio } from "@/lib/dates";

/** Duracion inclusiva: del 1 al 1 es 1 dia, no 0. Null si falta alguna fecha. */
function duracion(ini: unknown, fin: unknown): number | null {
  const a = diaDeFecha(ini);
  const b = diaDeFecha(fin);
  if (a === null || b === null) return null;
  return b - a + 1;
}

function fmtDias(n: number): string {
  if (n < 7) return `${n} día${n === 1 ? "" : "s"}`;
  const semanas = Math.round(n / 7);
  if (n < 60) return `${n} días · ~${semanas} sem`;
  const meses = Math.round(n / 30);
  return `${n} días · ~${meses} ${meses === 1 ? "mes" : "meses"}`;
}

type Estado = { cls: string; texto: string };

function estadoDe(p: Phase, hoy: number): Estado {
  if (p.total > 0 && p.done === p.total) return { cls: "ok", texto: "Completada" };
  const i = diaDeFecha(p.start_date);
  const f = diaDeFecha(p.end_date);
  if (i === null || f === null) return { cls: "sin", texto: "Sin fecha" };
  if (f < hoy) return { cls: "crit", texto: "Atrasada" };
  if (i <= hoy && hoy <= f) return { cls: "warn", texto: "En curso" };
  return { cls: "pend", texto: "Pendiente" };
}

/**
 * Linea de tiempo vertical: cada fase en orden cronologico, con su rango de
 * fechas, cuanto duro (o durara) y cuanto se hizo dentro de ella.
 *
 * Es complementaria al Gantt, no una repeticion: el Gantt sirve para ver el
 * solape entre fases de un vistazo; esto sirve para leer el proyecto como una
 * historia de principio a fin y saber en que punto va.
 */
export function Timeline({ initiative }: { initiative: Initiative }) {
  const hoy = hoyEnDias();

  // Orden cronologico real, no el orden de captura. Las fases sin fecha (o con
  // una ilegible) van al final: no se pueden ubicar en el tiempo pero tampoco
  // deben desaparecer.
  const fases = [...initiative.phases].sort((a, b) => {
    const x = diaDeFecha(a.start_date);
    const y = diaDeFecha(b.start_date);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  });

  if (fases.length === 0) {
    return <p className="pv-meta">Este cronograma todavía no tiene fases.</p>;
  }

  const rangos: [number, number][] = [];
  for (const p of fases) {
    const a = diaDeFecha(p.start_date);
    const b = diaDeFecha(p.end_date);
    if (a !== null && b !== null) rangos.push([a, b]);
  }
  const ini = rangos.length ? Math.min(...rangos.map((r) => r[0])) : null;
  const fin = rangos.length ? Math.max(...rangos.map((r) => r[1])) : null;

  let resumen: React.ReactNode = null;
  if (ini !== null && fin !== null) {
    const total = fin - ini + 1;
    const transcurridos = Math.min(total, Math.max(0, hoy - ini + 1));
    const restantes = Math.max(0, fin - hoy);
    const pctTiempo = Math.round((transcurridos / total) * 100);
    resumen = (
      <div className="tl-resumen">
        <div className="tl-res-item">
          <span className="tl-res-k">Duración total</span>
          <span className="tl-res-v mono">{fmtDias(total)}</span>
        </div>
        <div className="tl-res-item">
          <span className="tl-res-k">Transcurrido</span>
          <span className="tl-res-v mono">{transcurridos} d · {pctTiempo}%</span>
        </div>
        <div className="tl-res-item">
          <span className="tl-res-k">Restante</span>
          <span className="tl-res-v mono">{restantes} d</span>
        </div>
        <div className="tl-res-item">
          <span className="tl-res-k">Avance real</span>
          <span className={"tl-res-v mono" + (initiative.progress < pctTiempo ? " atras" : " bien")}>
            {initiative.progress}%
          </span>
        </div>
      </div>
    );
  }

  let etapaPrev: string | null = null;

  return (
    <div className="tl">
      {resumen}

      <ol className="tl-lista">
        {fases.map((p, idx) => {
          const est = estadoDe(p, hoy);
          const dur = duracion(p.start_date, p.end_date);
          const fIni = fmtDiaMesAnio(p.start_date);
          const fFin = fmtDiaMesAnio(p.end_date);
          const cabeceraEtapa = p.stage && p.stage !== etapaPrev ? p.stage : null;
          etapaPrev = p.stage || etapaPrev;

          return (
            <li key={p.id} className={"tl-item " + est.cls}>
              {cabeceraEtapa && <div className="tl-etapa">{cabeceraEtapa}</div>}
              <span className="tl-punto" aria-hidden="true" />
              <div className="tl-cuerpo">
                <div className="tl-linea1">
                  <span className="tl-fechas mono">
                    {fIni && fFin
                      ? fIni === fFin ? fIni : `${fIni} → ${fFin}`
                      : "Sin fecha definida"}
                  </span>
                  {dur !== null && <span className="tl-dur mono">{fmtDias(dur)}</span>}
                  <span className={"tl-estado " + est.cls}>{est.texto}</span>
                </div>
                <div className="tl-titulo">
                  <span className="phase-num">Fase {idx + 1}</span>
                  {p.title}
                </div>
                <div className="tl-avance">
                  <div className="progress-track sm">
                    <div
                      className="progress-fill"
                      style={{ width: `${p.progress}%`, background: initiative.company_color }}
                    />
                  </div>
                  <span className="progress-label mono">
                    {p.done}/{p.total} tareas · {p.progress}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
