"use server";

import { sql, ensureSchema } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSessionCookie, clearSessionCookie, getCurrentUser, requireAdmin } from "@/lib/auth";

export async function login(formData: FormData) {
  await ensureSchema();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=1");

  const rows = await sql!`SELECT id, password_hash, role FROM users WHERE lower(email) = ${email}`;
  const user = rows[0] as { id: number; password_hash: string; role: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) redirect("/login?error=1");

  await createSessionCookie(user!.id);
  redirect(user!.role === "admin" ? "/" : "/mis-tickets");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
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
  const role = String(formData.get("role") || "agent") === "admin" ? "admin" : "agent";
  if (!name || !email || !password) return;

  const rows = await sql!`INSERT INTO users (name, email, password_hash, role)
    VALUES (${name}, ${email}, ${hashPassword(password)}, ${role})
    ON CONFLICT (email) DO NOTHING RETURNING id`;
  if (rows.length === 0) return; // correo ya usado
  await saveUserCompanies(rows[0].id, formData);
  revalidatePath("/config");
}

export async function updateUser(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "agent") === "admin" ? "admin" : "agent";
  if (!id || !name || !email) return;

  // No dejar el sistema sin ningun admin: si este era el ultimo y se le quita
  // el rol, se ignora el cambio de rol (el resto de los campos si se guarda).
  let finalRole = role;
  if (role !== "admin") {
    const admins = await sql!`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> ${id}`;
    if (admins[0].n === 0) finalRole = "admin";
  }

  await sql!`UPDATE users SET name = ${name}, email = ${email}, role = ${finalRole} WHERE id = ${id}`;
  if (password) {
    await sql!`UPDATE users SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;
    // Al cambiar la clave se cierran las sesiones abiertas de ese usuario.
    await sql!`DELETE FROM sessions WHERE user_id = ${id}`;
  }
  await saveUserCompanies(id, formData);
  revalidatePath("/config");
  revalidatePath("/rutas");
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

  await sql!`INSERT INTO tickets (title, description, company_id, category, priority, status, requester, created_by)
    VALUES (${title}, ${description}, ${company_id}, ${category}, ${priority}, 'nuevo', ${requester}, ${me?.id ?? null})`;

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

/* ---------- Rutas de trabajo ---------- */
export async function createInitiative(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const company_id = Number(formData.get("company_id"));
  const title = String(formData.get("title") || "").trim();
  const area = String(formData.get("area") || "");
  const owner = String(formData.get("owner") || "");
  const due_date = String(formData.get("due_date") || "") || null;
  const tasksRaw = String(formData.get("tasks") || "");
  if (!company_id || !title) return;

  const rows = await sql!`INSERT INTO initiatives (company_id, title, area, status, owner, due_date)
    VALUES (${company_id}, ${title}, ${area}, 'planificado', ${owner}, ${due_date}) RETURNING id`;
  const id = rows[0].id;
  const tasks = tasksRaw.split("\n").map((t) => t.trim()).filter(Boolean);
  let pos = 0;
  for (const t of tasks) {
    await sql!`INSERT INTO initiative_tasks (initiative_id, title, position) VALUES (${id}, ${t}, ${pos})`;
    pos++;
  }
  revalidatePath("/rutas");
  revalidatePath("/");
}

/**
 * Unica accion de rutas que un agente puede ejecutar. El admin marca cualquier
 * tarea; el agente solo las de empresas que tiene asignadas en /config, y la
 * comprobacion va dentro del propio UPDATE para que no exista ventana entre
 * verificar y escribir.
 */
export async function toggleTask(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  const me = await getCurrentUser();
  if (!me) return;

  if (me.role === "admin") {
    await sql!`UPDATE initiative_tasks SET done = NOT done WHERE id = ${id}`;
  } else {
    await sql!`
      UPDATE initiative_tasks t SET done = NOT t.done
      FROM initiatives i
      WHERE t.id = ${id} AND i.id = t.initiative_id
        AND EXISTS (
          SELECT 1 FROM user_companies uc
          WHERE uc.user_id = ${me.id} AND uc.company_id = i.company_id
        )`;
  }
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function addTask(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const initiative_id = Number(formData.get("initiative_id"));
  const title = String(formData.get("title") || "").trim();
  if (!initiative_id || !title) return;
  const pos = await sql!`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM initiative_tasks WHERE initiative_id = ${initiative_id}`;
  await sql!`INSERT INTO initiative_tasks (initiative_id, title, position) VALUES (${initiative_id}, ${title}, ${pos[0].p})`;
  revalidatePath("/rutas");
}

export async function updateTaskTitle(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiative_tasks SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/rutas");
}

export async function deleteTask(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiative_tasks WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function setInitiativeStatus(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;
  await sql!`UPDATE initiatives SET status = ${status} WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function updateInitiativeTitle(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiatives SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function updateInitiativeDueDate(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  const due_date = String(formData.get("due_date") || "") || null;
  if (!id) return;
  await sql!`UPDATE initiatives SET due_date = ${due_date} WHERE id = ${id}`;
  revalidatePath("/rutas");
}

export async function deleteInitiative(formData: FormData) {
  await ensureSchema();
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiatives WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
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
  revalidatePath("/rutas");
}
