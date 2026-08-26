"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(d: Date, delta: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + delta);
  return r;
}

const PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "3 días", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "1 mes", days: 30 },
];

export function DateRangeFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const goTo = (params: URLSearchParams) => {
    router.push(pathname + (params.toString() ? "?" + params.toString() : ""));
  };

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    goTo(p);
  };

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set("from", f);
    p.set("to", t);
    goTo(p);
  };

  const clear = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("from");
    p.delete("to");
    goTo(p);
  };

  const today = new Date();
  const todayStr = ymd(today);

  return (
    <div className="daterange-wrap">
      <div className="dr-presets">
        <button
          type="button"
          className={"btn sm" + (!from && !to ? " active" : "")}
          onClick={clear}
        >
          Todo
        </button>
        {PRESETS.map((p) => {
          const f = ymd(addDays(today, -p.days));
          const isActive = from === f && to === todayStr;
          return (
            <button
              key={p.label}
              type="button"
              className={"btn sm" + (isActive ? " active" : "")}
              onClick={() => setRange(f, todayStr)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="daterange">
        <label>
          Desde
          <input type="date" value={from} max={to || undefined} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} min={from || undefined} onChange={(e) => set("to", e.target.value)} />
        </label>
        {(from || to) && (
          <button type="button" className="btn sm" onClick={clear}>Limpiar</button>
        )}
      </div>
    </div>
  );
}
