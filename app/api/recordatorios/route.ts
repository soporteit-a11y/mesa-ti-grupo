import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getPendientes, porDestinatario, DIAS_AVISO } from "@/lib/recordatorios";
import { sendEmail, baseUrl, emailConfigurado, emailVencimientos } from "@/lib/email";
import { hoyEnRD } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Envio diario de avisos de vencimiento.
 *
 * Lo dispara el cron de Vercel (ver vercel.json). Se protege con CRON_SECRET:
 * sin el, cualquiera con la URL podria provocar una tanda de correos.
 *
 * **Un aviso por persona y por dia, no uno por tarea.** Si a alguien le vencen
 * seis cosas recibe un correo con las seis, no seis correos. La diferencia
 * entre un sistema que se lee y uno que se filtra a la papelera esta justo ahi.
 *
 * La marca de "ya enviado" se guarda en `meta` con la fecha del dia. Un cron
 * puede dispararse dos veces (reintento, redespliegue), y sin esto la segunda
 * vez volveria a escribirle a todo el mundo.
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secreto}`) {
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    }
  }

  await ensureSchema();
  const hoy = hoyEnRD();
  const clave = `recordatorio_${hoy}`;

  const url = new URL(req.url);
  const forzar = url.searchParams.get("forzar") === "1";

  const ya = await sql!`SELECT v FROM meta WHERE k = ${clave}`;
  if (ya.length > 0 && !forzar) {
    return NextResponse.json({ ok: true, omitido: "ya se envió hoy", detalle: ya[0].v });
  }

  const pendientes = await getPendientes();
  if (pendientes.length === 0) {
    await marcar(clave, "nada que avisar");
    return NextResponse.json({ ok: true, pendientes: 0, enviados: 0 });
  }

  // Sin correo configurado no se marca el dia como enviado: cuando Eddy ponga
  // la clave de Resend, el siguiente disparo hara el trabajo en vez de creer
  // que ya lo hizo.
  if (!emailConfigurado()) {
    return NextResponse.json({
      ok: false,
      pendientes: pendientes.length,
      enviados: 0,
      motivo: "RESEND_API_KEY no configurada — el aviso en pantalla sí funciona",
    });
  }

  const grupos = porDestinatario(pendientes);
  const link = `${baseUrl()}/cronogramas`;
  let enviados = 0;

  for (const [userId, items] of grupos) {
    // Sin dueno asignado va a los administradores: un vencimiento que no es de
    // nadie es el que mas facil se queda sin mirar.
    const destinos =
      userId === null
        ? ((await sql!`SELECT name, email FROM users WHERE role = 'admin' AND approved = true AND email <> ''`) as any[])
        : ((await sql!`SELECT name, email FROM users WHERE id = ${userId} AND approved = true AND email <> ''`) as any[]);

    for (const d of destinos) {
      if (!d.email) continue;
      const { subject, html } = emailVencimientos(d.name, items, link);
      if (await sendEmail(d.email, subject, html)) enviados++;
    }
  }

  await marcar(clave, `${enviados} correos, ${pendientes.length} vencimientos`);
  return NextResponse.json({ ok: true, pendientes: pendientes.length, enviados, dias: DIAS_AVISO });
}

async function marcar(clave: string, detalle: string) {
  await sql!`INSERT INTO meta (k, v) VALUES (${clave}, ${detalle})
    ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
}
