import Link from "next/link";
import { hasDb } from "@/lib/db";
import { getSupportDashboard } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { DateRangeFilter } from "@/components/DateRangeFilter";

export const dynamic = "force-dynamic";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fmtPeriod(min: string | null, max: string | null) {
  if (!min || !max) return "—";
  const a = new Date(min), b = new Date(max);
  const f = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
  return `${f(a)} – ${f(b)} ${b.getUTCFullYear()}`;
}
function fmtYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function Donut({ pct, label }: { pct: number; label: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="donut">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="center"><div className="pv">{pct}%</div><div className="pl">{label}</div></div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const from = searchParams?.from || null;
  const to = searchParams?.to || null;

  let d;
  try {
    d = await getSupportDashboard(from, to);
  } catch (e) {
    return <Setup />;
  }

  const periodLabel = (from || to)
    ? `${from ? fmtYMD(from) : "inicio"} – ${to ? fmtYMD(to) : "hoy"}`
    : "Todo el historial";

  const closedPct = d.total ? Math.round((d.closed / d.total) * 100) : 0;
  const openPct = 100 - closedPct;
  const maxCat = Math.max(1, ...d.byCategory.map((c) => c.n));
  const maxCompany = Math.max(1, ...d.byCompany.map((c: any) => c.n));
  const maxDay = Math.max(1, ...d.byDay);
  const topCats = d.byCategory.slice(0, 9);

  return (
    <>
      <div className="content">
        {/* Header + stat cards */}
        <div className="report-head">
          <div>
            <div className="rh-title">RESUMEN DE TICKETS DE SOPORTE</div>
            <div className="rh-period">📅 PERIODO: <b>{periodLabel}</b></div>
            <div style={{ marginTop: 12 }}><DateRangeFilter /></div>
          </div>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="sc-ic blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              <div><div className="sc-k">Total de tickets</div><div className="sc-v">{d.total}</div><div className="sc-d">tickets</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg></div>
              <div><div className="sc-k">Cerrados</div><div className="sc-v">{d.closed}</div><div className="sc-d green">{closedPct}%</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></div>
              <div><div className="sc-k">Abiertos</div><div className="sc-v">{d.open}</div><div className="sc-d">{openPct}%</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg></div>
              <div><div className="sc-k">Fuera de SLA</div><div className="sc-v" style={{ color: d.breached > 0 ? "var(--crit)" : undefined }}>{d.breached}</div><div className="sc-d">abiertos vencidos</div></div>
            </div>
          </div>
        </div>

        <div className="dash-cols">
          {/* Columna 1 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Resumen general</div>
              <div className="donut-wrap">
                <Donut pct={closedPct} label="Cerrados" />
                <div className="donut-legend">
                  <div className="lg"><span className="dt" style={{ background: "var(--accent)" }} /> Cerrados <b>{d.closed} ({closedPct}%)</b></div>
                  <div className="lg"><span className="dt" style={{ background: "var(--muted)" }} /> Abiertos <b>{d.open} ({openPct}%)</b></div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets por día de la semana</div>
              <div className="daybars">
                {d.byDay.map((n, idx) => (
                  <div className="daycol" key={idx}>
                    <div className="dv">{n}</div>
                    <div className="dbar" style={{ height: `${(n / maxDay) * 100}%` }} />
                    <div className="dl">{DIAS[idx]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets recientes</div>
              <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
                <table>
                  <thead><tr><th>Ticket</th><th>Empresa</th><th>Estado</th></tr></thead>
                  <tbody>
                    {d.recent.map((t: any) => (
                      <tr key={t.id}>
                        <td><span className="t-title">{t.title}</span><div className="t-sub">#{t.id} · {fmtDate(t.created_at)}</div></td>
                        <td className="cat-tag">{t.company}</td>
                        <td><span className="status-pill resuelto">Cerrado</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Columna 2 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Tickets por categoría <span className="small">(Top {topCats.length})</span></div>
              <div className="catbars">
                {topCats.map((c) => (
                  <div className="catbar" key={c.category}>
                    <div className="cb-top">
                      <span className="cb-name">{c.category}</span>
                      <span className="cb-val"><b>{c.n}</b> ({c.pct}%)</span>
                    </div>
                    <div className="catbar-track"><div className="catbar-fill" style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="pv-meta" style={{ marginTop: 14 }}>Total: {d.total} tickets</p>
            </div>

            <div className="panel">
              <div className="panel-title">Estado de tickets</div>
              <div className="donut-wrap">
                <Donut pct={closedPct} label="Cerrados" />
                <div className="donut-legend">
                  <div className="lg"><span className="dt" style={{ background: "var(--accent)" }} /> Cerrados <b>{d.closed} ({closedPct}%)</b></div>
                  <div className="lg"><span className="dt" style={{ background: "var(--muted)" }} /> Abiertos <b>{d.open} ({openPct}%)</b></div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets por empresa</div>
              <div className="catbars">
                {d.byCompany.map((c: any) => (
                  <Link
                    href={`/tickets?company=${encodeURIComponent(c.name)}`}
                    className="catbar catbar-link"
                    key={c.name}
                    title={`Ver tickets de ${c.name}`}
                  >
                    <div className="cb-top">
                      <span className="cb-name">{c.name}</span>
                      <span className="cb-val"><b>{c.n}</b></span>
                    </div>
                    <div className="catbar-track">
                      <div className="catbar-fill" style={{ width: `${(c.n / maxCompany) * 100}%`, background: c.color }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Columna 3 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Detalle de tickets por categoría</div>
              <table>
                <thead><tr><th>Categoría</th><th className="num">Cant.</th><th className="num">% del total</th></tr></thead>
                <tbody>
                  {d.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td>{c.category}</td>
                      <td className="num">{c.n}</td>
                      <td>
                        <div className="pct-cell">
                          <div className="mini-track"><div className="mini-fill" style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                          {c.pct}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>TOTAL</td><td className="num">{d.total}</td><td className="pct-cell" style={{ justifyContent: "flex-end" }}>100%</td></tr></tfoot>
              </table>
            </div>

            <div className="panel">
              <div className="panel-title">Resumen</div>
              <div className="resumen-lead">
                <div className="ri"><svg viewBox="0 0 24 24" width="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></div>
                <p>
                  {d.total === 0
                    ? "No hay tickets registrados en este período."
                    : `Todos los tickets del período ${fmtPeriod(d.minDate, d.maxDate)} fueron atendidos y cerrados satisfactoriamente.`}
                </p>
              </div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg></div><div><div className="rt">Eficiencia</div><div className="rd">{closedPct}% de tickets cerrados</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></div><div><div className="rt">Respuesta oportuna</div><div className="rd">Atención rápida y efectiva</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div><div><div className="rt">Soporte confiable</div><div className="rd">Comprometidos con tu productividad</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg></div><div><div className="rt">Mejora continua</div><div className="rd">Seguimos trabajando para servirte mejor</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
