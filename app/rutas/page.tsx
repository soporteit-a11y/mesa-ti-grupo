import { redirect } from "next/navigation";

/**
 * El módulo se llamaba "Rutas de trabajo" y vivía en /rutas. Se renombró a
 * "Cronogramas" (2026-09-02). Esta redirección existe para que los enlaces
 * guardados, favoritos o compartidos antes del cambio sigan funcionando.
 */
export default function RutasRedirect() {
  redirect("/cronogramas");
}
