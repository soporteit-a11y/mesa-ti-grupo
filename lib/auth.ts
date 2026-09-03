import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sql, ensureSchema } from "./db";

/** Usuario de la sesion, ya con sus permisos (solo del lado Node). */
export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  can_edit_schedule: boolean;
  can_create_tickets: boolean;
};

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export async function createSessionCookie(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql!`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt.toISOString()})`;
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await sql!`DELETE FROM sessions WHERE token = ${token}`;
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Resuelve la sesion con permisos incluidos. Hace su propia consulta en vez de
 * reusar getSession() de lib/session.ts porque aqui si se puede llamar a
 * ensureSchema() primero — ver el comentario de SessionUser en ese archivo.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || !sql) return null;
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.approved, u.can_edit_schedule, u.can_create_tickets
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > now()`;
    return (rows[0] as CurrentUser) || null;
  } catch (e) {
    console.error("[sesion] getCurrentUser fallo:", e);
    return null;
  }
}

export async function requireAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/**
 * A donde va cada rol despues de entrar, o cuando pide una ruta que no le
 * corresponde. Centralizado aqui para no repetir el mapeo (login, middleware,
 * y las paginas admin-only que redirigen en defensa de profundidad).
 */
export function roleHome(role: string): string {
  if (role === "admin") return "/";
  if (role === "viewer") return "/cronogramas";
  return "/mis-tickets";
}
