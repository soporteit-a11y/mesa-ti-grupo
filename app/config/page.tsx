import { hasDb } from "@/lib/db";
import { getCompanies, getCategories, getCollaborators, getCanned } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { SlaInput } from "@/components/SlaInput";
import {
  createCompany, updateCompany, deleteCompany,
  createCategory, updateCategory, deleteCategory,
  createCollaborator, updateCollaborator, deleteCollaborator,
  createCanned, deleteCanned,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  if (!hasDb) return <Setup />;

  let companies: any[], categories: any[], collaborators: any[], canned: any[];
  try {
    [companies, categories, collaborators, canned] = await Promise.all([
      getCompanies(), getCategories(), getCollaborators(), getCanned(),
    ]);
  } catch (e) {
    return <Setup />;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Configuración</h1>
          <div className="sub">Personaliza empresas, categorías, SLA, colaboradores y respuestas rápidas</div>
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

        {/* ---------- Colaboradores / usuarios del sistema ---------- */}
        <div className="section-title">
          <h2>Colaboradores</h2>
          <span className="hint">usuarios del sistema — nombre, empresa, correo y celular</span>
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
          Los cambios se aplican al instante en la Mesa de ayuda. Una empresa solo se puede eliminar si no tiene tickets, colaboradores ni rutas asociadas.
        </p>
      </div>
    </>
  );
}
