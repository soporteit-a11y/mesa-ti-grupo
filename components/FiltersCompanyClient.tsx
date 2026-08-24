"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function FiltersCompanyClient({ companies }: { companies: any[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const set = (v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set("company", v);
    else p.delete("company");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <select value={sp.get("company") || ""} onChange={(e) => set(e.target.value)}>
      <option value="">Todas las empresas</option>
      {companies.map((c) => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  );
}
