import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Rutas que solo puede ver el super admin. Un colaborador que las pida es
 * redirigido a su propia pantalla en vez de recibir un error.
 */
const SOLO_ADMIN = ["/", "/tickets", "/config"];

/** Unicas rutas accesibles sin haber iniciado sesion. */
const PUBLICAS = ["/login", "/registro"];

/** El rol "visualizador" solo ve cronogramas: no crea tickets ni tiene los suyos. */
const SOLO_NO_VIEWER = ["/mis-tickets"];

function coincide(lista: string[], pathname: string): boolean {
  return lista.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
}

/**
 * A donde va cada rol. Duplicado a proposito de roleHome() en lib/auth.ts: ese
 * archivo importa cookies() de next/headers y no es edge-safe, y el middleware
 * corre en Edge Runtime (ver la tabla de runtimes en HANDOFF.md §5.11). Si
 * cambias el mapeo de roles, cambialo en los dos sitios.
 */
function inicioDe(role: string): string {
  if (role === "admin") return "/";
  if (role === "viewer") return "/cronogramas";
  return "/mis-tickets";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getSession(req.cookies.get("session")?.value);

  // Sin sesion: solo se pueden ver las rutas publicas.
  if (!user) {
    if (PUBLICAS.includes(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const inicio = inicioDe(user.role);

  // Ya con sesion, login/registro no tienen sentido: a su pantalla de inicio.
  if (PUBLICAS.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = inicio;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user.role !== "admin" && coincide(SOLO_ADMIN, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = inicio;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // El visualizador no reporta tickets ni tiene los suyos: /mis-tickets no le
  // sirve de nada.
  if (user.role === "viewer" && coincide(SOLO_NO_VIEWER, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/cronogramas";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Se excluyen los archivos internos de Next y cualquier ruta con extension
  // (imagenes, favicon): si no, cada asset estatico gastaria una consulta a la
  // base para resolver la sesion.
  matcher: ["/((?!_next/|.*\\.).*)"],
};
