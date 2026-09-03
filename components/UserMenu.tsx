"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({
  name, email, role, companies,
}: {
  name: string;
  email: string;
  role: string;
  /** Empresas visibles para este usuario. Vacio = todas (admin). */
  companies: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape: sin esto el panel queda abierto
  // tapando contenido al navegar por la pagina.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const esAdmin = role === "admin";
  const rolInfo =
    role === "admin"
      ? { clase: "admin", etiqueta: "Super admin" }
      : role === "viewer"
      ? { clase: "viewer", etiqueta: "Visualizador" }
      : { clase: "agent", etiqueta: "Colaborador" };

  return (
    <div className="usermenu" ref={wrapRef}>
      <button
        type="button"
        className={"usermenu-btn" + (open ? " open" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title={name}
      >
        <span className="usermenu-avatar">{initials(name)}</span>
        <span className="usermenu-name">{name}</span>
        <svg className="usermenu-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="usermenu-panel">
          <div className="usermenu-head">
            <span className="usermenu-avatar lg">{initials(name)}</span>
            <div className="usermenu-id">
              <div className="usermenu-fullname">{name}</div>
              <div className="usermenu-email">{email}</div>
            </div>
          </div>

          <div className="usermenu-rows">
            <div className="usermenu-row">
              <span className="usermenu-k">Rol</span>
              <span className={"role-pill " + rolInfo.clase}>{rolInfo.etiqueta}</span>
            </div>
            <div className="usermenu-row">
              <span className="usermenu-k">Empresas</span>
              <span className="usermenu-v">
                {esAdmin ? "Todas" : companies.length > 0 ? companies.join(", ") : "Ninguna asignada"}
              </span>
            </div>
          </div>

          <form action={logout}>
            <button type="submit" className="btn sm usermenu-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
