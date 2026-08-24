"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateRangeFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  const clear = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("from");
    p.delete("to");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
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
  );
}
