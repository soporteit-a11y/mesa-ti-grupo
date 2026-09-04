"use client";

import { useState } from "react";
import type { Evento } from "@/lib/recordatorios";

const ETIQUETA: Record<Evento["tipo"], string> = {
  vence: "vence",
  inicia: "empieza",
  completada: "completada",
};

/**
 * Aviso en pantalla de los eventos de etapa: la que arranca hoy, la que esta
 * por vencer y la que se completo.
 *
 * Existe porque el correo depende de que Resend este configurado y de que la
 * gente lo lea; esto se ve al entrar, siempre. Los dos avisan de lo mismo y se
 * complementan: el correo te busca a ti, este te espera donde trabajas.
 *
 * Arranca plegado a una linea. Un panel abierto con diez filas encima del
 * contenido acaba siendo algo que se cierra sin leer.
 */
export function AvisoVencimientos({ eventos }: { eventos: Evento[] }) {
  const [abierto, setAbierto] = useState(false);

  // Las completadas no entran en el titular: son buenas noticias y no compiten
  // por la atencion con algo que vence en dos dias.
  const accionables = eventos.filter((e) => e.tipo !== "completada");
  if (eventos.length === 0) return null;

  const urgentes = eventos.filter((e) => e.tipo === "vence" && (e.diasRestantes ?? 9) <= 1).length;
  const listas = eventos.length - accionables.length;

  const titular =
    accionables.length > 0
      ? `${accionables.length} ${accionables.length === 1 ? "etapa necesita" : "etapas necesitan"} tu atención`
      : `${listas} ${listas === 1 ? "etapa completada" : "etapas completadas"}`;

  return (
    <div className={"av" + (urgentes > 0 ? " urge" : "") + (accionables.length === 0 ? " ok" : "")}>
      <button type="button" className="av-head" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <span className="av-punto" aria-hidden="true" />
        <span className="av-txt">
          <b>{titular}</b>
          {urgentes > 0 ? <span className="av-urg"> · {urgentes} vence hoy o mañana</span> : null}
          {accionables.length > 0 && listas > 0 ? (
            <span className="av-ok-n"> · {listas} completada{listas === 1 ? "" : "s"}</span>
          ) : null}
        </span>
        <span className="av-mas mono">{abierto ? "ocultar" : "ver"}</span>
      </button>

      {abierto && (
        <ul className="av-lista">
          {eventos.map((e) => (
            <li key={e.clave}>
              <span
                className={
                  "av-dias mono ev-" + e.tipo +
                  (e.tipo === "vence" && (e.diasRestantes ?? 9) <= 1 ? " urge" : "")
                }
              >
                {e.tipo === "completada"
                  ? "lista"
                  : e.tipo === "inicia"
                  ? "hoy"
                  : e.diasRestantes === 0
                  ? "hoy"
                  : e.diasRestantes === 1
                  ? "mañana"
                  : `${e.diasRestantes} d`}
              </span>
              <span className="av-item">
                <span className="av-item-t">{e.etapa}</span>
                <span className="av-item-m mono">
                  {e.empresa} · {ETIQUETA[e.tipo]} {e.fecha} · {e.hechas}/{e.total} tareas · {e.progreso}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
