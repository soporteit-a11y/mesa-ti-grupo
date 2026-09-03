import Link from "next/link";
import { resetPassword } from "@/app/actions";
import { sql, hasDb, ensureSchema } from "@/lib/db";
import { Setup } from "@/components/Setup";

export const dynamic = "force-dynamic";

export default async function RestablecerPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const token = searchParams?.token || "";
  const errorClave = searchParams?.error === "1";
  const vencido = searchParams?.vencido === "1";

  // Se valida el token aqui tambien (no solo al enviar el formulario) para no
  // mostrarle a alguien un formulario que de todos modos va a rechazar: mejor
  // decirle de una vez que pida un enlace nuevo.
  let valido = false;
  if (token && !vencido) {
    try {
      await ensureSchema();
      const rows = await sql!`SELECT 1 FROM password_resets WHERE token = ${token} AND expires_at > now()`;
      valido = rows.length > 0;
    } catch (e) {
      valido = false;
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-brand">
          <img src="/droppett-icon-white.png" alt="Mesa TI" className="logo" />
          <div>
            <div className="bt">MESA&nbsp;TI</div>
            <div className="bs">Grupo empresarial</div>
          </div>
        </div>

        {!valido ? (
          <>
            <h1 className="auth-title">Enlace vencido o inválido</h1>
            <p className="auth-error">
              Este enlace de restablecimiento ya no sirve — o expiró (dura 1 hora) o ya se usó.
              Pide uno nuevo.
            </p>
            <Link href="/recuperar" className="btn primary auth-submit">Pedir un enlace nuevo</Link>
          </>
        ) : (
          <form action={resetPassword} className="auth-form">
            <h1 className="auth-title">Elige tu contraseña</h1>
            {errorClave ? <p className="auth-error">La contraseña debe tener al menos 8 caracteres.</p> : null}
            <input type="hidden" name="token" value={token} />
            <div className="field">
              <label>Contraseña nueva</label>
              <input type="password" name="password" required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="new-password" autoFocus />
            </div>
            <button type="submit" className="btn primary auth-submit">Guardar contraseña</button>
          </form>
        )}
      </div>
    </div>
  );
}
