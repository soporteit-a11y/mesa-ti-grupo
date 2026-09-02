import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { getSession, type SessionUser } from "./session";

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

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getSession(token);
}

export async function requireAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
