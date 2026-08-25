# CONTINUIDAD — cómo retomar este proyecto desde otra cuenta o IA

> **Lee esto primero. Es el punto de entrada.**
>
> Este documento no describe el proyecto: describe **cómo se trabaja en él**, en qué estado
> quedó y qué hay que saber para continuar sin perder nada. La descripción técnica completa,
> con el código fuente íntegro, está en **`HANDOFF.md`**, en esta misma carpeta.
>
> **Última sesión:** 25 de agosto de 2026
> **Estado del sistema:** en producción, funcionando, sin incidencias abiertas.

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

En la última sesión se añadió un `console.error` en `app/layout.tsx` para que un fallo futuro
quede registrado en los logs de Vercel en vez de pasar en silencio. **Ese cambio está en disco pero
puede que no se haya llegado a desplegar** — comprueba `git status` al arrancar.

**Cómo terminar de verificarlo** (es reversible y de un solo campo):

1. En `/tickets`, coge cualquier ticket antiguo ya cerrado
2. Cambia su estado a **En progreso** con el selector de la última columna
3. Al ser antiguo, su fecha límite ya pasó → debe aparecer una **insignia roja** junto a
   "Mesa de ayuda" y una **franja roja** arriba de la bandeja
4. Devuélvelo a **Resuelto**

El usuario fue informado de esta prueba y no llegó a autorizarla explícitamente, así que
**pregúntale antes de tocar sus datos**.

### Pendientes que él conoce y no ha pedido aún

- **Alertas nivel 2** (resumen diario por correo con Vercel Cron + Resend). Limitación real: el
  plan Hobby solo permite cron diario.
- **Alertas para rutas de trabajo**: hoy imposible por fecha, porque `initiatives` no tiene columna
  de vencimiento. Habría que añadir `due_date` primero.
- **El sitio no tiene autenticación.** Cualquiera con la URL lee y modifica todo. Hoy es tolerable
  porque lo usa una sola persona, pero si entra más gente hay que resolverlo antes.
- **La fórmula de SLA está repetida en tres sitios** (§5.6 del handoff). Es la deuda técnica más
  propensa a causar incoherencias.

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

### 5.2 La API de Vercel miente por omisión

- `get_deployment` y `get_deployment_build_logs` devuelven **404** para este proyecto. Es normal
  (plan Hobby, scope personal), no es un fallo.
- `get_project` también da 404.
- **La única verificación fiable es consultar la URL de producción.**

### 5.3 Enlazar un repositorio no despliega nada

Al conectar el repo a Vercel, este **no** despliega lo que ya existe: espera al siguiente push.
Hizo falta un commit nuevo para arrancar el primer despliegue. No es un fallo de configuración.

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

Si vas a mover el proyecto a otra cuenta, comprueba estos puntos:

- [ ] **Volcado de la base de datos** hecho y guardado fuera de Vercel (§6)
- [ ] Acceso al repositorio `soporteit-a11y/mesa-ti-grupo` en GitHub
- [ ] Acceso a la cuenta de Vercel (equipo `helpdesk10`) — o transferir el proyecto
- [ ] Acceso a la base Neon, que se administra desde el panel de Vercel
- [ ] `HANDOFF.md` y este documento copiados
- [ ] Verificado que `git status` está limpio y sincronizado antes de mover nada

**Sobre cambiar de cuenta de Claude en concreto:** los archivos viven en el disco del usuario, no
en la cuenta. Una sesión nueva en la misma carpeta los ve igual. Lo único que se pierde es la
memoria de la conversación — y para eso existen exactamente estos dos documentos.

---

## 8. Qué hacer en la primera respuesta

Cuando retomes, no empieces a programar. Haz esto:

1. Comprueba producción y `git status` (§1)
2. Confirma si el `console.error` de `app/layout.tsx` está desplegado o pendiente (§3)
3. Pregúntale si quiere que se termine de verificar el contador de avisos (§3), porque implica
   tocar un ticket suyo
4. Pregunta qué quiere hacer a continuación

Y recuerda la regla que más le importa: **cada cambio va acompañado de su actualización en
`HANDOFF.md`, en el mismo commit.**
