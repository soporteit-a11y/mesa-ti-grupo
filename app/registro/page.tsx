import Link from "next/link";
import { registerUser } from "@/app/actions";
import { getRegistroAbierto } from "@/lib/data";
import { hasDb } from "@/lib/db";
import { Setup } from "@/components/Setup";

export const dynamic = "force-dynamic";

export default async function RegistroPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  let abierto = false;
  try {
    abierto = await getRegistroAbierto();
  } catch (e) {
    return <Setup />;
  }

  const listo = searchParams?.listo === "1";
  const error = searchParams?.error === "1";
  const cerrado = searchParams?.cerrado === "1" || !abierto;

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
            <h1 className="auth-title">Solicitud enviada</h1>
            <p className="auth-ok">
              Tu cuenta quedó registrada y está <b>pendiente de aprobación</b>. El administrador de
              TI debe habilitarla antes de que puedas entrar. Te avisará cuando esté lista.
            </p>
            <Link href="/login" className="btn auth-submit">Volver al inicio de sesión</Link>
          </>
        ) : cerrado ? (
          <>
            <h1 className="auth-title">Registro cerrado</h1>
            <p className="auth-error">
              Ahora mismo no se aceptan solicitudes de cuenta nuevas. Pide al administrador de TI
              que te cree una.
            </p>
            <Link href="/login" className="btn auth-submit">Volver al inicio de sesión</Link>
          </>
        ) : (
          <form action={registerUser} className="auth-form">
            <h1 className="auth-title">Solicitar una cuenta</h1>
            {error ? (
              <p className="auth-error">Revisa los datos: la contraseña debe tener al menos 8 caracteres.</p>
            ) : null}
            <div className="form-grid">
              <div className="field">
                <label>Nombre y apellido</label>
                <input type="text" name="name" required autoFocus placeholder="Tu nombre" />
              </div>
              <div className="field">
                <label>Correo</label>
                <input type="email" name="email" required placeholder="tu@empresa.com" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" name="password" required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" className="btn primary auth-submit">Enviar solicitud</button>
            <p className="auth-foot">
              Las cuentas nuevas las revisa el administrador antes de darles acceso.
              <br />
              ¿Ya tienes cuenta? <Link href="/login" className="auth-link">Inicia sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
