"use client";

import { useEffect } from "react";

/**
 * Pantalla de error de la aplicacion.
 *
 * Sin esto, cualquier fallo en el navegador deja la pantalla en negro con
 * "Application error: a client-side exception has occurred", que no le dice
 * nada a quien lo sufre ni a quien tiene que arreglarlo. Aqui se muestra el
 * mensaje real y se ofrece reintentar, que en la mayoria de los casos basta.
 *
 * Los errores del SERVIDOR llegan censurados a proposito (solo un `digest`,
 * para no filtrar detalles internos a quien mira la pagina); ese digest es lo
 * que permite localizar la traza completa en los registros de Vercel. Los
 * errores del navegador si traen su mensaje, que es justo lo que hace falta
 * para diagnosticar sin tener que pedirle a nadie que abra la consola.
 */
export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en la consola del navegador con la traza completa, por si hace
    // falta mas detalle del que cabe en pantalla.
    console.error("[mesa-ti] error no controlado:", error);
  }, [error]);

  return (
    <div className="err-page">
      <div className="err-card">
        <div className="err-title">Algo se rompió en esta pantalla</div>
        <p className="err-lead">
          El servidor respondió bien; el fallo ocurrió al dibujar la página. Casi siempre se
          arregla reintentando. Si vuelve a pasar, mándale este detalle a quien mantiene el
          sistema.
        </p>
        <pre className="err-detalle mono">{error.message || "Sin mensaje"}</pre>
        {error.digest ? (
          <p className="err-digest mono">
            Referencia del servidor: {error.digest}
          </p>
        ) : null}
        <div className="err-acciones">
          <button type="button" className="btn" onClick={reset}>Reintentar</button>
          <a className="btn" href="/cronogramas">Ir a Cronogramas</a>
          <a className="btn" href="/">Ir al inicio</a>
        </div>
      </div>
    </div>
  );
}
