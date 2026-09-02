import { sql } from "./db";

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
