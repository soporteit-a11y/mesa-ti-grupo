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
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
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

          <div className="cfg-list">
            {users.map((u) => (
              <div className={"cfg-row cfg-row-user" + (u.approved ? "" : " pendiente")} key={u.id}>
                <form action={updateUser} className="cfg-edit cfg-edit-user">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="cfg-user-line">
                    <input type="text" name="name" defaultValue={u.name} placeholder="Nombre" className="cfg-name-input" />
                    <input type="email" name="email" defaultValue={u.email} placeholder="Correo" className="cfg-contact-input" />
                    <select name="role" defaultValue={u.role} className="cfg-role-select">
                      <option value="admin">Super admin</option>
                      <option value="agent">Colaborador</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                    <input type="password" name="password" placeholder="Nueva clave (opcional)" className="cfg-contact-input" autoComplete="new-password" />
                    <button type="submit" className="btn sm" title="Guardar">✓</button>
                  </div>
                  {u.role !== "admin" && (
                    <div className="cfg-user-companies">
                      <span className="cfg-user-clabel">Empresas visibles</span>
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
                    <div className="cfg-user-companies">
                      <span className="cfg-user-clabel">Permisos</span>
                      <label className="cfg-chk">
                        <input type="checkbox" name="can_edit_schedule" defaultChecked={u.can_edit_schedule} />
                        Puede marcar tareas en cronogramas
                      </label>
                      <label className="cfg-chk">
                        <input type="checkbox" name="can_create_tickets" defaultChecked={u.can_create_tickets} />
                        Puede reportar tickets
                      </label>
                    </div>
                  )}
                  {u.role === "viewer" && (
                    <div className="cfg-user-companies">
                      <span className="pv-meta">Solo ve los cronogramas de sus empresas — no puede marcar tareas ni reportar tickets.</span>
                    </div>
                  )}
                  {u.role === "admin" && (
                    <div className="cfg-user-companies">
                      <span className="pv-meta">Un super admin ve todas las empresas y tiene todos los permisos.</span>
                    </div>
                  )}
                </form>
                <div className="cfg-user-actions">
                  <form action={setUserApproved}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="approved" value={u.approved ? "0" : "1"} />
                    <button
                      type="submit"
                      className={"btn sm" + (u.approved ? "" : " primary")}
                      title={u.approved ? "Revocar el acceso de esta cuenta" : "Aprobar esta cuenta"}
                    >
                      {u.approved ? "Activa" : "Aprobar"}
                    </button>
                  </form>
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
                  <form action={deleteUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="btn sm danger" title="Eliminar cuenta">✕</button>
                  </form>
                </div>
              </div>
            ))}
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
              placeholder="Contraseña (opcional)"
              autoComplete="new-password"
              title="Déjala vacía para enviarle un enlace y que él mismo elija su contraseña"
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
            reporta tickets, así que esos dos permisos no le aplican aunque queden marcados. Deja la
            clave vacía al crear o al editar para no asignarle una tú — en vez de eso se le manda un
            correo para que elija la suya (o usa <b>Enviar enlace</b> en cualquier momento, sin tocar
            la clave actual). No puedes eliminar ni desactivar tu propia cuenta, ni dejar el sistema
            sin ningún super admin.
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
