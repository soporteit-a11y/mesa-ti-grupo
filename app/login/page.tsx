import Link from "next/link";
import { login } from "@/app/actions";
import { getRegistroAbierto } from "@/lib/data";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Record<string, string> }) {
  const hasError = searchParams?.error === "1";
  const pendiente = searchParams?.pendiente === "1";
  const restablecido = searchParams?.restablecido === "1";

  // Si la consulta falla no se cae la pantalla de login: simplemente no se
  // ofrece el enlace de registro.
  let registroAbierto = false;
  if (hasDb) {
    try {
      registroAbierto = await getRegistroAbierto();
    } catch (e) {}
  }

  return (
    <div className="auth-wrap">
      <form action={login} className="card auth-card">
        <div className="auth-brand">
          <img src="/droppett-icon-white.png" alt="Mesa TI" className="logo" />
          <div>
            <div className="bt">MESA&nbsp;TI</div>
            <div className="bs">Grupo empresarial</div>
          </div>
        </div>
        <h1 className="auth-title">Iniciar sesión</h1>
        {restablecido ? <p className="auth-ok">Tu contraseña se actualizó. Ya puedes entrar con la nueva.</p> : null}
        {hasError ? <p className="auth-error">Correo o contraseña incorrectos.</p> : null}
        {pendiente ? (
          <p className="auth-warn">
            Tu cuenta todavía está pendiente de aprobación. El administrador de TI debe habilitarla
            antes de que puedas entrar.
          </p>
        ) : null}
        <div className="form-grid">
          <div className="field">
            <label>Correo</label>
            <input type="email" name="email" required autoFocus placeholder="tu@correo.com" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" name="password" required placeholder="••••••••" />
          </div>
        </div>
        <button type="submit" className="btn primary auth-submit">Entrar</button>
        <p className="auth-foot">
          <Link href="/recuperar" className="auth-link">¿Olvidaste tu contraseña?</Link>
        </p>
        {registroAbierto ? (
          <p className="auth-foot">
            ¿No tienes cuenta? <Link href="/registro" className="auth-link">Solicita una</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
