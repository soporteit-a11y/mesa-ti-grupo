"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function Filters({ companies, categories, collaborators, count }: { companies: any[]; categories: string[]; collaborators: any[]; count: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <div className="filters">
      <select value={sp.get("company") || ""} onChange={(e) => set("company", e.target.value)}>
        <option value="">Todas las empresas</option>
        {companies.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={sp.get("category") || ""} onChange={(e) => set("category", e.target.value)}>
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select value={sp.get("priority") || ""} onChange={(e) => set("priority", e.target.value)}>
        <option value="">Toda prioridad</option>
        {["Alta", "Media", "Baja"].map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select value={sp.get("requester") || ""} onChange={(e) => set("requester", e.target.value)}>
        <option value="">Todos los solicitantes</option>
        {collaborators.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={sp.get("status") || ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">Todo estado</option>
        <option value="abiertos">Solo abiertos</option>
        <option value="nuevo">Nuevo</option>
        <option value="en_progreso">En progreso</option>
        <option value="en_espera">En espera</option>
        <option value="resuelto">Cerrado</option>
      </select>
      <span className="fcount">{count} tickets</span>
    </div>
  );
}
