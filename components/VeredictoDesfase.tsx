"use client";

import { useEffect, useRef, useState } from "react";
import { irAEtapa } from "@/components/GanttInteractivo";

export type FaseAtrasada = {
  cronoId: number;
  cronoTitulo: string;
  fase: string;
  numero: number;
  finTexto: string;
  diasAtraso: number;
  done: number;
  total: number;
  progress: number;
};

/**
 * El veredicto ("Atrasado 29 puntos") deja de ser un cartel y pasa a ser un
 * botón que responde la pregunta obvia: ¿atrasado por qué?
 *
 * Al abrirlo lista las fases cuya fecha de fin ya pasó y siguen incompletas,
 * ordenadas por las que más días llevan, y cada una lleva al desglose de su
 * etapa. Se despliega como panel flotante (igual que el menú de usuario) para
 * no descolocar la fila de la cabecera.
 */
export function VeredictoDesfase({
  cls, texto, pctTiempo, pctReal, atrasadas, vista,
}: {
  cls: string;
  texto: string;
  pctTiempo: number;
  pctReal: number;
  atrasadas: FaseAtrasada[];
  vista: string;
}) {
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

  const masAtrasada = atrasadas[0];

  return (
    <div className="vd-wrap" ref={wrapRef}>
      <button
        type="button"
        className={"po-veredicto vd-btn " + cls}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Ver qué está atrasado"
      >
        {texto}
        <svg className="vd-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="vd-panel">
          <p className="vd-expl">
            El proyecto lleva consumido el <b>{pctTiempo}%</b> del calendario y hecho el{" "}
            <b>{pctReal}%</b> de las tareas. Esa diferencia son los <b>{Math.abs(pctReal - pctTiempo)} puntos</b>.
          </p>

          {atrasadas.length === 0 ? (
            <p className="pv-meta">
              Ninguna fase tiene la fecha de fin vencida todavía: el desfase viene de tareas sin
              marcar en fases que aún están dentro de plazo.
            </p>
          ) : (
            <>
              <div className="vd-k">
                {atrasadas.length} fase{atrasadas.length === 1 ? "" : "s"} con la fecha vencida
                {masAtrasada ? ` · hasta ${masAtrasada.diasAtraso} días de atraso` : ""}
              </div>
              <ul className="vd-lista">
                {atrasadas.map((a) => (
                  <li key={`${a.cronoId}-${a.fase}-${a.numero}`}>
                    <button
                      type="button"
                      className="vd-item"
                      onClick={() => {
                        setOpen(false);
                        irAEtapa(`crono.${vista}.${a.cronoId}`, `crono-${a.cronoId}`);
                      }}
                      title="Ir al desglose de esta etapa"
                    >
                      <span className="vd-dias mono">{a.diasAtraso}d</span>
                      <span className="vd-txt">
                        <span className="vd-fase">Fase {a.numero} · {a.fase}</span>
                        <span className="vd-crono mono">
                          {a.cronoTitulo} · venció {a.finTexto} · {a.done}/{a.total} tareas ({a.progress}%)
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
