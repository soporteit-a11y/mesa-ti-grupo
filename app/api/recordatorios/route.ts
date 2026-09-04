import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { getEventos, repartir, sinAvisar, marcarAvisados, DIAS_AVISO } from "@/lib/recordatorios";
import { sendEmail, baseUrl, emailConfigurado, emailEventosEtapa } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Avisos por correo de los tres momentos de una etapa: cuando arranca, cuando
 * le queda una semana para terminar, y cuando se completa.
 *
 * Lo dispara el cron de Vercel (ver vercel.json). Va a todo el que tenga
 * habilitada esa empresa — quien esta dado de alta en CMG recibe los eventos de
 * CMG — mas los administradores. Un correo por persona con todo lo suyo, no uno
 * por etapa.
 *
 * **Nada se avisa dos veces.** Cada evento tiene una clave en la tabla
 * `avisos_enviados`, y solo se marca DESPUES de que el correo salga: si el
 * envio falla, el aviso sigue pendiente y se reintenta al dia siguiente en vez
 * de darse por hecho.
 */
export async function GET(req: Request) {
  // Falla cerrado: sin CRON_SECRET no se atiende a nadie.
  //
  // La tentacion es "si no hay secreto, dejar pasar", y es justo al reves: esta
  // ruta dispara correos a todo el personal y no esta detras del login (el cron
  // no trae cookie). Sin secreto seria un boton de envio masivo publico, y de
  // paso contaria a cualquiera cuanto trabajo hay pendiente.
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurada; la ruta queda cerrada a proposito" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  await ensureSchema();

  const todos = await getEventos();
  const nuevos = await sinAvisar(todos);

  if (nuevos.length === 0) {
    return NextResponse.json({ ok: true, eventos: todos.length, nuevos: 0, enviados: 0 });
  }

  // Sin correo configurado no se marca nada como avisado: cuando exista la
  // clave de Resend, el siguiente disparo hara el trabajo en vez de creer que
  // ya lo hizo y callarse para siempre.
  if (!emailConfigurado()) {
    return NextResponse.json({
      ok: false,
      eventos: todos.length,
      nuevos: nuevos.length,
      enviados: 0,
      motivo: "RESEND_API_KEY no configurada — el aviso en pantalla sí funciona",
    });
  }

  const buzones = await repartir(nuevos);
  const link = `${baseUrl()}/cronogramas`;
  let enviados = 0;
  let fallidos = 0;

  for (const d of buzones) {
    const { subject, html } = emailEventosEtapa(d.nombre, d.eventos, link);
    if (await sendEmail(d.correo, subject, html)) enviados++;
    else fallidos++;
  }

  // Solo se dan por avisados si alguien los recibio. Marcarlos con cero envios
  // los enterraria: no volverian a intentarse nunca.
  if (enviados > 0) await marcarAvisados(nuevos);

  return NextResponse.json({
    ok: true,
    eventos: todos.length,
    nuevos: nuevos.length,
    destinatarios: buzones.length,
    enviados,
    fallidos,
    dias: DIAS_AVISO,
  });
}
