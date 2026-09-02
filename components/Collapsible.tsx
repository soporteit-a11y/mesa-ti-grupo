"use client";

import { useEffect, useState } from "react";

const EVENTO = "mesati:plegar";
const PREFIJO = "mesati.abierto.";

/**
 * Bloque plegable reutilizable (cronogramas y fases).
 *
 * El estado se guarda en localStorage por dos razones:
 *  1. Marcar una tarea dispara revalidatePath y vuelve a pintar la pagina; sin
 *     persistir, todo lo que tenias abierto se cerraria en cada clic.
 *  2. Al volver a la pagina sigues donde estabas, que es lo util cuando el
 *     cronograma tiene 60 fases.
 *
 * Se envuelve en try/catch porque en navegacion privada localStorage puede
 * lanzar al escribir, y eso no debe romper la pagina.
 */
function leer(clave: string, porDefecto: boolean): boolean {
  try {
    const v = localStorage.getItem(PREFIJO + clave);
    return v === null ? porDefecto : v === "1";
  } catch {
    return porDefecto;
  }
}

function guardar(clave: string, abierto: boolean) {
  try {
    localStorage.setItem(PREFIJO + clave, abierto ? "1" : "0");
  } catch {}
}

export function Collapsible({
  storageKey, defaultOpen = false, head, meta, className = "", children,
}: {
  storageKey: string;
  defaultOpen?: boolean;
  /** Contenido de la cabecera, siempre visible. */
  head: React.ReactNode;
  /** Resumen corto que solo se muestra cuando esta plegado. */
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // Arranca con el valor por defecto y lo corrige tras montar: leer
  // localStorage durante el render rompe la hidratacion (servidor y cliente
  // pintarian cosas distintas).
  const [abierto, setAbierto] = useState(defaultOpen);

  useEffect(() => {
    setAbierto(leer(storageKey, defaultOpen));
  }, [storageKey, defaultOpen]);

  // "Expandir todo" / "Contraer todo" avisan por un evento de ventana.
  useEffect(() => {
    function onPlegar(e: Event) {
      const d = (e as CustomEvent<{ abrir: boolean; alcance: string }>).detail;
      if (!d) return;
      // Un alcance terminado en "." es un grupo ("crono.", "fase."); cualquier
      // otro es una clave concreta y tiene que coincidir EXACTAMENTE. Con
      // startsWith a secas, abrir "crono.lista.12" abriria tambien
      // "crono.lista.123".
      if (d.alcance) {
        const esGrupo = d.alcance.endsWith(".");
        const coincide = esGrupo ? storageKey.startsWith(d.alcance) : storageKey === d.alcance;
        if (!coincide) return;
      }
      setAbierto(d.abrir);
      guardar(storageKey, d.abrir);
    }
    window.addEventListener(EVENTO, onPlegar);
    return () => window.removeEventListener(EVENTO, onPlegar);
  }, [storageKey]);

  const alternar = () => {
    const v = !abierto;
    setAbierto(v);
    guardar(storageKey, v);
  };

  return (
    <div className={"clp " + className + (abierto ? " abierto" : "")}>
      <div className="clp-head">
        <button
          type="button"
          className="clp-toggle"
          onClick={alternar}
          aria-expanded={abierto}
          title={abierto ? "Contraer" : "Desplegar"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div className="clp-head-in" onDoubleClick={alternar}>{head}</div>
      </div>
      {!abierto && meta ? <div className="clp-meta">{meta}</div> : null}
      {abierto ? <div className="clp-body">{children}</div> : null}
    </div>
  );
}

/** Botones de "Expandir todo / Contraer todo" para un alcance dado. */
export function ExpandirTodo({ alcance, etiqueta }: { alcance: string; etiqueta?: string }) {
  const emitir = (abrir: boolean) => {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { abrir, alcance } }));
  };
  return (
    <div className="vista-toggle">
      <button type="button" className="btn sm" onClick={() => emitir(true)}>
        Expandir{etiqueta ? ` ${etiqueta}` : ""}
      </button>
      <button type="button" className="btn sm" onClick={() => emitir(false)}>
        Contraer
      </button>
    </div>
  );
}
