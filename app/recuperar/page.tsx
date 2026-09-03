import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function RecuperarPage({ searchParams }: { searchParams: Record<string, string> }) {
  const listo = searchParams?.listo === "1";

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

        {listo ? (
          <>
            <h1 className="auth-title">Revisa tu correo</h1>
            <p className="auth-ok">
              Si ese correo tiene una cuenta activa en Mesa TI, te acabamos de enviar un enlace para
              elegir una contraseña nueva. Es válido por 1 hora.
            </p>
            <Link href="/login" className="btn auth-submit">Volver al inicio de sesión</Link>
          </>
        ) : (
          <form action={requestPasswordReset} className="auth-form">
            <h1 className="auth-title">Recuperar contraseña</h1>
            <p className="pv-meta" style={{ lineHeight: 1.5 }}>
              Escribe el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.
            </p>
            <div className="field">
              <label>Correo</label>
              <input type="email" name="email" required autoFocus placeholder="tu@correo.com" />
            </div>
            <button type="submit" className="btn primary auth-submit">Enviar enlace</button>
            <p className="auth-foot">
              <Link href="/login" className="auth-link">Volver al inicio de sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
