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
 * Aviso de eventos de etapa: la que arranca, la que esta por vencer y la que se
 * completo.
 *
 * Van los tres tipos en un mismo correo, separados por bloques. Mandar tres
 * correos distintos el mismo dia a la misma persona es como se consigue que
 * deje de abrirlos; lo que hay que separar es el tono, no el mensaje.
 *
 * El orden no es casual: primero lo que exige actuar, al final la buena
 * noticia. Nadie deberia tener que bajar hasta el fondo para enterarse de que
 * algo se le vence en dos dias.
 */
export function emailEventosEtapa(
  nombre: string,
  eventos: {
    tipo: "inicia" | "vence" | "completada";
    etapa: string; empresa: string; fecha: string;
    diasRestantes: number | null; progreso: number; hechas: number; total: number;
  }[],
  link: string,
): { subject: string; html: string } {
  const de = (t: string) => eventos.filter((e) => e.tipo === t);
  const vencen = de("vence");
  const inician = de("inicia");
  const listas = de("completada");

  const bloque = (titulo: string, color: string, items: typeof eventos, pie: (e: any) => string) =>
    items.length === 0
      ? ""
      : `<div style="margin:18px 0 0;">
           <div style="font-size:12px;font-weight:700;color:${color};letter-spacing:.04em;text-transform:uppercase;">${titulo}</div>
           <table style="width:100%;border-collapse:collapse;margin-top:6px;">
             ${items
               .map(
                 (e) => `<tr>
                   <td style="padding:7px 0;border-bottom:1px solid #eee;font-size:13px;">
                     <b>${escapar(e.etapa)}</b>
                     <div style="color:#888;font-size:11px;">${escapar(e.empresa)} · ${escapar(pie(e))}</div>
                   </td>
                 </tr>`,
               )
               .join("")}
           </table>
         </div>`;

  // El asunto dice lo mas urgente que hay dentro. Un asunto generico obliga a
  // abrir el correo para saber si corre prisa.
  const subject = vencen.length
    ? `${vencen.length === 1 ? "Una etapa vence" : `${vencen.length} etapas vencen`} pronto — Mesa TI`
    : inician.length
    ? `${inician.length === 1 ? "Empieza una etapa" : `Empiezan ${inician.length} etapas`} hoy — Mesa TI`
    : `${listas.length === 1 ? "Etapa completada" : `${listas.length} etapas completadas`} — Mesa TI`;

  return {
    subject,
    html: envoltorio(`
      <p>Hola ${escapar(nombre)},</p>
      ${bloque(
        "Vence pronto",
        "#c0392b",
        vencen,
        (e) =>
          `${e.diasRestantes === 0 ? "vence hoy" : e.diasRestantes === 1 ? "vence mañana" : `faltan ${e.diasRestantes} días`} (${e.fecha}) · ${e.hechas}/${e.total} tareas · ${e.progreso}%`,
      )}
      ${bloque("Empieza hoy", "#b8860b", inician, (e) => `arranca el ${e.fecha}`)}
      ${bloque("Completada", "#4a7a2a", listas, (e) => `${e.total} tareas terminadas`)}
      <p style="margin-top:20px;"><a href="${link}" style="color:#4a7a2a;">Abrir cronogramas</a></p>
    `),
  };
}

/**
 * Escapa texto que va dentro del HTML del correo. Los titulos de las etapas los
 * escribe gente, y un "<" suelto romperia la maqueta del mensaje.
 */
function escapar(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
