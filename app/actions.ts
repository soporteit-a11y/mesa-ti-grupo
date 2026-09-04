"use server";

import { sql, ensureSchema } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSessionCookie, clearSessionCookie, getCurrentUser, getSessionToken, requireAdmin, roleHome } from "@/lib/auth";
import { getRegistroAbierto } from "@/lib/data";
import { hoyEnRD } from "@/lib/dates";
import { sendEmail, baseUrl, emailConfigurado, emailRestablecer, emailBienvenida, emailCuentaAprobada, emailEventosEtapa } from "@/lib/email";
import { getEventos, repartir, sinAvisar, marcarAvisados } from "@/lib/recordatorios";

export async function login(formData: FormData) {
  await ensureSchema();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=1");

  const rows = await sql!`SELECT id, password_hash, role, approved FROM users WHERE lower(email) = ${email}`;
  const user = rows[0] as { id: number; password_hash: string; role: string; approved: boolean } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) redirect("/login?error=1");

  // Las cuentas creadas por auto-registro nacen sin aprobar. No se les crea
  // sesion: asi una cuenta pendiente no existe para el resto del sistema y el
  // middleware no necesita saber nada de aprobaciones.
  if (!user!.approved) redirect("/login?pendiente=1");

  await createSessionCookie(user!.id);
  redirect(roleHome(user!.role));
}

/**
 * Auto-registro publico. Crea la cuenta SIN aprobar y sin ninguna empresa
 * asignada: hasta que un admin la apruebe en /config, no puede iniciar sesion.
 * Esto es deliberado — la URL es publica, y sin este paso cualquiera en internet
 * tendria una cuenta con acceso al sistema.
 */
export async function registerUser(formData: FormData) {
  await ensureSchema();
  if (!(await getRegistroAbierto())) redirect("/registro?cerrado=1");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!name || !email || password.length < 8) redirect("/registro?error=1");

  const rows = await sql!`INSERT INTO users (name, email, password_hash, role, approved, can_edit_schedule, can_create_tickets)
    VALUES (${name}, ${email}, ${hashPassword(password)}, 'agent', false, false, true)
    ON CONFLICT (email) DO NOTHING RETURNING id`;
  // Si el correo ya existe se muestra el mismo mensaje de exito a proposito:
  // decir "ese correo ya esta registrado" permitiria averiguar quien tiene
  // cuenta en el sistema probando correos.
  revalidatePath("/config");
  redirect("/registro?listo=1");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Auto-servicio de "olvidé mi contraseña". Muestra el mismo mensaje de éxito
 * exista o no la cuenta, y aunque el correo no llegue a enviarse (sin
 * RESEND_API_KEY configurada, por ejemplo) — decir "ese correo no está
 * registrado" permitiría averiguar quién tiene cuenta probando direcciones,
 * el mismo motivo por el que registerUser ya hace esto.
 */
export async function requestPasswordReset(formData: FormData) {
  await ensureSchema();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (email) {
    const rows = await sql!`SELECT id, name FROM users WHERE lower(email) = ${email} AND approved = true`;
    const user = rows[0] as { id: number; name: string } | undefined;
    if (user) {
      const link = await crearEnlaceRestablecer(user.id);
      const { subject, html } = emailRestablecer(user.name, link);
      await sendEmail(email, subject, html);
    }
  }
  redirect("/recuperar?listo=1");
}

/** Completa el restablecimiento: cambia la clave, cierra sesiones abiertas de ese usuario. */
export async function resetPassword(formData: FormData) {
  await ensureSchema();
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (!token) redirect("/login");
  if (password.length < 8) redirect(`/restablecer?token=${token}&error=1`);

  const rows = await sql!`SELECT user_id FROM password_resets WHERE token = ${token} AND expires_at > now()`;
  const row = rows[0] as { user_id: number } | undefined;
  if (!row) redirect("/restablecer?vencido=1");

  await sql!`UPDATE users SET password_hash = ${hashPassword(password)} WHERE id = ${row!.user_id}`;
  await sql!`DELETE FROM password_resets WHERE user_id = ${row!.user_id}`;
  // Si alguien mas dejo una sesion abierta con la clave vieja, se cierra.
  await sql!`DELETE FROM sessions WHERE user_id = ${row!.user_id}`;
  redirect("/login?restablecido=1");
}

/**
 * Rol valido a partir del formulario. Solo tres valores existen; cualquier
 * otra cosa cae en "agent" en vez de fallar, igual que el resto de las
 * acciones de este archivo tratan un dato invalido (silencioso, no un error).
 */
function parseRole(formData: FormData): "admin" | "agent" | "viewer" {
  const raw = String(formData.get("role") || "agent");
  return raw === "admin" || raw === "viewer" ? raw : "agent";
}

/**
 * Crea (reemplazando cualquier anterior) el token de restablecimiento de un
 * usuario y devuelve el enlace completo listo para meter en un correo.
 * Compartida por el auto-servicio (requestPasswordReset), el envio manual del
 * admin (sendResetLink) y la bienvenida de una cuenta sin clave (createUser).
 */
async function crearEnlaceRestablecer(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await sql!`DELETE FROM password_resets WHERE user_id = ${userId}`;
  await sql!`INSERT INTO password_resets (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt.toISOString()})`;
  return `${baseUrl()}/restablecer?token=${token}`;
}

// Guarda las empresas asignadas a un usuario. Se llama desde createUser y
// updateUser; el admin no necesita filas aqui porque siempre ve todas.
async function saveUserCompanies(userId: number, formData: FormData) {
  const ids = formData.getAll("company_ids").map(Number).filter(Boolean);
  await sql!`DELETE FROM user_companies WHERE user_id = ${userId}`;
  for (const cid of ids) {
    await sql!`INSERT INTO user_companies (user_id, company_id) VALUES (${userId}, ${cid}) ON CONFLICT DO NOTHING`;
  }
}

export async function createUser(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = parseRole(formData);
  // Estos dos permisos solo significan algo para un colaborador: el admin los
  // ignora (ve y hace todo) y el visualizador nunca debe marcar ni reportar,
  // asi que se fuerzan a false sin importar que haya llegado marcado en el
  // formulario.
  const canEdit = role === "agent" && formData.get("can_edit_schedule") != null;
  const canTicket = role === "agent" && formData.get("can_create_tickets") != null;
  if (!name || !email) return;

  // Sin correo configurado y sin clave, la cuenta nacería sin ninguna forma de
  // entrar: ni la sabe el admin ni le llega el enlace. Mejor no crearla.
  if (!password && !emailConfigurado()) redirect("/config?err=sinclave");

  // La clave es opcional: si el admin la deja en blanco, se genera una al azar
  // que nadie va a escribir nunca (nadie la conoce) y se le manda al usuario un
  // enlace para que elija la suya — asi el admin no tiene que inventarle una
  // contraseña y comunicarsela por otro medio.
  const passwordHash = hashPassword(password || randomBytes(24).toString("hex"));

  const rows = await sql!`INSERT INTO users (name, email, password_hash, role, approved, can_edit_schedule, can_create_tickets)
    VALUES (${name}, ${email}, ${passwordHash}, ${role}, true, ${canEdit}, ${canTicket})
    ON CONFLICT (email) DO NOTHING RETURNING id`;
  if (rows.length === 0) return; // correo ya usado
  const userId = rows[0].id;
  await saveUserCompanies(userId, formData);

  if (!password) {
    const link = await crearEnlaceRestablecer(userId);
    const { subject, html } = emailBienvenida(name, link);
    await sendEmail(email, subject, html);
  }
  revalidatePath("/config");
}

/** Aprueba o revoca una cuenta (las del auto-registro nacen sin aprobar). */
export async function setUserApproved(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const approved = String(formData.get("approved")) === "1";
  if (!id) return;

  const me = await getCurrentUser();
  if (me?.id === id) return; // no revocarte a ti mismo

  // Se lee el estado anterior para no reenviar el correo de "cuenta activada"
  // cada vez que el admin la active/desactive varias veces.
  const antes = await sql!`SELECT approved, email, name FROM users WHERE id = ${id}`;
  await sql!`UPDATE users SET approved = ${approved} WHERE id = ${id}`;
  // Al revocar se cierran sus sesiones abiertas: si no, seguiria dentro hasta
  // que la cookie caducara sola.
  if (!approved) await sql!`DELETE FROM sessions WHERE user_id = ${id}`;

  if (approved && antes[0] && !antes[0].approved) {
    const { subject, html } = emailCuentaAprobada(antes[0].name, `${baseUrl()}/login`);
    await sendEmail(antes[0].email, subject, html);
  }
  revalidatePath("/config");
}

/**
 * El admin le asigna una contraseña directamente, sin pasar por el correo.
 * Es el camino que siempre funciona: no depende de que Resend este
 * configurado, a diferencia de sendResetLink.
 */
export async function setUserPassword(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") || "");
  if (!id) return;
  if (password.length < 8) redirect("/config?err=clave");

  await sql!`UPDATE users SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;

  // Se cierran las sesiones abiertas de esa cuenta — pero si el admin se esta
  // cambiando la suya, se conserva la actual: expulsarlo de la pantalla donde
  // acaba de cambiarla parece que algo fallo.
  const me = await getCurrentUser();
  const miToken = getSessionToken();
  if (me?.id === id && miToken) {
    await sql!`DELETE FROM sessions WHERE user_id = ${id} AND token <> ${miToken}`;
  } else {
    await sql!`DELETE FROM sessions WHERE user_id = ${id}`;
  }
  // Un enlace de restablecimiento pendiente ya no deberia servir.
  await sql!`DELETE FROM password_resets WHERE user_id = ${id}`;

  revalidatePath("/config");
  redirect("/config?ok=clave");
}

/** El admin dispara el mismo correo de restablecimiento sin conocer ni tocar la clave actual. */
export async function sendResetLink(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  const rows = await sql!`SELECT email, name FROM users WHERE id = ${id}`;
  const user = rows[0] as { email: string; name: string } | undefined;
  if (!user) return;

  const link = await crearEnlaceRestablecer(id);
  const { subject, html } = emailRestablecer(user.name, link);
  const enviado = await sendEmail(user.email, subject, html);

  revalidatePath("/config");
  // Se le dice al admin si salio o no: antes esto no daba ninguna señal y
  // parecia que el boton estaba roto cuando en realidad faltaba configurar
  // el correo.
  redirect(enviado ? "/config?ok=enlace" : "/config?err=correo");
}

/** Abre o cierra el auto-registro publico desde /config. */
export async function setRegistroAbierto(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const abierto = String(formData.get("abierto")) === "1" ? "1" : "0";
  await sql!`INSERT INTO meta (k, v) VALUES ('registro_abierto', ${abierto})
    ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  revalidatePath("/config");
  revalidatePath("/registro");
  revalidatePath("/login");
}

export async function updateUser(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = parseRole(formData);
  const canEdit = role === "agent" && formData.get("can_edit_schedule") != null;
  const canTicket = role === "agent" && formData.get("can_create_tickets") != null;
  if (!id || !name || !email) return;

  // No dejar el sistema sin ningun admin: si este era el ultimo y se le quita
  // el rol, se ignora el cambio de rol (el resto de los campos si se guarda).
  let finalRole = role;
  if (role !== "admin") {
    const admins = await sql!`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> ${id}`;
    if (admins[0].n === 0) finalRole = "admin";
  }

  // La contraseña NO se toca aqui: tiene su propia accion (setUserPassword),
  // con su propio boton. Tenerla mezclada en este formulario hacia que no se
  // viera y que guardar cualquier otro campo pudiera cambiarla sin querer.
  await sql!`UPDATE users SET name = ${name}, email = ${email}, role = ${finalRole},
    can_edit_schedule = ${canEdit}, can_create_tickets = ${canTicket} WHERE id = ${id}`;
  await saveUserCompanies(id, formData);
  revalidatePath("/config");
  revalidatePath("/cronogramas");
}

export async function deleteUser(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;

  const me = await getCurrentUser();
  if (me?.id === id) return; // no borrarse a si mismo

  const admins = await sql!`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> ${id}`;
  if (admins[0].n === 0) return; // no dejar el sistema sin admin

  await sql!`DELETE FROM users WHERE id = ${id}`;
  revalidatePath("/config");
}

export async function createTicket(formData: FormData) {
  await ensureSchema();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "");
  const company_id = Number(formData.get("company_id"));
  const category = String(formData.get("category") || "Otros");
  const priority = String(formData.get("priority") || "Baja");
  const requester = String(formData.get("requester") || "");
  if (!title || !company_id) return;

  // El autor sale de la sesion, nunca de un campo del formulario: es lo que
  // despues decide que tickets ve un agente en /mis-tickets.
  const me = await getCurrentUser();
  if (!me) return;
  if (me.role !== "admin" && !me.can_create_tickets) return;

  await sql!`INSERT INTO tickets (title, description, company_id, category, priority, status, requester, created_by)
    VALUES (${title}, ${description}, ${company_id}, ${category}, ${priority}, 'nuevo', ${requester}, ${me.id})`;

  revalidatePath("/tickets");
  revalidatePath("/mis-tickets");
  revalidatePath("/");
}

export async function createCollaborator(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const name = String(formData.get("name") || "").trim();
  const companyRaw = String(formData.get("company_id") || "");
  const company_id = companyRaw ? Number(companyRaw) : null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!name) return;
  await sql!`INSERT INTO collaborators (name, company_id, email, phone)
    VALUES (${name}, ${company_id}, ${email}, ${phone}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/tickets");
  revalidatePath("/config");
}

export async function updateCollaborator(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const companyRaw = String(formData.get("company_id") || "");
  const company_id = companyRaw ? Number(companyRaw) : null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!id || !name) return;
  await sql!`UPDATE collaborators SET name = ${name}, company_id = ${company_id}, email = ${email}, phone = ${phone} WHERE id = ${id}`;
  revalidatePath("/tickets");
  revalidatePath("/config");
}

/* ---------- Configuracion: empresas, categorias, colaboradores ---------- */
export async function createCompany(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#7FB93E");
  if (!name) return;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  await sql!`INSERT INTO companies (name, slug, color) VALUES (${name}, ${slug}, ${color}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function updateCompany(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#7FB93E");
  if (!id || !name) return;
  await sql!`UPDATE companies SET name = ${name}, color = ${color} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function deleteCompany(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  const used = await sql!`SELECT
    (SELECT COUNT(*) FROM tickets WHERE company_id = ${id})::int +
    (SELECT COUNT(*) FROM collaborators WHERE company_id = ${id})::int +
    (SELECT COUNT(*) FROM initiatives WHERE company_id = ${id})::int AS n`;
  if (used[0].n > 0) return; // no borrar si tiene datos asociados
  await sql!`DELETE FROM companies WHERE id = ${id}`;
  revalidatePath("/config");
}

export async function createCategory(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await sql!`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateCategory(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;
  await sql!`UPDATE categories SET name = ${name} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCategory(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM categories WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateCategorySla(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const sla_hours = Number(formData.get("sla_hours"));
  if (!id || !sla_hours || sla_hours < 1) return;
  await sql!`UPDATE categories SET sla_hours = ${sla_hours} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

/* ---------- Respuestas rapidas ---------- */
export async function createCanned(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const title = String(formData.get("title") || "").trim();
  const text = String(formData.get("text") || "").trim();
  if (!title || !text) return;
  await sql!`INSERT INTO canned_responses (title, text) VALUES (${title}, ${text}) ON CONFLICT (title) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCanned(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM canned_responses WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCollaborator(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM collaborators WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateTicket(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "");
  const company_id = Number(formData.get("company_id"));
  const category = String(formData.get("category") || "Otros");
  const priority = String(formData.get("priority") || "Baja");
  const requester = String(formData.get("requester") || "");
  if (!id || !title || !company_id) return;

  await sql!`UPDATE tickets SET
    title = ${title}, description = ${description}, company_id = ${company_id},
    category = ${category}, priority = ${priority}, requester = ${requester}, updated_at = now()
    WHERE id = ${id}`;

  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function updateTicketResolutionTime(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const mode = String(formData.get("mode") || "auto");
  if (!id) return;
  if (mode === "manual") {
    const hours = Number(formData.get("hours") || 0);
    const minutes = Number(formData.get("minutes") || 0);
    const total = Math.max(0, Math.round(hours * 60 + minutes));
    await sql!`UPDATE tickets SET resolution_minutes = ${total} WHERE id = ${id}`;
  } else {
    await sql!`UPDATE tickets SET resolution_minutes = NULL WHERE id = ${id}`;
  }
  revalidatePath("/tickets");
}

export async function addComment(formData: FormData) {
  await ensureSchema();
  const ticket_id = Number(formData.get("ticket_id"));
  const author = String(formData.get("author") || "").trim();
  const text = String(formData.get("text") || "").trim();
  if (!ticket_id || !text) return;

  // Un agente solo puede comentar en tickets que el mismo creo: sin esto podria
  // comentar en cualquiera adivinando el id en la URL.
  const me = await getCurrentUser();
  if (!me) return;
  if (me.role !== "admin") {
    const own = await sql!`SELECT 1 FROM tickets WHERE id = ${ticket_id} AND created_by = ${me.id}`;
    if (own.length === 0) return;
  }

  await sql!`INSERT INTO ticket_comments (ticket_id, author, text) VALUES (${ticket_id}, ${author || null}, ${text})`;
  revalidatePath("/tickets");
  revalidatePath("/mis-tickets");
}

export async function setTicketRequester(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const requester = String(formData.get("requester") || "");
  if (!id) return;
  await sql!`UPDATE tickets SET requester = ${requester}, updated_at = now() WHERE id = ${id}`;
  revalidatePath("/tickets");
}

export async function setStatus(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;

  if (status === "resuelto") {
    await sql!`UPDATE tickets SET status = ${status}, resolved_at = now(), updated_at = now() WHERE id = ${id}`;
  } else {
    await sql!`UPDATE tickets SET status = ${status}, resolved_at = NULL, updated_at = now() WHERE id = ${id}`;
  }
  revalidatePath("/tickets");
  revalidatePath("/");
}

/* ---------- Cronogramas (antes "Rutas de trabajo") ---------- */
export async function createInitiative(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const company_id = Number(formData.get("company_id"));
  const title = String(formData.get("title") || "").trim();
  const area = String(formData.get("area") || "");
  const owner = String(formData.get("owner") || "");
  let start_date = String(formData.get("start_date") || "") || null;
  let due_date = String(formData.get("due_date") || "") || null;
  // Mismo criterio que updateInitiativeFechas: un rango al reves se voltea.
  if (start_date && due_date && start_date > due_date) {
    [start_date, due_date] = [due_date, start_date];
  }
  const tasksRaw = String(formData.get("tasks") || "");
  if (!company_id || !title) return;

  const rows = await sql!`INSERT INTO initiatives (company_id, title, area, status, owner, start_date, due_date)
    VALUES (${company_id}, ${title}, ${area}, 'planificado', ${owner}, ${start_date}, ${due_date}) RETURNING id`;
  const id = rows[0].id;
  const tasks = tasksRaw.split("\n").map((t) => t.trim()).filter(Boolean);
  let pos = 0;
  for (const t of tasks) {
    await sql!`INSERT INTO initiative_tasks (initiative_id, title, position) VALUES (${id}, ${t}, ${pos})`;
    pos++;
  }
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

/**
 * Unica accion de rutas que un colaborador puede ejecutar (el visualizador
 * nunca). El admin marca cualquier tarea; el colaborador solo las de empresas
 * que tiene asignadas en /config, y la comprobacion va dentro del propio
 * UPDATE para que no exista ventana entre verificar y escribir.
 */
/**
 * Marca o desmarca una tarea, y de paso lleva la cuenta de CUANDO se hizo.
 *
 * Al marcarla se graba done_at = hoy, que es la suposicion correcta el 99% de
 * las veces y evita tener que rellenar una fecha a mano en cada clic; si el
 * trabajo se hizo otro dia, se corrige con setTaskDoneAt. Al desmarcarla se
 * borra: una tarea que no esta hecha no tiene fecha de realizacion.
 *
 * La fecha se calcula en la zona de RD, no en UTC. Con UTC, marcar algo a las
 * 9 de la noche lo fecharia al dia siguiente.
 */
export async function toggleTask(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  const me = await getCurrentUser();
  if (!me) return;
  const hoy = hoyEnRD();

  if (me.role === "admin") {
    await sql!`UPDATE initiative_tasks
      SET done = NOT done,
          done_at = CASE WHEN NOT done THEN ${hoy}::date ELSE NULL END
      WHERE id = ${id}`;
  } else if (me.role !== "agent" || !me.can_edit_schedule) {
    return; // visualizador, o colaborador sin ese permiso: solo lectura
  } else {
    await sql!`
      UPDATE initiative_tasks t
      SET done = NOT t.done,
          done_at = CASE WHEN NOT t.done THEN ${hoy}::date ELSE NULL END
      FROM initiatives i
      WHERE t.id = ${id} AND i.id = t.initiative_id
        AND EXISTS (
          SELECT 1 FROM user_companies uc
          WHERE uc.user_id = ${me.id} AND uc.company_id = i.company_id
        )`;
  }
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

/**
 * Corrige la fecha real de una tarea ya marcada. Marcar en el sistema y hacer
 * el trabajo no siempre pasan el mismo dia, y el atraso se mide contra esta
 * fecha, asi que tiene que poder ajustarse.
 *
 * Vaciar el campo deja la fecha en NULL — "hecha, pero no se sabe cuando" —
 * que es justo el estado de las tareas que ya estaban marcadas antes de que
 * existiera la columna. No se inventa una fecha para taparlo.
 */
export async function setTaskDoneAt(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  const done_at = String(formData.get("done_at") || "") || null;
  await sql!`UPDATE initiative_tasks SET done_at = ${done_at} WHERE id = ${id} AND done = true`;
  revalidatePath("/cronogramas");
}

export async function addTask(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const initiative_id = Number(formData.get("initiative_id"));
  const title = String(formData.get("title") || "").trim();
  const phaseRaw = String(formData.get("phase_id") || "");
  const phase_id = phaseRaw ? Number(phaseRaw) : null;
  if (!initiative_id || !title) return;
  const pos = await sql!`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM initiative_tasks WHERE initiative_id = ${initiative_id}`;
  await sql!`INSERT INTO initiative_tasks (initiative_id, phase_id, title, position)
    VALUES (${initiative_id}, ${phase_id}, ${title}, ${pos[0].p})`;
  revalidatePath("/cronogramas");
}

export async function updateTaskTitle(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiative_tasks SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
}

export async function deleteTask(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiative_tasks WHERE id = ${id}`;
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

export async function setInitiativeStatus(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;
  await sql!`UPDATE initiatives SET status = ${status} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

export async function updateInitiativeTitle(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiatives SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

/**
 * Fija a mano el rango de una etapa (inicio y fin). Lo que se guarda aqui manda
 * sobre el rango que se calcula de las fases, y por eso mueve la barra de esa
 * etapa en el Gantt del resumen.
 *
 * Un campo vacio guarda NULL a proposito: es como se vuelve al calculo
 * automatico. Por eso no hay validacion de "falta el dato" — faltar ES la
 * instruccion de no fijar nada.
 *
 * Si las fechas vienen al reves se voltean en vez de rechazarse. Un rango
 * invertido no significa nada dibujable, y lo unico que puede haber pasado es
 * que se llenaran los dos campos en el orden equivocado.
 */
export async function updateInitiativeFechas(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  let start_date = String(formData.get("start_date") || "") || null;
  let due_date = String(formData.get("due_date") || "") || null;
  if (start_date && due_date && start_date > due_date) {
    [start_date, due_date] = [due_date, start_date];
  }
  await sql!`UPDATE initiatives SET start_date = ${start_date}, due_date = ${due_date} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
}

export async function deleteInitiative(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiatives WHERE id = ${id}`;
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

/* ---------- Fases de un cronograma ---------- */
export async function createPhase(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const initiative_id = Number(formData.get("initiative_id"));
  const title = String(formData.get("title") || "").trim();
  if (!initiative_id || !title) return;
  const pos = await sql!`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM initiative_phases WHERE initiative_id = ${initiative_id}`;
  await sql!`INSERT INTO initiative_phases (initiative_id, title, position) VALUES (${initiative_id}, ${title}, ${pos[0].p})`;
  revalidatePath("/cronogramas");
}

export async function updatePhase(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const start_date = String(formData.get("start_date") || "") || null;
  const end_date = String(formData.get("end_date") || "") || null;
  if (!id || !title) return;
  await sql!`UPDATE initiative_phases SET title = ${title}, start_date = ${start_date}, end_date = ${end_date} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
}

/**
 * Borra la fase pero NO sus tareas: quedan con phase_id NULL (ON DELETE SET
 * NULL) y se siguen viendo en el bloque "Sin fase". Borrar trabajo real solo
 * por reorganizar el cronograma seria destructivo y dificil de deshacer.
 */
export async function deletePhase(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiative_phases WHERE id = ${id}`;
  revalidatePath("/cronogramas");
  revalidatePath("/");
}

/** Responsable de una tarea. Texto libre: los del Excel son "SINCOSOFT",
 *  "MESSINA", "SINCOSOFT - MESSINA", que no son colaboradores del sistema. */
export async function updateTaskOwner(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const owner = String(formData.get("owner") || "").trim() || null;
  if (!id) return;
  await sql!`UPDATE initiative_tasks SET owner = ${owner} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
}

/**
 * Comprueba que a ese usuario se le pueda asignar trabajo de esa empresa: o es
 * admin (ve todo) o tiene la empresa asignada en /config. Asignarle una fase a
 * alguien que no puede ni abrir el cronograma no serviria de nada, y la
 * interfaz ya filtra el desplegable — esto lo garantiza tambien en el servidor.
 */
async function puedeAsignarse(userId: number, companyId: number): Promise<boolean> {
  const rows = await sql!`
    SELECT 1 FROM users u
    WHERE u.id = ${userId} AND u.approved = true
      AND (u.role = 'admin' OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id AND uc.company_id = ${companyId}
      ))`;
  return rows.length > 0;
}

/** Asigna (o quita, con valor vacio) el usuario responsable de una tarea. */
export async function assignTask(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const raw = String(formData.get("user_id") || "");
  if (!id) return;

  if (!raw) {
    await sql!`UPDATE initiative_tasks SET assigned_user_id = NULL WHERE id = ${id}`;
  } else {
    const userId = Number(raw);
    const emp = await sql!`
      SELECT i.company_id FROM initiative_tasks t
      JOIN initiatives i ON i.id = t.initiative_id WHERE t.id = ${id}`;
    if (!emp[0] || !(await puedeAsignarse(userId, emp[0].company_id))) return;
    await sql!`UPDATE initiative_tasks SET assigned_user_id = ${userId} WHERE id = ${id}`;
  }
  revalidatePath("/cronogramas");
}

/** Asigna (o quita) el usuario responsable de una fase completa. */
export async function assignPhase(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const raw = String(formData.get("user_id") || "");
  if (!id) return;

  if (!raw) {
    await sql!`UPDATE initiative_phases SET assigned_user_id = NULL WHERE id = ${id}`;
  } else {
    const userId = Number(raw);
    const emp = await sql!`
      SELECT i.company_id FROM initiative_phases p
      JOIN initiatives i ON i.id = p.initiative_id WHERE p.id = ${id}`;
    if (!emp[0] || !(await puedeAsignarse(userId, emp[0].company_id))) return;
    await sql!`UPDATE initiative_phases SET assigned_user_id = ${userId} WHERE id = ${id}`;
  }
  revalidatePath("/cronogramas");
}

/** Mueve una tarea a otra fase, o la deja sin fase si phase_id viene vacio. */
export async function updateTaskPhase(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const raw = String(formData.get("phase_id") || "");
  const phase_id = raw ? Number(raw) : null;
  if (!id) return;
  await sql!`UPDATE initiative_tasks SET phase_id = ${phase_id} WHERE id = ${id}`;
  revalidatePath("/cronogramas");
}

export async function reorderTasks(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const initiative_id = Number(formData.get("initiative_id"));
  const order = String(formData.get("order") || "").split(",").map(Number).filter(Boolean);
  if (!initiative_id || order.length === 0) return;
  for (let i = 0; i < order.length; i++) {
    await sql!`UPDATE initiative_tasks SET position = ${i} WHERE id = ${order[i]} AND initiative_id = ${initiative_id}`;
  }
  revalidatePath("/cronogramas");
}

/**
 * Envia ahora los avisos de etapa que estan pendientes, sin esperar al cron.
 *
 * Existe por dos motivos. El primero es poder probar el circuito completo el
 * dia que se configura el correo, en vez de esperar al disparo de la mañana
 * siguiente. El segundo es que a veces hace falta empujar: se corrige una fecha
 * a las 4 de la tarde y tiene sentido que el equipo se entere hoy.
 *
 * Se autentica con la sesion (admin), NO con CRON_SECRET: ese secreto es para
 * que Vercel llame a una ruta que no tiene sesion, y no hay ninguna razon para
 * que una persona lo tenga que escribir en ningun sitio.
 *
 * Manda solo lo que aun no se ha avisado, igual que el cron. Pulsarlo dos veces
 * seguidas no reenvia nada — si lo hiciera, seria la forma mas rapida de que
 * alguien acabe filtrando estos correos a la papelera.
 */
export async function enviarAvisosAhora() {
  await ensureSchema();
  if (!(await requireAdmin())) return;

  if (!emailConfigurado()) redirect("/cronogramas?avisos=sincorreo");

  const nuevos = await sinAvisar(await getEventos());
  if (nuevos.length === 0) redirect("/cronogramas?avisos=nada");

  const buzones = await repartir(nuevos);
  const link = `${baseUrl()}/cronogramas`;
  let enviados = 0;
  for (const d of buzones) {
    const { subject, html } = emailEventosEtapa(d.nombre, d.eventos, link);
    if (await sendEmail(d.correo, subject, html)) enviados++;
  }

  // Solo se dan por avisados si alguien los recibio. Marcarlos con cero envios
  // los enterraria: no volverian a intentarse nunca.
  if (enviados > 0) await marcarAvisados(nuevos);

  revalidatePath("/cronogramas");
  redirect(`/cronogramas?avisos=${enviados > 0 ? "ok" : "fallo"}&n=${enviados}&e=${nuevos.length}`);
}
