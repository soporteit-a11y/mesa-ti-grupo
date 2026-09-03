"use client";

import { useState } from "react";

/**
 * Abre la etapa indicada y hace scroll hasta ella. Compartida por las barras
 * del Gantt, sus etiquetas y el detalle del atraso: las tres hacen exactamente
 * lo mismo desde sitios distintos.
 */
export function irAEtapa(storageKey: string, anchorId: string) {
  window.dispatchEvent(
    new CustomEvent("mesati:plegar", { detail: { abrir: true, alcance: storageKey } })
  );
  // El bloque tarda un frame en montarse tras abrirse; sin el retardo el
  // scroll apunta a un elemento que todavia mide 0.
  setTimeout(() => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

/**
 * Barra del Gantt que lleva al detalle de su etapa.
 *
 * Al pulsarla despliega el bloque correspondiente (le manda el mismo evento que
 * usan los botones de Expandir/Contraer, ver Collapsible.tsx) y hace scroll
 * hasta el. Asi el Gantt deja de ser solo un dibujo y pasa a ser el indice del
 * cronograma: ves el periodo, pulsas, y estas en el desglose.
 */
export function GanttBar({
  storageKey, anchorId, titulo, izq, ancho, progress, color, vencida, lista, detalle,
}: {
  storageKey: string;
  anchorId: string;
  titulo: string;
  izq: number;
  ancho: number;
  progress: number;
  color: string;
  vencida: boolean;
  lista: boolean;
  detalle: string;
}) {
  const ir = () => {
    window.dispatchEvent(
      new CustomEvent("mesati:plegar", { detail: { abrir: true, alcance: storageKey } })
    );
    // El bloque tarda un frame en montarse tras abrirse; sin el retardo el
    // scroll apunta a un elemento que todavia mide 0.
    setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <button
      type="button"
      onClick={ir}
      className={"gantt-bar clicable" + (vencida ? " vencida" : "") + (lista ? " lista" : "")}
      style={{ left: `${izq}%`, width: `${ancho}%`, borderColor: color }}
      title={`${detalle}\n\nClic para ver el desglose`}
    >
      <span className="gantt-fill" style={{ width: `${progress}%`, background: color }} />
      <span className="gantt-bar-txt mono">{progress}%</span>
    </button>
  );
}

/** Etiqueta de fila del Gantt, tambien clicable, y que se puede ampliar. */
export function GanttLabel({
  storageKey, anchorId, titulo,
}: {
  storageKey: string; anchorId: string; titulo: string;
}) {
  const ir = () => {
    window.dispatchEvent(
      new CustomEvent("mesati:plegar", { detail: { abrir: true, alcance: storageKey } })
    );
    setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };
  return (
    <button type="button" className="gantt-lbl clicable" onClick={ir} title={`${titulo}\n\nClic para ver el desglose`}>
      {titulo}
    </button>
  );
}

/**
 * Interruptor del ancho de la columna de nombres. Los titulos largos
 * ("ETAPA 4 - SINCO · A&F — BD Secundaria 1") no caben en la columna estrecha
 * y quedaban cortados sin manera de leerlos completos.
 */
export function AnchoNombres({ children }: { children: React.ReactNode }) {
  const [ancho, setAncho] = useState(false);
  return (
    <div className={"gantt-wrap" + (ancho ? " nombres-anchos" : "")}>
      <div className="gantt-tools">
        <button type="button" className="btn sm" onClick={() => setAncho((v) => !v)}>
          {ancho ? "◂ Encoger nombres" : "▸ Ampliar nombres"}
        </button>
      </div>
      {children}
    </div>
  );
}

/** Abre o cierra TODAS las etapas de golpe. */
export function DesplegarEtapas() {
  const emitir = (abrir: boolean) =>
    window.dispatchEvent(new CustomEvent("mesati:plegar", { detail: { abrir, alcance: "crono." } }));
  return (
    <div className="vista-toggle">
      <button type="button" className="btn sm" onClick={() => emitir(true)}>Desplegar todas las etapas</button>
      <button type="button" className="btn sm" onClick={() => emitir(false)}>Contraer todas</button>
    </div>
  );
}
