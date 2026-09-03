"use client";

import { useEffect, useRef, useState } from "react";
import type { Atraso } from "@/lib/atraso";

/**
 * El cuadrito de retraso de UNA etapa, en su propia tarjeta.
 *
 * Cada etapa se juzga sola: el veredicto de la empresa promediaba todas y
 * escondia cual iba mal. Al pulsarlo se abre el desglose de por que, con las
 * tres cosas que lo explican — cuanto calendario lleva consumido contra cuanto
 * ha avanzado, cuantas fases tiene vencidas y cuantas tareas se hicieron
 * despues de su fecha coordinada.
 *
 * Si la etapa va bien no se dibuja nada. Un cuadrito verde de "todo en orden"
 * en cada tarjeta solo seria ruido que compite con los que si importan.
 */
export function AtrasoEtapa({ atraso }: { atraso: Atraso }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!atraso.etiqueta) return null;

  return (
    <div className="ae-wrap" ref={wrapRef}>
      <button
        type="button"
        className={"ae-chip " + atraso.nivel}
        onClick={(e) => {
          // La tarjeta entera reacciona al doble clic para plegarse; sin esto,
          // abrir el desglose tambien la plegaria.
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-expanded={open}
        title="Ver por qué esta etapa va con retraso"
      >
        {atraso.etiqueta}
      </button>

      {open && (
        <div className="ae-panel" onDoubleClick={(e) => e.stopPropagation()}>
          <div className="ae-fila">
            <span className="ae-k">Calendario consumido</span>
            <span className="ae-v mono">{atraso.pctTiempo}%</span>
          </div>
          <div className="ae-fila">
            <span className="ae-k">Avance real</span>
            <span className={"ae-v mono" + (atraso.desfase > 0 ? " crit" : "")}>{atraso.pctReal}%</span>
          </div>
          {atraso.diasVencida !== null ? (
            <div className="ae-fila">
              <span className="ae-k">Días desde la fecha de fin</span>
              <span className="ae-v mono crit">{atraso.diasVencida}</span>
            </div>
          ) : null}
          {atraso.fasesVencidas > 0 ? (
            <div className="ae-fila">
              <span className="ae-k">Fases con la fecha vencida</span>
              <span className="ae-v mono crit">{atraso.fasesVencidas}</span>
            </div>
          ) : null}
          {atraso.tareasTarde > 0 ? (
            <div className="ae-fila">
              <span className="ae-k">Tareas fuera de su fecha</span>
              <span className="ae-v mono crit">{atraso.tareasTarde}</span>
            </div>
          ) : null}
          <p className="ae-nota">
            Este retraso es solo de esta etapa. No cuenta lo que pase en las demás, ni se lo pasa
            a ellas.
          </p>
        </div>
      )}
    </div>
  );
}
