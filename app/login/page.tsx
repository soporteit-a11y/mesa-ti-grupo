import { login } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: Record<string, string> }) {
  const hasError = searchParams?.error === "1";

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
        {hasError ? <p className="auth-error">Correo o contraseña incorrectos.</p> : null}
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
      </form>
    </div>
  );
}
