import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/UserMenu";
import { hasDb, sql } from "@/lib/db";
import { getAlertCounts } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

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
  // Sin sesion no se pinta el armazon de la app (menu lateral + barra de
  // usuario): asi /login se ve como una pantalla suelta y no como una pagina
  // mas del sistema con el menu de alguien que todavia no ha entrado.
  let user = null;
  if (hasDb) {
    try {
      user = await getCurrentUser();
    } catch (e) {
      console.error("[sesion] getCurrentUser fallo:", e);
    }
  }

  if (!user) {
    return (
      <html lang="es">
        <body>{children}</body>
      </html>
    );
  }

  const esAdmin = user.role === "admin";

  // Contador de avisos del menu. Nunca debe tumbar el layout: si la base no
  // esta conectada o la consulta falla, se muestra sin insignia.
  let alerts = { breached: 0, dueSoon: 0 };
  if (esAdmin) {
    try {
      alerts = await getAlertCounts();
    } catch (e) {
      // Se registra a proposito: sin esto, un fallo de la consulta seria
      // indistinguible de "no hay nada vencido" y las alertas dejarian de
      // avisar en silencio, que es justo lo que no debe pasar.
      console.error("[avisos SLA] getAlertCounts fallo:", e);
    }
  }

  // Nombres de las empresas asignadas, solo para mostrarlos en el perfil.
  let misEmpresas: string[] = [];
  if (!esAdmin) {
    try {
      const rows = await sql!`
        SELECT c.name FROM user_companies uc JOIN companies c ON c.id = uc.company_id
        WHERE uc.user_id = ${user.id} ORDER BY c.name`;
      misEmpresas = (rows as any[]).map((r) => r.name);
    } catch (e) {
      console.error("[perfil] empresas del usuario fallaron:", e);
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
              {esAdmin ? (
                <>
                  <NavLink href="/" label="Dashboard" icon="grid" />
                  <NavLink
                    href="/tickets"
                    label="Mesa de ayuda"
                    icon="inbox"
                    badge={alerts.breached}
                    badgeWarn={alerts.dueSoon}
                  />
                  <NavLink href="/cronogramas" label="Cronogramas" icon="route" />
                  <NavLink href="/config" label="Configuración" icon="settings" />
                </>
              ) : (
                <>
                  <NavLink href="/mis-tickets" label="Mis reportes" icon="inbox" />
                  <NavLink href="/cronogramas" label="Cronogramas" icon="route" />
                </>
              )}
            </nav>
            <div className="spacer" />
            <div className="side-foot">
              Droppett · Gilligan<br />CMG · Shazam
            </div>
          </aside>
          <main className="main">
            <div className="userbar">
              <UserMenu name={user.name} email={user.email} role={user.role} companies={misEmpresas} />
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
