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
    try {
      alerts = await getAlertCounts();
    } catch (e) {
      // Se registra a proposito: sin esto, un fallo de la consulta seria
      // indistinguible de "no hay nada vencido" y las alertas dejarian de
      // avisar en silencio, que es justo lo que no debe pasar.
      console.error("[avisos SLA] getAlertCounts fallo:", e);
    }
  }

  return (
    <html lang="es">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <img src="/droppett-icon-white.png" alt="Droppett" className="logo" />
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
