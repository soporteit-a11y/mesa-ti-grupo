// Importa de lib/sql.ts, NO de lib/db.ts: este archivo lo usa el middleware, que
// corre en Edge Runtime, y db.ts arrastra `crypto` de Node (ver lib/sql.ts).
import { sql } from "./sql";

/**
 * Datos minimos de sesion. A proposito NO incluye permisos ni `approved`:
 * este SELECT lo ejecuta el middleware en cada request, incluso justo despues
 * de un despliegue que agregue columnas nuevas, antes de que ensureSchema()
 * haya podido correr. Si pidiera una columna que todavia no existe, la consulta
 * fallaria y dejaria a todo el mundo fuera del sistema.
 *
 * Los permisos se leen del lado Node en getCurrentUser() (lib/auth.ts), que si
 * puede llamar a ensureSchema() antes.
 */
export type SessionUser = { id: number; name: string; email: string; role: string };

export async function getSession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || !sql) return null;
  try {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > now()`;
    return (rows[0] as SessionUser) || null;
  } catch (e) {
    // Las tablas users/sessions pueden no existir todavia (deploy nuevo, nadie
    // ha renderizado una pagina que dispare ensureSchema). Tratar como "no logueado"
    // en vez de tumbar el middleware con un 500.
    return null;
  }
}
