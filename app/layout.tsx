import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NavLink } from "@/components/NavLink";
import { hasDb } from "@/lib/db";
import { getAlertCounts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Mesa de Servicios TI — Grupo Empresarial",
  description: "Sistema de tickets y priorización para Droppett, Gilligan, CMG y Shazam.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0E15",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Contador de avisos del menu. Nunca debe tumbar el layout: si la base no
  // esta conectada o la consulta falla, se muestra sin insignia.
  let alerts = { breached: 0, dueSoon: 0 };
  if (hasDb) {
    try { alerts = await getAlertCounts(); } catch (e) {}
  }

  return (
    <html lang="es">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <div className="logo">TI</div>
              <div>
                <div className="bt">MESA&nbsp;TI</div>
                <div className="bs">Grupo empresarial</div>
              </div>
            </div>
            <div className="nav-label">Operación</div>
            <nav className="sidebar-nav">
              <NavLink href="/" label="Dashboard" icon="grid" />
              <NavLink
                href="/tickets"
                label="Mesa de ayuda"
                icon="inbox"
                badge={alerts.breached}
                badgeWarn={alerts.dueSoon}
              />
              <NavLink href="/rutas" label="Rutas de trabajo" icon="route" />
              <NavLink href="/config" label="Configuración" icon="settings" />
            </nav>
            <div className="spacer" />
            <div className="side-foot">
              Droppett · Gilligan<br />CMG · Shazam
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
