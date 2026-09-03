"use client";

import { useState } from "react";
import type { Pendiente } from "@/lib/recordatorios";

/**
 * Aviso en pantalla de lo que vence esta semana.
 *
 * Existe porque el correo depende de que Resend este configurado y de que la
 * gente lo lea; esto se ve al entrar, siempre. Los dos avisan de lo mismo y se
 * complementan: el correo te busca a ti, este te espera donde trabajas.
 *
 * Arranca plegado a una linea. Un panel abierto con diez filas encima del
 * contenido se convierte en algo que se cierra sin leer a los dos dias.
 */
export function AvisoVencimientos({ items, mio }: { items: Pendiente[]; mio: boolean }) {
  const [abierto, setAbierto] = useState(false);
  if (items.length === 0) return null;

  const urgentes = items.filter((i) => i.diasRestantes <= 1).length;

  return (
    <div className={"av" + (urgentes > 0 ? " urge" : "")}>
      <button type="button" className="av-head" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <span className="av-punto" aria-hidden="true" />
        <span className="av-txt">
          <b>{items.length}</b> {items.length === 1 ? "vencimiento" : "vencimientos"} en los próximos 7 días
          {mio ? "" : " en total"}
          {urgentes > 0 ? <span className="av-urg"> · {urgentes} para hoy o mañana</span> : null}
        </span>
        <span className="av-mas mono">{abierto ? "ocultar" : "ver"}</span>
      </button>

      {abierto && (
        <ul className="av-lista">
          {items.map((i) => (
            <li key={`${i.tipo}-${i.id}`}>
              <span className={"av-dias mono" + (i.diasRestantes <= 1 ? " urge" : "")}>
                {i.diasRestantes === 0 ? "hoy" : i.diasRestantes === 1 ? "mañana" : `${i.diasRestantes} d`}
              </span>
              <span className="av-item">
                <span className="av-item-t">{i.titulo}</span>
                <span className="av-item-m mono">
                  {i.empresa} · {i.etapa} · {i.tipo} · vence {i.vence}
                  {i.asignadoNombre ? ` · ${i.asignadoNombre}` : " · sin asignar"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
