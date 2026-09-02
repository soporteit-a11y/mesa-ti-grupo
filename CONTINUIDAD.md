# CONTINUIDAD — cómo retomar este proyecto desde otra cuenta o IA

> **Lee esto primero. Es el punto de entrada.**
>
> Este documento no describe el proyecto: describe **cómo se trabaja en él**, en qué estado
> quedó y qué hay que saber para continuar sin perder nada. La descripción técnica completa,
> con el código fuente íntegro, está en **`HANDOFF.md`**, en esta misma carpeta.
>
> **Última sesión:** 2 de septiembre de 2026
> **Estado del sistema:** en producción, funcionando, sin incidencias abiertas.
> **El sistema ya NO es de acceso abierto:** tiene login con roles `admin` / `agent`, permisos
> por cuenta, auto-registro con aprobación, bloqueo de rutas por middleware y gestión de cuentas
> desde `/config`. Antes de tocar cualquier cosa relacionada con permisos, sesiones o el
> middleware, lee **HANDOFF.md §5.11** — en particular la tabla de qué archivo puede correr en
> Edge Runtime y cuál no, y la advertencia de no agregar columnas a `getSession()`.
>
> **El módulo "Rutas de trabajo" ahora se llama "Cronogramas"** y vive en `/cronogramas`
> (`/rutas` quedó como redirección). Ahora tiene **fases con fechas de inicio/fin y una vista
> Gantt**, y trae importado el cronograma real de la implementación de SINCO ERP en CMG
> (9 cronogramas, 61 fases, 249 tareas, tomados del Excel del proveedor). Ver HANDOFF.md §5.12
> antes de tocar nada de eso — en particular por qué ninguna tarea se importó marcada como hecha.
>
> ### 👉 ¿Buscas qué hay que hacer? Está todo en **§3.bis · TODO LO PENDIENTE**
> Doce puntos numerados de P0 a P11, ordenados por prioridad. Nada de eso bloquea el
> funcionamiento actual, pero **P0 (volcado de la base de datos) debe hacerse antes de
> cualquier cambio de cuenta**: es lo único irrecuperable.

---

## 1. Arranque en 60 segundos

Si eres una IA retomando este proyecto, haz esto en orden:

1. **Lee este documento entero.** Son las reglas del encargo y el estado actual.
2. **Lee `HANDOFF.md`.** Es el proyecto: arquitectura, base de datos, código fuente completo.
3. **Comprueba que producción está viva** antes de tocar nada:

```bash
for p in "" tickets config rutas; do
  printf "/%-8s -> " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "https://mesa-ti-grupo-delta.vercel.app/$p"
done
# Se esperan cuatro 200.
```

4. **Mira el estado de git** para saber si hay trabajo sin desplegar:

```bash
cd "C:\Users\Diomelvis\OneDrive - droppett.io\Desktop\claude code\helpdesk"
git log --oneline -5
git status -sb
```

Si `git status` muestra la rama sincronizada y sin cambios, lo que hay en disco es exactamente
lo que hay en producción.

### Si la IA nueva no puede leer archivos

Si trabajas en una interfaz sin acceso al disco (por ejemplo la web de Claude en vez de la
terminal), el usuario debe pegarte **dos archivos**: este y `HANDOFF.md`. Con esos dos tienes
absolutamente todo. `HANDOFF.md` es largo (~4.300 líneas) porque incluye el código fuente entero,
y eso es a propósito: hace que el proyecto sea reconstruible desde cero sin acceso a nada más.

---

## 2. Quién es el usuario y cómo trabajar con él

**Eddy Vargas** (`evargas@droppett.io`), única persona de TI de un grupo de cuatro empresas
(Droppett, Gilligan, CMG, Shazam). Este sistema lo usa a diario para su trabajo real.

### Reglas de trabajo que él estableció

Estas no son preferencias mías: salieron de peticiones suyas explícitas a lo largo del proyecto.

1. **Todo en español.** Interfaz, comentarios de código, mensajes de commit, tus respuestas.
2. **Actualizar `HANDOFF.md` en cada cambio.** Petición literal suya: *"cada vez que hagas cambio
   modifica el handoff y actualízalo"*. No es opcional ni se deja para el final: va en el mismo
   commit que el cambio.
3. **Nada codificado en duro que él pueda querer cambiar.** Empresas, categorías, SLA,
   colaboradores y plantillas viven en la base de datos y se editan desde `/config`. Si añades una
   función con valores fijos, la estás haciendo mal.
4. **Desplegar solo el diff, nunca el proyecto entero.** Petición suya explícita. Hoy se cumple
   vía git (§4).
5. **Sin dependencias nuevas** salvo necesidad real. Cero librerías de UI, gráficos o CSS.
6. **Para cualquier cambio visual/de diseño, seguir la skill `visual-design-changes`** (creada
   2026-08-27, vive en el perfil de Claude del usuario, no en este repo): reusar un patrón
   existente antes de inventar uno, revisar todos los breakpoints afectados y verificar en
   navegador (datos reales y vacíos, cada ancho relevante) antes de dar el cambio por terminado.

### Cómo se comunica

Escribe en español, informal, con frases cortas y a veces sin tildes. Suele pedir varias cosas
numeradas en un mismo mensaje — conviene responderlas en ese mismo orden y no dejarse ninguna.

Cuando algo no funciona, dice *"valida"* o *"valida la conexión"*. Espera que **compruebes de
verdad**, no que supongas. En este proyecto la comprobación fiable es siempre consultar la URL de
producción, nunca fiarse de que una herramienta diga "éxito".

---

## 3. Estado exacto al cerrar la última sesión

### Lo que está hecho y verificado en producción

| Función | Verificado |
|---|---|
| Dashboard con KPIs, donas y filtro de fechas | ✅ |
| Mesa de ayuda: crear, filtrar, editar, comentar | ✅ |
| SLA configurable por categoría + chip por ticket + KPI | ✅ |
| Respuestas rápidas | ✅ |
| Rutas de trabajo: tareas editables, borrables, reordenables | ✅ |
| Títulos de rutas editables en línea | ✅ probado en vivo |
| Diseño responsive | ✅ probado a 375 px y 1280 px |
| Contador de avisos de SLA en el menú | ⚠️ **ver abajo** |
| Despliegue por git | ✅ tres despliegues correctos |

### ⚠️ Lo único que quedó sin verificar del todo

**El contador de avisos de SLA no se ha podido probar con datos reales.**

El código está desplegado y su CSS también, pero ahora mismo el sistema tiene **0 tickets
abiertos**, así que la insignia correctamente no muestra nada. El problema es que un `0` legítimo
y un `0` causado por un fallo de la consulta se ven exactamente igual.

Ya se añadió un `console.error` en `app/layout.tsx` (commit `6519a95`, desplegado) para que un
fallo futuro quede registrado en los logs de Vercel en vez de pasar en silencio. Pero eso solo
sirve de aquí en adelante: **la consulta sigue sin probarse con datos que disparen la alerta.**

Cómo terminar de verificarlo está en el pendiente **P1** de la sección siguiente.

---

## 3.bis · TODO LO PENDIENTE

> Esta es **la lista completa**. El usuario pidió expresamente dejarlo todo aquí antes de cambiar
> de cuenta. Si algo hay que hacer en este proyecto, está en esta sección.
> Nada de esto bloquea el funcionamiento actual: el sistema está en producción y operativo.

### 🔴 Antes de cambiar de cuenta — hazlo primero

**P0.bis · Borrar `ADMIN_PASSWORD` de las variables de entorno de Vercel.**
Ya se usó: la cuenta admin existe y el login funciona. Esas variables
(`ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`) solo se leen cuando la tabla `users` está vacía, así
que ya no hacen nada — pero dejan la contraseña inicial en texto plano en el panel de Vercel.
Conviene borrar al menos `ADMIN_PASSWORD`. Si algún día hiciera falta recrear la primera cuenta
desde cero (tabla `users` vacía), se vuelven a poner.

**P0.ter · Cambiar la contraseña inicial.**
La contraseña con la que se creó la cuenta admin llegó a compartirse por chat durante la sesión
del 2-sep, así que debe considerarse comprometida. Se cambia desde `/config` → Usuarios del
sistema → escribir la clave nueva en la fila de tu cuenta → ✓. Al cambiarla se cierran
automáticamente todas las sesiones abiertas de ese usuario.

**Nota sobre el cambio de despliegue.** Un cambio en las variables de entorno de Vercel **no**
afecta a un despliegue que ya está corriendo: hay que hacer *Redeploy* del despliegue **más
reciente** (Vercel no deja redesplegar uno viejo — da el aviso "A more recent Production
Deployment has been created"). Esto costó un par de vueltas la primera vez.

**P0 · Volcado de la base de datos.**
Es lo único verdaderamente irrecuperable. El repositorio **no** contiene los datos reales (§6):
si se pierde el acceso a Neon sin haber volcado, se pierden los ~84 tickets, los 17 colaboradores
y el historial completo.

```bash
# Cadena de conexión: Vercel → mesa-ti-grupo → Storage → Postgres → .env.local
pg_dump "postgresql://usuario:clave@host/basedatos?sslmode=require" > respaldo-mesa-ti.sql
```

Guárdalo fuera de Vercel y fuera de la máquina.

**P0b · Confirmar accesos que sobreviven al cambio.**
- Repositorio GitHub `soporteit-a11y/mesa-ti-grupo` — la cuenta es del usuario, no de Claude ✅
- Proyecto Vercel `mesa-ti-grupo`, equipo `helpdesk10` — también del usuario ✅
- Base Neon — se administra desde el panel de Vercel ✅

Nada de esto depende de la cuenta de Claude, así que el cambio no debería afectarlos. Conviene
comprobarlo igualmente.

### 🟠 Verificación pendiente

**P1 · Probar el contador de avisos de SLA con datos reales.**
Prueba reversible, de un solo campo:

1. En `/tickets`, coge cualquier ticket antiguo ya cerrado
2. Cambia su estado a **En progreso** con el selector de la última columna
3. Al ser antiguo, su fecha límite ya pasó → deben aparecer una **insignia roja** junto a
   "Mesa de ayuda" y una **franja roja** arriba de la bandeja
4. Devuélvelo a **Resuelto** y comprueba que ambas desaparecen

Si no aparecen, mira los logs de Vercel buscando `[avisos SLA]`.
**Pregunta al usuario antes de hacerlo:** implica tocar uno de sus tickets reales.

### 🟡 Funciones no implementadas

**P2 · Alertas nivel 2 — resumen diario por correo.**
Vercel Cron (`vercel.json`) llamando a un endpoint `/api/cron/alertas`, con Resend para enviar
(capa gratuita: 3.000 correos/mes). Sería el primer `/api/` del proyecto.
*Limitación real: el plan Hobby de Vercel solo permite cron **diario**. Para avisos por hora hace
falta Pro (20 USD/mes).* Estimación: ~3 h. Requiere API key de Resend.

**P3 · Alertas para rutas de trabajo. ✅ Resuelto en parte (2026-08-25).**
`initiatives.due_date` ya existe, editable desde la tarjeta y el diálogo de alta. Cada ruta muestra
un chip "Atrasado Xd" / "Vence en Xd" calculado en el cliente. **Lo que falta si se quiere más:**
insignia en el menú lateral para rutas atrasadas (hoy solo hay chip en la tarjeta), siguiendo el
mismo patrón que la alerta de SLA de tickets.

**P4 · Alertas nivel 3 — tiempo real.**
WebSockets o push del navegador. **Desproporcionado** para un sistema de un solo usuario.
Documentado para descartarlo con criterio, no para hacerlo.

### 🟡 Seguridad

**P5 · El sitio no tiene autenticación.**
Cualquiera con la URL lee y modifica todo: tickets, configuración, rutas. Hoy es tolerable porque
lo usa una sola persona y la URL no está publicada. **Si algún día entra más gente del grupo, hay
que resolverlo antes.** Vercel Password Protection es de pago; alternativas gratuitas: Auth.js o
un middleware con Basic Auth.

### 🔵 Deuda técnica (nada urgente, todo conocido)

**P6 · ✅ Resuelto (2026-08-25).** La fórmula de SLA en SQL se unificó en la función
`ticket_sla_deadline()` (`lib/db.ts`), usada tanto por `getSupportDashboard()` como por
`getAlertCounts()`. Queda en dos sitios en vez de tres: esa función SQL + `slaInfo()` en
`lib/priority.ts` (§5.6 del handoff). Si cambias los multiplicadores, sigue habiendo que tocar
ambos.

**P7 · `tickets.category` es texto libre, no clave foránea.**
Se une con `categories` por nombre. Si el usuario **renombra** una categoría en `/config`, los
tickets antiguos quedan huérfanos y su SLA cae al valor por defecto de 24 h vía `COALESCE`.
Ya pasó una vez: "Flota (Tablets)" hoy se llama "Flota - Tablets / Celulares".

**P8 · ✅ Resuelto (2026-08-25).** Se eliminaron `urgency`, `impact`, `weight`, `score`,
`service_id`, `assignee`, `tickets.sla_hours` y la tabla `services` completa (todo con
`DROP ... IF EXISTS`, corre en el próximo `ensureSchema()` tras el deploy). También se quitaron de
`lib/priority.ts` las constantes `PRIORITIES`, `PRIORITY_META`, `computeScore`, `levelFor` y
`slaForLevel` — se confirmó por grep que ningún archivo las importaba antes de borrarlas.

### ⚪ Higiene del entorno

**P9 · Repositorio git accidental en el directorio de usuario.**
Existe un `.git` en `C:\Users\Diomelvis`. **Verificado: tiene 0 archivos rastreados**, así que
nada sensible está versionado y el riesgo real es bajo. Pero un `git add -A` ejecutado por error
desde esa carpeta prepararía todo el perfil del usuario, incluido `.ssh`. Conviene eliminarlo:

```bash
# Comprobar primero que sigue vacío:
cd /c/Users/Diomelvis && git ls-files | wc -l   # debe dar 0
# Y entonces:
rm -rf /c/Users/Diomelvis/.git
```

**P10 · Correo de los commits distinto al de la cuenta de GitHub.**
Los commits van firmados como `evargas@droppett.io`, pero el git global usa
`diomelvis.manzueta04@gmail.com`. Los commits no aparecen enlazados al perfil de GitHub. No afecta
al funcionamiento; se arregla añadiendo `evargas@droppett.io` en GitHub → Settings → Emails.

**P11 · Vercel CLI instalado sin sesión.**
Está globalmente en la máquina como plan B (`vercel login` → `vercel --prod`). No hace falta
mientras git funcione. Se documenta para que nadie lo confunda con algo roto.

---

## 4. Cómo se despliega hoy

**Por git, y solo por git.**

```bash
git add -A
git commit -m "descripción en español"
git push
```

Vercel detecta el push, construye y publica en 1–3 minutos. Por la red viaja solo el diff.

| | |
|---|---|
| Repositorio | `soporteit-a11y/mesa-ti-grupo` (privado) |
| Rama de producción | `main` |
| Proyecto en Vercel | `mesa-ti-grupo`, equipo `helpdesk10` |
| URL | https://mesa-ti-grupo-delta.vercel.app |

### Verificar que un despliegue llegó

```bash
until curl -s https://mesa-ti-grupo-delta.vercel.app/ | grep -q "MARCA_DEL_CAMBIO"; do sleep 10; done
```

Sustituye `MARCA_DEL_CAMBIO` por una clase CSS o texto nuevo del cambio. **No uses la API de
despliegues de Vercel**: devuelve 404 para este proyecto por ser plan Hobby, y eso no significa
que algo haya fallado.

---

## 5. Trampas de este entorno — léelas antes de perder una hora

Cada una de estas costó tiempo real de descubrir.

### 5.1 No despliegues nunca por árbol de archivos

Existe una herramienta que sube el proyecto entero a Vercel. **Un despliegue en Vercel es una foto
completa, no un parche.** Si envías solo los archivos que cambiaste, el resultado es un proyecto que
solo contiene esos archivos, y el sitio se cae con 404 — pero la herramienta responde "éxito".

Ya pasó dos veces. La segunda dejó producción caída varios minutos. Con git montado esto ya no
debería hacer falta nunca.

### 5.2 La API de Vercel — ya no da 404 (corregido 2026-08-27)

Esto se documentó el 24-ago porque en ese momento `get_deployment`, `get_deployment_build_logs`
y `get_project` daban 404. **Ya no es así:** probado el 27-ago con el MCP de Vercel —
`list_teams` → equipo `helpdesk10` (`team_dNPSiAmBa9NeAjoKVIAY7Jte`), `list_projects`,
`get_project`, `list_deployments` y `get_deployment` sobre el ID del último deploy — y todo
respondió bien, con el `githubCommitSha` exacto del commit recién pusheado y `readyState: "READY"`.
No se sabe qué cambió, pero hoy es una vía de verificación válida. **Sigue siendo buena práctica
confirmar también contra la URL pública** (§1), que no depende de ningún token ni permiso.

### 5.3 Enlazar un repositorio no despliega nada

Al conectar el repo a Vercel, este **no** despliega lo que ya existe: espera al siguiente push.
Hizo falta un commit nuevo para arrancar el primer despliegue. No es un fallo de configuración.

### 5.2bis El auto-deploy a veces se estanca (visto 2026-08-28)

Un push (`abfde59`) confirmado en GitHub tardó varios minutos en aparecer siquiera como build en
Vercel, después de ~15 pushes seguidos en la misma sesión que se recogían en segundos. Antes de
sospechar del código: confirma el commit en GitHub directo
(`curl https://api.github.com/repos/soporteit-a11y/mesa-ti-grupo/commits/main`), y si ya está ahí,
el problema es el webhook Git↔Vercel, no el push. Detalle completo en HANDOFF.md §10.

### 5.4 Credencial cruzada de GitHub

La máquina tiene guardada en Git Credential Manager la cuenta **`aiportal-dev`**, que **no** tiene
permiso sobre este repositorio. Para que no interfiera, el remoto lleva el usuario incrustado:

```bash
git remote -v
# origin  https://soporteit-a11y@github.com/soporteit-a11y/mesa-ti-grupo.git
git config credential.useHttpPath   # true
```

Si un push falla con `403 Permission denied to aiportal-dev`, es que se perdió esa configuración.
Vuelve a fijar la URL con el usuario incluido. **No borres la credencial de `aiportal-dev`**: el
usuario la utiliza en otros proyectos.

### 5.5 Herramientas que NO hay en esta máquina

- **`gh` (GitHub CLI)**: no instalado.
- **Vercel CLI**: instalado globalmente pero **sin sesión iniciada**. Sirve como plan B
  (`vercel login` → `vercel --prod`), no hace falta con git funcionando.
- **Cadena de conexión de Postgres**: no está en local ni debe estarlo. Vercel la inyecta.
  Para respaldar la base, sacarla de Vercel → Storage → Postgres.

### 5.6 Cuidado con la semilla de tickets

En `lib/db.ts` hay un bloque protegido por la clave `tickets_seed = 'csv-v1'` de la tabla `meta`
que hace `DELETE FROM tickets` antes de recargar los 68 tickets del CSV original. **Si cambias ese
valor, borras todos los tickets reales de producción.** No lo toques.

---

## 6. Los datos reales no están en el repositorio

Esto es lo más fácil de perder al cambiar de cuenta o de máquina, así que léelo con atención.

**El repositorio es la fuente de verdad del código. La base de datos Neon es la fuente de verdad de
los datos.** Ya divergieron mucho: el usuario lleva meses editando desde la interfaz.

| Dato | Lo que crea la semilla | Lo que hay en producción |
|---|---|---|
| Tickets | 68 | ~84, con tickets nuevos |
| Colaboradores | 8 | 17 |
| Rutas de trabajo | 7 | 4 |
| Respuestas rápidas | 6 | 12 |
| Categorías | 12 | 12, una renombrada |

Clonar el repositorio y desplegarlo en otro sitio te dará **la aplicación correcta con datos de
ejemplo**, no el historial real. Para llevarte los datos hay que volcarlos:

```bash
# Cadena de conexión: Vercel → mesa-ti-grupo → Storage → Postgres
pg_dump "postgresql://usuario:clave@host/basedatos?sslmode=require" > respaldo.sql
```

**Recomendación:** haz este volcado antes de cualquier migración de cuenta. Es lo único
verdaderamente irrecuperable si algo sale mal.

---

## 7. Lista de traspaso

Antes de mover el proyecto a otra cuenta:

- [ ] **P0 · Volcado de la base de datos** hecho y guardado fuera de Vercel (§3.bis y §6)
- [ ] Acceso al repositorio `soporteit-a11y/mesa-ti-grupo` en GitHub
- [ ] Acceso a la cuenta de Vercel (equipo `helpdesk10`)
- [ ] Acceso a la base Neon, que se administra desde el panel de Vercel
- [ ] `HANDOFF.md` y este documento copiados
- [ ] `git status` limpio y sincronizado antes de mover nada

**Lo importante:** ninguno de esos accesos pertenece a la cuenta de Claude. El repositorio es del
usuario, el proyecto de Vercel es del usuario y la base también. **Cambiar de cuenta de Claude no
pone en riesgo nada de eso.** Lo único que se pierde es la memoria de la conversación, y para eso
existen exactamente estos dos documentos.

**Sobre cambiar de cuenta de Claude en concreto:** los archivos viven en el disco del usuario, no
en la cuenta. Una sesión nueva en la misma carpeta los ve igual. Lo único que se pierde es la
memoria de la conversación — y para eso existen exactamente estos dos documentos.

---

## 8. Qué hacer en la primera respuesta

Cuando retomes, no empieces a programar. Haz esto:

1. **Comprueba producción y `git status`** (§1). Si las cuatro rutas dan 200 y la rama está
   sincronizada, no hay nada roto ni nada a medio desplegar.
2. **Lee §3.bis · TODO LO PENDIENTE** para saber qué hay sobre la mesa.
3. **Recuérdale P0** si va a cambiar de cuenta o de máquina: el volcado de la base de datos es lo
   único irrecuperable.
4. **Pregúntale qué quiere hacer.** No des por hecho que quiere seguir por el pendiente con el
   número más bajo: la numeración es de prioridad técnica, no de sus ganas.

Dos cosas que **no** debes hacer sin preguntar:
- Tocar sus tickets, categorías o rutas reales, aunque sea para probar algo (ver P1)
- Cambiar el valor de `tickets_seed` en `lib/db.ts` — borraría todos sus tickets (§5.6)

Y la regla que más le importa: **cada cambio va acompañado de su actualización en `HANDOFF.md`,
en el mismo commit.**
