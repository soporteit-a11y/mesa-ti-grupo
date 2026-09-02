import type { Initiative, Phase } from "@/lib/data";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** 'YYYY-MM-DD' -> dias desde epoch, como fecha pura (sin horas ni zona). */
function dia(d: string): number {
  const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86400000);
}

function hoyDia(): number {
  // El "hoy" del negocio es el de Republica Dominicana, no el del servidor.
  return dia(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date()));
}

function fecha(d: string): string {
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return `${Number(dd)} ${MESES[Number(m) - 1]} ${String(y).slice(2)}`;
}

/** Duracion inclusiva: del 1 al 1 es 1 dia, no 0. */
function duracion(ini: string, fin: string): number {
  return dia(fin) - dia(ini) + 1;
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
  if (!p.start_date || !p.end_date) return { cls: "sin", texto: "Sin fecha" };
  const f = dia(p.end_date);
  const i = dia(p.start_date);
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
  const hoy = hoyDia();

  // Orden cronologico real, no el orden de captura. Las fases sin fecha van al
  // final: no se pueden ubicar en el tiempo pero tampoco deben desaparecer.
  const fases = [...initiative.phases].sort((a, b) => {
    if (!a.start_date && !b.start_date) return 0;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return dia(a.start_date) - dia(b.start_date);
  });

  if (fases.length === 0) {
    return <p className="pv-meta">Este cronograma todavía no tiene fases.</p>;
  }

  const conFecha = fases.filter((p) => p.start_date && p.end_date);
  const ini = conFecha.length ? Math.min(...conFecha.map((p) => dia(p.start_date!))) : null;
  const fin = conFecha.length ? Math.max(...conFecha.map((p) => dia(p.end_date!))) : null;

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
          const dur = p.start_date && p.end_date ? duracion(p.start_date, p.end_date) : null;
          const cabeceraEtapa = p.stage && p.stage !== etapaPrev ? p.stage : null;
          etapaPrev = p.stage || etapaPrev;

          return (
            <li key={p.id} className={"tl-item " + est.cls}>
              {cabeceraEtapa && <div className="tl-etapa">{cabeceraEtapa}</div>}
              <span className="tl-punto" aria-hidden="true" />
              <div className="tl-cuerpo">
                <div className="tl-linea1">
                  <span className="tl-fechas mono">
                    {p.start_date && p.end_date
                      ? p.start_date === p.end_date
                        ? fecha(p.start_date)
                        : `${fecha(p.start_date)} → ${fecha(p.end_date)}`
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
