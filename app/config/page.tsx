import { redirect } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getCompanies, getCategories, getCollaborators, getCanned, getUsers, getRegistroAbierto } from "@/lib/data";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { Setup } from "@/components/Setup";
import { SlaInput } from "@/components/SlaInput";
import {
  createCompany, updateCompany, deleteCompany,
  createCategory, updateCategory, deleteCategory,
  createCollaborator, updateCollaborator, deleteCollaborator,
  createCanned, deleteCanned,
  createUser, updateUser, deleteUser, setUserApproved, setRegistroAbierto, sendResetLink,
  setUserPassword,
} from "@/app/actions";
import { emailConfigurado } from "@/lib/email";
import { Collapsible } from "@/components/Collapsible";

export const dynamic = "force-dynamic";

const ROLES = {
  admin: { cls: "admin", txt: "Super admin" },
  agent: { cls: "agent", txt: "Colaborador" },
  viewer: { cls: "viewer", txt: "Visualizador" },
} as const;

/** Iniciales para el avatar de la tarjeta de usuario. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default async function ConfigPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  // Defensa en profundidad: el middleware ya bloquea esta ruta para agentes,
  // pero si algun dia cambia su matcher la pagina no debe quedar expuesta.
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect(roleHome(me.role));

  let companies: any[], categories: any[], collaborators: any[], canned: any[], users: any[];
  let registroAbierto: boolean;
  try {
    [companies, categories, collaborators, canned, users, registroAbierto] = await Promise.all([
      getCompanies(), getCategories(), getCollaborators(), getCanned(), getUsers(), getRegistroAbierto(),
    ]);
  } catch (e) {
    return <Setup />;
  }

  const pendientes = users.filter((u) => !u.approved).length;
  const hayCorreo = emailConfigurado();

  // Avisos de las acciones de usuario. Estas si dan señal (a diferencia del
  // resto de /config, que guarda en silencio): asignar una clave o mandar un
  // correo son cosas donde no saber si funcionó es un problema real.
  const ok = searchParams?.ok;
  const err = searchParams?.err;
  const aviso =
    ok === "clave" ? { cls: "ok", txt: "Contraseña asignada. Las demás sesiones de esa cuenta se cerraron." }
    : ok === "enlace" ? { cls: "ok", txt: "Enlace de restablecimiento enviado por correo." }
    : err === "clave" ? { cls: "err", txt: "La contraseña debe tener al menos 8 caracteres. No se cambió nada." }
    : err === "correo" ? { cls: "err", txt: "No se pudo enviar el correo. Falta configurar RESEND_API_KEY en Vercel (ver HANDOFF.md §14, tanda 10). Mientras tanto, asígnale la contraseña a mano aquí abajo." }
    : err === "sinclave" ? { cls: "err", txt: "No se creó la cuenta: sin correo configurado hay que ponerle una contraseña, o nacería sin ninguna forma de entrar." }
    : null;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Configuración</h1>
          <div className="sub">Personaliza empresas, categorías, SLA, usuarios, colaboradores y respuestas rápidas</div>
        </div>
      </div>

      <div className="content">
        <div className="grid g2">

          {/* ---------- Empresas ---------- */}
          <div className="card cfg-card">
            <div className="cfg-head">Empresas <span className="cfg-count">{companies.length}</span></div>
            <div className="cfg-list">
              {companies.map((c) => (
                <div className="cfg-row" key={c.id}>
                  <form action={updateCompany} className="cfg-edit">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="color" name="color" defaultValue={c.color || "#7FB93E"} className="swatch-input" title="Color" />
                    <input type="text" name="name" defaultValue={c.name} className="cfg-name-input" />
                    <button type="submit" className="btn sm" title="Guardar">✓</button>
                  </form>
                  <form action={deleteCompany}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn sm danger" title="Eliminar (solo si no tiene datos)">✕</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={createCompany} className="cfg-add">
              <input type="color" name="color" defaultValue="#7FB93E" className="swatch-input" />
              <input type="text" name="name" placeholder="Nueva empresa" required />
              <button type="submit" className="btn primary sm">Agregar</button>
            </form>
          </div>

          {/* ---------- Categorías + SLA ---------- */}
          <div className="card cfg-card">
            <div className="cfg-head">Categorías &amp; SLA <span className="cfg-count">{categories.length}</span></div>
            <div className="cfg-list">
              {categories.map((c) => (
                <div className="cfg-row" key={c.id}>
                  <form action={updateCategory} className="cfg-edit">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="text" name="name" defaultValue={c.name} className="cfg-name-input" />
                    <button type="submit" className="btn sm" title="Guardar">✓</button>
                  </form>
                  <SlaInput id={c.id} hours={c.sla_hours} />
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn sm danger" title="Eliminar">✕</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={createCategory} className="cfg-add">
              <input type="text" name="name" placeholder="Nueva categoría" required />
              <button type="submit" className="btn primary sm">Agregar</button>
            </form>
            <p className="pv-meta" style={{ marginTop: 2 }}>
              SLA = horas objetivo para prioridad Media. Alta se calcula a mitad de tiempo, Baja a 1.5x.
            </p>
          </div>

        </div>

        {/* ---------- Usuarios con acceso al sistema ---------- */}
        <div className="section-title">
          <h2>Usuarios del sistema</h2>
          <span className="hint">quién puede entrar, con qué rol y qué empresas ve en Cronogramas</span>
        </div>
        <div className="card cfg-card">
          <div className="cfg-head">
            Cuentas <span className="cfg-count">{users.length}</span>
            {pendientes > 0 ? <span className="cfg-count pend">{pendientes} pendiente(s)</span> : null}
          </div>

          {aviso ? (
            <p className={aviso.cls === "ok" ? "auth-ok" : "auth-error"}>{aviso.txt}</p>
          ) : null}

          {!hayCorreo ? (
            <p className="auth-warn">
              <b>El envío de correo no está configurado.</b> Por eso no aparece el botón de enviar
              enlace de restablecimiento: sin <code>RESEND_API_KEY</code> en Vercel no saldría nada y
              parecería que falla. Mientras tanto, asigna las contraseñas a mano con el campo
              <b> Asignar clave</b> de cada usuario.
            </p>
          ) : null}

          <form action={setRegistroAbierto} className="cfg-toggle-row">
            <div>
              <b>Auto-registro público</b>
              <span className="pv-meta">
                {registroAbierto
                  ? "Cualquiera con el enlace puede solicitar una cuenta desde /registro. Las solicitudes NO tienen acceso hasta que las apruebes aquí."
                  : "Nadie puede solicitar cuenta; solo tú puedes crearlas desde aquí."}
              </span>
            </div>
            <input type="hidden" name="abierto" value={registroAbierto ? "0" : "1"} />
            <button type="submit" className={"btn sm" + (registroAbierto ? "" : " primary")}>
              {registroAbierto ? "Cerrar registro" : "Abrir registro"}
            </button>
          </form>

          <div className="usr-list">
            {users.map((u) => {
              const rol = ROLES[u.role as keyof typeof ROLES] ?? ROLES.agent;
              const susEmpresas = companies
                .filter((co) => u.company_ids.includes(co.id))
                .map((co) => co.name);

              // Cerrada, la tarjeta dice lo que se necesita para reconocer la
              // cuenta de un vistazo: quien es, que rol tiene, si esta activa y
              // que empresas ve. Lo editable vive dentro.
              const resumen = (
                <div className="usr-sum">
                  <span className="usr-avatar">{iniciales(u.name)}</span>
                  <span className="usr-id">
                    <span className="usr-nombre">{u.name}</span>
                    <span className="usr-mail mono">{u.email}</span>
                  </span>
                  <span className="usr-tags">
                    <span className={"role-pill " + rol.cls}>{rol.txt}</span>
                    {!u.approved && <span className="usr-pend">Pendiente</span>}
                    {u.role !== "admin" && (
                      <span className="usr-emp mono">
                        {susEmpresas.length > 0 ? susEmpresas.join(" · ") : "sin empresas"}
                      </span>
                    )}
                  </span>
                </div>
              );

              return (
                <div className={"usr-card" + (u.approved ? "" : " pendiente")} key={u.id}>
                  <Collapsible storageKey={`usuario.${u.id}`} defaultOpen={false} head={resumen}>
                    <div className="usr-body">
                      <form action={updateUser} className="usr-form">
                        <input type="hidden" name="id" value={u.id} />
                        <div className="usr-fila">
                          <span className="usr-k">Datos</span>
                          <input type="text" name="name" defaultValue={u.name} placeholder="Nombre" className="cfg-name-input" />
                          <input type="email" name="email" defaultValue={u.email} placeholder="Correo" className="cfg-contact-input" />
                          <select name="role" defaultValue={u.role} className="cfg-role-select">
                            <option value="admin">Super admin</option>
                            <option value="agent">Colaborador</option>
                            <option value="viewer">Visualizador</option>
                          </select>
                        </div>

                        {u.role !== "admin" && (
                          <div className="usr-fila">
                            <span className="usr-k">Empresas</span>
                            {companies.map((co) => (
                              <label className="cfg-chk" key={co.id}>
                                <input
                                  type="checkbox"
                                  name="company_ids"
                                  value={co.id}
                                  defaultChecked={u.company_ids.includes(co.id)}
                                />
                                {co.name}
                              </label>
                            ))}
                          </div>
                        )}

                        {u.role === "agent" && (
                          <div className="usr-fila">
                            <span className="usr-k">Permisos</span>
                            <label className="cfg-chk">
                              <input type="checkbox" name="can_edit_schedule" defaultChecked={u.can_edit_schedule} />
                              Marcar tareas
                            </label>
                            <label className="cfg-chk">
                              <input type="checkbox" name="can_create_tickets" defaultChecked={u.can_create_tickets} />
                              Reportar tickets
                            </label>
                          </div>
                        )}

                        {u.role !== "agent" && (
                          <div className="usr-fila">
                            <span className="usr-k" />
                            <span className="pv-meta">
                              {u.role === "admin"
                                ? "Ve todas las empresas y tiene todos los permisos."
                                : "Solo consulta los cronogramas de sus empresas: no marca tareas ni reporta tickets."}
                            </span>
                          </div>
                        )}

                        <div className="usr-fila">
                          <span className="usr-k" />
                          <button type="submit" className="btn sm primary">Guardar cambios</button>
                        </div>
                      </form>

                      {/* Fuera del form de arriba: en HTML no se pueden anidar
                          forms, y asi guardar datos nunca toca la clave. */}
                      <form action={setUserPassword} className="usr-fila usr-fila-sep">
                        <input type="hidden" name="id" value={u.id} />
                        <span className="usr-k">Contraseña</span>
                        <input
                          type="password"
                          name="password"
                          placeholder="Mínimo 8 caracteres"
                          minLength={8}
                          className="cfg-contact-input"
                          autoComplete="new-password"
                        />
                        <button type="submit" className="btn sm" title="Asignarle esta contraseña ahora">
                          Asignar
                        </button>
                      </form>

                      <div className="usr-fila usr-fila-sep">
                        <span className="usr-k">Cuenta</span>
                        <form action={setUserApproved}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="approved" value={u.approved ? "0" : "1"} />
                          <button
                            type="submit"
                            className={"btn sm" + (u.approved ? "" : " primary")}
                            title={u.approved ? "Revocar el acceso de esta cuenta" : "Aprobar esta cuenta"}
                          >
                            {u.approved ? "Desactivar" : "Aprobar"}
                          </button>
                        </form>
                        {hayCorreo && (
                          <form action={sendResetLink}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="btn sm"
                              title="Enviarle un correo para que elija una contraseña nueva, sin tocar la actual"
                            >
                              Enviar enlace
                            </button>
                          </form>
                        )}
                        <form action={deleteUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="btn sm danger" title="Eliminar cuenta">Eliminar</button>
                        </form>
                      </div>
                    </div>
                  </Collapsible>
                </div>
              );
            })}
          </div>
          <form action={createUser} className="cfg-add cfg-add-user">
            <input type="text" name="name" placeholder="Nombre" required />
            <input type="email" name="email" placeholder="Correo" required />
            <select name="role" defaultValue="agent" className="cfg-role-select">
              <option value="agent">Colaborador</option>
              <option value="viewer">Visualizador</option>
              <option value="admin">Super admin</option>
            </select>
            <input
              type="password"
              name="password"
              placeholder={hayCorreo ? "Contraseña (opcional)" : "Contraseña"}
              autoComplete="new-password"
              required={!hayCorreo}
              title={
                hayCorreo
                  ? "Déjala vacía para enviarle un enlace y que él mismo elija su contraseña"
                  : "Obligatoria mientras el envío de correo no esté configurado: si la dejas vacía, la cuenta quedaría sin forma de entrar"
              }
            />
            <div className="cfg-user-companies">
              <span className="cfg-user-clabel">Empresas visibles</span>
              {companies.map((co) => (
                <label className="cfg-chk" key={co.id}>
                  <input type="checkbox" name="company_ids" value={co.id} />
                  {co.name}
                </label>
              ))}
            </div>
            <div className="cfg-user-companies">
              <span className="cfg-user-clabel">Permisos (solo si el rol es Colaborador)</span>
              <label className="cfg-chk">
                <input type="checkbox" name="can_edit_schedule" defaultChecked />
                Puede marcar tareas en cronogramas
              </label>
              <label className="cfg-chk">
                <input type="checkbox" name="can_create_tickets" defaultChecked />
                Puede reportar tickets
              </label>
            </div>
            <button type="submit" className="btn primary sm">Crear cuenta</button>
          </form>
          <p className="pv-meta" style={{ marginTop: 2 }}>
            Un <b>colaborador</b> ve los cronogramas de las empresas que le marques y sus propios tickets;
            con los permisos decides si además puede <b>marcar tareas</b> y <b>reportar tickets</b>. Un
            <b> visualizador</b> solo puede ver los cronogramas de sus empresas — nunca marca tareas ni
            reporta tickets, así que esos dos permisos no le aplican aunque queden marcados.
            <br /><br />
            La contraseña tiene su propio campo <b>Asignar clave</b> en cada fila: la escribes y
            queda puesta al instante (se cierran las otras sesiones de esa cuenta, pero no la tuya si
            te la cambias a ti mismo). El ✓ de arriba guarda solo nombre, correo y rol — nunca la
            clave. No puedes eliminar ni desactivar tu propia cuenta, ni dejar el sistema sin ningún
            super admin.
          </p>
        </div>

        {/* ---------- Colaboradores / usuarios del sistema ---------- */}
        <div className="section-title">
          <h2>Colaboradores</h2>
          <span className="hint">directorio de contactos para asignar como solicitante de un ticket — no dan acceso al sistema</span>
        </div>
        <div className="card cfg-card">
          <div className="cfg-head">Perfiles <span className="cfg-count">{collaborators.length}</span></div>
          <div className="cfg-list">
            {collaborators.map((c) => (
              <div className="cfg-row cfg-row-collab" key={c.id}>
                <form action={updateCollaborator} className="cfg-edit cfg-edit-collab">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="text" name="name" defaultValue={c.name} placeholder="Nombre" className="cfg-name-input" />
                  <select name="company_id" defaultValue={c.company_id ?? ""} className="cfg-contact-input">
                    <option value="">Empresa (opcional)</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>{co.name}</option>
                    ))}
                  </select>
                  <input type="email" name="email" defaultValue={c.email ?? ""} placeholder="Correo" className="cfg-contact-input" />
                  <input type="tel" name="phone" defaultValue={c.phone ?? ""} placeholder="Celular" className="cfg-contact-input" />
                  <button type="submit" className="btn sm" title="Guardar">✓</button>
                </form>
                <form action={deleteCollaborator}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn sm danger" title="Eliminar">✕</button>
                </form>
              </div>
            ))}
          </div>
          <form action={createCollaborator} className="cfg-add">
            <input type="text" name="name" placeholder="Nuevo colaborador" required />
            <select name="company_id" defaultValue="">
              <option value="">Empresa (opcional)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input type="email" name="email" placeholder="Correo (opcional)" />
            <input type="tel" name="phone" placeholder="Celular (opcional)" />
            <button type="submit" className="btn primary sm">Agregar</button>
          </form>
        </div>

        {/* ---------- Respuestas rápidas ---------- */}
        <div className="section-title">
          <h2>Respuestas rápidas</h2>
          <span className="hint">se insertan con un clic al comentar en un ticket</span>
        </div>
        <div className="card cfg-card">
          <div className="cfg-head">Plantillas <span className="cfg-count">{canned.length}</span></div>
          <div className="cfg-list">
            {canned.length === 0 ? (
              <p className="pv-meta">Aún no hay respuestas rápidas.</p>
            ) : (
              canned.map((c) => (
                <div className="cfg-row cfg-row-canned" key={c.id}>
                  <div className="cfg-canned-text">
                    <b>{c.title}</b>
                    <span className="pv-meta">{c.text}</span>
                  </div>
                  <form action={deleteCanned}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn sm danger" title="Eliminar">✕</button>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={createCanned} className="cfg-add cfg-add-col">
            <input type="text" name="title" placeholder="Título (ej: Reinicio de equipo)" required />
            <textarea name="text" placeholder="Texto de la respuesta..." required rows={2} />
            <button type="submit" className="btn primary sm">Agregar</button>
          </form>
        </div>

        <p className="pv-meta" style={{ marginTop: 16 }}>
          Los cambios se aplican al instante en la Mesa de ayuda. Una empresa solo se puede eliminar si no tiene tickets, colaboradores ni cronogramas asociados.
        </p>
      </div>
    </>
  );
}
