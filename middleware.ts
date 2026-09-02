import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";

/**
 * Rutas que solo puede ver el super admin. Un colaborador que las pida es
 * redirigido a su propia pantalla en vez de recibir un error.
 */
const SOLO_ADMIN = ["/", "/tickets", "/config"];

/** Unicas rutas accesibles sin haber iniciado sesion. */
const PUBLICAS = ["/login", "/registro"];

function esRutaAdmin(pathname: string): boolean {
  return SOLO_ADMIN.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
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

  const inicio = user.role === "admin" ? "/" : "/mis-tickets";

  // Ya con sesion, login/registro no tienen sentido: a su pantalla de inicio.
  if (PUBLICAS.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = inicio;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user.role !== "admin" && esRutaAdmin(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/mis-tickets";
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
