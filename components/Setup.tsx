export function Setup() {
  return (
    <div className="content">
      <div className="setup">
        <div className="card">
          <h2>Conecta la base de datos para encender el sistema</h2>
          <p>
            La aplicación ya está desplegada y lista. Solo falta un paso que debes hacer tú desde tu
            panel de Vercel — así las credenciales quedan seguras y nadie más las ve. Toma ~2 minutos.
          </p>
          <ol className="steps">
            <li>
              Entra a tu proyecto en <b>vercel.com</b> → pestaña <b>Storage</b> → <b>Create Database</b>.
            </li>
            <li>
              Elige <b>Postgres</b> (Neon). Acepta la región más cercana y crea la base de datos.
            </li>
            <li>
              En <b>Connect Project</b>, conéctala a este proyecto. Vercel inyecta las variables
              (<code>DATABASE_URL</code> / <code>POSTGRES_URL</code>) automáticamente.
            </li>
            <li>
              Ve a <b>Deployments</b> → menú <b>···</b> del último despliegue → <b>Redeploy</b>.
            </li>
          </ol>
          <div className="callout" style={{ marginTop: 18 }}>
            Al recargar, el sistema crea solo sus tablas y carga las 4 empresas, los servicios clave y
            algunos tickets de ejemplo para que veas todo funcionando de inmediato.
          </div>
        </div>
      </div>
    </div>
  );
}
