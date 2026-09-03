import { headers } from "next/headers";

/**
 * Envio de correo via la API HTTP de Resend (fetch puro, sin agregar ninguna
 * dependencia — consistente con que este proyecto no usa librerias mas alla
 * de Next/React/el driver de Neon).
 *
 * Sin RESEND_API_KEY configurada, no-opea con un aviso en los logs en vez de
 * fallar: igual que `hasDb` en lib/sql.ts, una funcionalidad opcional sin
 * configurar no debe tumbar la accion que la dispara (crear un usuario, pedir
 * un restablecimiento de clave siguen funcionando aunque el correo no salga).
 *
 * Para activar el envio real: agregar RESEND_API_KEY en las variables de
 * entorno de Vercel (cuenta gratis en resend.com, 3000 correos/mes). Sin
 * verificar un dominio propio en Resend, el remitente de prueba
 * (onboarding@resend.dev) SOLO entrega al correo con el que se creo la cuenta
 * de Resend — para que le llegue a cualquier colaborador hace falta verificar
 * un dominio real y poner EMAIL_FROM con una direccion de ese dominio.
 */
/**
 * Si el envio de correo esta conectado. La interfaz lo consulta para no
 * ofrecer botones que no harian nada: un boton que no avisa de que no hizo
 * nada es peor que no tenerlo (paso exactamente eso con "Enviar enlace").
 */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[correo] RESEND_API_KEY no configurada — no se envio "${subject}" a ${to}`);
    return false;
  }
  const from = process.env.EMAIL_FROM || "Mesa TI <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[correo] Resend respondio ${res.status} al enviar "${subject}" a ${to}:`, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[correo] fallo de red enviando "${subject}" a ${to}:`, e);
    return false;
  }
}

/**
 * Dominio de la app para armar enlaces en los correos. Se toma del propio
 * request (headers de Server Action) en vez de una URL fija: asi funciona
 * igual en produccion, en un deploy de preview, o en local, sin variable de
 * entorno nueva que mantener sincronizada.
 */
export function baseUrl(): string {
  try {
    const h = headers();
    const host = h.get("host");
    if (host) return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  } catch (e) {}
  return "https://mesa-ti-grupo-delta.vercel.app";
}

function envoltorio(cuerpo: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="font-family: monospace; font-weight: 700; letter-spacing: .04em; color: #4a7a2a; margin-bottom: 18px;">MESA TI · GRUPO EMPRESARIAL</div>
      ${cuerpo}
      <p style="font-size: 12px; color: #888; margin-top: 28px;">Este es un correo automático de Mesa TI. Si no esperabas este mensaje, ignóralo.</p>
    </div>`;
}

export function emailRestablecer(nombre: string, link: string): { subject: string; html: string } {
  return {
    subject: "Restablecer tu contraseña — Mesa TI",
    html: envoltorio(`
      <p>Hola ${nombre},</p>
      <p>Pediste restablecer tu contraseña en Mesa TI. Este enlace es válido por 1 hora:</p>
      <p><a href="${link}" style="color:#4a7a2a;">${link}</a></p>
      <p>Si no fuiste tú, ignora este correo — tu contraseña no cambia hasta que abras el enlace.</p>
    `),
  };
}

export function emailBienvenida(nombre: string, link: string): { subject: string; html: string } {
  return {
    subject: "Tu cuenta en Mesa TI — crea tu contraseña",
    html: envoltorio(`
      <p>Hola ${nombre},</p>
      <p>Se creó una cuenta para ti en Mesa TI. Para entrar, primero elige tu contraseña con este
      enlace (válido por 1 hora):</p>
      <p><a href="${link}" style="color:#4a7a2a;">${link}</a></p>
    `),
  };
}

export function emailCuentaAprobada(nombre: string, link: string): { subject: string; html: string } {
  return {
    subject: "Tu cuenta en Mesa TI ya está activa",
    html: envoltorio(`
      <p>Hola ${nombre},</p>
      <p>Tu solicitud de cuenta en Mesa TI fue aprobada. Ya puedes iniciar sesión:</p>
      <p><a href="${link}" style="color:#4a7a2a;">${link}</a></p>
    `),
  };
}

/**
 * Aviso de lo que vence esta semana.
 *
 * Va en una sola tabla y sin adornos: quien lo recibe necesita saber que le
 * toca y cuando, no leer un boletin. Se ordena por lo que vence antes, y lo que
 * vence hoy o manana se marca, porque es lo unico que exige accion inmediata.
 */
export function emailVencimientos(
  nombre: string,
  items: { tipo: string; titulo: string; etapa: string; empresa: string; vence: string; diasRestantes: number }[],
  link: string,
): { subject: string; html: string } {
  const filas = items
    .map((i) => {
      const urgente = i.diasRestantes <= 1;
      const cuando =
        i.diasRestantes === 0 ? "hoy" : i.diasRestantes === 1 ? "mañana" : `en ${i.diasRestantes} días`;
      return `
        <tr>
          <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;">
            <b>${escapar(i.titulo)}</b>
            <div style="color:#888;font-size:11px;">${escapar(i.empresa)} · ${escapar(i.etapa)} · ${i.tipo}</div>
          </td>
          <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:12px;white-space:nowrap;${urgente ? "color:#c0392b;font-weight:700;" : "color:#555;"}">
            ${escapar(i.vence)}<br><span style="font-size:11px;">${cuando}</span>
          </td>
        </tr>`;
    })
    .join("");

  return {
    subject: `${items.length} ${items.length === 1 ? "cosa vence" : "cosas vencen"} esta semana — Mesa TI`,
    html: envoltorio(`
      <p>Hola ${escapar(nombre)},</p>
      <p>Esto vence dentro de los próximos 7 días y todavía no está terminado:</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">${filas}</table>
      <p><a href="${link}" style="color:#4a7a2a;">Abrir cronogramas</a></p>
    `),
  };
}

/**
 * Escapa texto que va dentro del HTML del correo. Los titulos de fases y tareas
 * los escribe gente, y un "<" suelto romperia la maqueta del mensaje.
 */
function escapar(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
