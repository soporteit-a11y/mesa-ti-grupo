# HANDOFF — Mesa TI · Grupo Empresarial

> ### 📍 ¿Retomas el proyecto desde cero o desde otra cuenta?
> **Lee antes `CONTINUIDAD.md`**, en esta misma carpeta. Este documento describe *el proyecto*;
> aquel describe *cómo se trabaja en él*, en qué estado quedó y las trampas del entorno.
> Los dos juntos son el traspaso completo.

> **Propósito de este documento.** Es un traspaso completo y autocontenido del proyecto.
> Si lo pegas en cualquier otro LLM/IA (ChatGPT, Gemini, Copilot, otro Claude, etc.), esa IA
> tiene aquí **todo** lo necesario para entender el sistema y reconstruirlo idéntico desde cero:
> contexto de negocio, decisiones de arquitectura, esquema de base de datos, el código fuente
> íntegro de los 35 archivos, el sistema de diseño, el procedimiento de despliegue y las trampas
> ya descubiertas.
>
> **Fecha del traspaso:** 24 de agosto de 2026
> **Última actualización:** 28 de agosto de 2026 — se corrigió un bug real de zona horaria (toda
> fecha se mostraba en UTC crudo, 4 horas adelantada respecto a RD) y se agregó tiempo de
> resolución por ticket (automático o manual). Ver §14 y §5.8/§5.9.
> **Estado:** en producción y en uso real.
>
> **Regla de mantenimiento:** este documento se actualiza en cada cambio del proyecto. Si tocas
> el código y no actualizas esto, el traspaso deja de servir.

---

## 1. Qué es este sistema

Plataforma interna de **mesa de ayuda (helpdesk) + seguimiento de proyectos de TI** para un grupo
de cuatro empresas. No es un prototipo ni una maqueta: está desplegada, conectada a una base de
datos real y se usa a diario para registrar tickets reales.

Tiene cuatro módulos, uno por cada entrada del menú lateral:

| Ruta | Módulo | Para qué sirve |
|---|---|---|
| `/` | **Dashboard** | Informe visual: KPIs, donas, barras por categoría y por día, tickets recientes, filtro por rango de fechas. |
| `/tickets` | **Mesa de ayuda** | Bandeja de tickets: crear, filtrar, editar, comentar, cambiar estado, ver cumplimiento de SLA. |
| `/rutas` | **Rutas de trabajo** | Proyectos/iniciativas por empresa con checklist de tareas y barra de avance. |
| `/config` | **Configuración** | CRUD de empresas, categorías (con su SLA), colaboradores y respuestas rápidas. |

### Principio rector del proyecto

**Todo lo que el usuario podría querer cambiar, se cambia desde la interfaz — nunca tocando código.**

Empresas, categorías, horas de SLA por categoría, colaboradores y plantillas de respuesta son
todos datos en la base de datos, editables desde `/config`. Esta regla se estableció explícitamente
y debe respetarse en cualquier función nueva.

---

## 2. Contexto de negocio

**El grupo empresarial** está formado por cuatro empresas, cada una con su color de identidad:

| Empresa | Color | Notas |
|---|---|---|
| Droppett | `#5A6BE0` (azul) | |
| Gilligan | `#2AB6A4` (verde azulado) | Restaurantes — integración con Deliverect |
| CMG | `#E0A94A` (ámbar) | Construcción — origen de la mayoría de tickets |
| Shazam | `#E0698A` (rosa) | Ventas con flota de tablets |

**El usuario/propietario** es la única persona de TI del grupo (`evargas@droppett.io`, aparece
como "Eddy V." en las rutas de trabajo). Combina dos trabajos muy distintos:

1. **Seguridad e infraestructura de red** — Fortinet, Check Point, Cisco, SINCO ERP, Deliverect.
   Este trabajo, por ser de proyecto y largo plazo, vive en el módulo **Rutas de trabajo**.
2. **Soporte general de helpdesk** — impresoras, carpetas compartidas, correo, Office, cámaras,
   tablets. Este trabajo, por ser reactivo y por incidente, vive en **Mesa de ayuda**.

Esa separación en dos módulos distintos es deliberada y es la idea central del producto.

**El idioma de toda la interfaz es español.** Cualquier texto nuevo debe ir en español.

---

## 3. Infraestructura y accesos

| Elemento | Valor |
|---|---|
| **URL de producción** | https://mesa-ti-grupo-delta.vercel.app |
| **Proveedor de hosting** | Vercel (cuenta propia del usuario) |
| **Nombre del proyecto en Vercel** | `mesa-ti-grupo` |
| **Equipo / scope** | `helpdesk10` — id `team_dNPSiAmBa9NeAjoKVIAY7Jte` |
| **Plan** | Hobby (gratuito) |
| **Base de datos** | Neon Postgres, creada desde Vercel → Storage |
| **Driver** | `@neondatabase/serverless` (HTTP, sin pool de conexiones) |
| **Ruta local del proyecto** | `C:\Users\Diomelvis\OneDrive - droppett.io\Desktop\claude code\helpdesk` |

### Variables de entorno

**No hay archivo `.env` y no debe crearse.** Vercel inyecta automáticamente las credenciales de
Postgres al conectar la base de datos al proyecto desde el panel (Storage → Connect Project).

`lib/db.ts` busca la cadena de conexión en este orden de prioridad y usa la primera que exista:

```
POSTGRES_URL → DATABASE_URL → POSTGRES_PRISMA_URL → POSTGRES_URL_NON_POOLING → DATABASE_URL_UNPOOLED
```

Si ninguna existe, `hasDb` es `false` y **todas las páginas muestran el componente `<Setup />`**,
que son instrucciones en pantalla para que el usuario conecte la base de datos él mismo desde
Vercel. Esto es intencional: las credenciales nunca pasan por el chat ni por el repositorio.

Para obtener la cadena de conexión (por ejemplo para respaldar la base):
Vercel → proyecto `mesa-ti-grupo` → Storage → la base Postgres → `.env.local` / Connection string.

---

## 4. Stack técnico — versiones exactas

```json
{
  "dependencies": {
    "@neondatabase/serverless": "0.9.5",
    "next": "14.2.35",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "20.16.11",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "typescript": "5.6.3"
  }
}
```

- **Next.js 14 App Router** (no Pages Router, no Next 15).
- **Sin librerías de UI ni de gráficos.** Cero Tailwind, cero shadcn, cero Chart.js, cero Recharts.
  Todo el CSS es artesanal en un único archivo `app/globals.css`. Todos los gráficos (donas, barras)
  son SVG y `div`s calculados a mano. **Mantenerlo así** — es una decisión deliberada de diseño.
- **Sin API routes.** Todas las mutaciones son Server Actions (`"use server"` en `app/actions.ts`).
- **Sin gestor de estado.** El estado de filtros y de "qué ticket está abierto" vive en los
  parámetros de la URL (`?company=CMG&ticket=42`).
- **Sin autenticación.** El sitio es público por URL. (Ver §12 — pendiente conocido.)

---

## 5. Arquitectura y patrones

### 5.1 Renderizado

Las cuatro páginas son **Server Components asíncronos** con `export const dynamic = "force-dynamic"`,
es decir, se renderizan en cada petición contra la base de datos en vivo. No hay caché estática.

Los Client Components (`"use client"`) se usan **solo** donde hace falta interactividad real:
diálogos, selects que se auto-envían, edición en línea y arrastrar-soltar.

### 5.2 Mutaciones — Server Actions

Todas las escrituras están en `app/actions.ts` y siguen siempre el mismo patrón de cinco pasos:

```ts
export async function nombreAccion(formData: FormData) {
  await ensureSchema();                              // 1. garantizar esquema
  const id = Number(formData.get("id"));             // 2. leer del FormData
  if (!id) return;                                   // 3. validar (salida silenciosa)
  await sql!`UPDATE ...`;                            // 4. mutar
  revalidatePath("/rutas");                          // 5. revalidar rutas afectadas
}
```

Se enlazan directamente al formulario: `<form action={nombreAccion}>`. Muchas mutaciones
funcionan **sin JavaScript** en el cliente.

### 5.3 Patrón "auto-enviar al cambiar"

Los selects que guardan al instante (estado de ticket, solicitante, estado de ruta) usan un
`ref` al formulario y llaman `requestSubmit()` en el `onChange`:

```tsx
const ref = useRef<HTMLFormElement>(null);
<form ref={ref} action={setStatus}>
  <input type="hidden" name="id" value={id} />
  <select onChange={() => ref.current?.requestSubmit()}> ... </select>
</form>
```

Variante con `onBlur` en lugar de `onChange` para campos de texto y numéricos
(`SlaInput`, título de tarea en `TaskItem`).

### 5.4 Diálogos

Se usa el elemento nativo `<dialog>` con `showModal()` / `close()`. Nunca una librería de modales.
Cierre por clic en el fondo comparando `e.target === ref.current`.

`TicketDetailDialog` además sincroniza su apertura con la URL: se abre porque existe `?ticket=N`,
y al cerrarse borra ese parámetro con `router.push`.

### 5.5 Esquema auto-migrable — el patrón más importante del proyecto

**No hay herramienta de migraciones** (nada de Prisma, Drizzle ni SQL manual). En su lugar,
`lib/db.ts` exporta `ensureSchema()`, que se ejecuta **una sola vez por instancia del servidor**
(memoizada en la variable `schemaPromise`) y es **idempotente**: se puede llamar infinitas veces
sin causar daño.

Contiene, en orden:

1. `CREATE TABLE IF NOT EXISTS` de las 9 tablas.
2. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para bases ya existentes.
3. `ALTER TABLE ... DROP NOT NULL` envueltos en `try/catch` vacíos (columnas heredadas de un
   modelo de priorización anterior que ya no se usa).
4. Semillas condicionadas: cada una corre solo si su tabla está vacía (`COUNT(*) === 0`).
5. Migraciones de una sola vez, controladas por la tabla `meta` (clave/valor).

**Cómo añadir un cambio de esquema:** agrega el `CREATE`/`ALTER` idempotente dentro de `init()`.
Si además necesitas modificar datos existentes una única vez, protégelo con una clave nueva en
`meta`, siguiendo el modelo de `category_sla_v1`:

```ts
const ver = await q`SELECT v FROM meta WHERE k = 'mi_clave_v1'`;
if (ver.length === 0) {
  // ... cambios de datos, una sola vez ...
  await q`INSERT INTO meta (k, v) VALUES ('mi_clave_v1','1')
          ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
}
```

**Advertencia:** la clave `tickets_seed = 'csv-v1'` protege un bloque que hace `DELETE FROM tickets`
seguido de recargar los 68 tickets del CSV original. Si cambias ese valor a otra cosa, **borras
todos los tickets reales de producción.** No lo toques.

### 5.6 Modelo de SLA

El SLA se calcula, no se almacena. La fórmula tiene dos factores:

```
horas objetivo = horas_base_de_la_categoría × multiplicador_de_prioridad
```

- **Horas base**: columna `categories.sla_hours`, editable por el usuario en `/config`.
- **Multiplicador**: `Alta = 0.5`, `Media = 1`, `Baja = 1.5` (constante `PRIORITY_SLA_MULT`).
  Es decir, el número que el usuario configura corresponde a prioridad Media; Alta va a la mitad
  de tiempo y Baja a tiempo y medio.
- **Fecha límite** = `created_at + horas objetivo`.
- **Evaluación**: para tickets cerrados se compara contra `resolved_at`; para los abiertos, contra
  la hora actual.

Está implementado **dos veces y las dos deben mantenerse sincronizadas** (antes eran tres — ver
§14, 2026-08-25, unificación de la parte SQL):

1. En TypeScript — `slaInfo()` en `lib/priority.ts`, usado para pintar cada chip de la tabla, la
   insignia del diálogo de detalle y el conteo de la franja de aviso de `/tickets`.
2. En SQL — la función `ticket_sla_deadline(created_at, sla_hours, priority)`, creada en
   `ensureSchema()` (`lib/db.ts`) con `CREATE OR REPLACE FUNCTION`. La usan tanto
   `getSupportDashboard()` (KPI "Fuera de SLA") como `getAlertCounts()` (insignia del menú), así
   que el CASE de multiplicadores vive en un solo lugar del lado SQL.

Si cambias los multiplicadores, **cámbialos en los dos sitios**: la constante `PRIORITY_SLA_MULT`
(TypeScript) y el `CASE` dentro de `ticket_sla_deadline()` (SQL, en `lib/db.ts`).

### 5.7 Estado en la URL

Filtros y selección se guardan en `searchParams`, no en estado de React:

| Parámetro | Página | Efecto |
|---|---|---|
| `?company=` | `/tickets`, `/rutas` | Filtra por empresa |
| `?category=` `?priority=` `?requester=` `?status=` | `/tickets` | Filtros de la bandeja |
| `?ticket=N` | `/tickets` | Abre el diálogo de detalle del ticket N |
| `?from=` `?to=` | `/` | Rango de fechas del dashboard |

Ventaja: los filtros son enlazables y sobreviven a recargas. El patrón para modificarlos siempre es
leer `useSearchParams()`, clonar a `URLSearchParams`, mutar y `router.push()`.

### 5.8 Zona horaria — todo se muestra en hora de República Dominicana

**Bug real, corregido 2026-08-28:** las fechas se guardan en Postgres como `TIMESTAMPTZ` (instante
UTC real), pero hasta este cambio `app/tickets/page.tsx`, `app/page.tsx` y
`components/TicketDetailDialog.tsx` las formateaban con `getUTCDate()`/`getUTCHours()` — es decir,
mostraban la hora UTC **etiquetada como si fuera hora local**, 4 horas adelantada respecto a
Santo Domingo. El usuario lo notó comparando contra el reloj real ("Current time in Dominican
Republic... UTC-4").

**`lib/dates.ts` es ahora la única fuente de conversión de fecha/hora del proyecto.** Usa
`Intl.DateTimeFormat` con `timeZone: "America/Santo_Domingo"` (UTC-4 fijo, sin horario de
verano — la RD no lo usa) en vez de aritmética manual de offset, así que es correcto sin importar
en qué zona horaria corra el servidor. Exporta:

- `fmtDateDR(iso)` → `"DD/MM/YYYY"` (columna "Creado" de `/tickets`).
- `fmtDateTimeDR(iso)` → `"DD/MM/YYYY HH:mm"` (dashboard, detalle de ticket, comentarios).
- `drDayMonth(iso, meses)` / `drYear(iso)` → para el período del dashboard (`fmtPeriod`).
- `autoResolutionMinutes(createdAt, resolvedAt)` y `fmtDuration(minutes)` → ver §5.9.

**Si agregas una pantalla nueva que muestre una fecha, usa `lib/dates.ts`.** Volver a escribir
`getUTCDate()`/`getUTCHours()` a mano reintroduce exactamente este bug.

### 5.9 Tiempo de resolución (agregado 2026-08-28)

`tickets.resolution_minutes` (INT, nullable) guarda una duración manual en minutos que **sobrescribe**
el cálculo automático. Cuando es `NULL` (el caso normal), el tiempo de resolución se calcula solo:
`autoResolutionMinutes()` en `lib/dates.ts` resta `created_at` de `resolved_at` — esto es un cálculo
de duración (diferencia entre dos instantes), así que **no depende de la zona horaria**: da el
mismo resultado sin importar en qué huso se muestren esas fechas. La zona horaria solo importa para
mostrar *cuándo* pasó algo (§5.8), no para calcular *cuánto* duró.

`components/TicketResolutionTime.tsx` (nuevo, en `TicketDetailDialog`) deja elegir entre
**Automático** (el cálculo de arriba; muestra "se calcula al resolver" si el ticket sigue abierto)
y **Manual** (dos inputs, horas y minutos, que se guardan en `resolution_minutes` vía la Server
Action `updateTicketResolutionTime`). Volver a Automático simplemente pone la columna en `NULL`
otra vez — no se pierde nada, el valor manual anterior no se recupera pero tampoco hace falta:
siempre puede volver a escribirse.

---

## 6. Modelo de datos

Ocho tablas en Postgres, más la función SQL `ticket_sla_deadline()` (§5.6). La novena tabla,
`services`, y varias columnas muertas de `tickets` se eliminaron el 2026-08-25 (§14) por no tener
uso — este es el esquema efectivo actual de `ensureSchema()`:

```sql
companies         (id, name UNIQUE, slug, color)
categories        (id, name UNIQUE, sla_hours DEFAULT 24)
collaborators     (id, name UNIQUE, company_id → companies, email, phone)
tickets           (id, title, description, company_id → companies,
                   category, priority, status DEFAULT 'resuelto', requester,
                   created_at, updated_at, resolved_at, resolution_minutes)
ticket_comments   (id, ticket_id → tickets ON DELETE CASCADE, author, text, created_at)
initiatives       (id, company_id → companies, title, area,
                   status DEFAULT 'planificado', owner, due_date, created_at)
initiative_tasks  (id, initiative_id → initiatives ON DELETE CASCADE,
                   title, done DEFAULT false, position DEFAULT 0)
meta              (k PRIMARY KEY, v)          -- control de migraciones de una sola vez
canned_responses  (id, title UNIQUE, text)
```

### Notas importantes sobre el esquema

- **`tickets.category` es TEXTO LIBRE, no una clave foránea.** Se une con `categories` por nombre
  (`LEFT JOIN categories cat ON cat.name = t.category`). Consecuencia: si el usuario **renombra**
  una categoría en `/config`, los tickets viejos quedan huérfanos y su SLA cae al valor por defecto
  de 24 h vía `COALESCE`. Es una deuda técnica conocida y aceptada. *(De hecho ya ocurrió: la
  categoría sembrada como "Flota (Tablets)" hoy se llama "Flota - Tablets / Celulares" en producción,
  renombrada por fuera de la interfaz antes de que existiera un botón para hacerlo.)* Sigue
  pendiente (P7 en CONTINUIDAD.md) — el 2026-08-27 se agregó la edición de nombre desde `/config`
  (`updateCategory`), pero la deuda de fondo (columna de texto libre, no clave foránea) no se tocó.
- **`collaborators.email` / `collaborators.phone`** (agregadas 2026-08-27): datos de contacto
  opcionales, editables desde `/config` junto con el nombre y la empresa del colaborador.
- **`tickets.resolution_minutes`** (agregada 2026-08-28): override manual del tiempo de
  resolución, en minutos. `NULL` = usar el cálculo automático (`resolved_at - created_at`). Ver
  §5.9.
- **`initiatives.due_date`** (agregada 2026-08-25): fecha límite opcional de la ruta, editable en
  línea desde `<InitiativeDueDate>`. `dueInfo()` en `app/rutas/page.tsx` la compara contra hoy para
  mostrar el chip "Atrasado Xd" / "Vence en Xd"; una ruta `completado` nunca se marca atrasada.
- **Valores de `status` en tickets:** `nuevo`, `en_progreso`, `en_espera`, `resuelto`.
  Un ticket recién creado entra como `nuevo`; los importados del CSV entraron como `resuelto`.
  Al pasar a `resuelto` se sella `resolved_at = now()`; al salir de `resuelto` se pone a `NULL`.
- **Valores de `status` en iniciativas:** `planificado`, `en_curso`, `en_pausa`, `completado`.
- **`priority` en tickets:** `Alta`, `Media`, `Baja` (con mayúscula inicial — se usan tal cual como
  clase CSS: `.pri.Alta`).
- **Orden de tareas:** la columna `position` (entero desde 0). `reorderTasks` la reescribe
  secuencialmente al soltar una tarea arrastrada.

---

## 7. Estado de los datos en producción

**Crítico para replicar de verdad:** el repositorio es la fuente de verdad del **código**, pero
la base de datos Neon es la fuente de verdad de los **datos**. Ya divergieron mucho, porque el
usuario lleva meses editando desde la interfaz.

Comparación al 24 de agosto de 2026:

| Dato | Lo que crea la semilla del código | Lo que hay en producción |
|---|---|---|
| Empresas | 4 | 4 |
| Categorías | 12 | 12 (una renombrada a "Flota - Tablets / Celulares") |
| Colaboradores | 8 | 17 |
| Tickets | 68 (del CSV, todos cerrados) | ~84, incluye tickets nuevos y abiertos |
| Rutas de trabajo | 7 | 4 (el usuario eliminó 3) |
| Tareas de rutas | 31 | 15, con títulos reescritos por el usuario |
| Respuestas rápidas | 6 | 12 |

**Volver a desplegar el código NO restaura estos datos** — las semillas solo corren con la tabla
vacía. Y tampoco los borra, salvo que se manipule la clave `tickets_seed`.

### Cómo respaldar la base antes de mover nada

```bash
# 1. Copia la cadena de conexión desde Vercel → Storage → Postgres
# 2. Vuelca todo:
pg_dump "postgresql://usuario:clave@host/basedatos?sslmode=require" > respaldo.sql

# Restaurar en una base nueva:
psql "postgresql://...nueva..." < respaldo.sql
```

Sin este volcado, una reconstrucción desde cero te dará la aplicación correcta pero con los datos
de ejemplo, no con el historial real de tickets.

---

## 8. Sistema de diseño

Tema **oscuro único** (azul marino + verde). No hay modo claro ni conmutador, a propósito.
Todos los colores son variables CSS declaradas una sola vez en `:root` de `app/globals.css`.

```css
--paper:       #0A0E15   /* fondo de la página */
--surface:     #121A25   /* tarjetas y paneles */
--surface-2:   #18222F   /* campos, filas alternas, cabeceras de tabla */
--ink:         #EAEFF4   /* texto principal */
--ink-soft:    #B7C2CE   /* texto secundario */
--muted:       #7E8B99   /* etiquetas, metadatos */
--faint:       #55616D   /* texto muy tenue, iconos inactivos */
--line:        #1F2937   /* bordes suaves */
--line-strong: #2C3947   /* bordes de controles */
--accent:      #7FB93E   /* verde de marca */
--accent-ink:  #A6DA66   /* verde claro para texto */
--accent-wash: #17240F   /* fondo verde muy oscuro */
--crit: #E4694A / --crit-w: #2C1712   /* rojo  — prioridad Alta, SLA vencido */
--high: #E0A94A / --high-w: #2B2410   /* ámbar — prioridad Media, SLA por vencer */
--low:  #7FB93E / --low-w:  #16240F   /* verde — prioridad Baja, SLA cumplido */
--info: #4FA3E0                        /* azul  — estado "nuevo" */
```

### Convenciones tipográficas

- Fuente de interfaz: pila del sistema (`system-ui`, Segoe UI, Roboto…).
- **Todo lo numérico o de datos va en `var(--font-mono)`**: identificadores, fechas, contadores,
  chips, etiquetas de eje. Además `font-variant-numeric: tabular-nums` en cifras que se alinean
  en columna, para que no "bailen".
- Las etiquetas de sección van en mayúsculas, mono, tamaño ~10–12 px, con `letter-spacing`
  generoso (clases `.panel-title`, `.cfg-head`, `.sc-k`, `thead th`).

### Anchos y layout

- Barra lateral fija de `244px` (`--sidebar-w`), contenido con `max-width: 1600px` y
  `margin: 0 auto` (centrado agregado 2026-08-25; el ancho subió de 1320px a 1600px el
  2026-08-27, con un segundo salto a `1900px` desde `min-width: 1900px` — medido en vivo: a
  2560px de viewport el contenido usaba solo 1320+244=1564px, dejando ~1000px muertos). Ver §14.
- Radios: `--radius: 12px` en tarjetas, `--radius-sm: 7px` en campos.

### Sistema responsive

Las reglas responsive están **agrupadas al final de `app/globals.css`**, bajo el encabezado
`RESPONSIVE`. Es a propósito: tienen la misma especificidad que las de escritorio, así que ganan
por orden de aparición. Si añades reglas responsive, ponlas ahí, no dispersas.

| Punto de quiebre | Qué cambia |
|---|---|
| `1080px` | Dashboard pasa de 3 a 2 columnas |
| `980px` | Grillas `g4`→2 columnas, `g3`→1 columna |
| `820px` | **La barra lateral pasa a cabecera horizontal**; el nav se vuelve una grilla de 4 |
| `760px` | **La tabla de tickets se convierte en tarjetas apiladas**; filtros a 2 por fila; KPIs en 2×2; en rutas se ocultan los tiradores de arrastre y aparecen los botones ▲▼ |
| `720px` | Dashboard a 1 columna |
| `640px` | Diálogos casi a pantalla completa; `row2` a 1 columna |
| `560px` | Nav a 2 columnas; acciones de ruta a línea propia |
| `420px` | KPIs y filtros a 1 columna |

Dos detalles de implementación que conviene conocer:

1. **La tabla de tickets en móvil** no usa un componente distinto: cada `<td>` lleva un atributo
   `data-label` y el CSS lo pinta con `content: attr(data-label)` en un `::before`. Si añades una
   columna a la tabla, **tienes que añadirle su `data-label`** o en móvil saldrá sin etiqueta.
2. **`app/layout.tsx` exporta `viewport`** (`width=device-width, initialScale=1`). Sin eso el móvil
   renderiza a ancho de escritorio y nada de lo anterior surte efecto.

---

## 9. Árbol de archivos

```
helpdesk/
├── package.json              # dependencias exactas
├── next.config.mjs           # ignora errores de TS y ESLint en build
├── tsconfig.json             # alias "@/*" → raíz del proyecto
├── next-env.d.ts
├── .gitignore                # excluye node_modules, .next, .env, .vercel
├── CONTINUIDAD.md            # cómo retomar el proyecto: reglas, estado y trampas
├── HANDOFF.md                # este documento
│
├── app/
│   ├── layout.tsx            # shell: barra lateral + <main>; exporta metadata y viewport
│   ├── icon.png              # favicon (convención Next.js App Router), logo de Droppett
│   ├── globals.css           # TODO el CSS del proyecto
│   ├── actions.ts            # TODAS las Server Actions (25 funciones)
│   ├── page.tsx              # Dashboard
│   ├── tickets/page.tsx      # Mesa de ayuda
│   ├── rutas/page.tsx        # Rutas de trabajo
│   └── config/page.tsx       # Configuración
│
├── public/                   # assets estáticos (agregado 2026-08-26)
│   ├── droppett-logo.png       # logo completo (ícono + wordmark), trazo blanco, sin usar aún
│   ├── droppett-icon.png       # solo el ícono (wifi+nube), trazo negro
│   └── droppett-icon-white.png # solo el ícono, trazo blanco — el que usa el sidebar
│
├── lib/
│   ├── db.ts                 # conexión + ensureSchema() + semillas
│   ├── data.ts               # todas las consultas de lectura
│   ├── priority.ts           # constantes + cálculo de SLA
│   └── dates.ts              # unica fuente de fecha/hora en zona RD + duracion de resolucion
│
└── components/
    ├── NavLink.tsx                 # enlace lateral: icono, activo e insignia de avisos
    ├── Setup.tsx                   # pantalla "conecta la base de datos"
    ├── DateRangeFilter.tsx         # rango de fechas del dashboard
    ├── Filters.tsx                 # 5 filtros de la bandeja de tickets
    ├── FiltersCompanyClient.tsx    # filtro de empresa en /rutas
    ├── NewTicketDialog.tsx         # diálogo de alta de ticket
    ├── TicketOpenLink.tsx          # título clicable → ?ticket=N
    ├── TicketDetailDialog.tsx      # detalle: edición + comentarios + SLA + respuestas rápidas
    ├── TicketResolutionTime.tsx    # tiempo de resolución: automático o manual
    ├── StatusControl.tsx           # select de estado que auto-guarda
    ├── RequesterControl.tsx        # select de solicitante que auto-guarda
    ├── CollaboratorsDialog.tsx     # alta rápida de colaboradores desde /tickets
    ├── SlaInput.tsx                # input numérico de horas de SLA (guarda al perder foco)
    ├── NewInitiativeDialog.tsx     # diálogo de alta de ruta
    ├── InitiativeStatusControl.tsx # select de estado de ruta
    ├── InitiativeTitle.tsx         # título de ruta editable en línea
    ├── InitiativeDueDate.tsx       # fecha límite de ruta, guarda al cambiar
    ├── DeleteInitiativeButton.tsx  # botón ✕ para borrar una ruta completa
    ├── TaskList.tsx                # lista de tareas: arrastrar-soltar + botones ▲▼ en móvil
    ├── TaskItem.tsx                # tarea: casilla + título editable + borrar
    └── AddTaskForm.tsx             # input "+ Agregar tarea"
```

**41 archivos** sin contar `node_modules`, `.next` ni `package-lock.json`.

---

## 10. Procedimiento de despliegue

### Desarrollo local

```bash
cd helpdesk
npm install
npm run dev      # http://localhost:3000
```

Sin variables de entorno de Postgres, verás la pantalla `<Setup />`. Para desarrollar contra datos
reales, crea un `.env.local` con `POSTGRES_URL=...` (y **no lo subas al repositorio**).

Antes de cualquier despliegue, siempre:

```bash
npm run build
```

### Despliegue a producción — vía git ✅ OPERATIVA

**Esta es la vía en uso.** Quedó montada el 24-ago-2026 y es la única que debe usarse.

| | |
|---|---|
| Repositorio | `soporteit-a11y/mesa-ti-grupo` (privado, en GitHub) |
| Rama de producción | `main` |
| Enlace con Vercel | proyecto `mesa-ti-grupo`, despliegue automático en cada push |

Desplegar es simplemente:

```bash
git add -A
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push, construye y publica. Por la red viaja **solo el diff**, no el proyecto
entero. Tarda entre 1 y 3 minutos.

**Detalle de credenciales que conviene conocer:** la máquina tiene guardada en Git Credential
Manager otra cuenta de GitHub (`aiportal-dev`) que **no** tiene permiso sobre este repositorio.
Para que no interfiera, el remoto lleva el usuario incrustado en la URL y el repositorio activa
`credential.useHttpPath`:

```bash
git remote -v
# origin  https://soporteit-a11y@github.com/soporteit-a11y/mesa-ti-grupo.git
git config credential.useHttpPath   # true
```

Si algún día un push falla con `403 Permission denied to aiportal-dev`, es que se perdió esa
configuración: basta con volver a fijar la URL del remoto con el usuario incluido.

**El repositorio es privado a propósito:** no contiene credenciales (`.gitignore` excluye `.env`),
pero sí los nombres reales de los colaboradores del grupo y el historial de tickets.

### Despliegue a producción — vía árbol de archivos (obsoleta, solo referencia histórica)

Antes de montar git, el despliegue se hacía subiendo el árbol completo a Vercel. **Ya no se usa
y no debe usarse.** Se documenta porque explica varias cicatrices del proyecto.

> **Limitación que lo dejó inservible:** el proyecto creció hasta ~120 KB de código fuente, y
> enviar el árbol completo en una sola operación supera el límite de salida de un asistente de IA.
> Por eso el paso a git dejó de ser una mejora opcional.

También existe la CLI de Vercel como alternativa manual (`npm i -g vercel`, `vercel login`,
`vercel --prod`), que sube solo los archivos cuyo hash Vercel no tiene ya. Está instalada en la
máquina pero **sin sesión iniciada**, porque git resolvió el problema antes. Sirve como plan B si
alguna vez GitHub no está disponible.

> ### ⚠️ TRAMPA CRÍTICA — leer antes de desplegar por árbol de archivos
>
> **Hay que enviar el árbol de archivos COMPLETO en cada despliegue.** El despliegue no es
> incremental: lo que subes *es* el proyecto entero, no un parche sobre lo anterior.
>
> Si subes solo los archivos que cambiaste, el resultado es un proyecto al que le faltan archivos.
> La llamada **devuelve éxito igualmente** y te da una URL nueva, pero el sitio queda roto
> (páginas en 404) o sirviendo la versión anterior sin avisar.
>
> **Esto ya pasó dos veces en este proyecto**, la segunda dejó producción caída en 404 varios
> minutos. No hay atajo: siempre los 33 archivos.

### Cómo verificar que un despliegue funcionó

**Corrección (2026-08-27):** esto se documentó el 24-ago porque en ese momento `get_deployment` y
`get_deployment_build_logs` devolvían 404. Probado de nuevo hoy con el MCP de Vercel
(`list_teams` → `team_dNPSiAmBa9NeAjoKVIAY7Jte`, `list_projects`, `get_project`, `list_deployments`
y `get_deployment` sobre el ID exacto del último deploy) y **todas responden bien**, con el
`githubCommitSha` coincidiendo exacto con el commit recién pusheado y `readyState: "READY"`. No
está claro qué cambió (¿token del MCP renovado?, ¿algo del lado de Vercel?), pero a partir de hoy
sí es una vía de verificación válida — igual de fiable seguir confirmando contra la URL pública.

El método fiable es consultar directamente la URL de producción:

```bash
# ¿responden las cuatro rutas?
for p in "" tickets config rutas; do
  printf "/%-8s -> " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "https://mesa-ti-grupo-delta.vercel.app/$p"
done
# Se esperan cuatro 200.

# ¿está viva una función concreta? (busca su marca en el HTML)
curl -s https://mesa-ti-grupo-delta.vercel.app/tickets | grep -c "sla-chip"
curl -s https://mesa-ti-grupo-delta.vercel.app/          | grep -c "Fuera de SLA"
curl -s https://mesa-ti-grupo-delta.vercel.app/config    | grep -c "Respuestas r"
```

Para funciones interactivas (que un elemento sea editable, arrastrable, etc.), inspecciona el DOM
en un navegador; el HTML plano no basta para distinguirlas:

```js
document.querySelectorAll('.task-drag-row').length   // tareas arrastrables
document.querySelectorAll('.init-del').length        // botones de borrar ruta
```

Un despliegue tarda entre 1 y 3 minutos en propagarse al alias de producción.

---

## 11. Recorrido funcional, módulo por módulo

### Común a todas las páginas — insignia de avisos

El menú lateral muestra una insignia en **Mesa de ayuda** cuando hay tickets abiertos en riesgo:

- **Roja** con el número de tickets **ya fuera de SLA** (tiene prioridad)
- **Ámbar** con los que **vencen en menos de 2 horas**, solo si no hay ninguno vencido
- **Sin insignia** si no hay nada pendiente

El dato sale de `getAlertCounts()` (`lib/data.ts`), que llama el layout raíz. Tres detalles de
implementación importantes:

1. `app/layout.tsx` es un Server Component **asíncrono** por esto. La consulta va envuelta en
   `if (hasDb)` + `try/catch`: si la base no está conectada o falla, se muestra el menú sin
   insignia en lugar de tumbar toda la aplicación. **No quites esa protección** — sin ella, un
   fallo de base de datos deja el sitio entero en blanco, no solo una página.
2. Es una consulta por carga de página. Es un único `COUNT` sobre los tickets abiertos y a esta
   escala no se nota, pero conviene tenerlo presente si el volumen crece mucho.
3. Las páginas son `force-dynamic`, así que la insignia se recalcula en cada navegación. No hay
   nada que invalidar.

### Dashboard (`/`)

Cuatro tarjetas KPI: **Total de tickets**, **Cerrados** (con %), **Abiertos** (con %) y
**Fuera de SLA** (abiertos que ya pasaron su fecha límite; se pinta en rojo si es > 0).

Debajo, tres columnas: dona de cerrados + barras por día de la semana + tickets recientes;
barras por categoría + segunda dona; tabla detallada por categoría + bloque de resumen.

El filtro de rango de fechas (`?from=`/`?to=`) afecta a **todas** las consultas del dashboard.
Nota de implementación: el filtro `to` es inclusivo — internamente se compara con
`< to + interval '1 day'`.

**Presets de período** (agregado 2026-08-26, `<DateRangeFilter>`): botones **Todo / Hoy / 3 días /
1 semana / 1 mes**, más los campos manuales **Desde/Hasta** de siempre para un rango
personalizado. Los presets calculan la fecha con `new Date()` **en el cliente** (por eso "Hoy"
avanza solo, día a día, sin tocar el servidor) y solo hacen `set("from"/"to")` sobre los mismos
parámetros de URL — no hay estado nuevo, ni ruta nueva.

El texto "📅 PERIODO" del encabezado **ya no muestra el rango de fechas de los tickets
existentes** (`d.minDate`/`d.maxDate`); antes de este cambio mostraba el mínimo/máximo real de
`created_at` entre los tickets, lo que el usuario veía como "estático" porque solo avanzaba
cuando entraba un ticket nuevo. Ahora `periodLabel` en `app/page.tsx` refleja el **filtro
seleccionado**: "Todo el historial" sin filtro, o las fechas exactas de `from`/`to` con
`fmtYMD()` cuando hay uno activo. `fmtPeriod(d.minDate, d.maxDate)` se sigue usando, pero solo
para la frase del panel "Resumen" (que sí describe los datos, no el filtro) — y esa frase ahora
se oculta si `d.total === 0` (período sin tickets, ej. "Hoy" antes de que entre el primero).

Las donas se dibujan con dos `<circle>` SVG y `stroke-dasharray`; el texto va centrado con
flexbox sobre el SVG (`position:absolute; inset:0`), no con `text-anchor` — esto se corrigió
dos veces, no lo cambies a coordenadas SVG.

### Mesa de ayuda (`/tickets`)

Si hay tickets abiertos fuera de SLA, lo primero de la página es una **franja roja de aviso** con
el conteo, que enlaza a `?status=abiertos`. Su número se calcula en el servidor sobre los tickets
ya cargados —sin consulta extra— y **siempre refleja el total global**, no lo que estés filtrando:
es una alerta, no una estadística de la vista.

Tabla con 9 columnas: `#`, Asunto, Solicitante, Empresa, Categoría, Prioridad, SLA, Creado, Estado.

- El **asunto** es un botón que abre el diálogo de detalle vía `?ticket=N`.
- **Solicitante** y **Estado** son selects que guardan al instante, sin abrir nada.
- La columna **SLA** muestra un chip: `Cumplido` / `Fuera de SLA` para cerrados;
  `Vence en Xh` / `Vencido Xh` para abiertos (ámbar si quedan ≤ 2 h, rojo si ya venció).
- Cinco filtros combinables arriba, todos por URL.

**Diálogo de detalle** (`TicketDetailDialog`): formulario completo de edición (asunto, descripción,
empresa, categoría, prioridad, solicitante) + insignia de SLA + **tiempo de resolución**
(`<TicketResolutionTime>`, agregado 2026-08-28 — automático o manual, ver §5.9) + hilo de
comentarios con autor y fecha + desplegable "💬 Insertar respuesta rápida…" que rellena el área de
comentario al vuelo, sin ida y vuelta al servidor.

### Rutas de trabajo (`/rutas`)

Iniciativas agrupadas por empresa, en tarjetas de dos columnas. Cada tarjeta tiene título, área,
responsable, select de estado, botón ✕ para eliminarla, barra de avance (tareas hechas / totales)
y su checklist.

El **título de la ruta es editable en línea** (`InitiativeTitle`): se ve como texto normal, se
subraya al pasar el ratón y se convierte en campo al hacer clic. Enter confirma, Escape revierte,
vacío revierte. Guarda al perder el foco vía `updateInitiativeTitle`.

Cada tarea permite: marcar/desmarcar, **editar el título en línea** (mismo comportamiento),
**borrar** (con confirmación) y **reordenar**. El reordenamiento es optimista en el cliente y se
persiste con `reorderTasks`, que reescribe la columna `position` de forma secuencial.

**Reordenar tiene dos mecanismos según el dispositivo**, y esto es deliberado: en escritorio se
arrastra por el tirador `⠿`; en pantallas de ≤760 px ese tirador se oculta y aparecen botones ▲▼.
La razón es que **la API de arrastrar-soltar de HTML5 no funciona con eventos táctiles** — sin los
botones, reordenar sería imposible en móvil. Ambos caminos llaman a la misma función `persist()`.

### Configuración (`/config`)

Dos tarjetas en fila: **Empresas** (nombre + color, editable) y **Categorías & SLA** (nombre —
editable desde 2026-08-27 vía `updateCategory` — + horas objetivo). Debajo, a todo lo ancho,
**Colaboradores** (nombre, empresa, correo y celular, todos editables vía `updateCollaborator`;
correo y celular son opcionales) y **Respuestas rápidas** (título + texto).

**Colaboradores salió del grid de 3 columnas el mismo día que se agregó** (2026-08-27, misma
tanda): con nombre + empresa + correo + celular + dos botones, una tarjeta de 1/3 de página
(~300px) no alcanzaba — cada campo terminaba en su propia línea, una fila por colaborador podía
ocupar 3-4 líneas de alto con 17 colaboradores. La sección pasó a ser de ancho completo, con el
mismo patrón que ya usaba **Respuestas rápidas** (`.section-title` + `.card` fuera del grid), en
vez de inventar un layout nuevo — con eso todos los campos caben en una sola fila.

Salvaguarda: una empresa solo se puede borrar si no tiene tickets, colaboradores ni rutas
asociadas — `deleteCompany` cuenta las tres cosas y sale sin hacer nada si encuentra alguna.

---

## 12. Trabajo pendiente

> **La lista completa y priorizada está en `CONTINUIDAD.md`, sección §3.bis** (P0 a P11).
> Aquí queda el detalle técnico de los puntos relacionados con alertas y seguridad.

### Alertas — siguientes niveles

El **Nivel 1 está implementado** (insignia en el menú + franja en la bandeja, §11). Quedan dos
niveles posibles, ninguno pedido todavía:

**Nivel 2 — Resumen diario por correo.** Un Vercel Cron Job definido en `vercel.json` que llame a
un endpoint (`/api/cron/alertas`) y envíe el correo con Resend (capa gratuita: 3.000 correos/mes).
Coste: gratis, ~3 horas, requiere dar de alta una API key de Resend. **Limitación real: el plan
Hobby de Vercel solo permite cron con frecuencia diaria** — para avisos por hora hace falta Pro
(20 USD/mes). Sería el primer `/api/` del proyecto, que hasta ahora no tiene ninguno.

**Nivel 3 — Tiempo real (WebSockets o push del navegador).** Desproporcionado para un sistema de un
solo usuario. No recomendado.

**Alertas para rutas de trabajo — ✅ resuelto en parte (2026-08-25).** `initiatives` ya tiene
columna `due_date`, editable desde la tarjeta (`<InitiativeDueDate>`) y en el diálogo de alta. Cada
ruta muestra un chip "Atrasado Xd" / "Vence en Xd" calculado en el cliente (`dueInfo()` en
`app/rutas/page.tsx`), sin insignia en el menú lateral — eso seguiría el mismo patrón que las
alertas de SLA de tickets (§11) si se pide más adelante.

### Limitación de fondo, no planteada aún por el usuario

El sitio **no tiene autenticación**. Cualquiera con la URL puede leer y modificar todo. Hoy es
tolerable porque lo usa una sola persona y la URL no está publicada, pero si algún día entra más
gente del grupo hay que resolverlo antes. Vercel Password Protection es de pago; alternativas
gratuitas: Auth.js, o un middleware con Basic Auth.

---

## 13. Reglas para quien continúe este proyecto

Estas convenciones se establecieron a lo largo del desarrollo. Respétalas para que el proyecto
siga siendo coherente:

1. **Español en toda la interfaz.** Sin excepciones.
2. **Nada se codifica en duro si el usuario podría querer cambiarlo.** Empresas, categorías,
   colaboradores, SLA y plantillas van en la base de datos y se editan desde `/config`.
3. **Sin dependencias nuevas** salvo necesidad real y justificada. Nada de librerías de UI,
   de gráficos ni de CSS.
4. **Todo el CSS va en `app/globals.css`**, con las variables de `:root`. Nada de CSS-in-JS,
   nada de módulos CSS, nada de estilos en línea salvo valores calculados (anchos de barra,
   colores de empresa que vienen de la base).
5. **Las mutaciones son Server Actions**, siempre con el patrón de cinco pasos de §5.2 y siempre
   con `revalidatePath` de las rutas afectadas.
6. **Los cambios de esquema van en `ensureSchema()`** y tienen que ser idempotentes.
7. **Los cambios en el cálculo de SLA se hacen en los dos sitios** (TypeScript y SQL) — §5.6.
8. **Compila (`npm run build`) antes de desplegar, y despliega el árbol completo** — §10.
9. **Verifica en la URL de producción, no en la API de despliegues de Vercel**, que da 404 — §10.
10. **Los números y datos se muestran en fuente mono con `tabular-nums`** — §8.

---


---

## 14. Registro de cambios

Cada entrada corresponde a una tanda de cambios pedida por el usuario. Mantener este registro
al día es parte del trabajo: es lo que permite reconstruir *por qué* el sistema es como es.

### 28 de agosto de 2026 — Zona horaria de RD + tiempo de resolución de tickets

El usuario pidió poder asignar cuánto tardó un ticket en resolverse, con dos modos: manual o
según "el reloj mundial... Dominican Republic, UTC-4". Esa frase fue la pista de un bug real, no
solo el pedido de una función nueva.

**El bug (encontrado antes de escribir nada, por inspección de código):** `app/tickets/page.tsx`,
`app/page.tsx` y `components/TicketDetailDialog.tsx` formateaban las fechas con
`getUTCDate()`/`getUTCHours()` sobre timestamps que son instantes UTC reales (`TIMESTAMPTZ` en
Postgres) — es decir, mostraban la hora UTC etiquetada como si fuera hora local. Verificado con
Node: `2026-08-28T20:54:00Z` (20:54 UTC) formateado con `Intl.DateTimeFormat` y
`timeZone: "America/Santo_Domingo"` da **16:54**, la hora real en RD. La app mostraba "20:54" en
vez de "16:54" — 4 horas adelantada, todo el tiempo, en cada fecha de toda la aplicación.

- **`lib/dates.ts` (nuevo):** única fuente de conversión de fecha/hora del proyecto, ver §5.8.
  `fmtDateDR`, `fmtDateTimeDR`, `drDayMonth`, `drYear` reemplazan la aritmética manual de UTC en
  los tres archivos de arriba.
- **Tiempo de resolución (§5.9):** `tickets.resolution_minutes` (INT, nullable) guarda un override
  manual en minutos. `autoResolutionMinutes()` calcula `resolved_at - created_at` cuando es
  `NULL` — esta resta es una duración entre dos instantes, así que da el mismo resultado sin
  importar la zona horaria de visualización (la zona horaria solo afecta *cuándo* se muestra que
  pasó algo, no *cuánto* duró).
- **`components/TicketResolutionTime.tsx` (nuevo):** en `TicketDetailDialog`, radio Automático /
  Manual + inputs de horas y minutos para el modo manual. Nueva Server Action
  `updateTicketResolutionTime`.
- Verificado con Node antes de desplegar que `Intl.DateTimeFormat` soporta
  `America/Santo_Domingo` en el runtime (usa datos ICU del propio Node, no una librería nueva —
  sigue la regla de "sin dependencias nuevas").

### 27 de agosto de 2026 (tanda 4) — Validación de la conexión con Vercel (sin cambios de código)

El usuario pidió validar la conexión con Vercel. Se probó el MCP de Vercel de punta a punta:
`list_teams` → equipo `helpdesk10`; `get_git_deployment_context` → confirma `mesa-ti-grupo`
enlazado a `soporteit-a11y/mesa-ti-grupo` en GitHub; `list_projects` y `get_project` → devuelven
el proyecto con su `latestDeployment` en `READY`; `list_deployments` → los últimos ~10 despliegues
de esta sesión, todos `READY`, cada uno con el `githubCommitSha` exacto del commit correspondiente;
`get_deployment` sobre el ID del último → coincide con el commit recién pusheado
(`539c7e9...`, el fix de categorías de la tanda 3) y `readyState: "READY"`.

**Se corrigió una nota desactualizada** (§10 de este documento y §5.2 de CONTINUIDAD.md): decían
que `get_deployment`/`get_deployment_build_logs`/`get_project` daban 404 para este proyecto. Ya
no es así — probablemente cambió algo del lado del token del MCP o de Vercel entre el 24-ago y
hoy. La recomendación de seguir verificando también contra la URL pública se mantiene, porque no
depende de ningún token.

Ningún archivo de código cambió en esta tanda — solo la corrección de estas dos notas.

### 27 de agosto de 2026 (tanda 3) — Categorías desincronizadas al crear ticket + auditoría completa

El usuario reportó que categorías que había quitado o modificado en `/config` seguían saliendo
al crear un ticket nuevo, y pidió validar que **todas** las acciones estuvieran sincronizadas, no
solo categorías.

**La causa:** `components/NewTicketDialog.tsx` combinaba la lista de categorías de la BD con
`TICKET_CATEGORIES`, una lista de 10 nombres grabada en `lib/priority.ts` desde el import inicial
del CSV (§14, entrada "Antes del 24 de agosto"). Esa lista nunca se tocó desde entonces, así que:
categorías borradas en `/config` seguían ofreciéndose (venían de la lista fija, no de la BD), y
"Flota (Tablets)" (el nombre original, hoy renombrado a "Flota - Tablets / Celulares") seguía
apareciendo como opción fantasma. `TICKET_CATEGORIES` se eliminó de `lib/priority.ts`;
`NewTicketDialog` ahora solo recibe `cats.map(c => c.name)` — categorías reales de la BD, sin
mezclar nada (§11 de este documento, sección `app/tickets/page.tsx`, explica por qué `/tickets`
mantiene **dos** listas de categorías a propósito: `categories`, unión con categorías históricas
de tickets viejos, solo para el filtro; y `cats` a secas, solo de la BD, para crear/editar).

**Auditoría del resto del sistema** (lo que pidió el usuario explícitamente): se revisaron todos
los `import ... from "@/lib/priority"` del proyecto y todo uso de listas de opciones en
formularios. `TICKET_CATEGORIES` era el único caso de una lista fija mezclada con datos de la
BD — no se encontró ningún otro. Lo demás que está "hardcoded" en el código (`STATUSES` /
`STATUS_LABEL`, `INITIATIVE_STATUSES` / `INITIATIVE_STATUS_LABEL`, prioridad Alta/Media/Baja) es
correcto que lo esté: son enumeraciones fijas del negocio, no hay ninguna pantalla en `/config`
que las edite, así que no hay nada con lo que puedan desincronizarse. Empresas, colaboradores,
categorías (para editar) y respuestas rápidas ya se leían directo de la BD en cada pantalla donde
aparecen — sin ninguna lista intermedia fija.

### 27 de agosto de 2026 (tanda 2) — Colaboradores sale del grid de 3 columnas

El usuario reportó que "el cuadro de colaboradores se dañó" tras la tanda 1 del mismo día. Antes
de asumir nada se midió en vivo con `getBoundingClientRect()` sobre la fila de un colaborador en
producción: la tarjeta de Colaboradores medía **~300px** de ancho (1/3 del grid de 3 columnas),
pero el input de correo por sí solo ya medía 199px y el de celular 163px — ni sumando nombre +
empresa + botones cabía nada en una sola línea. El `flex-wrap` que se había puesto sí evitaba que
algo se recortara, pero el resultado visual era una fila de 3-4 líneas de alto por colaborador,
con 17 colaboradores en la lista: se veía roto aunque técnicamente no lo estaba (los valores en
el HTML servido eran correctos, se verificó con `curl` antes de tocar nada).

El usuario aprovechó para pedir que además de arreglarse, esta sección se piense como **"todos
los usuarios o perfiles del sistema"**, no como una lista secundaria de tickets. Cambio:

- `app/config/page.tsx`: el grid superior pasa de `grid g3` (Empresas, Categorías, Colaboradores)
  a `grid g2` (Empresas, Categorías). **Colaboradores se saca del grid** y pasa a ser su propia
  sección de ancho completo, con el mismo patrón que ya usaba Respuestas rápidas
  (`.section-title` + `<div className="card cfg-card">` fuera del grid) — se reusó un patrón que
  ya existía en la misma página en vez de inventar uno nuevo.
- `app/globals.css`: `.cfg-contact-input` sube su `min-width` de 110px a 150px; nueva regla
  `.cfg-edit-collab .cfg-name-input { flex: 1.4; min-width: 170px }` para que el nombre tenga más
  peso relativo que el resto de los campos. Con el ancho completo de la página (agrandado en la
  tanda 1 de hoy, §14) todos los campos caben ahora en una sola fila.
- No se tocó el modelo de datos ni las Server Actions — el problema era enteramente de layout.

### 27 de agosto de 2026 (tanda 1) — Ancho completo, empresa→tickets, editar categorías y colaboradores

Cuatro pedidos en un mismo mensaje. Antes de tocar CSS se creó y empaquetó una skill personal del
usuario, **`visual-design-changes`** (fuera de este repo, en su perfil de Claude), con un
organigrama de decisión para cambios visuales: reusar un patrón existente antes que inventar uno,
revisar todos los breakpoints afectados (no solo el que se está agregando), compilar, y verificar
en navegador — datos reales y vacíos, cada ancho de pantalla afectado — antes de dar por hecho el
cambio. Se siguió ese orden para los cuatro pedidos de esta tanda.

**1. Responsive de pantalla completa.** Medido en vivo con el DevTools del navegador antes de
tocar nada: a 2560px de viewport, `.content` (`max-width: 1320px`) + `.sidebar` (`244px`) sumaban
apenas 1564px, dejando **~1000px muertos** a los lados; a 1920px (resolución muy común) sobraban
~356px. `app/globals.css`: `.content` sube de `1320px` a `1600px`, con un segundo salto a
`1900px` desde `@media (min-width: 1900px)` para monitores aún más anchos. Los diálogos
(`dialog.ticket-detail`, `640px`; el resto, `560px`) y la pantalla de `<Setup>` (`720px`)
**no se tocaron a propósito** — son elementos que deben quedarse angostos y centrados aunque la
pantalla sea enorme, estirarlos habría sido el error exacto que la skill nueva existe para evitar.
Los breakpoints angostos (mobile/tablet, §8) ya estaban bien y no se modificaron.

**2. El gráfico "Tickets por empresa" enlaza a la bandeja filtrada.** `app/page.tsx`: cada fila del
panel pasa de `<div className="catbar">` a `<Link href="/tickets?company=<nombre>">`. No hizo
falta tocar `/tickets` — ya filtraba por `?company=` desde antes (§5.7), usado también por
`/rutas`. CSS nueva: `.catbar-link` (mismo hover que otros elementos clicables del sistema, fondo
`--surface-2`).

**3. Colaboradores editables, con correo y celular.** `lib/db.ts`: `collaborators.email` y
`collaborators.phone`, columnas opcionales. Nueva Server Action `updateCollaborator`;
`createCollaborator` gana los mismos dos campos. `/config`: la fila de colaborador pasa de texto
fijo a un formulario editable (nombre, empresa, correo, celular), siguiendo el mismo patrón de
`updateCompany` (fila = formulario con botón ✓) que ya existía para Empresas — no se inventó un
patrón nuevo de edición.

**4. Categorías editables.** Nueva Server Action `updateCategory`. Antes solo se podían crear y
borrar (el SLA sí era editable vía `<SlaInput>`, el nombre no). Mismo patrón de fila-formulario
que Empresas y Colaboradores. **La deuda técnica de fondo no cambió** (§6, P7): `tickets.category`
sigue siendo texto libre, así que renombrar una categoría todavía deja huérfanos a los tickets
viejos con el nombre anterior — ahora es más fácil hacerlo por accidente desde la interfaz, así
que vale la pena tenerlo presente.

### 26 de agosto de 2026 (tanda 2) — Presets de período en el dashboard

**Motivo del usuario:** el texto "📅 PERIODO" mostraba el mínimo/máximo real de `created_at`
entre los tickets (ej. "25 MAY – 25 AGO 2026"), que solo avanzaba cuando entraba un ticket nuevo
— lo percibía como "estático" y quería que reflejara un período que él elige, no los datos.

- `components/DateRangeFilter.tsx`: nuevos botones de preset **Todo / Hoy / 3 días / 1 semana /
  1 mes**, calculados con `new Date()` en el cliente (por eso "Hoy" avanza solo, sin tocar el
  servidor). Los campos manuales **Desde/Hasta** de siempre siguen ahí para un rango
  personalizado — no hubo que agregar un modo "personalizado" aparte, editar esos campos ya lo es.
  Internamente siguen siendo los mismos parámetros de URL `?from=&to=`, sin estado nuevo.
- `app/page.tsx`: nuevo `periodLabel` — muestra "Todo el historial" sin filtro, o las fechas
  exactas del filtro activo (`fmtYMD()`) cuando hay uno. Reemplaza el uso de
  `fmtPeriod(d.minDate, d.maxDate)` en el encabezado (esa función se conserva, pero solo para la
  frase del panel "Resumen", que sí describe los datos filtrados).
- `app/page.tsx`: la frase "Todos los tickets del período ... fueron atendidos" se oculta si
  `d.total === 0` (ej. al filtrar "Hoy" antes de que entre el primer ticket del día) y se
  reemplaza por "No hay tickets registrados en este período."
- `app/globals.css`: `.daterange-wrap`, `.dr-presets` y `.btn.active` (botón de preset resaltado
  en verde cuando coincide con el `from`/`to` actual de la URL).
- **No se cambió el comportamiento por defecto:** sin filtro, el dashboard sigue mostrando todo
  el historial (88 tickets), igual que antes — no se forzó "Hoy" como default porque eso ocultaría
  el resumen general que el usuario revisa a diario.

### 26 de agosto de 2026 (tanda 1) — Logo real de Droppett (sidebar + favicon)

- El usuario pegó una captura del logo de Droppett (ícono de wifi + nube, wordmark "DROPPETT"),
  pero la imagen tenía de fondo el papel rayado de la app de origen y las marcas de selección
  (handles) alrededor, así que no era usable directamente.
- **Limpieza de la imagen:** sin herramientas de edición de imágenes instaladas en la máquina
  (no hay ImageMagick ni Python/Pillow), se procesó en el navegador con un `<canvas>`: se
  clasificó cada píxel como "tinta" (oscuro y neutro, sin saturación) o fondo, se agruparon los
  píxeles de tinta en componentes conexas y se descartaron las componentes pequeñas (los handles
  de selección, que quedan aislados del trazo real del logo). Con eso se generaron cuatro
  variantes: ícono solo / logo completo (ícono+wordmark), cada uno en negro y en blanco.
- **Assets nuevos en `public/`** (carpeta creada en este cambio): `droppett-logo.png` (completo,
  blanco), `droppett-icon.png` (solo ícono, negro) y `droppett-icon-white.png` (solo ícono,
  blanco — el que se usa en el sidebar, porque un trazo negro es invisible sobre el navy oscuro
  de fondo).
- `app/layout.tsx`: el badge cuadrado del sidebar (antes texto "TI" sobre fondo verde) ahora
  muestra `droppett-icon-white.png`. Se mantiene el texto "MESA TI / Grupo empresarial" al lado —
  no se reemplazó, porque esta herramienta sirve a las cuatro empresas del grupo, no solo a
  Droppett.
- `app/globals.css`: `.brand .logo` pasa de estilos de texto (`font-family`, `color`, etc., para
  las letras "TI") a estilos de imagen (`object-fit: contain`, `padding`), conservando el fondo
  verde y el halo (`box-shadow`) del badge original.
- `app/icon.png`: nuevo archivo (convención de Next.js App Router — cualquier `icon.png` dentro de
  `app/` se sirve automáticamente como favicon). Usa la variante negra del ícono, porque la
  mayoría de navegadores muestran la pestaña sobre fondo claro por defecto.
- Verificado en local (`npm run dev`): el badge se ve correctamente en el sidebar y
  `<link rel="icon" href="/icon.png">` aparece en el `<head>` servido.

### 25 de agosto de 2026 (tanda 4) — Centrar el contenido en pantallas anchas

- `app/globals.css`: `.content` gana `margin: 0 auto`. El usuario reportó (con captura) que en
  monitores anchos el contenido quedaba pegado a la izquierda, dejando una franja vacía enorme a
  la derecha — `.content` tiene `max-width: 1320px` pero `.main` (flex column) no centraba un
  hijo más angosto que el contenedor por defecto. Con el margen automático, el bloque se centra
  en el espacio disponible junto al sidebar en vez de quedar pegado a un lado.

### 25 de agosto de 2026 (tanda 3) — Fecha límite en rutas, limpieza de esquema, panel por empresa

Cambios pedidos por el usuario después de revisar el registro de pendientes P0–P11: se resolvieron
P3, P6 y P8; se agregó además el panel de tickets por empresa en el dashboard (pedido aparte).

**1. P3 · Fecha límite en rutas de trabajo**
- `lib/db.ts`: `initiatives.due_date DATE`, agregada con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- `lib/data.ts`: `getInitiatives()` selecciona `i.due_date`; el tipo `Initiative` lo incluye.
- `app/actions.ts`: `createInitiative` acepta `due_date`; nueva Server Action
  `updateInitiativeDueDate`.
- Nuevo componente `components/InitiativeDueDate.tsx` — mismo patrón "auto-enviar al cambiar" que
  `StatusControl`, guarda con `onChange` + `requestSubmit()`.
- `components/NewInitiativeDialog.tsx`: campo "Fecha límite" junto a "Responsable" en un `row2`.
- `app/rutas/page.tsx`: función `dueInfo()` calcula si la ruta está atrasada (`due_date` en el
  pasado y `status !== 'completado'`) o próxima a vencer (≤ 7 días), y pinta un chip `sla-chip`
  (reutilizando las clases `crit`/`warn`/`ok` del SLA de tickets) junto al selector de fecha.
- CSS: `.init-due-row`, `.init-due-form`, `.init-due-input`.
- **Alcance deliberado:** no se agregó insignia en el menú lateral para rutas atrasadas — el chip
  vive solo en la tarjeta de la ruta. Ver §12.

**2. P6 · Fórmula de SLA unificada en SQL**
- `lib/db.ts`: nueva función SQL `ticket_sla_deadline(created_at, sla_hours, priority)`, creada con
  `CREATE OR REPLACE FUNCTION ... LANGUAGE sql IMMUTABLE` dentro de `ensureSchema()`.
- `lib/data.ts`: `getAlertCounts()` y `getSupportDashboard()` ahora llaman a
  `ticket_sla_deadline(...)` en vez de repetir el `CASE t.priority WHEN 'Alta' THEN 0.5 ...` cada
  una. La fórmula pasa de estar triplicada (TS + 2 sitios SQL) a estar en dos sitios (TS + 1 función
  SQL) — §5.6.
- **Sin cambio de comportamiento:** los multiplicadores (`Alta=0.5, Media=1, Baja=1.5`) y el
  `COALESCE(..., 24)` son exactamente los mismos; solo se movió el cálculo a un solo lugar del lado
  SQL.

**3. P8 · Limpieza del modelo de priorización P1-P4 (sin uso)**
- `lib/priority.ts`: eliminados `PRIORITIES`, `Priority`, `PRIORITY_META`, `computeScore`,
  `levelFor`, `slaForLevel` — verificado que ningún archivo del proyecto los importaba.
- `lib/db.ts`: eliminada la tabla `services` (`DROP TABLE IF EXISTS`) y las columnas muertas de
  `tickets` (`urgency`, `impact`, `weight`, `score`, `service_id`, `assignee`, `sla_hours`), todas
  con `DROP COLUMN IF EXISTS`. La función de semilla `seedCompaniesServices` se renombra a
  `seedCompanies` y deja de insertar en `services`.
- `lib/data.ts`: eliminada `getServices()` (sin llamadores).
- Ejecuta en el primer request contra producción tras el despliegue, dentro del `ensureSchema()`
  de siempre — no requiere una migración manual aparte.

**4. Panel "Tickets por empresa" en el dashboard**
- `app/page.tsx`: nuevo panel en la columna 2, debajo de "Estado de tickets" (era el espacio que
  quedaba más corto que las columnas 1 y 3). Usa `d.byCompany`, que `getSupportDashboard()` ya
  calculaba pero ningún componente consumía todavía. Reutiliza las clases `.catbars`/`.catbar`, con
  la barra pintada del color de cada empresa (`c.color`) en vez del verde de marca fijo.

### 25 de agosto de 2026 (tanda 2) — Consolidación de pendientes

- `CONTINUIDAD.md` gana la sección **§3.bis · TODO LO PENDIENTE**: los 13 puntos abiertos del
  proyecto (P0–P11) en un solo sitio, ordenados por prioridad y con su motivo, su coste estimado
  y sus limitaciones reales. Petición del usuario antes de cambiar de cuenta.
- Se enlaza desde la cabecera del documento, desde la lista de traspaso (§7) y desde §12 del
  handoff, para que sea imposible pasarla por alto.
- **Corrección de un dato que se había dado mal:** el repositorio git accidental de
  `C:\Users\Diomelvis` se describió antes como un riesgo de tener `.ssh` versionado. Comprobado:
  tiene **0 archivos rastreados**, nada llegó a commitearse. El riesgo real es solo latente (un
  `git add -A` ejecutado ahí por error). Queda como P9.

### 25 de agosto de 2026 (tanda 1) — Documento de continuidad

- Nuevo **`CONTINUIDAD.md`**: punto de entrada para retomar el proyecto desde otra cuenta o con
  otra IA. Recoge lo que este documento no cubre: las reglas de trabajo que puso el usuario, el
  estado exacto al cerrar sesión, las trampas del entorno (credencial cruzada de GitHub, APIs de
  Vercel que dan 404, el peligro de la clave `tickets_seed`) y la advertencia de que **los datos
  reales viven en Neon, no en el repositorio**.
- `app/layout.tsx`: el `catch` del contador de avisos pasa a registrar el error con
  `console.error`. Antes era un `catch` vacío, lo que hacía que un fallo de la consulta fuese
  indistinguible de "no hay nada vencido" — es decir, las alertas podían dejar de avisar en
  silencio. Ahora queda en los logs de Vercel.

### 24 de agosto de 2026 (tanda 3) — Contador de avisos de SLA y git operativo

**1. Contador de vencidos** *(petición del usuario; es el "Nivel 1" del análisis de alertas)*
- `lib/data.ts`: nueva `getAlertCounts()`, con un CTE `abiertos` que calcula la fecha límite de
  cada ticket abierto y devuelve dos cifras: `breached` (ya vencidos) y `dueSoon` (vencen en
  menos de 2 h).
- `app/layout.tsx`: pasa a ser **Server Component asíncrono** para poder consultar el contador.
  La llamada va protegida con `if (hasDb)` + `try/catch` — sin eso, un fallo de base de datos
  dejaría en blanco toda la aplicación en lugar de una sola página.
- `components/NavLink.tsx`: props nuevas `badge` y `badgeWarn`. Roja si hay vencidos, ámbar si
  solo hay próximos a vencer, nada si no hay riesgo. Incluye texto para lectores de pantalla.
- `app/tickets/page.tsx`: franja de aviso roja enlazada a `?status=abiertos`. Su conteo se
  calcula sobre los tickets ya cargados, sin consulta adicional, y es global (no depende de los
  filtros activos).
- CSS: `.nav-badge`, `.alert-bar` y utilidad `.sr-only`. En móvil la insignia pierde el
  `margin-left: auto` para no romper el centrado del menú.
- **Efecto colateral a vigilar:** la fórmula de SLA pasa de estar duplicada a estar **triplicada**
  (§5.6). Es la deuda técnica más propensa a incoherencias del proyecto.

**2. Despliegue por git, ya operativo**
- Repositorio `soporteit-a11y/mesa-ti-grupo` (privado) creado y enlazado al proyecto de Vercel.
- Hubo que resolver un cruce de credenciales: Git Credential Manager tenía guardada la cuenta
  `aiportal-dev`, sin permiso sobre este repositorio. Se resolvió incrustando el usuario en la
  URL del remoto y activando `credential.useHttpPath`, **sin borrar** la credencial de la otra
  cuenta, que el usuario emplea en otros proyectos (§10).
- Secuencia de configuración en Vercel, por si hay que repetirla: Login Connection de GitHub →
  instalar la app de Vercel en el repositorio → enlazar desde *Settings → Git* del proyecto.
  Este último paso **solo se puede hacer desde el panel**: la API únicamente permite crear
  proyectos nuevos, y devuelve `409 Project already exists` con uno existente.
- Aprendizaje: **conectar el repositorio no despliega lo que ya existe.** Vercel espera al
  siguiente push. Hizo falta un commit nuevo para arrancar el primer despliegue.

**3. Limpieza**
- Eliminado `components/TaskToggle.tsx`, huérfano desde que lo sustituyeron `TaskItem` +
  `TaskList`. Verificado sin importadores antes de borrarlo.

### 24 de agosto de 2026 (tanda 2) — Títulos editables, responsive y repositorio git

**1. Títulos de las rutas editables** *(petición del usuario)*
- Nuevo componente `components/InitiativeTitle.tsx`, con el mismo patrón de edición en línea
  que `TaskItem`: Enter confirma, Escape revierte, vacío revierte, guarda al perder el foco.
- Nueva Server Action `updateInitiativeTitle` en `app/actions.ts`.
- `app/rutas/page.tsx`: el `<div className="init-title">` estático se sustituye por el
  componente; el contenedor pasa a `.init-head` para poder encoger sin romper la fila.
- CSS: `.init-head`, `.init-title-form`, `.init-title-input` con estados hover y focus.

**2. Diseño responsive completo** *(petición del usuario)*
- `app/layout.tsx`: se exporta `viewport` (`width=device-width`, `initialScale: 1`,
  `themeColor`). **Sin esto nada de lo demás funciona en móvil.**
- `app/layout.tsx`: los cuatro enlaces se envuelven en `<nav className="sidebar-nav">` para
  poder reorganizarlos como grilla en pantallas pequeñas.
- `app/tickets/page.tsx`: cada `<td>` recibe un atributo `data-label`, que alimenta las
  etiquetas del modo tarjeta en móvil.
- `app/globals.css`: bloque `RESPONSIVE` nuevo al final del archivo, con 7 puntos de quiebre
  (§8). Lo más notable: la tabla de tickets se convierte en tarjetas apiladas por debajo de
  760 px, y la barra lateral pasa a cabecera horizontal por debajo de 820 px.
- `components/TaskList.tsx`: función `move(index, dir)` y botones ▲▼, porque **arrastrar y
  soltar de HTML5 no funciona en pantallas táctiles**. Los botones solo se ven en móvil; el
  tirador de arrastre se oculta ahí. Ambos caminos reutilizan `persist()`.

**3. Alertas y notificaciones** *(pregunta del usuario)*
- No se implementó nada: era una consulta de viabilidad. El análisis completo, con costes,
  límites del plan Hobby y la carencia de `due_date` en `initiatives`, está en §12.

**4. Repositorio git** *(consecuencia de un límite encontrado al desplegar)*
- `git init` propio dentro de `helpdesk/`, con `.gitignore` que excluye `node_modules`,
  `.next`, `.env*` y `.vercel`. Commit inicial `c381bd1`, 37 archivos.
- Motivo: al intentar desplegar por árbol de archivos se descubrió que el proyecto ya supera
  el volumen que una IA puede enviar en una sola operación (§10). El despliegue por git deja
  de ser una mejora opcional y pasa a ser la vía necesaria.
- **Nota:** antes de esto, la carpeta del proyecto quedaba dentro de un repositorio git
  accidental que abarcaba todo `C:\Users\Diomelvis` (incluido `.ssh`). El repositorio nuevo es
  independiente; conviene revisar y eliminar aquel repositorio accidental del directorio de
  usuario.

### Antes del 24 de agosto de 2026

Historial reconstruido a partir del estado del código; las fechas exactas no quedaron registradas.

- Sistema inicial: dashboard, mesa de ayuda y rutas de trabajo, con tema oscuro y datos de ejemplo.
- Importación de 68 tickets reales desde un CSV de Zoho Desk, sustituyendo los de ejemplo
  (protegido por la clave `tickets_seed` de la tabla `meta`).
- Página de configuración: empresas, categorías y colaboradores pasan a ser editables desde la
  interfaz en lugar de estar en el código.
- Diálogo de detalle de ticket: edición completa después de crearlo, más hilo de comentarios
  (antes el comentario inicial se capturaba al crear y ya no era accesible).
- Filtro por rango de fechas en el dashboard.
- Corrección del centrado del texto en las donas (dos intentos; la solución buena es flexbox
  superpuesto, no coordenadas SVG).
- SLA configurable por categoría con multiplicador por prioridad, chip por ticket y KPI
  "Fuera de SLA" en el dashboard.
- Respuestas rápidas: tabla propia, CRUD en configuración e inserción con un clic al comentar.
- Tareas de rutas editables y eliminables (antes solo se podían marcar).
- Reordenar tareas arrastrando y eliminar rutas completas.

---

## 15. Código fuente completo

Todo lo que sigue es el contenido íntegro y literal de los archivos del proyecto, tal como están
en producción a la fecha de la última actualización. Con esto y las secciones anteriores, el
proyecto se reconstruye desde cero sin necesitar nada más.

---

## 15.1 Configuración del proyecto

### `package.json`

Dependencias exactas. No añadir nada sin justificación.

```json
{
  "name": "helpdesk-grupo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@neondatabase/serverless": "0.9.5",
    "next": "14.2.35",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "20.16.11",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "typescript": "5.6.3"
  }
}
```

### `next.config.mjs`

Ignora errores de TypeScript y ESLint en el build a propósito, para que un aviso de tipos no tumbe un despliegue.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
```

### `tsconfig.json`

Lo relevante: el alias `@/*` apunta a la raíz del proyecto y `strict` está en `false`.

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next-env.d.ts`

Generado por Next.js. No editar.

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
```

### `.gitignore`

Excluye dependencias, artefactos de build y **las variables de entorno** — la cadena de Postgres nunca debe llegar al repositorio.

```text
# dependencias
/node_modules

# build de Next.js
/.next
/out

# variables de entorno (NUNCA subir: contienen la cadena de Postgres)
.env
.env.local
.env*.local

# Vercel
.vercel

# sistema
.DS_Store
Thumbs.db
*.log
npm-debug.log*
```

---

## 15.2 Capa de datos (`lib/`)

### `lib/db.ts`

**El archivo más importante del proyecto.** Conexión a Postgres, `ensureSchema()` idempotente con las 8 tablas activas (la novena, `services`, fue eliminada — ver §5.6bis y §14), migraciones controladas por la tabla `meta`, la función SQL `ticket_sla_deadline()` y las cuatro funciones de semilla.

```ts
import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

export const hasDb = Boolean(connectionString);
export const sql = connectionString ? neon(connectionString) : null;

let schemaPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) return Promise.reject(new Error("NO_DB"));
  if (!schemaPromise) schemaPromise = init(sql);
  return schemaPromise;
}

async function init(q: NonNullable<typeof sql>) {
  await q`CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT, color TEXT
  )`;
  await q`CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    company_id INT REFERENCES companies(id),
    category TEXT,
    priority TEXT,
    status TEXT NOT NULL DEFAULT 'resuelto',
    requester TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution_minutes INT
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiatives (
    id SERIAL PRIMARY KEY, company_id INT REFERENCES companies(id),
    title TEXT NOT NULL, area TEXT, status TEXT NOT NULL DEFAULT 'planificado', owner TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiative_tasks (
    id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT false, position INT NOT NULL DEFAULT 0
  )`;
  await q`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`;
  await q`CREATE TABLE IF NOT EXISTS collaborators (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, company_id INT REFERENCES companies(id),
    email TEXT, phone TEXT
  )`;
  await q`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sla_hours INT DEFAULT 24
  )`;
  await q`CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
    author TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS canned_responses (
    id SERIAL PRIMARY KEY,
    title TEXT UNIQUE NOT NULL,
    text TEXT NOT NULL
  )`;

  // Migracion para BD existente (tickets antiguos con columnas NOT NULL)
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category TEXT`;
  await q`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 24`;
  await q`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS due_date DATE`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS email TEXT`;
  await q`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS phone TEXT`;
  await q`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_minutes INT`;
  try { await q`ALTER TABLE tickets ALTER COLUMN priority DROP NOT NULL`; } catch (e) {}

  // Limpieza de columnas y tabla del modelo de priorizacion P1-P4, ya sin uso (2026-08-25).
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS urgency`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS impact`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS weight`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS score`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS service_id`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS assignee`;
  await q`ALTER TABLE tickets DROP COLUMN IF EXISTS sla_hours`;
  await q`DROP TABLE IF EXISTS services`;

  // Formula unica de SLA (antes triplicada: aqui, en getSupportDashboard y en
  // getAlertCounts). Cambiar los multiplicadores aqui Y en PRIORITY_SLA_MULT
  // (lib/priority.ts), que es la version usada para pintar cada ticket en el cliente.
  await q`
    CREATE OR REPLACE FUNCTION ticket_sla_deadline(p_created_at TIMESTAMPTZ, p_sla_hours INT, p_priority TEXT)
    RETURNS TIMESTAMPTZ AS $$
      SELECT p_created_at + (
        COALESCE(p_sla_hours, 24) * (CASE p_priority WHEN 'Alta' THEN 0.5 WHEN 'Baja' THEN 1.5 ELSE 1 END)
      ) * INTERVAL '1 hour'
    $$ LANGUAGE sql IMMUTABLE`;

  const c = await q`SELECT COUNT(*)::int AS n FROM companies`;
  if (c[0].n === 0) await seedCompanies(q);

  const i = await q`SELECT COUNT(*)::int AS n FROM initiatives`;
  if (i[0].n === 0) await seedInitiatives(q);

  const cc = await q`SELECT COUNT(*)::int AS n FROM collaborators`;
  if (cc[0].n === 0) await seedCollaborators(q);

  const cat = await q`SELECT COUNT(*)::int AS n FROM categories`;
  if (cat[0].n === 0) await seedCategories(q);

  const cr = await q`SELECT COUNT(*)::int AS n FROM canned_responses`;
  if (cr[0].n === 0) await seedCanned(q);

  // SLA por defecto por categoria (una sola vez; luego editable en Configuracion).
  const slaVer = await q`SELECT v FROM meta WHERE k = 'category_sla_v1'`;
  if (slaVer.length === 0) {
    const defaults: [string, number][] = [
      ["Impresora", 8],
      ["Carpetas Compartidas", 8],
      ["Correo Electronico", 8],
      ["Hardware / Laptop", 24],
      ["Office / Apps", 24],
      ["Requerimiento de Compras", 72],
      ["Suministros / Cables", 24],
      ["Flota (Tablets)", 24],
      ["Red / Conectividad", 8],
      ["Camaras / CCTV", 24],
      ["Accesos / Permisos", 8],
      ["Otros", 24],
    ];
    for (const [name, h] of defaults) {
      await q`UPDATE categories SET sla_hours = ${h} WHERE name = ${name}`;
    }
    await q`INSERT INTO meta (k, v) VALUES ('category_sla_v1', '1') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }

  // Reemplaza los tickets de ejemplo por los tickets reales del CSV (una sola vez).
  const ver = await q`SELECT v FROM meta WHERE k = 'tickets_seed'`;
  if (ver.length === 0 || ver[0].v !== "csv-v1") {
    await q`DELETE FROM tickets`;
    await seedRealTickets(q);
    await q`INSERT INTO meta (k, v) VALUES ('tickets_seed', 'csv-v1') ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  }
}

async function seedCompanies(q: NonNullable<typeof sql>) {
  const companies: [string, string, string][] = [
    ["Droppett", "droppett", "#5A6BE0"],
    ["Gilligan", "gilligan", "#2AB6A4"],
    ["CMG", "cmg", "#E0A94A"],
    ["Shazam", "shazam", "#E0698A"],
  ];
  for (const [name, slug, color] of companies) {
    await q`INSERT INTO companies (name, slug, color) VALUES (${name}, ${slug}, ${color}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedCategories(q: NonNullable<typeof sql>) {
  const cats = [
    "Impresora",
    "Carpetas Compartidas",
    "Correo Electronico",
    "Hardware / Laptop",
    "Office / Apps",
    "Requerimiento de Compras",
    "Suministros / Cables",
    "Flota (Tablets)",
    "Red / Conectividad",
    "Camaras / CCTV",
    "Accesos / Permisos",
    "Otros",
  ];
  for (const name of cats) {
    await q`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedCanned(q: NonNullable<typeof sql>) {
  const list: [string, string][] = [
    ["Impresora sin papel/tinta", "Se verifico la impresora y se repuso el insumo (papel/tinta). Quedo operativa."],
    ["Reinicio de equipo", "Se realizo reinicio del equipo para liberar recursos y aplicar actualizaciones pendientes. Por favor confirmar si el problema persiste."],
    ["Carpeta compartida - reconectar", "Se verifico la sincronizacion de la carpeta compartida. Se recomienda cerrar sesion en la app de Drive/OneDrive y volver a iniciar sesion."],
    ["Acceso otorgado", "Se otorgo el acceso solicitado. Por favor validar que ya pueda ingresar correctamente."],
    ["Requerimiento enviado a compras", "Se genero la solicitud de compra correspondiente y se envio al area encargada para cotizacion."],
    ["Pendiente de repuesto/proveedor", "El caso esta en espera de repuesto o respuesta del proveedor. Se dara seguimiento y se notificara cualquier actualizacion."],
  ];
  for (const [title, text] of list) {
    await q`INSERT INTO canned_responses (title, text) VALUES (${title}, ${text}) ON CONFLICT (title) DO NOTHING`;
  }
}

async function seedRealTickets(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id;
  if (!cId("CMG")) return;

  // [titulo, empresa, categoria, prioridad, creado, cerrado]
  const rows: [string, string, string, string, string, string][] = [
    ["Ayuda configuracion de Google Chat", "Shazam", "Flota (Tablets)", "Baja", "2026-05-25 10:26", "2026-06-01 10:07"],
    ["Asistencia con AI", "Shazam", "Otros", "Baja", "2026-05-26 12:48", "2026-05-26 12:48"],
    ["Registrar en Control de Asistencia", "CMG", "Otros", "Baja", "2026-05-26 15:14", "2026-05-26 15:14"],
    ["Actualizacion de correo del ing Luis Lara CMG", "CMG", "Correo Electronico", "Baja", "2026-05-28 11:28", "2026-05-28 14:33"],
    ["Crear correo y carpeta compartida", "CMG", "Correo Electronico", "Media", "2026-05-25 16:30", "2026-05-25 16:32"],
    ["Control de TV", "CMG", "Otros", "Baja", "2026-05-26 10:03", "2026-06-25 10:36"],
    ["Papel para la impresora", "CMG", "Impresora", "Baja", "2026-05-27 15:38", "2026-05-27 15:40"],
    ["Asistencia con cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-05-29 11:52", "2026-05-29 11:52"],
    ["Mouse ergonomico", "CMG", "Requerimiento de Compras", "Baja", "2026-05-26 14:53", "2026-05-27 15:41"],
    ["Ayuda con desencriptar correo", "Droppett", "Otros", "Alta", "2026-05-27 15:39", "2026-05-27 15:41"],
    ["Gestionar 3 Tablet Dials 10", "Shazam", "Requerimiento de Compras", "Baja", "2026-05-27 16:38", "2026-05-28 14:29"],
    ["Configurar carpeta compartida", "CMG", "Otros", "Alta", "2026-05-28 16:07", "2026-05-28 16:16"],
    ["Quiere acceso a camaras del proyecto", "CMG", "Otros", "Baja", "2026-05-29 14:18", "2026-06-17 16:35"],
    ["Audio de la laptop", "Shazam", "Hardware / Laptop", "Baja", "2026-05-28 11:23", "2026-06-01 14:27"],
    ["Cotizar laptop e impresora con scanner", "Droppett", "Requerimiento de Compras", "Baja", "2026-05-28 14:38", "2026-06-05 10:33"],
    ["Cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-06-01 10:10", "2026-06-01 14:27"],
    ["Cotizar equipo nuevo", "CMG", "Requerimiento de Compras", "Baja", "2026-06-03 14:01", "2026-06-08 09:40"],
    ["Ayuda con Excel", "CMG", "Office / Apps", "Baja", "2026-06-08 14:19", "2026-06-08 14:19"],
    ["Cable HDMI", "Shazam", "Otros", "Baja", "2026-06-05 11:16", "2026-06-05 11:16"],
    ["Cable HDMI", "Shazam", "Suministros / Cables", "Baja", "2026-06-08 09:36", "2026-06-08 09:36"],
    ["Facturas Gilligan Google y Deliverect", "Gilligan", "Otros", "Baja", "2026-06-09 09:26", "2026-06-09 09:26"],
    ["Pantalla en negro", "CMG", "Hardware / Laptop", "Baja", "2026-06-09 11:46", "2026-06-09 11:46"],
    ["No puedo utilizar scanner", "Gilligan", "Impresora", "Alta", "2026-06-10 09:52", "2026-06-10 09:52"],
    ["Compra de 3 cable HDMI", "Shazam", "Requerimiento de Compras", "Baja", "2026-06-10 10:14", "2026-06-10 10:15"],
    ["Impresora no funciona", "CMG", "Impresora", "Media", "2026-06-10 16:57", "2026-06-10 16:57"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-06-11 09:06", "2026-06-12 14:55"],
    ["Acceso camaras de Azua", "CMG", "Otros", "Media", "2026-06-12 14:54", "2026-06-12 14:55"],
    ["Gestion de doc del correo y carpeta compartida", "CMG", "Correo Electronico", "Baja", "2026-06-12 14:57", "2026-06-12 14:57"],
    ["Inconvenientes con Excel", "CMG", "Office / Apps", "Baja", "2026-06-12 14:56", "2026-06-12 14:56"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-06-15 09:15", "2026-06-15 09:15"],
    ["Ayuda con Teams", "Shazam", "Office / Apps", "Baja", "2026-06-15 15:35", "2026-06-16 17:26"],
    ["Configurar tablets del equipo ventas Shazam", "Shazam", "Flota (Tablets)", "Baja", "2026-06-16 14:31", "2026-06-16 17:26"],
    ["Asistencia con reunion Teams", "CMG", "Office / Apps", "Baja", "2026-06-16 17:27", "2026-06-16 17:27"],
    ["Asistencia con reunion Teams", "CMG", "Otros", "Alta", "2026-06-16 17:26", "2026-06-16 17:26"],
    ["Cambio de tinta Plotter T250", "CMG", "Impresora", "Alta", "2026-06-18 16:25", "2026-06-18 16:25"],
    ["Apps en tablet", "Shazam", "Office / Apps", "Baja", "2026-06-23 09:25", "2026-06-23 15:44"],
    ["Asistencia con AI", "CMG", "Otros", "Baja", "2026-06-23 09:32", "2026-06-23 14:50"],
    ["No funciona la impresora", "CMG", "Impresora", "Baja", "2026-06-23 12:07", "2026-06-23 12:07"],
    ["Cotizacion camaras Guerra", "CMG", "Requerimiento de Compras", "Baja", "2026-06-24 10:07", "2026-06-29 10:52"],
    ["Registro de impresora y escaner", "CMG", "Impresora", "Baja", "2026-06-24 12:47", "2026-06-24 12:50"],
    ["No funciona la carpeta compartida", "CMG", "Carpetas Compartidas", "Baja", "2026-06-24 16:32", "2026-06-24 16:32"],
    ["Compra e instalacion de camara oficina Fernando", "CMG", "Requerimiento de Compras", "Media", "2026-06-25 10:31", "2026-06-25 10:34"],
    ["Camaras centro de distribucion de Plaza Lama", "CMG", "Requerimiento de Compras", "Baja", "2026-06-25 10:33", "2026-06-25 10:34"],
    ["WiFi no funciona", "CMG", "Hardware / Laptop", "Media", "2026-06-29 10:51", "2026-06-29 10:51"],
    ["Configuracion Plotter", "CMG", "Impresora", "Baja", "2026-06-30 11:06", "2026-06-30 11:06"],
    ["Configuracion Plotter", "CMG", "Impresora", "Baja", "2026-06-30 11:07", "2026-06-30 11:07"],
    ["No tengo conexion de internet", "CMG", "Red / Conectividad", "Media", "2026-07-01 10:15", "2026-07-02 10:22"],
    ["No funciona Excel", "Shazam", "Office / Apps", "Baja", "2026-07-07 11:34", "2026-07-07 11:34"],
    ["Asistencia con flota (tablet) a vendedores", "Shazam", "Flota (Tablets)", "Baja", "2026-07-03 15:38", "2026-07-03 15:38"],
    ["No funciona la impresora", "CMG", "Impresora", "Baja", "2026-07-03 16:58", "2026-07-03 16:58"],
    ["Configuracion de pass WiFi", "CMG", "Red / Conectividad", "Baja", "2026-07-06 11:07", "2026-07-06 11:07"],
    ["Impresora con inconvenientes", "Gilligan", "Hardware / Laptop", "Baja", "2026-07-07 10:13", "2026-07-07 16:27"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Baja", "2026-07-06 11:36", "2026-07-06 11:42"],
    ["Configuracion de impresora", "Gilligan", "Impresora", "Baja", "2026-07-06 14:15", "2026-07-06 15:15"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Media", "2026-07-07 10:23", "2026-07-07 10:23"],
    ["Problemas con el Office", "Shazam", "Office / Apps", "Media", "2026-07-07 16:16", "2026-07-07 16:16"],
    ["Problemas con la impresora", "Shazam", "Impresora", "Baja", "2026-07-07 16:15", "2026-07-07 16:16"],
    ["Configuracion de impresora nueva", "Gilligan", "Impresora", "Baja", "2026-07-08 09:12", "2026-07-08 15:02"],
    ["No puedo acceder a la carpeta compartida", "CMG", "Carpetas Compartidas", "Media", "2026-07-09 10:08", "2026-07-09 16:22"],
    ["No puede acceder a carpeta compartida", "CMG", "Carpetas Compartidas", "Baja", "2026-07-09 16:22", "2026-07-09 16:23"],
    ["Impresora sin hoja", "CMG", "Impresora", "Media", "2026-07-09 16:23", "2026-07-09 16:23"],
    ["Problemas con el equipo", "Shazam", "Hardware / Laptop", "Alta", "2026-07-10 11:12", "2026-07-10 11:12"],
    ["Problemas de impresora", "CMG", "Impresora", "Baja", "2026-07-13 16:14", "2026-07-13 16:15"],
    ["Carpeta compartida no funciona", "CMG", "Carpetas Compartidas", "Baja", "2026-07-15 15:26", "2026-07-15 15:26"],
    ["Configuracion de equipo nuevo", "CMG", "Hardware / Laptop", "Baja", "2026-07-15 15:27", "2026-07-15 15:28"],
    ["Crear correo para nuevo ing", "CMG", "Correo Electronico", "Media", "2026-07-15 15:27", "2026-07-15 15:28"],
    ["Configurar nueva carpeta compartida", "Droppett", "Carpetas Compartidas", "Media", "2026-07-15 15:28", "2026-07-15 15:28"],
    ["Problemas de Office", "CMG", "Office / Apps", "Baja", "2026-07-16 14:32", "2026-07-16 14:33"],
  ];

  for (const [title, company, category, priority, created, closed] of rows) {
    await q`INSERT INTO tickets (title, description, company_id, category, priority, status, created_at, updated_at, resolved_at)
      VALUES (${title}, ${""}, ${cId(company)}, ${category}, ${priority}, 'resuelto', ${created}, ${closed}, ${closed})`;
  }
}

async function seedCollaborators(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id ?? null;
  const list: [string, string | null][] = [
    ["Fernando Silva", "CMG"],
    ["Carlos Martinez", "CMG"],
    ["Glenda", "CMG"],
    ["Luis Lara", "CMG"],
    ["Nikaury Reyes", "CMG"],
    ["Marcos Mora", "Shazam"],
    ["Misael Collado", "Shazam"],
    ["Contabilidad Gilligan", "Gilligan"],
  ];
  for (const [name, co] of list) {
    await q`INSERT INTO collaborators (name, company_id) VALUES (${name}, ${co ? cId(co) : null}) ON CONFLICT (name) DO NOTHING`;
  }
}

async function seedInitiatives(q: NonNullable<typeof sql>) {
  const cs = await q`SELECT id, name FROM companies`;
  const cId = (n: string) => cs.find((r: any) => r.name === n)?.id;
  if (!cId("Droppett")) return;

  type Task = [string, boolean];
  type Init = { company: string; title: string; area: string; status: string; owner: string; tasks: Task[] };

  const inits: Init[] = [
    { company: "Droppett", title: "Aseguramiento perimetral FortiGate", area: "Fortinet", status: "en_curso", owner: "Eddy V.", tasks: [["Inventario de FortiGate y firmware; confirmar FortiCare", true], ["Revisar politicas y perfiles (AV, IPS, Web Filter)", true], ["Evaluar SD-WAN: rutas, SLA de enlaces y failover", false], ["Auditar accesos admin, MFA y logging a FortiAnalyzer", false], ["Plan de actualizacion de firmware por ventana controlada", false]] },
    { company: "Droppett", title: "Hardening Check Point", area: "Check Point", status: "planificado", owner: "", tasks: [["Inventario de gateways y version de Gaia", false], ["Auditar rulebase: reglas any-any y shadowing", false], ["Verificar blades IPS/AV/Anti-Bot y firmas", false], ["Revisar VPN site-to-site", false], ["Definir baseline de respaldo de politica", false]] },
    { company: "Droppett", title: "Estandarizacion de red (Cisco)", area: "Cisco", status: "en_curso", owner: "Eddy V.", tasks: [["Levantar topologia por sitio (switches, routers, APs)", true], ["Normalizar VLANs y direccionamiento", false], ["Auditar respaldos de config y versiones IOS", false], ["Estandarizar acceso de gestion (SSH, AAA, syslog)", false]] },
    { company: "Shazam", title: "VPN y Threat Prevention (Check Point)", area: "Check Point", status: "en_curso", owner: "Eddy V.", tasks: [["Inventario de gateways y estado de blades", true], ["Revisar tuneles VPN con proveedores", true], ["Verificar IPS / Threat Prevention y firmas", false], ["Respaldo de configuracion y ventana de cambios", false]] },
    { company: "CMG", title: "Gobierno de SINCO ERP", area: "SINCO ERP", status: "planificado", owner: "", tasks: [["Relevar modulos en uso y quien los opera", false], ["Mapear roles y permisos (segregacion de funciones)", false], ["Documentar calendario de cierres y reportes clave", false], ["Revisar integraciones (bancos, factura) y respaldos DB", false], ["Backlog de mejoras y capacitacion", false]] },
    { company: "Gilligan", title: "Integracion Deliverect", area: "Deliverect", status: "en_curso", owner: "Eddy V.", tasks: [["Mapear canales (Uber Eats, Rappi, PedidosYa) y POS", true], ["Revisar sincronizacion de menus (precios, disponibilidad)", true], ["Diagnosticar ordenes perdidas o duplicadas", false], ["Configurar alertas de caida de canal", false], ["Documentar alta de nueva sucursal o canal", false]] },
    { company: "Gilligan", title: "Red y conectividad de sucursales (Cisco)", area: "Cisco", status: "planificado", owner: "", tasks: [["Inventario de equipos por sucursal", false], ["Estandarizar VLANs y Wi-Fi", false], ["Respaldo centralizado de configuraciones", false]] },
  ];

  for (const it of inits) {
    const r = await q`INSERT INTO initiatives (company_id, title, area, status, owner) VALUES (${cId(it.company)}, ${it.title}, ${it.area}, ${it.status}, ${it.owner}) RETURNING id`;
    const initId = r[0].id;
    let pos = 0;
    for (const [title, done] of it.tasks) {
      await q`INSERT INTO initiative_tasks (initiative_id, title, done, position) VALUES (${initId}, ${title}, ${done}, ${pos})`;
      pos++;
    }
  }
}
```

### `lib/data.ts`

Todas las consultas de lectura, ninguna escribe. Incluye `getAlertCounts()` (insignia del menú) y `getSupportDashboard()` (KPI de SLA). **Ambas usan la función SQL `ticket_sla_deadline()`** definida en `ensureSchema()` (§5.6), en vez de repetir el CASE de multiplicadores.

```ts
import { sql, ensureSchema } from "./db";

export async function getCompanies() {
  await ensureSchema();
  return sql!`SELECT id, name, color FROM companies ORDER BY name`;
}

export async function getCollaborators() {
  await ensureSchema();
  return sql!`SELECT id, name, company_id, email, phone FROM collaborators ORDER BY name`;
}

export async function getCategories() {
  await ensureSchema();
  return sql!`SELECT id, name, sla_hours FROM categories ORDER BY name`;
}

export async function getCanned() {
  await ensureSchema();
  return sql!`SELECT id, title, text FROM canned_responses ORDER BY title`;
}

/* ---------- Avisos de SLA (contador del menu lateral) ---------- */
export type AlertCounts = {
  breached: number;  // tickets abiertos que ya pasaron su fecha limite
  dueSoon: number;   // tickets abiertos que vencen en las proximas 2 horas
};

// Misma formula de SLA que slaInfo() en lib/priority.ts, calculada aqui via la
// funcion SQL ticket_sla_deadline() (definida en ensureSchema, lib/db.ts) para
// no repetir el CASE de multiplicadores en cada consulta.
export async function getAlertCounts(): Promise<AlertCounts> {
  await ensureSchema();
  const rows = await sql!`
    WITH abiertos AS (
      SELECT ticket_sla_deadline(t.created_at, cat.sla_hours, t.priority) AS vence
      FROM tickets t
      LEFT JOIN categories cat ON cat.name = t.category
      WHERE t.status <> 'resuelto'
    )
    SELECT
      COUNT(*) FILTER (WHERE now() > vence)::int AS breached,
      COUNT(*) FILTER (WHERE now() <= vence AND vence <= now() + interval '2 hour')::int AS due_soon
    FROM abiertos`;
  return { breached: rows[0]?.breached || 0, dueSoon: rows[0]?.due_soon || 0 };
}

export type TicketRow = {
  id: number;
  title: string;
  company: string;
  company_color: string;
  category: string;
  priority: string;
  status: string;
  requester: string | null;
  created_at: string;
  resolved_at: string | null;
  cat_sla: number | null;
};

export async function getTickets(): Promise<TicketRow[]> {
  await ensureSchema();
  const rows = await sql!`
    SELECT t.id, t.title, t.category, t.priority, t.status, t.requester, t.created_at, t.resolved_at,
           c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    ORDER BY t.created_at DESC, t.id DESC`;
  return rows as TicketRow[];
}

export async function getTicketDetail(id: number) {
  await ensureSchema();
  const q = sql!;
  const rows = await q`
    SELECT t.*, c.name AS company, c.color AS company_color, cat.sla_hours AS cat_sla
    FROM tickets t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN categories cat ON cat.name = t.category
    WHERE t.id = ${id}`;
  if (!rows[0]) return null;
  const comments = await q`
    SELECT id, author, text, created_at FROM ticket_comments
    WHERE ticket_id = ${id} ORDER BY created_at ASC`;
  return { ...rows[0], comments: comments as any[] };
}

export type SupportDashboard = {
  total: number;
  closed: number;
  open: number;
  breached: number;
  minDate: string | null;
  maxDate: string | null;
  byCategory: { category: string; n: number; pct: number }[];
  byCompany: any[];
  byDay: number[]; // Lun..Dom
  recent: any[];
};

export async function getSupportDashboard(from?: string | null, to?: string | null): Promise<SupportDashboard> {
  await ensureSchema();
  const q = sql!;
  const f = from || null;
  const t2 = to || null;

  const totals = await q`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'resuelto')::int AS closed,
      COUNT(*) FILTER (WHERE t.status <> 'resuelto')::int AS open,
      COUNT(*) FILTER (
        WHERE t.status <> 'resuelto'
          AND now() > ticket_sla_deadline(t.created_at, cat.sla_hours, t.priority)
      )::int AS breached,
      MIN(t.created_at) AS minc, MAX(t.created_at) AS maxc
    FROM tickets t
    LEFT JOIN categories cat ON cat.name = t.category
    WHERE (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))`;

  const cat = await q`
    SELECT COALESCE(NULLIF(category, ''), 'Otros') AS category, COUNT(*)::int AS n
    FROM tickets
    WHERE (${f}::timestamptz IS NULL OR created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY 1 ORDER BY n DESC, category`;

  const byCompany = await q`
    SELECT c.name, c.color, COUNT(t.id)::int AS n
    FROM companies c LEFT JOIN tickets t ON t.company_id = c.id
      AND (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY c.id, c.name, c.color HAVING COUNT(t.id) > 0 ORDER BY n DESC`;

  const dow = await q`
    SELECT EXTRACT(ISODOW FROM created_at)::int AS d, COUNT(*)::int AS n
    FROM tickets
    WHERE (${f}::timestamptz IS NULL OR created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR created_at < (${t2}::timestamptz + interval '1 day'))
    GROUP BY 1 ORDER BY 1`;

  const recent = await q`
    SELECT t.id, t.title, t.status, t.created_at, t.category, c.name AS company
    FROM tickets t LEFT JOIN companies c ON c.id = t.company_id
    WHERE (${f}::timestamptz IS NULL OR t.created_at >= ${f}::timestamptz)
      AND (${t2}::timestamptz IS NULL OR t.created_at < (${t2}::timestamptz + interval '1 day'))
    ORDER BY t.created_at DESC, t.id DESC LIMIT 6`;

  const t = totals[0];
  const total = t.total || 0;
  const byCategory = (cat as any[]).map((r) => ({
    category: r.category,
    n: r.n,
    pct: total ? Math.round((r.n / total) * 100) : 0,
  }));

  const byDay = [0, 0, 0, 0, 0, 0, 0]; // ISODOW 1=Lun .. 7=Dom
  for (const r of dow as any[]) byDay[r.d - 1] = r.n;

  return {
    total,
    closed: t.closed || 0,
    open: t.open || 0,
    breached: t.breached || 0,
    minDate: t.minc,
    maxDate: t.maxc,
    byCategory,
    byCompany: byCompany as any[],
    byDay,
    recent: recent as any[],
  };
}

/* ---------- Rutas de trabajo (modulo aparte) ---------- */
export type Initiative = {
  id: number;
  title: string;
  area: string;
  status: string;
  owner: string | null;
  due_date: string | null;
  company: string;
  company_color: string;
  tasks: { id: number; title: string; done: boolean }[];
  total: number;
  done: number;
  progress: number;
};

export async function getInitiatives(): Promise<Initiative[]> {
  await ensureSchema();
  const q = sql!;
  const inits = await q`
    SELECT i.id, i.title, i.area, i.status, i.owner, i.due_date, c.name AS company, c.color AS company_color
    FROM initiatives i JOIN companies c ON c.id = i.company_id
    ORDER BY c.name, i.id`;
  const tasks = await q`SELECT id, initiative_id, title, done FROM initiative_tasks ORDER BY position, id`;
  return (inits as any[]).map((i) => {
    const t = (tasks as any[]).filter((x) => x.initiative_id === i.id);
    const done = t.filter((x) => x.done).length;
    return {
      ...i,
      tasks: t.map((x) => ({ id: x.id, title: x.title, done: x.done })),
      total: t.length,
      done,
      progress: t.length ? Math.round((done / t.length) * 100) : 0,
    } as Initiative;
  });
}

export async function getInitiativeSummary() {
  await ensureSchema();
  return sql!`
    SELECT c.name, c.color,
      COUNT(DISTINCT i.id)::int AS initiatives,
      COUNT(t.id)::int AS total_tasks,
      COUNT(t.id) FILTER (WHERE t.done)::int AS done_tasks
    FROM companies c
    LEFT JOIN initiatives i ON i.company_id = c.id
    LEFT JOIN initiative_tasks t ON t.initiative_id = i.id
    GROUP BY c.id, c.name, c.color
    HAVING COUNT(DISTINCT i.id) > 0
    ORDER BY c.name`;
}
```

### `lib/priority.ts`

Constantes compartidas y el cálculo de SLA en TypeScript: `PRIORITY_SLA_MULT`, `slaInfo()` y `fmtSlaHours()`. Las constantes del modelo P1–P4 antiguo (`PRIORITIES`, `PRIORITY_META`, `computeScore`, `levelFor`, `slaForLevel`) se eliminaron el 2026-08-25 por no tener uso (§14).

```ts
export const STATUSES = ["nuevo", "en_progreso", "en_espera", "resuelto"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  nuevo: "Nuevo",
  en_progreso: "En progreso",
  en_espera: "En espera",
  resuelto: "Resuelto",
};

// Modelo de tickets basado en el CSV real: categoria + prioridad Baja/Media/Alta.
export const TICKET_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const INITIATIVE_STATUSES = ["planificado", "en_curso", "en_pausa", "completado"] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];

export const INITIATIVE_STATUS_LABEL: Record<InitiativeStatus, string> = {
  planificado: "Planificado",
  en_curso: "En curso",
  en_pausa: "En pausa",
  completado: "Completado",
};

/* ---------- SLA de tickets: por categoria (base) x prioridad (multiplicador) ---------- */
export const PRIORITY_SLA_MULT: Record<string, number> = { Alta: 0.5, Media: 1, Baja: 1.5 };

export type SlaInfo = {
  targetHours: number;
  closed: boolean;
  onTime: boolean;
  hoursLeft: number; // negativo si vencido/incumplido
};

export function slaInfo(
  createdAt: string,
  resolvedAt: string | null,
  status: string,
  baseHours: number,
  priority: string
): SlaInfo {
  const mult = PRIORITY_SLA_MULT[priority] ?? 1;
  const targetHours = Math.max(1, Math.round((baseHours || 24) * mult));
  const created = new Date(createdAt).getTime();
  const deadline = created + targetHours * 3600000;

  if (status === "resuelto" && resolvedAt) {
    const resolved = new Date(resolvedAt).getTime();
    const hoursLeft = (deadline - resolved) / 3600000;
    return { targetHours, closed: true, onTime: hoursLeft >= 0, hoursLeft };
  }
  const hoursLeft = (deadline - Date.now()) / 3600000;
  return { targetHours, closed: false, onTime: hoursLeft >= 0, hoursLeft };
}

export function fmtSlaHours(h: number): string {
  const abs = Math.abs(h);
  if (abs < 1) return Math.max(1, Math.round(abs * 60)) + "m";
  if (abs < 48) return Math.round(abs) + "h";
  return Math.round(abs / 24) + "d";
}
```

### `lib/dates.ts`

Única fuente de conversión de fecha/hora del proyecto (agregado 2026-08-28, §5.8). Antes de este
archivo, cada pantalla mostraba la hora UTC guardada en Postgres como si fuera hora local — 4
horas adelantada respecto a Santo Domingo.

```ts
// Todas las fechas se guardan en Postgres como TIMESTAMPTZ (UTC real). Esta es
// la UNICA fuente de conversion a hora de Republica Dominicana (UTC-4, sin
// horario de verano) — antes cada pantalla llamaba getUTCHours()/getUTCDate()
// directamente, que muestra la hora UTC como si fuera local (4 horas adelantada).
const DR_TZ = "America/Santo_Domingo";

function drParts(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DR_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // Intl con hour12:false a veces da "24" para medianoche
  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute") };
}

export function fmtDateDR(iso: string): string {
  const p = drParts(iso);
  return `${p.day}/${p.month}/${p.year}`;
}

export function fmtDateTimeDR(iso: string): string {
  const p = drParts(iso);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function drDayMonth(iso: string, meses: string[]): string {
  const p = drParts(iso);
  return `${Number(p.day)} ${meses[Number(p.month) - 1]}`;
}

export function drYear(iso: string): number {
  return Number(drParts(iso).year);
}

/* ---------- Tiempo de resolucion (duracion creado -> resuelto) ---------- */

export function autoResolutionMinutes(createdAt: string, resolvedAt: string | null): number | null {
  if (!resolvedAt) return null;
  const mins = Math.round((new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000);
  return Math.max(0, mins);
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && mins) parts.push(`${mins}m`);
  return parts.join(" ") || "0m";
}
```

---

## 15.3 Server Actions

### `app/actions.ts`

Las 28 mutaciones del sistema, todas con el patrón de cinco pasos.

```ts
"use server";

import { sql, ensureSchema } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTicket(formData: FormData) {
  await ensureSchema();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "");
  const company_id = Number(formData.get("company_id"));
  const category = String(formData.get("category") || "Otros");
  const priority = String(formData.get("priority") || "Baja");
  const requester = String(formData.get("requester") || "");
  if (!title || !company_id) return;

  await sql!`INSERT INTO tickets (title, description, company_id, category, priority, status, requester)
    VALUES (${title}, ${description}, ${company_id}, ${category}, ${priority}, 'nuevo', ${requester})`;

  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function createCollaborator(formData: FormData) {
  await ensureSchema();
  const name = String(formData.get("name") || "").trim();
  const companyRaw = String(formData.get("company_id") || "");
  const company_id = companyRaw ? Number(companyRaw) : null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!name) return;
  await sql!`INSERT INTO collaborators (name, company_id, email, phone)
    VALUES (${name}, ${company_id}, ${email}, ${phone}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/tickets");
  revalidatePath("/config");
}

export async function updateCollaborator(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const companyRaw = String(formData.get("company_id") || "");
  const company_id = companyRaw ? Number(companyRaw) : null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!id || !name) return;
  await sql!`UPDATE collaborators SET name = ${name}, company_id = ${company_id}, email = ${email}, phone = ${phone} WHERE id = ${id}`;
  revalidatePath("/tickets");
  revalidatePath("/config");
}

/* ---------- Configuracion: empresas, categorias, colaboradores ---------- */
export async function createCompany(formData: FormData) {
  await ensureSchema();
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#7FB93E");
  if (!name) return;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  await sql!`INSERT INTO companies (name, slug, color) VALUES (${name}, ${slug}, ${color}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function updateCompany(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#7FB93E");
  if (!id || !name) return;
  await sql!`UPDATE companies SET name = ${name}, color = ${color} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function deleteCompany(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  const used = await sql!`SELECT
    (SELECT COUNT(*) FROM tickets WHERE company_id = ${id})::int +
    (SELECT COUNT(*) FROM collaborators WHERE company_id = ${id})::int +
    (SELECT COUNT(*) FROM initiatives WHERE company_id = ${id})::int AS n`;
  if (used[0].n > 0) return; // no borrar si tiene datos asociados
  await sql!`DELETE FROM companies WHERE id = ${id}`;
  revalidatePath("/config");
}

export async function createCategory(formData: FormData) {
  await ensureSchema();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await sql!`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateCategory(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;
  await sql!`UPDATE categories SET name = ${name} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCategory(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM categories WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateCategorySla(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const sla_hours = Number(formData.get("sla_hours"));
  if (!id || !sla_hours || sla_hours < 1) return;
  await sql!`UPDATE categories SET sla_hours = ${sla_hours} WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
  revalidatePath("/");
}

/* ---------- Respuestas rapidas ---------- */
export async function createCanned(formData: FormData) {
  await ensureSchema();
  const title = String(formData.get("title") || "").trim();
  const text = String(formData.get("text") || "").trim();
  if (!title || !text) return;
  await sql!`INSERT INTO canned_responses (title, text) VALUES (${title}, ${text}) ON CONFLICT (title) DO NOTHING`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCanned(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM canned_responses WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function deleteCollaborator(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM collaborators WHERE id = ${id}`;
  revalidatePath("/config");
  revalidatePath("/tickets");
}

export async function updateTicket(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "");
  const company_id = Number(formData.get("company_id"));
  const category = String(formData.get("category") || "Otros");
  const priority = String(formData.get("priority") || "Baja");
  const requester = String(formData.get("requester") || "");
  if (!id || !title || !company_id) return;

  await sql!`UPDATE tickets SET
    title = ${title}, description = ${description}, company_id = ${company_id},
    category = ${category}, priority = ${priority}, requester = ${requester}, updated_at = now()
    WHERE id = ${id}`;

  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function updateTicketResolutionTime(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const mode = String(formData.get("mode") || "auto");
  if (!id) return;
  if (mode === "manual") {
    const hours = Number(formData.get("hours") || 0);
    const minutes = Number(formData.get("minutes") || 0);
    const total = Math.max(0, Math.round(hours * 60 + minutes));
    await sql!`UPDATE tickets SET resolution_minutes = ${total} WHERE id = ${id}`;
  } else {
    await sql!`UPDATE tickets SET resolution_minutes = NULL WHERE id = ${id}`;
  }
  revalidatePath("/tickets");
}

export async function addComment(formData: FormData) {
  await ensureSchema();
  const ticket_id = Number(formData.get("ticket_id"));
  const author = String(formData.get("author") || "").trim();
  const text = String(formData.get("text") || "").trim();
  if (!ticket_id || !text) return;
  await sql!`INSERT INTO ticket_comments (ticket_id, author, text) VALUES (${ticket_id}, ${author || null}, ${text})`;
  revalidatePath("/tickets");
}

export async function setTicketRequester(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const requester = String(formData.get("requester") || "");
  if (!id) return;
  await sql!`UPDATE tickets SET requester = ${requester}, updated_at = now() WHERE id = ${id}`;
  revalidatePath("/tickets");
}

export async function setStatus(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;

  if (status === "resuelto") {
    await sql!`UPDATE tickets SET status = ${status}, resolved_at = now(), updated_at = now() WHERE id = ${id}`;
  } else {
    await sql!`UPDATE tickets SET status = ${status}, resolved_at = NULL, updated_at = now() WHERE id = ${id}`;
  }
  revalidatePath("/tickets");
  revalidatePath("/");
}

/* ---------- Rutas de trabajo ---------- */
export async function createInitiative(formData: FormData) {
  await ensureSchema();
  const company_id = Number(formData.get("company_id"));
  const title = String(formData.get("title") || "").trim();
  const area = String(formData.get("area") || "");
  const owner = String(formData.get("owner") || "");
  const due_date = String(formData.get("due_date") || "") || null;
  const tasksRaw = String(formData.get("tasks") || "");
  if (!company_id || !title) return;

  const rows = await sql!`INSERT INTO initiatives (company_id, title, area, status, owner, due_date)
    VALUES (${company_id}, ${title}, ${area}, 'planificado', ${owner}, ${due_date}) RETURNING id`;
  const id = rows[0].id;
  const tasks = tasksRaw.split("\n").map((t) => t.trim()).filter(Boolean);
  let pos = 0;
  for (const t of tasks) {
    await sql!`INSERT INTO initiative_tasks (initiative_id, title, position) VALUES (${id}, ${t}, ${pos})`;
    pos++;
  }
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function toggleTask(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`UPDATE initiative_tasks SET done = NOT done WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function addTask(formData: FormData) {
  await ensureSchema();
  const initiative_id = Number(formData.get("initiative_id"));
  const title = String(formData.get("title") || "").trim();
  if (!initiative_id || !title) return;
  const pos = await sql!`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM initiative_tasks WHERE initiative_id = ${initiative_id}`;
  await sql!`INSERT INTO initiative_tasks (initiative_id, title, position) VALUES (${initiative_id}, ${title}, ${pos[0].p})`;
  revalidatePath("/rutas");
}

export async function updateTaskTitle(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiative_tasks SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/rutas");
}

export async function deleteTask(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiative_tasks WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function setInitiativeStatus(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;
  await sql!`UPDATE initiatives SET status = ${status} WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function updateInitiativeTitle(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!id || !title) return;
  await sql!`UPDATE initiatives SET title = ${title} WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function updateInitiativeDueDate(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  const due_date = String(formData.get("due_date") || "") || null;
  if (!id) return;
  await sql!`UPDATE initiatives SET due_date = ${due_date} WHERE id = ${id}`;
  revalidatePath("/rutas");
}

export async function deleteInitiative(formData: FormData) {
  await ensureSchema();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql!`DELETE FROM initiatives WHERE id = ${id}`;
  revalidatePath("/rutas");
  revalidatePath("/");
}

export async function reorderTasks(formData: FormData) {
  await ensureSchema();
  const initiative_id = Number(formData.get("initiative_id"));
  const order = String(formData.get("order") || "").split(",").map(Number).filter(Boolean);
  if (!initiative_id || order.length === 0) return;
  for (let i = 0; i < order.length; i++) {
    await sql!`UPDATE initiative_tasks SET position = ${i} WHERE id = ${order[i]} AND initiative_id = ${initiative_id}`;
  }
  revalidatePath("/rutas");
}
```

---

## 15.4 Páginas y layout (`app/`)

### `app/layout.tsx`

Shell de la aplicación. **Server Component asíncrono**: consulta `getAlertCounts()` para la insignia, con guarda `hasDb` + `try/catch` que **registra el error** en lugar de silenciarlo. Exporta `metadata` y `viewport`. El badge cuadrado del sidebar (antes texto "TI") usa el logo real de Droppett (`public/droppett-icon-white.png`) desde el 2026-08-26 — ver §14 y §9 (assets en `public/` y `app/icon.png` para el favicon).

```tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NavLink } from "@/components/NavLink";
import { hasDb } from "@/lib/db";
import { getAlertCounts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Mesa de Servicios TI — Grupo Empresarial",
  description: "Sistema de tickets y priorización para Droppett, Gilligan, CMG y Shazam.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0E15",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Contador de avisos del menu. Nunca debe tumbar el layout: si la base no
  // esta conectada o la consulta falla, se muestra sin insignia.
  let alerts = { breached: 0, dueSoon: 0 };
  if (hasDb) {
    try {
      alerts = await getAlertCounts();
    } catch (e) {
      // Se registra a proposito: sin esto, un fallo de la consulta seria
      // indistinguible de "no hay nada vencido" y las alertas dejarian de
      // avisar en silencio, que es justo lo que no debe pasar.
      console.error("[avisos SLA] getAlertCounts fallo:", e);
    }
  }

  return (
    <html lang="es">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <img src="/droppett-icon-white.png" alt="Droppett" className="logo" />
              <div>
                <div className="bt">MESA&nbsp;TI</div>
                <div className="bs">Grupo empresarial</div>
              </div>
            </div>
            <div className="nav-label">Operación</div>
            <nav className="sidebar-nav">
              <NavLink href="/" label="Dashboard" icon="grid" />
              <NavLink
                href="/tickets"
                label="Mesa de ayuda"
                icon="inbox"
                badge={alerts.breached}
                badgeWarn={alerts.dueSoon}
              />
              <NavLink href="/rutas" label="Rutas de trabajo" icon="route" />
              <NavLink href="/config" label="Configuración" icon="settings" />
            </nav>
            <div className="spacer" />
            <div className="side-foot">
              Droppett · Gilligan<br />CMG · Shazam
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

### `app/page.tsx`

Dashboard. `Donut` dibuja las donas en SVG; el texto se centra con flexbox superpuesto, no con `text-anchor`. Columna 2 incluye el panel **Tickets por empresa** (usa `d.byCompany`, ya calculado por `getSupportDashboard()` pero sin usar hasta el 2026-08-25), con la barra pintada del color de cada empresa. Cada fila es un `<Link>` a `/tickets?company=<nombre>` desde el 2026-08-27 (mismo parámetro que ya filtraba `/tickets` y `/rutas`, §5.7 — no hizo falta tocar la página de tickets). El encabezado "📅 PERIODO" usa `periodLabel` (§14, 2026-08-26): el filtro elegido (`from`/`to`), no el rango de datos.

```tsx
import Link from "next/link";
import { hasDb } from "@/lib/db";
import { getSupportDashboard } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { drDayMonth, drYear, fmtDateTimeDR } from "@/lib/dates";

export const dynamic = "force-dynamic";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fmtPeriod(min: string | null, max: string | null) {
  if (!min || !max) return "—";
  return `${drDayMonth(min, MESES)} – ${drDayMonth(max, MESES)} ${drYear(max)}`;
}
function fmtYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
const fmtDate = fmtDateTimeDR;

function Donut({ pct, label }: { pct: number; label: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="donut">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="center"><div className="pv">{pct}%</div><div className="pl">{label}</div></div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  const from = searchParams?.from || null;
  const to = searchParams?.to || null;

  let d;
  try {
    d = await getSupportDashboard(from, to);
  } catch (e) {
    return <Setup />;
  }

  const periodLabel = (from || to)
    ? `${from ? fmtYMD(from) : "inicio"} – ${to ? fmtYMD(to) : "hoy"}`
    : "Todo el historial";

  const closedPct = d.total ? Math.round((d.closed / d.total) * 100) : 0;
  const openPct = 100 - closedPct;
  const maxCat = Math.max(1, ...d.byCategory.map((c) => c.n));
  const maxCompany = Math.max(1, ...d.byCompany.map((c: any) => c.n));
  const maxDay = Math.max(1, ...d.byDay);
  const topCats = d.byCategory.slice(0, 9);

  return (
    <>
      <div className="content">
        {/* Header + stat cards */}
        <div className="report-head">
          <div>
            <div className="rh-title">RESUMEN DE TICKETS DE SOPORTE</div>
            <div className="rh-period">📅 PERIODO: <b>{periodLabel}</b></div>
            <div style={{ marginTop: 12 }}><DateRangeFilter /></div>
          </div>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="sc-ic blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
              <div><div className="sc-k">Total de tickets</div><div className="sc-v">{d.total}</div><div className="sc-d">tickets</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg></div>
              <div><div className="sc-k">Cerrados</div><div className="sc-v">{d.closed}</div><div className="sc-d green">{closedPct}%</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></div>
              <div><div className="sc-k">Abiertos</div><div className="sc-v">{d.open}</div><div className="sc-d">{openPct}%</div></div>
            </div>
            <div className="stat-card">
              <div className="sc-ic red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg></div>
              <div><div className="sc-k">Fuera de SLA</div><div className="sc-v" style={{ color: d.breached > 0 ? "var(--crit)" : undefined }}>{d.breached}</div><div className="sc-d">abiertos vencidos</div></div>
            </div>
          </div>
        </div>

        <div className="dash-cols">
          {/* Columna 1 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Resumen general</div>
              <div className="donut-wrap">
                <Donut pct={closedPct} label="Cerrados" />
                <div className="donut-legend">
                  <div className="lg"><span className="dt" style={{ background: "var(--accent)" }} /> Cerrados <b>{d.closed} ({closedPct}%)</b></div>
                  <div className="lg"><span className="dt" style={{ background: "var(--muted)" }} /> Abiertos <b>{d.open} ({openPct}%)</b></div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets por día de la semana</div>
              <div className="daybars">
                {d.byDay.map((n, idx) => (
                  <div className="daycol" key={idx}>
                    <div className="dv">{n}</div>
                    <div className="dbar" style={{ height: `${(n / maxDay) * 100}%` }} />
                    <div className="dl">{DIAS[idx]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets recientes</div>
              <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
                <table>
                  <thead><tr><th>Ticket</th><th>Empresa</th><th>Estado</th></tr></thead>
                  <tbody>
                    {d.recent.map((t: any) => (
                      <tr key={t.id}>
                        <td><span className="t-title">{t.title}</span><div className="t-sub">#{t.id} · {fmtDate(t.created_at)}</div></td>
                        <td className="cat-tag">{t.company}</td>
                        <td><span className="status-pill resuelto">Cerrado</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Columna 2 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Tickets por categoría <span className="small">(Top {topCats.length})</span></div>
              <div className="catbars">
                {topCats.map((c) => (
                  <div className="catbar" key={c.category}>
                    <div className="cb-top">
                      <span className="cb-name">{c.category}</span>
                      <span className="cb-val"><b>{c.n}</b> ({c.pct}%)</span>
                    </div>
                    <div className="catbar-track"><div className="catbar-fill" style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="pv-meta" style={{ marginTop: 14 }}>Total: {d.total} tickets</p>
            </div>

            <div className="panel">
              <div className="panel-title">Estado de tickets</div>
              <div className="donut-wrap">
                <Donut pct={closedPct} label="Cerrados" />
                <div className="donut-legend">
                  <div className="lg"><span className="dt" style={{ background: "var(--accent)" }} /> Cerrados <b>{d.closed} ({closedPct}%)</b></div>
                  <div className="lg"><span className="dt" style={{ background: "var(--muted)" }} /> Abiertos <b>{d.open} ({openPct}%)</b></div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Tickets por empresa</div>
              <div className="catbars">
                {d.byCompany.map((c: any) => (
                  <Link
                    href={`/tickets?company=${encodeURIComponent(c.name)}`}
                    className="catbar catbar-link"
                    key={c.name}
                    title={`Ver tickets de ${c.name}`}
                  >
                    <div className="cb-top">
                      <span className="cb-name">{c.name}</span>
                      <span className="cb-val"><b>{c.n}</b></span>
                    </div>
                    <div className="catbar-track">
                      <div className="catbar-fill" style={{ width: `${(c.n / maxCompany) * 100}%`, background: c.color }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Columna 3 */}
          <div className="col">
            <div className="panel">
              <div className="panel-title">Detalle de tickets por categoría</div>
              <table>
                <thead><tr><th>Categoría</th><th className="num">Cant.</th><th className="num">% del total</th></tr></thead>
                <tbody>
                  {d.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td>{c.category}</td>
                      <td className="num">{c.n}</td>
                      <td>
                        <div className="pct-cell">
                          <div className="mini-track"><div className="mini-fill" style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                          {c.pct}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>TOTAL</td><td className="num">{d.total}</td><td className="pct-cell" style={{ justifyContent: "flex-end" }}>100%</td></tr></tfoot>
              </table>
            </div>

            <div className="panel">
              <div className="panel-title">Resumen</div>
              <div className="resumen-lead">
                <div className="ri"><svg viewBox="0 0 24 24" width="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></div>
                <p>
                  {d.total === 0
                    ? "No hay tickets registrados en este período."
                    : `Todos los tickets del período ${fmtPeriod(d.minDate, d.maxDate)} fueron atendidos y cerrados satisfactoriamente.`}
                </p>
              </div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg></div><div><div className="rt">Eficiencia</div><div className="rd">{closedPct}% de tickets cerrados</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></div><div><div className="rt">Respuesta oportuna</div><div className="rd">Atención rápida y efectiva</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div><div><div className="rt">Soporte confiable</div><div className="rd">Comprometidos con tu productividad</div></div></div>
              <div className="resumen-item"><div className="ri"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg></div><div><div className="rt">Mejora continua</div><div className="rd">Seguimos trabajando para servirte mejor</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

### `app/tickets/page.tsx`

Mesa de ayuda. Franja de aviso de SLA, `SlaCell` por fila y `data-label` en cada `<td>` para el modo tarjeta en móvil. **Dos listas de categorías distintas, a propósito** (desde 2026-08-27):
`categories` (línea `const categories = ...`) es `cats` (BD) **unida** con las categorías que
aparezcan en tickets viejos aunque ya no existan en `/config` — correcta para **filtrar**
(`<Filters>`), porque tiene que poder filtrarse por una categoría histórica ya borrada. `cats` a
secas (sin unir con nada) es la que se le pasa a `<NewTicketDialog>` y `<TicketDetailDialog>` —
correcta para **crear/editar**, porque ahí solo deben ofrecerse categorías que existen de verdad
hoy en `/config`. Si algún día agregas otro selector de categoría, usa `cats` si es para
crear/editar y `categories` si es para filtrar — mezclarlos fue exactamente el bug de §14.

```tsx
import { hasDb } from "@/lib/db";
import { getTickets, getCompanies, getCollaborators, getCategories, getTicketDetail, getCanned } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { CollaboratorsDialog } from "@/components/CollaboratorsDialog";
import { Filters } from "@/components/Filters";
import { StatusControl } from "@/components/StatusControl";
import { RequesterControl } from "@/components/RequesterControl";
import { TicketOpenLink } from "@/components/TicketOpenLink";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";
import { slaInfo, fmtSlaHours } from "@/lib/priority";
import { fmtDateDR as fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

function SlaCell({ t }: { t: any }) {
  const s = slaInfo(t.created_at, t.resolved_at, t.status, t.cat_sla ?? 24, t.priority || "Baja");
  if (s.closed) {
    return s.onTime
      ? <span className="sla-chip ok">Cumplido</span>
      : <span className="sla-chip crit">Fuera de SLA</span>;
  }
  if (!s.onTime) return <span className="sla-chip crit">Vencido {fmtSlaHours(s.hoursLeft)}</span>;
  if (s.hoursLeft <= 2) return <span className="sla-chip warn">Vence en {fmtSlaHours(s.hoursLeft)}</span>;
  return <span className="sla-chip">Vence en {fmtSlaHours(s.hoursLeft)}</span>;
}

export default async function TicketsPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  let tickets: any[], companies: any[], collaborators: any[], cats: any[], canned: any[];
  try {
    [tickets, companies, collaborators, cats, canned] = await Promise.all([
      getTickets(), getCompanies(), getCollaborators(), getCategories(), getCanned(),
    ]);
  } catch (e) {
    return <Setup />;
  }

  const categories = Array.from(
    new Set([...cats.map((c) => c.name), ...tickets.map((t) => t.category).filter(Boolean)])
  ).sort();

  const f = searchParams || {};
  let rows = tickets;
  if (f.company) rows = rows.filter((t) => t.company === f.company);
  if (f.category) rows = rows.filter((t) => t.category === f.category);
  if (f.priority) rows = rows.filter((t) => t.priority === f.priority);
  if (f.requester) rows = rows.filter((t) => t.requester === f.requester);
  if (f.status === "abiertos") rows = rows.filter((t) => t.status !== "resuelto");
  else if (f.status) rows = rows.filter((t) => t.status === f.status);

  let detail: any = null;
  if (f.ticket) {
    try {
      detail = await getTicketDetail(Number(f.ticket));
    } catch (e) {}
  }

  // Aviso de SLA. Se calcula sobre TODOS los tickets, no sobre los filtrados:
  // es una alerta global, no debe cambiar segun lo que estes mirando.
  // Reutiliza los tickets ya cargados, sin consulta extra.
  const vencidos = tickets.filter((t) => {
    const s = slaInfo(t.created_at, t.resolved_at, t.status, t.cat_sla ?? 24, t.priority || "Baja");
    return !s.closed && !s.onTime;
  }).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mesa de ayuda</h1>
          <div className="sub">Tickets de soporte de todas las empresas</div>
        </div>
        <div className="push">
          <CollaboratorsDialog collaborators={collaborators} companies={companies} />
          <NewTicketDialog companies={companies} categories={cats.map((c) => c.name)} collaborators={collaborators} />
        </div>
      </div>

      <div className="content">
        {vencidos > 0 && (
          <a href="/tickets?status=abiertos" className="alert-bar">
            <span className="ab-ic" aria-hidden="true">!</span>
            <span className="ab-txt">
              <b>{vencidos}</b>{" "}
              {vencidos === 1
                ? "ticket abierto está fuera de SLA"
                : "tickets abiertos están fuera de SLA"}
            </span>
            <span className="ab-cta">Ver abiertos →</span>
          </a>
        )}

        <Filters companies={companies} categories={categories} collaborators={collaborators} count={rows.length} />

        {rows.length === 0 ? (
          <div className="card"><div className="empty"><div className="big">🗂️</div>No hay tickets con estos filtros.</div></div>
        ) : (
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Asunto</th>
                  <th>Solicitante</th>
                  <th>Empresa</th>
                  <th>Categoría</th>
                  <th>Prioridad</th>
                  <th>SLA</th>
                  <th>Creado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td data-label="#" className="mono" style={{ color: "var(--muted)" }}>{t.id}</td>
                    <td data-label="Asunto"><TicketOpenLink id={t.id} title={t.title} /></td>
                    <td data-label="Solicitante"><RequesterControl id={t.id} requester={t.requester} collaborators={collaborators} /></td>
                    <td data-label="Empresa"><span className="chip" style={{ background: t.company_color }}>{t.company}</span></td>
                    <td data-label="Categoría" className="cat-tag">{t.category || "Otros"}</td>
                    <td data-label="Prioridad"><span className={"pri " + (t.priority || "Baja")}>{t.priority || "Baja"}</span></td>
                    <td data-label="SLA"><SlaCell t={t} /></td>
                    <td data-label="Creado" className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(t.created_at)}</td>
                    <td data-label="Estado"><StatusControl id={t.id} status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <TicketDetailDialog ticket={detail} companies={companies} categories={cats} collaborators={collaborators} canned={canned} />
      )}
    </>
  );
}
```

### `app/rutas/page.tsx`

Rutas de trabajo. Agrupa por empresa y delega en `<InitiativeTitle>`, `<InitiativeDueDate>` y `<TaskList>`. `dueInfo()` calcula si la ruta está atrasada o próxima a vencer a partir de `due_date` (columna agregada el 2026-08-25, §14).

```tsx
import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { NewInitiativeDialog } from "@/components/NewInitiativeDialog";
import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { InitiativeStatusControl } from "@/components/InitiativeStatusControl";
import { InitiativeTitle } from "@/components/InitiativeTitle";
import { InitiativeDueDate } from "@/components/InitiativeDueDate";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";

export const dynamic = "force-dynamic";

function dueInfo(dueDate: string | null, status: string) {
  if (!dueDate || status === "completado") return null;
  const due = new Date(dueDate + "T23:59:59");
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { cls: "crit", label: `Atrasado ${Math.abs(diffDays)}d` };
  if (diffDays <= 7) return { cls: "warn", label: `Vence en ${diffDays}d` };
  return { cls: "ok", label: `Vence en ${diffDays}d` };
}

export default async function RutasPage({ searchParams }: { searchParams: Record<string, string> }) {
  if (!hasDb) return <Setup />;

  let initiatives: any[], companies: any[];
  try {
    [initiatives, companies] = await Promise.all([getInitiatives(), getCompanies()]);
  } catch (e) {
    return <Setup />;
  }

  const f = searchParams || {};
  let rows = initiatives;
  if (f.company) rows = rows.filter((i) => i.company === f.company);

  // Agrupar por empresa
  const groups: Record<string, { color: string; items: any[] }> = {};
  for (const i of rows) {
    if (!groups[i.company]) groups[i.company] = { color: i.company_color, items: [] };
    groups[i.company].items.push(i);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Rutas de trabajo</h1>
          <div className="sub">Proyectos y tareas por empresa — avance de los servicios clave</div>
        </div>
        <div className="push">
          <NewInitiativeDialog companies={companies} />
        </div>
      </div>

      <div className="content">
        <div className="filters">
          <FiltersCompanyClient companies={companies} />
          <span className="fcount">{rows.length} rutas</span>
        </div>

        {rows.length === 0 ? (
          <div className="card"><div className="empty"><div className="big">🧭</div>No hay rutas con este filtro.</div></div>
        ) : (
          Object.entries(groups).map(([company, g]) => (
            <section key={company} style={{ marginBottom: 28 }}>
              <div className="company-head">
                <span className="chip" style={{ background: g.color }}>{company}</span>
                <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{g.items.length} ruta(s)</span>
              </div>
              <div className="grid g2">
                {g.items.map((i) => {
                  const due = dueInfo(i.due_date, i.status);
                  return (
                  <article className="card init-card" key={i.id}>
                    <div className="init-top">
                      <div className="init-head">
                        <InitiativeTitle id={i.id} title={i.title} />
                        <div className="init-sub">
                          {i.area ? <span className="area-tag">{i.area}</span> : null}
                          {i.owner ? <span className="mono" style={{ color: "var(--muted)" }}> · {i.owner}</span> : null}
                        </div>
                        <div className="init-due-row">
                          <InitiativeDueDate id={i.id} dueDate={i.due_date} />
                          {due ? <span className={"sla-chip " + due.cls}>{due.label}</span> : null}
                        </div>
                      </div>
                      <div className="init-actions">
                        <InitiativeStatusControl id={i.id} status={i.status} />
                        <DeleteInitiativeButton id={i.id} />
                      </div>
                    </div>

                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${i.progress}%`, background: g.color }} />
                      </div>
                      <span className="progress-label mono">{i.done}/{i.total} · {i.progress}%</span>
                    </div>

                    <TaskList initiativeId={i.id} tasks={i.tasks} />
                    <AddTaskForm initiativeId={i.id} />
                  </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
```

### `app/config/page.tsx`

Configuración. Cuatro bloques CRUD enlazados directo a las Server Actions. Categorías y
Colaboradores ganaron edición completa el 2026-08-27 (antes solo se podían crear/borrar); el
helper `companyName` que solo servía para pintar el nombre de empresa de forma no editable se
eliminó junto con esa lectura de solo-texto.

```tsx
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
```

---

## 15.5 Hoja de estilos

### `app/globals.css`

**Todo el CSS del proyecto.** Las variables de `:root` son el sistema de diseño (§8); el bloque `RESPONSIVE` del final tiene los 7 puntos de quiebre.

```css
:root {
  /* Dark navy + green (single theme, matches report design) */
  --paper: #0A0E15;
  --surface: #121A25;
  --surface-2: #18222F;
  --ink: #EAEFF4;
  --ink-soft: #B7C2CE;
  --muted: #7E8B99;
  --faint: #55616D;
  --line: #1F2937;
  --line-strong: #2C3947;
  --accent: #7FB93E;
  --accent-ink: #A6DA66;
  --accent-wash: #17240F;
  --accent-dim: #2A3B1A;

  --crit: #E4694A;  --crit-w: #2C1712;
  --high: #E0A94A;  --high-w: #2B2410;
  --med:  #C9B23A;  --med-w:  #26220F;
  --low:  #7FB93E;  --low-w:  #16240F;
  --info: #4FA3E0;

  --radius: 12px;
  --radius-sm: 7px;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 14px 34px -18px rgba(0,0,0,.7);
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "Cascadia Mono", "SF Mono", Consolas, monospace;
  --sidebar-w: 244px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4 { margin: 0; letter-spacing: -.01em; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

/* ---------- App shell ---------- */
.app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: 100vh; }
.sidebar {
  background: #0D141D; border-right: 1px solid var(--line);
  padding: 20px 14px; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 6px;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 18px; }
.brand .logo { width: 30px; height: 30px; border-radius: 8px; background: var(--accent); box-shadow: 0 0 0 3px var(--accent-wash); object-fit: contain; padding: 5px; box-sizing: border-box; }
.brand .bt { font-family: var(--font-mono); font-size: 13px; font-weight: 700; letter-spacing: .02em; line-height: 1.1; }
.brand .bs { font-size: 10.5px; color: var(--muted); font-family: var(--font-mono); letter-spacing: .04em; }
.nav-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--faint); padding: 14px 10px 6px; }
.navlink { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px; color: var(--ink-soft); font-size: 14px; font-weight: 500; }
.navlink:hover { background: var(--surface-2); color: var(--ink); }
.navlink.active { background: var(--accent-wash); color: var(--accent-ink); font-weight: 600; }
.navlink .ic { width: 17px; height: 17px; opacity: .85; }

/* Insignia de avisos de SLA en el menu */
.nav-badge {
  margin-left: auto; flex-shrink: 0;
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 700;
  font-variant-numeric: tabular-nums; line-height: 1;
  min-width: 19px; height: 19px; padding: 0 6px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
}
.nav-badge.crit { background: var(--crit); color: #0A0E15; }
.nav-badge.warn { background: var(--high); color: #0A0E15; }

/* Texto solo para lectores de pantalla */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Franja de aviso sobre la bandeja de tickets */
.alert-bar {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 14px; margin-bottom: 14px;
  border: 1px solid var(--crit); border-left-width: 3px;
  background: var(--crit-w); border-radius: var(--radius-sm);
  font-size: 13.5px; color: var(--ink-soft);
}
.alert-bar:hover { background: #38201a; }
.alert-bar .ab-ic {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
  background: var(--crit); color: #0A0E15;
  display: grid; place-items: center;
  font-family: var(--font-mono); font-weight: 700; font-size: 12px;
}
.alert-bar .ab-txt { flex: 1; min-width: 0; }
.alert-bar .ab-txt b { color: var(--crit); font-variant-numeric: tabular-nums; }
.alert-bar .ab-cta {
  flex-shrink: 0; font-family: var(--font-mono); font-size: 11.5px;
  color: var(--crit); white-space: nowrap;
}
.sidebar .spacer { flex: 1; }
.side-foot { font-size: 11px; color: var(--faint); font-family: var(--font-mono); padding: 10px; border-top: 1px solid var(--line); }

.main { min-width: 0; display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; gap: 16px; padding: 16px 28px;
  border-bottom: 1px solid var(--line); background: rgba(10,14,21,.7);
  backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20;
}
.topbar h1 { font-size: 1.15rem; font-weight: 680; }
.topbar .sub { font-size: 12.5px; color: var(--muted); font-family: var(--font-mono); }
.topbar .push { margin-left: auto; display: flex; gap: 10px; align-items: center; }
.content { padding: 24px 28px 60px; max-width: 1600px; width: 100%; margin: 0 auto; }

/* Monitores muy anchos: seguir usando mas espacio en vez de dejar margenes enormes */
@media (min-width: 1900px) {
  .content { max-width: 1900px; }
}

@media (max-width: 820px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .sidebar .spacer, .side-foot { display: none; }
  .nav-label { display: none; }
  .brand { padding: 6px 8px; }
}

/* ---------- Buttons ---------- */
.btn {
  font-family: var(--font-sans); font-size: 14px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink);
  padding: 8px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 7px; line-height: 1;
}
.btn:hover { border-color: var(--muted); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #0A0E15; font-weight: 700; }
.btn.primary:hover { background: var(--accent-ink); border-color: var(--accent-ink); }
.btn.sm { padding: 6px 10px; font-size: 12.5px; }
.btn.active { background: var(--accent); border-color: var(--accent); color: #0A0E15; font-weight: 700; }

/* ---------- Cards / grids ---------- */
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.grid { display: grid; gap: 16px; }
.g2 { grid-template-columns: repeat(2, 1fr); }
.g3 { grid-template-columns: repeat(3, 1fr); }
.g4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 980px) { .g4 { grid-template-columns: repeat(2, 1fr); } .g3 { grid-template-columns: 1fr; } }
@media (max-width: 680px) { .g2, .g4 { grid-template-columns: 1fr; } }

.section-title { display: flex; align-items: baseline; gap: 10px; margin: 26px 0 12px; }
.section-title h2 { font-size: 1.05rem; font-weight: 680; }
.section-title .hint { font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

/* card header used in dashboard panels */
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px 20px; }
.panel-title { font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; margin-bottom: 16px; display: flex; align-items: baseline; gap: 8px; }
.panel-title .small { font-size: 10.5px; color: var(--muted); letter-spacing: .04em; }

/* ---------- Report header + stat cards ---------- */
.report-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 22px; }
.report-head .rh-title { font-size: clamp(1.5rem, 3vw, 2.1rem); font-weight: 800; letter-spacing: -.02em; }
.report-head .rh-period { font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.report-head .rh-period b { color: var(--accent-ink); }
.daterange-wrap { display: flex; flex-direction: column; gap: 10px; }
.dr-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.daterange { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.daterange label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); display: flex; flex-direction: column; gap: 4px; }
.daterange input[type=date] { font-family: var(--font-sans); font-size: 13px; color: var(--ink); background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); padding: 7px 10px; color-scheme: dark; cursor: pointer; }
.daterange input[type=date]:hover { border-color: var(--muted); }
.stat-cards { display: flex; gap: 14px; flex-wrap: wrap; }
.stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 20px; min-width: 140px; display: flex; align-items: center; gap: 14px; }
.stat-card .sc-ic { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
.stat-card .sc-ic svg { width: 20px; height: 20px; }
.sc-ic.blue { background: #16273A; color: #5AA9E6; }
.sc-ic.green { background: var(--accent-wash); color: var(--accent-ink); }
.sc-ic.gray { background: #1E2733; color: var(--muted); }
.stat-card .sc-k { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.stat-card .sc-v { font-size: 1.9rem; font-weight: 780; line-height: 1; font-variant-numeric: tabular-nums; margin-top: 3px; }
.stat-card .sc-d { font-size: 11.5px; color: var(--muted); margin-top: 3px; }
.stat-card .sc-d.green { color: var(--accent-ink); }

/* dashboard column layout */
.dash-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; align-items: start; }
.dash-cols .col { display: flex; flex-direction: column; gap: 18px; }
@media (max-width: 1080px) { .dash-cols { grid-template-columns: 1fr 1fr; } }
@media (max-width: 720px) { .dash-cols { grid-template-columns: 1fr; } }

/* ---------- Donut ---------- */
.donut-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; }
.donut { position: relative; width: 128px; height: 128px; flex-shrink: 0; }
.donut svg { display: block; transform: rotate(-90deg); }
.donut .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.donut .center .pv { font-size: 1.5rem; font-weight: 780; line-height: 1; }
.donut .center .pl { font-size: 10.5px; color: var(--muted); font-family: var(--font-mono); }
.donut-legend { display: flex; flex-direction: column; gap: 10px; font-size: 13px; align-items: center; }
.donut-legend .lg { display: flex; align-items: center; gap: 8px; }
.donut-legend .lg .dt { width: 10px; height: 10px; border-radius: 50%; }
.donut-legend .lg b { font-variant-numeric: tabular-nums; }

/* ---------- Category horizontal bars ---------- */
.catbars { display: flex; flex-direction: column; gap: 11px; }
.catbar { display: grid; grid-template-columns: 1fr; gap: 5px; }
.catbar-link { color: inherit; text-decoration: none; cursor: pointer; border-radius: 6px; padding: 4px 6px; margin: -4px -6px; transition: background .15s ease; }
.catbar-link:hover { background: var(--surface-2); }
.catbar .cb-top { display: flex; justify-content: space-between; font-size: 12.5px; }
.catbar .cb-name { color: var(--ink-soft); }
.catbar .cb-val { font-family: var(--font-mono); color: var(--muted); }
.catbar .cb-val b { color: var(--ink); }
.catbar-track { height: 9px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.catbar-fill { height: 100%; background: var(--accent); border-radius: 999px; }

/* ---------- Day-of-week vertical bars ---------- */
.daybars { display: flex; align-items: flex-end; gap: 10px; height: 150px; padding-top: 18px; }
.daycol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; height: 100%; }
.daycol .dv { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--ink); }
.daycol .dbar { width: 100%; max-width: 34px; background: var(--accent); border-radius: 5px 5px 0 0; min-height: 3px; }
.daycol .dl { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }

/* ---------- Tables ---------- */
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow); }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
.tickets-table { min-width: 820px; }
thead th {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .05em; text-transform: uppercase;
  color: var(--muted); text-align: left; font-weight: 600; padding: 11px 14px;
  border-bottom: 1px solid var(--line-strong); background: var(--surface-2); white-space: nowrap;
}
tbody td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--surface-2); }
tfoot td { padding: 12px 14px; border-top: 1px solid var(--line-strong); font-weight: 700; background: var(--surface-2); }
td.num, th.num { font-variant-numeric: tabular-nums; text-align: right; }
.t-title { font-weight: 600; color: var(--ink); }
.t-sub { font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }
.mini-bar { display: inline-block; height: 7px; background: var(--accent); border-radius: 999px; vertical-align: middle; }

/* detalle categoria row bar cell */
.pct-cell { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
.pct-cell .mini-track { width: 60px; height: 7px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.pct-cell .mini-fill { height: 100%; background: var(--accent); }

/* ---------- Chips / badges ---------- */
.chip { font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #fff; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.cat-tag { font-size: 12px; color: var(--ink-soft); }

.pri { font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; white-space: nowrap; }
.pri.Alta { color: var(--crit); background: var(--crit-w); }
.pri.Media { color: var(--high); background: var(--high-w); }
.pri.Baja { color: var(--low); background: var(--low-w); }

.status-pill { font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 8px; border: 1px solid var(--line-strong); color: var(--ink-soft); background: var(--surface); white-space: nowrap; }
.status-pill.nuevo { border-color: var(--info); color: var(--info); }
.status-pill.en_progreso { border-color: var(--accent); color: var(--accent-ink); background: var(--accent-wash); }
.status-pill.en_espera { border-color: var(--high); color: var(--high); }
.status-pill.resuelto { border-color: var(--accent); color: var(--accent-ink); background: var(--accent-wash); }

/* ---------- Resumen block (text list with icons) ---------- */
.resumen-lead { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
.resumen-lead .ri { width: 34px; height: 34px; border-radius: 50%; background: var(--accent-wash); color: var(--accent-ink); display: grid; place-items: center; flex-shrink: 0; }
.resumen-lead p { margin: 0; font-size: 13px; color: var(--ink-soft); }
.resumen-item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--line); }
.resumen-item .ri { width: 30px; height: 30px; border-radius: 50%; background: var(--accent-wash); color: var(--accent-ink); display: grid; place-items: center; flex-shrink: 0; }
.resumen-item .rt { font-weight: 700; font-size: 13px; }
.resumen-item .rd { font-size: 12.5px; color: var(--accent-ink); }

/* ---------- Filters ---------- */
.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
.filters select { width: auto; min-width: 150px; padding: 7px 10px; font-size: 13px; }
.filters .fcount { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }

.req-select { font-size: 12px; padding: 4px 8px; min-width: 140px; cursor: pointer; }
.collab-add { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.collab-add input { flex: 1; min-width: 150px; }
.collab-add select { width: auto; min-width: 130px; }
.collab-list { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.collab-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface-2); font-size: 13.5px; }

/* ---------- Configuracion ---------- */
.cfg-card { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.cfg-head { font-family: var(--font-mono); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; display: flex; align-items: center; gap: 8px; }
.cfg-count { font-size: 11px; color: var(--accent-ink); background: var(--accent-wash); border-radius: 999px; padding: 1px 8px; }
.cfg-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; }
.cfg-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface-2); }
.cfg-edit { display: flex; align-items: center; gap: 6px; flex: 1; margin: 0; }
.cfg-name { flex: 1; font-size: 13.5px; }
.cfg-name-input { flex: 1; font-size: 13px; padding: 5px 8px; }
.swatch-input { width: 30px; height: 30px; padding: 0; border: 1px solid var(--line-strong); border-radius: 6px; background: none; cursor: pointer; flex-shrink: 0; }
.cfg-add { display: flex; align-items: center; gap: 8px; padding-top: 6px; border-top: 1px solid var(--line); flex-wrap: wrap; }
.cfg-add input[type=text] { flex: 1; min-width: 120px; font-size: 13px; padding: 7px 10px; }
.cfg-add select { width: auto; min-width: 120px; font-size: 13px; padding: 7px 10px; }
.cfg-add input[type=email], .cfg-add input[type=tel] { flex: 1; min-width: 110px; font-size: 13px; padding: 7px 10px; }
.cfg-edit-collab { flex-wrap: wrap; row-gap: 8px; }
.cfg-edit-collab .cfg-name-input { flex: 1.4; min-width: 170px; }
.cfg-contact-input { width: auto; min-width: 150px; flex: 1; font-size: 13px; padding: 5px 8px; }
.btn.danger { color: var(--crit); border-color: var(--line-strong); padding: 5px 9px; }
.btn.danger:hover { border-color: var(--crit); background: var(--crit-w); }

.cfg-sla-form { display: flex; align-items: center; gap: 3px; margin: 0; flex-shrink: 0; }
.cfg-sla-input { width: 52px; font-size: 12.5px; padding: 5px 6px; text-align: right; font-variant-numeric: tabular-nums; }
.cfg-sla-suffix { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
.cfg-row-canned { align-items: flex-start; }
.cfg-canned-text { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: 13px; }
.cfg-canned-text span { line-height: 1.4; }
.cfg-add-col { flex-direction: column; align-items: stretch; }
.cfg-add-col input, .cfg-add-col textarea { width: 100%; }
.cfg-add-col button { align-self: flex-start; }

/* ---------- SLA chip ---------- */
.sla-chip { font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); }
.sla-chip.warn { color: var(--high); background: var(--high-w); border-color: transparent; }
.sla-chip.crit { color: var(--crit); background: var(--crit-w); border-color: transparent; }
.sla-chip.ok { color: var(--low); background: var(--low-w); border-color: transparent; }
.sc-ic.red { background: var(--crit-w); color: var(--crit); }

/* ---------- Respuestas rapidas (en dialog de ticket) ---------- */
.canned-select { margin: 8px 0; font-size: 12.5px; padding: 7px 10px; }

/* ---------- Ticket detail ---------- */
.ticket-open { background: none; border: 0; padding: 0; text-align: left; cursor: pointer; font-weight: 600; color: var(--ink); font-size: inherit; font-family: inherit; }
.ticket-open:hover { color: var(--accent-ink); text-decoration: underline; }
dialog.ticket-detail { max-width: 640px; }
.ticket-detail .dialog-body { max-height: 72vh; overflow-y: auto; }
.ticket-meta-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.restime { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
.restime-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.restime-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .03em; text-transform: uppercase; color: var(--muted); }
.restime-value { font-size: 13px; color: var(--ink); font-weight: 600; }
.restime-modes { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: var(--ink-soft); }
.restime-opt { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.restime-manual { display: flex; align-items: center; gap: 6px; }
.restime-input { width: 56px; font-size: 12.5px; padding: 5px 6px; text-align: right; font-variant-numeric: tabular-nums; }

.comments-block { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); }
.comments-list { display: flex; flex-direction: column; gap: 10px; margin: 12px 0 16px; max-height: 240px; overflow-y: auto; }
.comment-item { background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.comment-top { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; margin-bottom: 4px; gap: 10px; }
.comment-top b { color: var(--ink); }
.comment-item p { margin: 0; font-size: 13.5px; color: var(--ink-soft); white-space: pre-wrap; }
.comment-add { display: flex; flex-direction: column; gap: 8px; }
.comment-add input[type=text] { font-size: 13px; }
.comment-add textarea { font-size: 13px; min-height: 56px; }
.comment-add button { align-self: flex-end; }

/* ---------- Forms / dialog ---------- */
.form-grid { display: grid; gap: 14px; }
.field label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .03em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
input[type=text], input[type=range], textarea, select {
  width: 100%; font-family: var(--font-sans); font-size: 14px; color: var(--ink);
  background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); padding: 9px 11px;
}
option { background: var(--surface); color: var(--ink); }
textarea { resize: vertical; min-height: 68px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

dialog {
  border: 1px solid var(--line-strong); border-radius: var(--radius); padding: 0; background: var(--surface); color: var(--ink);
  max-width: 560px; width: calc(100% - 32px); box-shadow: 0 24px 60px -20px rgba(0,0,0,.7);
}
dialog::backdrop { background: rgba(3,6,10,.65); backdrop-filter: blur(2px); }
.dialog-head { padding: 18px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; }
.dialog-head h3 { font-size: 1.05rem; }
.dialog-body { padding: 20px; }
.dialog-foot { padding: 16px 20px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.x-btn { background: none; border: 0; font-size: 20px; color: var(--muted); cursor: pointer; line-height: 1; }
.pv-meta { font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

.empty { text-align: center; padding: 50px 20px; color: var(--muted); }
.empty .big { font-size: 2rem; margin-bottom: 8px; }
.mono { font-family: var(--font-mono); }

/* ---------- Rutas de trabajo (modulo) ---------- */
.company-head { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; }
.init-card { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.init-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.init-title { font-size: 1rem; font-weight: 680; letter-spacing: -.01em; }
.init-sub { font-size: 12px; margin-top: 3px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

/* Titulo de ruta editable en linea */
.init-head { flex: 1; min-width: 0; }
.init-title-form { margin: 0; }
.init-title-input {
  font-family: var(--font-sans); font-size: 1rem; font-weight: 680; letter-spacing: -.01em;
  color: var(--ink); background: transparent; border: 1px solid transparent;
  border-radius: 6px; padding: 3px 6px; margin: -3px -6px; width: calc(100% + 12px);
}
.init-title-input:hover { border-color: var(--line-strong); background: var(--surface-2); }
.init-title-input:focus { border-color: var(--accent); background: var(--surface-2); outline: none; }
.area-tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase; color: var(--accent-ink); background: var(--accent-wash); padding: 2px 7px; border-radius: 5px; }

/* Fecha limite de la ruta */
.init-due-row { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
.init-due-form { margin: 0; }
.init-due-input { font-family: var(--font-mono); font-size: 11px; padding: 4px 6px; color: var(--ink-soft); }

.init-status { font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--line-strong); color: var(--ink-soft); background: var(--surface-2); }
.init-status.planificado { border-color: var(--faint); color: var(--muted); }
.init-status.en_curso { border-color: var(--accent); color: var(--accent-ink); background: var(--accent-wash); }
.init-status.en_pausa { border-color: var(--high); color: var(--high); }
.init-status.completado { border-color: var(--accent); color: var(--accent-ink); background: var(--accent-wash); }

.init-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.init-del { background: none; border: 1px solid var(--line-strong); color: var(--faint); cursor: pointer; font-size: 11px; padding: 4px 7px; border-radius: 8px; line-height: 1; }
.init-del:hover { color: var(--crit); border-color: var(--crit); background: var(--crit-w); }

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-track { flex: 1; height: 8px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999px; transition: width .3s ease; }
@media (prefers-reduced-motion: reduce) { .progress-fill { transition: none; } }
.progress-label { font-size: 11.5px; color: var(--muted); white-space: nowrap; }

.checklist { display: flex; flex-direction: column; gap: 2px; }
.task-row { margin: 0; }
.task-check { display: flex; align-items: flex-start; gap: 9px; padding: 5px 4px; border-radius: 6px; cursor: pointer; font-size: 13.5px; color: var(--ink-soft); }
.task-check:hover { background: var(--surface-2); }
.task-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.task-check .box { flex-shrink: 0; width: 17px; height: 17px; margin-top: 1px; border: 1.5px solid var(--line-strong); border-radius: 5px; display: grid; place-items: center; transition: all .15s ease; }
.task-check .box::after { content: "\2713"; font-size: 11px; color: #0A0E15; opacity: 0; font-weight: 700; }
.task-check.done .box { background: var(--accent); border-color: var(--accent); }
.task-check.done .box::after { opacity: 1; }
.task-check.done .task-title { color: var(--faint); text-decoration: line-through; }

.add-task { margin-top: 2px; }
.add-task input { font-size: 13px; padding: 7px 10px; border-style: dashed; background: transparent; }
.add-task input:focus { border-style: solid; }

/* ---------- Task item (rutas de trabajo, editable) ---------- */
.task-item { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-radius: 6px; }
.task-item:hover { background: var(--surface-2); }
.task-check-box { display: flex; align-items: center; cursor: pointer; flex-shrink: 0; }
.task-check-box input { position: absolute; opacity: 0; width: 0; height: 0; }
.task-check-box .box { width: 17px; height: 17px; border: 1.5px solid var(--line-strong); border-radius: 5px; display: grid; place-items: center; transition: all .15s ease; }
.task-check-box .box::after { content: "\2713"; font-size: 11px; color: #0A0E15; opacity: 0; font-weight: 700; }
.task-item.done .task-check-box .box { background: var(--accent); border-color: var(--accent); }
.task-item.done .task-check-box .box::after { opacity: 1; }
.task-title-form { flex: 1; margin: 0; min-width: 0; }
.task-title-input { border: 1px solid transparent; background: transparent; padding: 4px 6px; font-size: 13.5px; color: var(--ink-soft); width: 100%; }
.task-title-input:hover, .task-title-input:focus { border-color: var(--line-strong); background: var(--surface); color: var(--ink); }
.task-item.done .task-title-input { color: var(--faint); text-decoration: line-through; }
.task-del { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 12px; padding: 3px 7px; border-radius: 5px; opacity: 0; transition: opacity .15s ease; flex-shrink: 0; }
.task-item:hover .task-del { opacity: 1; }
.task-del:hover { color: var(--crit); background: var(--crit-w); }

.task-drag-row { display: flex; align-items: center; gap: 2px; border-radius: 6px; }
.task-drag-row .task-item { flex: 1; }
.task-drag-row.over { background: var(--accent-wash); outline: 1px dashed var(--accent); outline-offset: -1px; }
.task-handle { cursor: grab; color: var(--faint); font-size: 12px; padding: 0 2px; flex-shrink: 0; line-height: 1; user-select: none; }
.task-handle:active { cursor: grabbing; }
.task-drag-row:hover .task-handle { color: var(--muted); }

.setup { max-width: 720px; margin: 20px auto; }
.setup .card { padding: 28px; }
.setup h2 { font-size: 1.4rem; margin-bottom: 8px; }
.setup p { color: var(--ink-soft); margin: 0 0 16px; }
.steps { counter-reset: s; list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.steps li { counter-increment: s; position: relative; padding-left: 40px; }
.steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 26px; height: 26px; border-radius: 50%; background: var(--accent-wash); color: var(--accent-ink); font-family: var(--font-mono); font-weight: 700; font-size: 13px; display: grid; place-items: center; }
.steps li b { color: var(--ink); }
code { font-family: var(--font-mono); font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; }
.callout { border-left: 3px solid var(--accent); background: var(--accent-wash); padding: 12px 15px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 13.5px; color: var(--ink-soft); }

/* ============================================================
   RESPONSIVE
   Las reglas viven al final del archivo a proposito: al tener la
   misma especificidad que las de escritorio, ganan por orden.
   Puntos de quiebre: 1080 / 980 / 820 / 760 / 640 / 560 / 420
   ============================================================ */

/* Nav lateral: contenedor propio para poder reorganizarlo en movil */
.sidebar-nav { display: flex; flex-direction: column; gap: 6px; }

/* Botones subir/bajar tarea: ocultos en escritorio (ahi se arrastra) */
.task-move { display: none; flex-direction: column; gap: 1px; flex-shrink: 0; }
.task-move button {
  background: none; border: 1px solid var(--line-strong); color: var(--muted);
  border-radius: 4px; cursor: pointer; font-size: 9px; line-height: 1;
  padding: 3px 5px; min-height: 22px;
}
.task-move button:disabled { opacity: .3; cursor: default; }
.task-move button:not(:disabled):hover { color: var(--accent-ink); border-color: var(--accent); }

/* ---------- <= 820px: la barra lateral pasa a cabecera ---------- */
@media (max-width: 820px) {
  .app { grid-template-columns: 1fr; }
  .sidebar {
    position: static; height: auto; flex-direction: column; gap: 10px;
    padding: 12px 14px; border-right: 0; border-bottom: 1px solid var(--line);
  }
  .sidebar .spacer, .side-foot, .nav-label { display: none; }
  .brand { padding: 0; }
  .sidebar-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .navlink { justify-content: center; padding: 9px 6px; font-size: 12px; gap: 7px; }
  /* con el nav centrado, la insignia no debe empujarse a la derecha */
  .nav-badge { margin-left: 0; }
}

/* ---------- <= 760px: tablet estrecha y movil ---------- */
@media (max-width: 760px) {
  .content { padding: 16px 14px 48px; }
  .topbar { padding: 12px 14px; flex-wrap: wrap; gap: 12px; }
  .topbar .push { margin-left: 0; width: 100%; }
  .topbar .push .btn { flex: 1; justify-content: center; }

  /* Cabecera del dashboard */
  .report-head { gap: 16px; margin-bottom: 18px; }
  .stat-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
  .stat-card { min-width: 0; padding: 12px 14px; gap: 11px; }
  .stat-card .sc-ic { width: 34px; height: 34px; }
  .stat-card .sc-ic svg { width: 16px; height: 16px; }
  .stat-card .sc-v { font-size: 1.45rem; }
  .panel { padding: 15px 16px; }

  /* Franja de aviso: el enlace baja a su propia linea */
  .alert-bar { flex-wrap: wrap; row-gap: 6px; }
  .alert-bar .ab-txt { flex: 1 1 auto; }
  .alert-bar .ab-cta { flex: 1 1 100%; text-align: right; }

  /* Filtros: dos por fila */
  .filters { gap: 8px; }
  .filters select { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .filters .fcount { flex: 1 1 100%; margin-left: 0; text-align: right; }

  /* --- Tabla de tickets -> tarjetas apiladas --- */
  .tickets-table { min-width: 0; }
  .tickets-table thead { display: none; }
  .tickets-table tbody tr { display: block; padding: 12px 14px; border-bottom: 1px solid var(--line-strong); }
  .tickets-table tbody tr:last-child { border-bottom: 0; }
  .tickets-table tbody tr:hover td { background: transparent; }
  .tickets-table tbody td {
    display: grid; grid-template-columns: 92px minmax(0, 1fr);
    gap: 10px; align-items: center; padding: 4px 0; border-bottom: 0;
  }
  .tickets-table tbody td::before {
    content: attr(data-label);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: var(--muted);
  }
  /* El asunto es el titulo de la tarjeta: sin etiqueta y a todo el ancho */
  .tickets-table tbody td[data-label="Asunto"] { grid-template-columns: minmax(0, 1fr); padding: 0 0 8px; }
  .tickets-table tbody td[data-label="Asunto"]::before { display: none; }
  .tickets-table tbody td[data-label="Asunto"] .ticket-open { font-size: 15px; }
  .req-select { width: 100%; min-width: 0; }

  /* Rutas de trabajo */
  .init-card { padding: 14px; }
  .task-handle { display: none; }          /* arrastrar no funciona al tacto */
  .task-move { display: flex; }            /* ...se reordena con botones */
  .task-drag-row { gap: 6px; }
  .task-title-input { border-color: var(--line); }

  /* Configuracion */
  .cfg-list { max-height: none; }
  .cfg-add { flex-wrap: wrap; }
  .cfg-add input[type=text] { flex: 1 1 100%; }
  .cfg-add select { flex: 1 1 auto; }
}

/* ---------- <= 640px: dialogos a pantalla casi completa ---------- */
@media (max-width: 640px) {
  dialog { width: calc(100% - 20px); max-width: none; }
  dialog.ticket-detail { max-width: none; }
  .dialog-head, .dialog-foot { padding: 14px 16px; }
  .dialog-body { padding: 16px; }
  .dialog-foot { flex-direction: column; align-items: stretch; gap: 10px; }
  .dialog-foot > div { display: flex; gap: 8px; }
  .dialog-foot > div .btn { flex: 1; justify-content: center; }
  .row2 { grid-template-columns: 1fr; }
  .ticket-detail .dialog-body { max-height: 78vh; }
  .collab-add { flex-direction: column; align-items: stretch; }
  .collab-add select { width: 100%; }
}

/* ---------- <= 560px: movil ---------- */
@media (max-width: 560px) {
  .sidebar-nav { grid-template-columns: 1fr 1fr; }
  .navlink { font-size: 13px; }
  .report-head .rh-title { font-size: 1.35rem; }
  .daterange { width: 100%; }
  .daterange label { flex: 1; }
  .daterange input[type=date] { width: 100%; }
  .cfg-row { flex-wrap: wrap; row-gap: 6px; }
  .cfg-edit { flex: 1 1 100%; }
  .init-top { flex-wrap: wrap; row-gap: 10px; }
  .init-actions { width: 100%; justify-content: flex-end; }
  .tickets-table tbody td { grid-template-columns: 80px minmax(0, 1fr); gap: 8px; }
}

/* ---------- <= 420px: pantallas muy estrechas ---------- */
@media (max-width: 420px) {
  .content { padding: 14px 11px 40px; }
  .stat-cards { grid-template-columns: 1fr; }
  .filters select { flex: 1 1 100%; }
  .daybars { gap: 5px; }
  .daycol .dl { font-size: 10px; }
}
```

---

## 15.6 Componentes

### `components/NavLink.tsx`

Enlace del menú: icono, estado activo e **insignia de avisos de SLA** (roja vencidos, ámbar por vencer).

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  grid: (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  inbox: (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  route: (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" />
      <path d="M9 19h6a3 3 0 0 0 3-3V8" /><path d="M6 16V8" />
    </svg>
  ),
  settings: (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export function NavLink({
  href, label, icon, badge = 0, badgeWarn = 0,
}: {
  href: string; label: string; icon: string;
  /** Vencidos: insignia roja. Tiene prioridad sobre badgeWarn. */
  badge?: number;
  /** Por vencer en <2h: insignia ambar. Solo si no hay vencidos. */
  badgeWarn?: number;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  const alerta =
    badge > 0
      ? { n: badge, tipo: "crit", texto: `${badge} fuera de SLA` }
      : badgeWarn > 0
      ? { n: badgeWarn, tipo: "warn", texto: `${badgeWarn} por vencer` }
      : null;

  return (
    <Link href={href} className={"navlink" + (active ? " active" : "")}>
      {icons[icon]}
      {label}
      {alerta && (
        <span className={"nav-badge " + alerta.tipo} title={alerta.texto}>
          {alerta.n}
          <span className="sr-only"> {alerta.texto}</span>
        </span>
      )}
    </Link>
  );
}
```

### `components/Setup.tsx`

Pantalla que sale cuando no hay base de datos conectada.

```tsx
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
```

### `components/DateRangeFilter.tsx`

Rango de fechas del dashboard. Desde el 2026-08-26 incluye presets rápidos (Todo/Hoy/3
días/1 semana/1 mes) calculados con `new Date()` en el cliente, además de los campos manuales
Desde/Hasta de siempre para un rango personalizado.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(d: Date, delta: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + delta);
  return r;
}

const PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "3 días", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "1 mes", days: 30 },
];

export function DateRangeFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const goTo = (params: URLSearchParams) => {
    router.push(pathname + (params.toString() ? "?" + params.toString() : ""));
  };

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    goTo(p);
  };

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set("from", f);
    p.set("to", t);
    goTo(p);
  };

  const clear = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("from");
    p.delete("to");
    goTo(p);
  };

  const today = new Date();
  const todayStr = ymd(today);

  return (
    <div className="daterange-wrap">
      <div className="dr-presets">
        <button
          type="button"
          className={"btn sm" + (!from && !to ? " active" : "")}
          onClick={clear}
        >
          Todo
        </button>
        {PRESETS.map((p) => {
          const f = ymd(addDays(today, -p.days));
          const isActive = from === f && to === todayStr;
          return (
            <button
              key={p.label}
              type="button"
              className={"btn sm" + (isActive ? " active" : "")}
              onClick={() => setRange(f, todayStr)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="daterange">
        <label>
          Desde
          <input type="date" value={from} max={to || undefined} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} min={from || undefined} onChange={(e) => set("to", e.target.value)} />
        </label>
        {(from || to) && (
          <button type="button" className="btn sm" onClick={clear}>Limpiar</button>
        )}
      </div>
    </div>
  );
}
```

### `components/Filters.tsx`

Los cinco filtros de la bandeja.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function Filters({ companies, categories, collaborators, count }: { companies: any[]; categories: string[]; collaborators: any[]; count: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <div className="filters">
      <select value={sp.get("company") || ""} onChange={(e) => set("company", e.target.value)}>
        <option value="">Todas las empresas</option>
        {companies.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={sp.get("category") || ""} onChange={(e) => set("category", e.target.value)}>
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select value={sp.get("priority") || ""} onChange={(e) => set("priority", e.target.value)}>
        <option value="">Toda prioridad</option>
        {["Alta", "Media", "Baja"].map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select value={sp.get("requester") || ""} onChange={(e) => set("requester", e.target.value)}>
        <option value="">Todos los solicitantes</option>
        {collaborators.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={sp.get("status") || ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">Todo estado</option>
        <option value="abiertos">Solo abiertos</option>
        <option value="nuevo">Nuevo</option>
        <option value="en_progreso">En progreso</option>
        <option value="en_espera">En espera</option>
        <option value="resuelto">Cerrado</option>
      </select>
      <span className="fcount">{count} tickets</span>
    </div>
  );
}
```

### `components/FiltersCompanyClient.tsx`

Filtro de empresa de `/rutas`.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function FiltersCompanyClient({ companies }: { companies: any[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const set = (v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set("company", v);
    else p.delete("company");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <select value={sp.get("company") || ""} onChange={(e) => set(e.target.value)}>
      <option value="">Todas las empresas</option>
      {companies.map((c) => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  );
}
```

### `components/NewTicketDialog.tsx`

Diálogo de alta de ticket. **La lista de categorías es la de `categories` (BD), sin mezclar nada
más** — hasta el 2026-08-27 se combinaba con `TICKET_CATEGORIES`, una lista de 10 categorías
grabada en el código en el momento del import del CSV. Esa lista nunca se actualizó cuando el
usuario editó o borró categorías desde `/config`, así que categorías ya eliminadas (o renombradas,
como "Flota (Tablets)" → "Flota - Tablets / Celulares") seguían apareciendo como opción al crear
un ticket nuevo. `TICKET_CATEGORIES` se eliminó de `lib/priority.ts` (§14) — no queda ningún otro
lugar del proyecto con un patrón similar, ver auditoría en §14.

```tsx
"use client";

import { useRef, useState } from "react";
import { createTicket } from "@/app/actions";

export function NewTicketDialog({ companies, categories, collaborators }: { companies: any[]; categories: string[]; collaborators: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button className="btn primary" onClick={() => ref.current?.showModal()}>
        + Nuevo ticket
      </button>
      <dialog ref={ref}>
        <form
          action={async (fd) => {
            setBusy(true);
            await createTicket(fd);
            setBusy(false);
            ref.current?.close();
          }}
        >
          <div className="dialog-head">
            <h3>Nuevo ticket</h3>
            <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
          </div>
          <div className="dialog-body form-grid">
            <div className="field">
              <label>Asunto *</label>
              <input type="text" name="title" required placeholder="Describe el requerimiento en una línea" />
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea name="description" placeholder="Detalle del caso..." />
            </div>
            <div className="row2">
              <div className="field">
                <label>Empresa *</label>
                <select name="company_id" required defaultValue="">
                  <option value="" disabled>Selecciona...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Categoría</label>
                <select name="category" defaultValue="Otros">
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Prioridad</label>
                <select name="priority" defaultValue="Baja">
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="field">
                <label>Solicitante</label>
                <select name="requester" defaultValue="">
                  <option value="">— sin asignar —</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="dialog-foot">
            <span className="pv-meta mono">Entra como "Nuevo" en la bandeja</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={() => ref.current?.close()}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "Creando..." : "Crear ticket"}</button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
```

### `components/TicketOpenLink.tsx`

Asunto clicable que añade `?ticket=N` a la URL.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function TicketOpenLink({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const open = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set("ticket", String(id));
    router.push(pathname + "?" + p.toString());
  };

  return (
    <button type="button" className="ticket-open" onClick={open} title="Ver detalle y comentarios">
      {title}
    </button>
  );
}
```

### `components/TicketDetailDialog.tsx`

Detalle: edición, `SlaBadge`, comentarios y respuestas rápidas.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { updateTicket, addComment } from "@/app/actions";
import { StatusControl } from "@/components/StatusControl";
import { slaInfo, fmtSlaHours } from "@/lib/priority";
import { fmtDateTimeDR as fmtDateTime, autoResolutionMinutes } from "@/lib/dates";
import { TicketResolutionTime } from "@/components/TicketResolutionTime";

function SlaBadge({ ticket }: { ticket: any }) {
  const s = slaInfo(ticket.created_at, ticket.resolved_at, ticket.status, ticket.cat_sla ?? 24, ticket.priority || "Baja");
  if (s.closed) {
    return s.onTime
      ? <span className="sla-chip ok">Cumplido en {s.targetHours}h objetivo</span>
      : <span className="sla-chip crit">Fuera de SLA (objetivo {s.targetHours}h)</span>;
  }
  if (!s.onTime) return <span className="sla-chip crit">Vencido hace {fmtSlaHours(s.hoursLeft)} · objetivo {s.targetHours}h</span>;
  return <span className={"sla-chip" + (s.hoursLeft <= 2 ? " warn" : "")}>Vence en {fmtSlaHours(s.hoursLeft)} · objetivo {s.targetHours}h</span>;
}

export function TicketDetailDialog({
  ticket, companies, categories, collaborators, canned,
}: {
  ticket: any; companies: any[]; categories: any[]; collaborators: any[]; canned: any[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const commentFormRef = useRef<HTMLFormElement>(null);
  const commentTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, [ticket.id]);

  const close = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("ticket");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
    <dialog
      ref={ref}
      className="ticket-detail"
      onClose={close}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="dialog-head">
        <div>
          <h3>Ticket #{ticket.id}</h3>
          <div className="ticket-meta-row">
            <span className="pv-meta">Creado {fmtDateTime(ticket.created_at)}</span>
            <StatusControl id={ticket.id} status={ticket.status} />
          </div>
          <div className="ticket-meta-row" style={{ marginTop: 6 }}>
            <SlaBadge ticket={ticket} />
          </div>
        </div>
        <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
      </div>

      <div className="dialog-body">
        <form
          action={async (fd) => {
            setSavingTicket(true);
            await updateTicket(fd);
            setSavingTicket(false);
          }}
          className="form-grid"
        >
          <input type="hidden" name="id" value={ticket.id} />
          <div className="field">
            <label>Asunto *</label>
            <input type="text" name="title" defaultValue={ticket.title} required />
          </div>
          <div className="field">
            <label>Descripción / comentario original</label>
            <textarea name="description" defaultValue={ticket.description || ""} rows={4} placeholder="Sin descripción" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Empresa *</label>
              <select name="company_id" defaultValue={ticket.company_id} required>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select name="category" defaultValue={ticket.category || "Otros"}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Prioridad</label>
              <select name="priority" defaultValue={ticket.priority || "Baja"}>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div className="field">
              <label>Solicitante</label>
              <select name="requester" defaultValue={ticket.requester || ""}>
                <option value="">— sin asignar —</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn primary" disabled={savingTicket}>
            {savingTicket ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        <TicketResolutionTime
          id={ticket.id}
          resolutionMinutes={ticket.resolution_minutes ?? null}
          autoMinutes={autoResolutionMinutes(ticket.created_at, ticket.resolved_at)}
        />

        <div className="comments-block">
          <div className="cfg-head">Comentarios <span className="cfg-count">{ticket.comments.length}</span></div>
          <div className="comments-list">
            {ticket.comments.length === 0 ? (
              <p className="pv-meta">Sin comentarios aún. Agrega el primero abajo.</p>
            ) : (
              ticket.comments.map((c: any) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-top">
                    <b>{c.author || "Sin nombre"}</b>
                    <span className="pv-meta">{fmtDateTime(c.created_at)}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))
            )}
          </div>

          {canned.length > 0 && (
            <select
              className="canned-select"
              defaultValue=""
              onChange={(e) => {
                const chosen = canned.find((c) => String(c.id) === e.target.value);
                if (chosen && commentTextRef.current) {
                  commentTextRef.current.value = chosen.text;
                  commentTextRef.current.focus();
                }
                e.target.value = "";
              }}
            >
              <option value="" disabled>💬 Insertar respuesta rápida...</option>
              {canned.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}

          <form
            ref={commentFormRef}
            action={async (fd) => {
              setSavingComment(true);
              await addComment(fd);
              setSavingComment(false);
              commentFormRef.current?.reset();
            }}
            className="comment-add"
          >
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <input type="text" name="author" placeholder="Tu nombre" />
            <textarea ref={commentTextRef} name="text" placeholder="Agregar comentario..." required rows={2} />
            <button type="submit" className="btn primary sm" disabled={savingComment}>
              {savingComment ? "..." : "Comentar"}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
```

### `components/TicketResolutionTime.tsx`

Tiempo de resolución del ticket, automático o manual (agregado 2026-08-28, §5.9). Vive fuera del
`<form>` principal de `TicketDetailDialog` porque tiene su propia Server Action
(`updateTicketResolutionTime`) — un `<form>` no puede anidar otro.

```tsx
"use client";

import { useState } from "react";
import { updateTicketResolutionTime } from "@/app/actions";
import { fmtDuration } from "@/lib/dates";

export function TicketResolutionTime({
  id, resolutionMinutes, autoMinutes,
}: { id: number; resolutionMinutes: number | null; autoMinutes: number | null }) {
  const [mode, setMode] = useState<"auto" | "manual">(resolutionMinutes != null ? "manual" : "auto");
  const [hours, setHours] = useState(resolutionMinutes != null ? Math.floor(resolutionMinutes / 60) : 0);
  const [minutes, setMinutes] = useState(resolutionMinutes != null ? resolutionMinutes % 60 : 0);

  const effective = mode === "manual" ? hours * 60 + minutes : autoMinutes;

  return (
    <form action={updateTicketResolutionTime} className="restime">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="restime-head">
        <span className="restime-label">Tiempo de resolución</span>
        <span className="restime-value mono">{effective != null ? fmtDuration(effective) : "— sin resolver aún —"}</span>
      </div>
      <div className="restime-modes">
        <label className="restime-opt">
          <input type="radio" name="mode-radio" checked={mode === "auto"} onChange={() => setMode("auto")} />
          Automático{autoMinutes != null ? ` (${fmtDuration(autoMinutes)}, creado → resuelto)` : " (se calcula al resolver)"}
        </label>
        <label className="restime-opt">
          <input type="radio" name="mode-radio" checked={mode === "manual"} onChange={() => setMode("manual")} />
          Manual
        </label>
      </div>
      {mode === "manual" && (
        <div className="restime-manual">
          <input
            type="number" name="hours" min={0} value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            className="restime-input"
          />
          <span className="pv-meta">h</span>
          <input
            type="number" name="minutes" min={0} max={59} value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
            className="restime-input"
          />
          <span className="pv-meta">m</span>
        </div>
      )}
      <button type="submit" className="btn sm">Guardar</button>
    </form>
  );
}
```

### `components/StatusControl.tsx`

Select de estado que se auto-envía.

```tsx
"use client";

import { useRef } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES, STATUS_LABEL } from "@/lib/priority";

export function StatusControl({ id, status }: { id: number; status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className={"status-pill " + status}
        style={{ cursor: "pointer", paddingRight: 22 }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
```

### `components/RequesterControl.tsx`

Select de solicitante; conserva a uno que ya no esté en la lista.

```tsx
"use client";

import { useRef } from "react";
import { setTicketRequester } from "@/app/actions";

export function RequesterControl({ id, requester, collaborators }: { id: number; requester: string | null; collaborators: any[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const names = collaborators.map((c) => c.name);
  const cur = requester || "";
  const extra = cur && !names.includes(cur) ? [cur] : [];

  return (
    <form ref={ref} action={setTicketRequester}>
      <input type="hidden" name="id" value={id} />
      <select
        name="requester"
        defaultValue={cur}
        onChange={() => ref.current?.requestSubmit()}
        className="req-select"
      >
        <option value="">— sin asignar —</option>
        {extra.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
        {collaborators.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </form>
  );
}
```

### `components/CollaboratorsDialog.tsx`

Alta rápida de colaboradores.

```tsx
"use client";

import { useRef, useState } from "react";
import { createCollaborator } from "@/app/actions";

export function CollaboratorsDialog({ collaborators, companies }: { collaborators: any[]; companies: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  const companyName = (id: number | null) => companies.find((c) => c.id === id)?.name || "";

  return (
    <>
      <button className="btn" onClick={() => ref.current?.showModal()}>
        Colaboradores
      </button>
      <dialog ref={ref}>
        <div className="dialog-head">
          <h3>Colaboradores</h3>
          <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
        </div>
        <div className="dialog-body">
          <form
            ref={formRef}
            action={async (fd) => {
              setBusy(true);
              await createCollaborator(fd);
              setBusy(false);
              formRef.current?.reset();
            }}
            className="collab-add"
          >
            <input type="text" name="name" placeholder="Nombre del colaborador" required />
            <select name="company_id" defaultValue="">
              <option value="">Empresa (opcional)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn primary sm" type="submit" disabled={busy}>{busy ? "..." : "Agregar"}</button>
          </form>
          <div className="collab-list">
            {collaborators.length === 0 ? (
              <p className="pv-meta">Aún no hay colaboradores.</p>
            ) : (
              collaborators.map((c) => (
                <div className="collab-item" key={c.id}>
                  <span>{c.name}</span>
                  {c.company_id ? <span className="pv-meta">{companyName(c.company_id)}</span> : null}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="dialog-foot">
          <span className="pv-meta mono">{collaborators.length} colaboradores</span>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>Cerrar</button>
        </div>
      </dialog>
    </>
  );
}
```

### `components/SlaInput.tsx`

Horas de SLA por categoría; guarda al perder el foco.

```tsx
"use client";

import { useRef } from "react";
import { updateCategorySla } from "@/app/actions";

export function SlaInput({ id, hours }: { id: number; hours: number | null }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={updateCategorySla} className="cfg-sla-form" title="SLA objetivo (horas, prioridad Media)">
      <input type="hidden" name="id" value={id} />
      <input
        type="number"
        name="sla_hours"
        defaultValue={hours ?? 24}
        min={1}
        onBlur={() => ref.current?.requestSubmit()}
        className="cfg-sla-input"
      />
      <span className="cfg-sla-suffix">h</span>
    </form>
  );
}
```

### `components/NewInitiativeDialog.tsx`

Alta de ruta; el textarea crea una tarea por línea.

```tsx
"use client";

import { useRef, useState } from "react";
import { createInitiative } from "@/app/actions";

export function NewInitiativeDialog({ companies }: { companies: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button className="btn primary" onClick={() => ref.current?.showModal()}>
        + Nueva ruta
      </button>
      <dialog ref={ref}>
        <form
          action={async (fd) => {
            setBusy(true);
            await createInitiative(fd);
            setBusy(false);
            ref.current?.close();
          }}
        >
          <div className="dialog-head">
            <h3>Nueva ruta de trabajo</h3>
            <button type="button" className="x-btn" onClick={() => ref.current?.close()}>&times;</button>
          </div>
          <div className="dialog-body form-grid">
            <div className="row2">
              <div className="field">
                <label>Empresa *</label>
                <select name="company_id" required defaultValue="">
                  <option value="" disabled>Selecciona...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Area / servicio</label>
                <input type="text" name="area" placeholder="Ej: Fortinet, SINCO ERP, Cisco..." />
              </div>
            </div>
            <div className="field">
              <label>Titulo de la ruta *</label>
              <input type="text" name="title" required placeholder="Ej: Aseguramiento perimetral FortiGate" />
            </div>
            <div className="row2">
              <div className="field">
                <label>Responsable</label>
                <input type="text" name="owner" placeholder="Quien lidera" />
              </div>
              <div className="field">
                <label>Fecha límite</label>
                <input type="date" name="due_date" />
              </div>
            </div>
            <div className="field">
              <label>Tareas (una por linea)</label>
              <textarea name="tasks" rows={5} placeholder={"Inventario de equipos\nRevisar politicas\nPlan de actualizacion"} />
            </div>
          </div>
          <div className="dialog-foot">
            <span className="pv-meta mono">Las tareas se convierten en checklist con avance</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={() => ref.current?.close()}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "Creando..." : "Crear ruta"}</button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
```

### `components/InitiativeDueDate.tsx`

Fecha límite de la ruta, guarda al cambiar (mismo patrón "auto-enviar al cambiar" que `StatusControl`). Agregado 2026-08-25 (§14).

```tsx
"use client";

import { useRef } from "react";
import { updateInitiativeDueDate } from "@/app/actions";

export function InitiativeDueDate({ id, dueDate }: { id: number; dueDate: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={updateInitiativeDueDate} className="init-due-form">
      <input type="hidden" name="id" value={id} />
      <input
        type="date"
        name="due_date"
        defaultValue={dueDate ?? ""}
        onChange={() => ref.current?.requestSubmit()}
        className="init-due-input"
        title="Fecha límite de la ruta"
      />
    </form>
  );
}
```

### `components/InitiativeStatusControl.tsx`

Select de estado de una ruta.

```tsx
"use client";

import { useRef } from "react";
import { setInitiativeStatus } from "@/app/actions";
import { INITIATIVE_STATUSES, INITIATIVE_STATUS_LABEL } from "@/lib/priority";

export function InitiativeStatusControl({ id, status }: { id: number; status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setInitiativeStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => ref.current?.requestSubmit()}
        className={"init-status " + status}
        style={{ cursor: "pointer" }}
      >
        {INITIATIVE_STATUSES.map((s) => (
          <option key={s} value={s}>{INITIATIVE_STATUS_LABEL[s]}</option>
        ))}
      </select>
    </form>
  );
}
```

### `components/InitiativeTitle.tsx`

**Título de ruta editable en línea.**

```tsx
"use client";

import { useRef, useState } from "react";
import { updateInitiativeTitle } from "@/app/actions";

export function InitiativeTitle({ id, title }: { id: number; title: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(title);

  return (
    <form ref={ref} action={updateInitiativeTitle} className="init-title-form">
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() && value !== title) ref.current?.requestSubmit();
          else if (!value.trim()) setValue(title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setValue(title); (e.target as HTMLInputElement).blur(); }
        }}
        className="init-title-input"
        title="Clic para editar el título de la ruta"
      />
    </form>
  );
}
```

### `components/DeleteInitiativeButton.tsx`

Elimina una ruta completa (tareas por `ON DELETE CASCADE`).

```tsx
"use client";

import { deleteInitiative } from "@/app/actions";

export function DeleteInitiativeButton({ id }: { id: number }) {
  return (
    <form action={deleteInitiative}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="init-del"
        title="Eliminar ruta"
        onClick={(e) => {
          if (!confirm("¿Eliminar esta ruta y todas sus tareas?")) e.preventDefault();
        }}
      >
        ✕
      </button>
    </form>
  );
}
```

### `components/TaskList.tsx`

Arrastrar en escritorio, **botones ▲▼ en móvil** (el arrastre HTML5 no responde al tacto).

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { reorderTasks } from "@/app/actions";
import { TaskItem } from "@/components/TaskItem";

type Task = { id: number; done: boolean; title: string };

export function TaskList({ initiativeId, tasks }: { initiativeId: number; tasks: Task[] }) {
  const [items, setItems] = useState<Task[]>(tasks);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const persist = (next: Task[]) => {
    const fd = new FormData();
    fd.set("initiative_id", String(initiativeId));
    fd.set("order", next.map((t) => t.id).join(","));
    reorderTasks(fd);
  };

  // El arrastrar-soltar de HTML5 no existe en pantallas tactiles:
  // en movil se reordena con estos botones (ver .task-move en globals.css).
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persist(next);
  };

  const onDrop = (index: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === index) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setItems(next);
    persist(next);
  };

  return (
    <div className="checklist">
      {items.map((t, i) => (
        <div
          key={t.id}
          draggable
          onDragStart={() => (dragIndex.current = i)}
          onDragOver={(e) => {
            e.preventDefault();
            if (overIndex !== i) setOverIndex(i);
          }}
          onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
          onDrop={() => onDrop(i)}
          onDragEnd={() => {
            dragIndex.current = null;
            setOverIndex(null);
          }}
          className={"task-drag-row" + (overIndex === i ? " over" : "")}
        >
          <span className="task-handle" aria-hidden="true" title="Arrastrar para reordenar">⠿</span>
          <div className="task-move">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir tarea">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar tarea">▼</button>
          </div>
          <TaskItem id={t.id} done={t.done} title={t.title} />
        </div>
      ))}
    </div>
  );
}
```

### `components/TaskItem.tsx`

Tarea: casilla, título editable y borrar.

```tsx
"use client";

import { useRef, useState } from "react";
import { toggleTask, updateTaskTitle, deleteTask } from "@/app/actions";

export function TaskItem({ id, done, title }: { id: number; done: boolean; title: string }) {
  const toggleRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLFormElement>(null);
  const deleteRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(title);

  return (
    <div className={"task-item" + (done ? " done" : "")}>
      <form ref={toggleRef} action={toggleTask}>
        <input type="hidden" name="id" value={id} />
        <label className="task-check-box">
          <input type="checkbox" defaultChecked={done} onChange={() => toggleRef.current?.requestSubmit()} />
          <span className="box" aria-hidden="true" />
        </label>
      </form>

      <form ref={titleRef} action={updateTaskTitle} className="task-title-form">
        <input type="hidden" name="id" value={id} />
        <input
          type="text"
          name="title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim() && value !== title) titleRef.current?.requestSubmit();
            else if (!value.trim()) setValue(title);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setValue(title); (e.target as HTMLInputElement).blur(); }
          }}
          className="task-title-input"
        />
      </form>

      <form ref={deleteRef} action={deleteTask}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="task-del"
          title="Eliminar tarea"
          onClick={(e) => { if (!confirm("¿Eliminar esta tarea?")) e.preventDefault(); }}
        >
          ✕
        </button>
      </form>
    </div>
  );
}
```

### `components/AddTaskForm.tsx`

Input "+ Agregar tarea".

```tsx
"use client";

import { useRef } from "react";
import { addTask } from "@/app/actions";

export function AddTaskForm({ initiativeId }: { initiativeId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addTask(fd);
        ref.current?.reset();
      }}
      className="add-task"
    >
      <input type="hidden" name="initiative_id" value={initiativeId} />
      <input type="text" name="title" placeholder="+ Agregar tarea" autoComplete="off" />
    </form>
  );
}
```

---

*Fin del traspaso. Ver también `CONTINUIDAD.md`.*
