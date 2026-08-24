"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function TicketOpenLink({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const open = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set("ticket", String(id));
    router.push(pathname + "?" + p.toString());
  };

  return (
    <button type="button" className="ticket-open" onClick={open} title="Ver detalle y comentarios">
      {title}
    </button>
  );
}
