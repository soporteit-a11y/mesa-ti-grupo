# HANDOFF — Mesa TI · Grupo Empresarial

> **Propósito de este documento.** Es un traspaso completo y autocontenido del proyecto.
> Si lo pegas en cualquier otro LLM/IA (ChatGPT, Gemini, Copilot, otro Claude, etc.), esa IA
> tiene aquí **todo** lo necesario para entender el sistema y reconstruirlo idéntico desde cero:
> contexto de negocio, decisiones de arquitectura, esquema de base de datos, el código fuente
> íntegro de los 33 archivos, el sistema de diseño, el procedimiento de despliegue y las trampas
> ya descubiertas.
>
> **Fecha del traspaso:** 24 de agosto de 2026
> **Estado:** en producción y en uso real.

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

Está implementado **dos veces y ambas deben mantenerse sincronizadas**:

1. En TypeScript — `slaInfo()` en `lib/priority.ts`, usado para pintar cada chip de la tabla y la
   insignia del diálogo de detalle.
2. En SQL — la expresión `COUNT(*) FILTER (...)` con `CASE t.priority WHEN 'Alta' THEN 0.5 ...`
   dentro de `getSupportDashboard()` en `lib/data.ts`, que calcula el KPI "Fuera de SLA".

Si cambias los multiplicadores, **cámbialos en los dos sitios.**

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

---

## 6. Modelo de datos

Nueve tablas en Postgres. Este es el esquema efectivo que produce `ensureSchema()`:

```sql
companies         (id, name UNIQUE, slug, color)
services          (id, name UNIQUE, weight, vendor, sla_hours)
categories        (id, name UNIQUE, sla_hours DEFAULT 24)
collaborators     (id, name UNIQUE, company_id → companies)
tickets           (id, title, description, company_id → companies, service_id,
                   category, urgency, impact, weight, score, priority,
                   status DEFAULT 'resuelto', requester, assignee, sla_hours,
                   created_at, updated_at, resolved_at)
ticket_comments   (id, ticket_id → tickets ON DELETE CASCADE, author, text, created_at)
initiatives       (id, company_id → companies, title, area,
                   status DEFAULT 'planificado', owner, created_at)
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
  categoría sembrada como "Flota (Tablets)" hoy se llama "Flota - Tablets / Celulares" en producción.)*
- **Columnas muertas:** `urgency`, `impact`, `weight`, `score`, `service_id`, `assignee`,
  `tickets.sla_hours` sobran. Son restos de un modelo de priorización P1–P4 anterior. Se les quitó
  el `NOT NULL` para que no estorben, pero siguen existiendo. La tabla `services` completa también
  está en desuso.
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

- Barra lateral fija de `244px` (`--sidebar-w`), contenido con `max-width: 1320px`.
- Radios: `--radius: 12px` en tarjetas, `--radius-sm: 7px` en campos.
- Puntos de quiebre existentes: `1080px` y `720px` (dashboard), `980px` y `680px` (grillas),
  `820px` (barra lateral pasa a horizontal).

---

## 9. Árbol de archivos

```
helpdesk/
├── package.json              # dependencias exactas
├── next.config.mjs           # ignora errores de TS y ESLint en build
├── tsconfig.json             # alias "@/*" → raíz del proyecto
├── next-env.d.ts
├── HANDOFF.md                # este documento
│
├── app/
│   ├── layout.tsx            # shell: barra lateral + <main>
│   ├── globals.css           # TODO el CSS del proyecto (379 líneas)
│   ├── actions.ts            # TODAS las Server Actions (23 funciones)
│   ├── page.tsx              # Dashboard
│   ├── tickets/page.tsx      # Mesa de ayuda
│   ├── rutas/page.tsx        # Rutas de trabajo
│   └── config/page.tsx       # Configuración
│
├── lib/
│   ├── db.ts                 # conexión + ensureSchema() + semillas
│   ├── data.ts               # todas las consultas de lectura
│   └── priority.ts           # constantes + cálculo de SLA
│
└── components/
    ├── NavLink.tsx                 # enlace lateral con icono e indicador de activo
    ├── Setup.tsx                   # pantalla "conecta la base de datos"
    ├── DateRangeFilter.tsx         # rango de fechas del dashboard
    ├── Filters.tsx                 # 5 filtros de la bandeja de tickets
    ├── FiltersCompanyClient.tsx    # filtro de empresa en /rutas
    ├── NewTicketDialog.tsx         # diálogo de alta de ticket
    ├── TicketOpenLink.tsx          # título clicable → ?ticket=N
    ├── TicketDetailDialog.tsx      # detalle: edición + comentarios + SLA + respuestas rápidas
    ├── StatusControl.tsx           # select de estado que auto-guarda
    ├── RequesterControl.tsx        # select de solicitante que auto-guarda
    ├── CollaboratorsDialog.tsx     # alta rápida de colaboradores desde /tickets
    ├── SlaInput.tsx                # input numérico de horas de SLA (guarda al perder foco)
    ├── NewInitiativeDialog.tsx     # diálogo de alta de ruta
    ├── InitiativeStatusControl.tsx # select de estado de ruta
    ├── DeleteInitiativeButton.tsx  # botón ✕ para borrar una ruta completa
    ├── TaskList.tsx                # lista de tareas con arrastrar-soltar
    ├── TaskItem.tsx                # tarea: casilla + título editable + borrar
    ├── AddTaskForm.tsx             # input "+ Agregar tarea"
    └── TaskToggle.tsx              # ⚠️ HUÉRFANO — ya nadie lo importa, se puede borrar
```

**33 archivos** sin contar `node_modules`, `.next` ni `package-lock.json`.

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

### Despliegue a producción

El despliegue se hace subiendo el árbol de archivos a Vercel (proyecto `mesa-ti-grupo`,
objetivo `production`).

> ### ⚠️ TRAMPA CRÍTICA — leer antes de desplegar
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

La API de detalle de despliegues de Vercel (`get_deployment`, `get_deployment_build_logs`)
**devuelve 404 para este proyecto** — es una limitación del plan Hobby con scope personal,
no señal de fallo. No te fíes de ella ni la uses como diagnóstico.

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

### Dashboard (`/`)

Cuatro tarjetas KPI: **Total de tickets**, **Cerrados** (con %), **Abiertos** (con %) y
**Fuera de SLA** (abiertos que ya pasaron su fecha límite; se pinta en rojo si es > 0).

Debajo, tres columnas: dona de cerrados + barras por día de la semana + tickets recientes;
barras por categoría + segunda dona; tabla detallada por categoría + bloque de resumen.

El filtro de rango de fechas (`?from=`/`?to=`) afecta a **todas** las consultas del dashboard.
Nota de implementación: el filtro `to` es inclusivo — internamente se compara con
`< to + interval '1 day'`.

Las donas se dibujan con dos `<circle>` SVG y `stroke-dasharray`; el texto va centrado con
flexbox sobre el SVG (`position:absolute; inset:0`), no con `text-anchor` — esto se corrigió
dos veces, no lo cambies a coordenadas SVG.

### Mesa de ayuda (`/tickets`)

Tabla con 9 columnas: `#`, Asunto, Solicitante, Empresa, Categoría, Prioridad, SLA, Creado, Estado.

- El **asunto** es un botón que abre el diálogo de detalle vía `?ticket=N`.
- **Solicitante** y **Estado** son selects que guardan al instante, sin abrir nada.
- La columna **SLA** muestra un chip: `Cumplido` / `Fuera de SLA` para cerrados;
  `Vence en Xh` / `Vencido Xh` para abiertos (ámbar si quedan ≤ 2 h, rojo si ya venció).
- Cinco filtros combinables arriba, todos por URL.

**Diálogo de detalle** (`TicketDetailDialog`): formulario completo de edición (asunto, descripción,
empresa, categoría, prioridad, solicitante) + insignia de SLA + hilo de comentarios con autor y
fecha + desplegable "💬 Insertar respuesta rápida…" que rellena el área de comentario al vuelo,
sin ida y vuelta al servidor.

### Rutas de trabajo (`/rutas`)

Iniciativas agrupadas por empresa, en tarjetas de dos columnas. Cada tarjeta tiene título, área,
responsable, select de estado, botón ✕ para eliminarla, barra de avance (tareas hechas / totales)
y su checklist.

Cada tarea permite: marcar/desmarcar, **editar el título en línea** (Enter confirma, Escape
revierte, vacío revierte), **borrar** (con confirmación) y **reordenar arrastrando** por el
tirador `⠿`. El reordenamiento es optimista en el cliente y se persiste con `reorderTasks`.

### Configuración (`/config`)

Tres tarjetas en fila: **Empresas** (nombre + color, editable), **Categorías & SLA** (nombre +
horas objetivo) y **Colaboradores** (nombre + empresa). Debajo, a todo lo ancho, **Respuestas
rápidas** (título + texto).

Salvaguarda: una empresa solo se puede borrar si no tiene tickets, colaboradores ni rutas
asociadas — `deleteCompany` cuenta las tres cosas y sale sin hacer nada si encuentra alguna.

---

## 12. Trabajo pendiente

Tres peticiones del usuario quedaron sin implementar cuando se redactó este traspaso:

1. **Títulos de las rutas editables.** Hoy el título de una iniciativa (`initiatives.title`) solo
   se puede fijar al crearla. Falta hacerlo editable en línea, igual que ya se hizo con los títulos
   de tarea. Es directo: replicar el patrón de `TaskItem` con una acción nueva `updateInitiativeTitle`.

2. **Hacer la página responsive.** Existen algunos `@media` (§8), pero no se ha revisado en móvil
   de verdad. Los puntos flojos conocidos: la tabla de tickets fuerza `min-width: 820px` y se
   desborda; la grilla de configuración `g3` colapsa a una sola columna solo por debajo de 980 px;
   los diálogos tienen `max-width` fijo; la barra lateral pasa a horizontal a 820 px pero no se ha
   probado con el menú completo.

3. **Alertas y notificaciones** (pregunta abierta del usuario, aún sin responder). Quiere saber si
   se pueden añadir avisos para tickets y rutas. Respuesta corta: **sí, y hay tres niveles**:
   - *Dentro de la app* (lo más sencillo): campanita con contador de tickets vencidos o por vencer;
     no requiere infraestructura nueva, es una consulta más.
   - *Por correo*: Vercel Cron Job (`vercel.json`) que dispara un endpoint diario, y Resend
     (plan gratuito) para enviar. Requiere una API key nueva.
   - *En tiempo real* (WebSockets/push): desproporcionado para un solo usuario; no recomendado.
   Nota de viabilidad: el plan Hobby de Vercel permite **cron jobs solo con frecuencia diaria**.

**Limpieza pendiente:** borrar `components/TaskToggle.tsx`, que quedó huérfano al sustituirlo por
`TaskItem` + `TaskList`.

**Limitación de fondo, no planteada aún por el usuario:** el sitio **no tiene autenticación**.
Cualquiera con la URL puede leer y modificar todo. Si algún día lo usan más personas del grupo,
esto hay que resolverlo antes (Vercel Password Protection es de pago; alternativas gratuitas:
Auth.js, o middleware con Basic Auth).

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

## 14. Código fuente completo

Todo lo que sigue es el contenido íntegro y literal de los archivos del proyecto, tal como están
en producción a la fecha de este traspaso. Con esto y las secciones anteriores, el proyecto se
reconstruye desde cero sin necesitar nada más.


---

## 14.1 Configuración del proyecto

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

---

## 14.2 Capa de datos (`lib/`)

### `lib/db.ts`

**El archivo más importante del proyecto.** Conexión a Postgres, `ensureSchema()` idempotente con las 9 tablas, migraciones controladas por la tabla `meta` y las cinco funciones de semilla (empresas y servicios, categorías, respuestas rápidas, los 68 tickets reales del CSV, colaboradores e iniciativas).

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
  await q`CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, weight NUMERIC NOT NULL, vendor TEXT, sla_hours INT
  )`;
  await q`CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    company_id INT REFERENCES companies(id),
    service_id INT,
    category TEXT,
    urgency INT, impact INT, weight NUMERIC, score NUMERIC,
    priority TEXT,
    status TEXT NOT NULL DEFAULT 'resuelto',
    requester TEXT, assignee TEXT, sla_hours INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiatives (
    id SERIAL PRIMARY KEY, company_id INT REFERENCES companies(id),
    title TEXT NOT NULL, area TEXT, status TEXT NOT NULL DEFAULT 'planificado', owner TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS initiative_tasks (
    id SERIAL PRIMARY KEY,
    initiative_id INT REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT false, position INT NOT NULL DEFAULT 0
  )`;
  await q`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`;
  await q`CREATE TABLE IF NOT EXISTS collaborators (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, company_id INT REFERENCES companies(id)
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
  try { await q`ALTER TABLE tickets ALTER COLUMN urgency DROP NOT NULL`; } catch (e) {}
  try { await q`ALTER TABLE tickets ALTER COLUMN impact DROP NOT NULL`; } catch (e) {}
  try { await q`ALTER TABLE tickets ALTER COLUMN weight DROP NOT NULL`; } catch (e) {}
  try { await q`ALTER TABLE tickets ALTER COLUMN score DROP NOT NULL`; } catch (e) {}
  try { await q`ALTER TABLE tickets ALTER COLUMN priority DROP NOT NULL`; } catch (e) {}

  const c = await q`SELECT COUNT(*)::int AS n FROM companies`;
  if (c[0].n === 0) await seedCompaniesServices(q);

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

async function seedCompaniesServices(q: NonNullable<typeof sql>) {
  const companies: [string, string, string][] = [
    ["Droppett", "droppett", "#5A6BE0"],
    ["Gilligan", "gilligan", "#2AB6A4"],
    ["CMG", "cmg", "#E0A94A"],
    ["Shazam", "shazam", "#E0698A"],
  ];
  for (const [name, slug, color] of companies) {
    await q`INSERT INTO companies (name, slug, color) VALUES (${name}, ${slug}, ${color}) ON CONFLICT (name) DO NOTHING`;
  }
  const services: [string, number, string, number][] = [
    ["Check Point", 1.5, "Check Point TAC", 8],
    ["Fortinet", 1.5, "Fortinet Support", 8],
    ["Deliverect", 1.2, "Deliverect Support", 16],
    ["Cisco", 1.1, "Cisco TAC", 24],
    ["SINCO ERP", 1.0, "Soporte SINCO", 48],
  ];
  for (const [name, weight, vendor, sla] of services) {
    await q`INSERT INTO services (name, weight, vendor, sla_hours) VALUES (${name}, ${weight}, ${vendor}, ${sla}) ON CONFLICT (name) DO NOTHING`;
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

Todas las consultas de lectura. Ninguna escribe. Cada una llama primero a `ensureSchema()`.

```ts
import { sql, ensureSchema } from "./db";

export async function getCompanies() {
  await ensureSchema();
  return sql!`SELECT id, name, color FROM companies ORDER BY name`;
}

export async function getServices() {
  await ensureSchema();
  return sql!`SELECT id, name, weight, vendor, sla_hours FROM services ORDER BY weight DESC, name`;
}

export async function getCollaborators() {
  await ensureSchema();
  return sql!`SELECT id, name, company_id FROM collaborators ORDER BY name`;
}

export async function getCategories() {
  await ensureSchema();
  return sql!`SELECT id, name, sla_hours FROM categories ORDER BY name`;
}

export async function getCanned() {
  await ensureSchema();
  return sql!`SELECT id, title, text FROM canned_responses ORDER BY title`;
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
          AND now() > t.created_at + (
            COALESCE(cat.sla_hours, 24) * (CASE t.priority WHEN 'Alta' THEN 0.5 WHEN 'Baja' THEN 1.5 ELSE 1 END)
          ) * interval '1 hour'
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
    SELECT i.id, i.title, i.area, i.status, i.owner, c.name AS company, c.color AS company_color
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

Constantes compartidas (estados, prioridades, etiquetas) y el cálculo de SLA en TypeScript: `PRIORITY_SLA_MULT`, `slaInfo()` y `fmtSlaHours()`. Las constantes `PRIORITIES`/`PRIORITY_META`/`computeScore`/`levelFor`/`slaForLevel` son del modelo P1–P4 antiguo y ya no se usan.

```ts
// Modelo de priorización — mismo criterio que el playbook del grupo.
// Score = Urgencia (1-5) x Impacto (1-5) x Peso del servicio (0.9-1.5)

export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { name: string; color: string; sla: number }> = {
  P1: { name: "Crítico", color: "#C0392B", sla: 4 },
  P2: { name: "Alto", color: "#B4711A", sla: 8 },
  P3: { name: "Medio", color: "#96820F", sla: 24 },
  P4: { name: "Bajo", color: "#2F855A", sla: 72 },
};

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

export const TICKET_CATEGORIES = [
  "Impresora",
  "Carpetas Compartidas",
  "Correo Electronico",
  "Hardware / Laptop",
  "Office / Apps",
  "Requerimiento de Compras",
  "Suministros / Cables",
  "Flota (Tablets)",
  "Red / Conectividad",
  "Otros",
];

export const INITIATIVE_STATUSES = ["planificado", "en_curso", "en_pausa", "completado"] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];

export const INITIATIVE_STATUS_LABEL: Record<InitiativeStatus, string> = {
  planificado: "Planificado",
  en_curso: "En curso",
  en_pausa: "En pausa",
  completado: "Completado",
};

export function computeScore(urgency: number, impact: number, weight: number): number {
  return Math.round(urgency * impact * Number(weight) * 10) / 10;
}

export function levelFor(score: number): Priority {
  if (score >= 20) return "P1";
  if (score >= 12) return "P2";
  if (score >= 6) return "P3";
  return "P4";
}

export function slaForLevel(level: Priority): number {
  return PRIORITY_META[level].sla;
}

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

---

## 14.3 Server Actions

### `app/actions.ts`

Las 23 mutaciones del sistema, todas con el patrón de cinco pasos. Agrupadas por área: tickets, configuración, respuestas rápidas y rutas de trabajo.

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
  if (!name) return;
  await sql!`INSERT INTO collaborators (name, company_id) VALUES (${name}, ${company_id}) ON CONFLICT (name) DO NOTHING`;
  revalidatePath("/tickets");
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
  const tasksRaw = String(formData.get("tasks") || "");
  if (!company_id || !title) return;

  const rows = await sql!`INSERT INTO initiatives (company_id, title, area, status, owner)
    VALUES (${company_id}, ${title}, ${area}, 'planificado', ${owner}) RETURNING id`;
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

## 14.4 Páginas y layout (`app/`)

### `app/layout.tsx`

Shell de la aplicación: barra lateral con los cuatro enlaces y `<main>`.

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { NavLink } from "@/components/NavLink";

export const metadata: Metadata = {
  title: "Mesa de Servicios TI — Grupo Empresarial",
  description: "Sistema de tickets y priorización para Droppett, Gilligan, CMG y Shazam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <div className="logo">TI</div>
              <div>
                <div className="bt">MESA&nbsp;TI</div>
                <div className="bs">Grupo empresarial</div>
              </div>
            </div>
            <div className="nav-label">Operación</div>
            <NavLink href="/" label="Dashboard" icon="grid" />
            <NavLink href="/tickets" label="Mesa de ayuda" icon="inbox" />
            <NavLink href="/rutas" label="Rutas de trabajo" icon="route" />
            <NavLink href="/config" label="Configuración" icon="settings" />
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

Dashboard. El componente `Donut` local dibuja las donas en SVG; el texto se centra con flexbox superpuesto, no con `text-anchor`.

```tsx
import { hasDb } from "@/lib/db";
import { getSupportDashboard } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { DateRangeFilter } from "@/components/DateRangeFilter";

export const dynamic = "force-dynamic";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fmtPeriod(min: string | null, max: string | null) {
  if (!min || !max) return "—";
  const a = new Date(min), b = new Date(max);
  const f = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
  return `${f(a)} – ${f(b)} ${b.getUTCFullYear()}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

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

  const closedPct = d.total ? Math.round((d.closed / d.total) * 100) : 0;
  const openPct = 100 - closedPct;
  const maxCat = Math.max(1, ...d.byCategory.map((c) => c.n));
  const maxDay = Math.max(1, ...d.byDay);
  const topCats = d.byCategory.slice(0, 9);

  return (
    <>
      <div className="content">
        {/* Header + stat cards */}
        <div className="report-head">
          <div>
            <div className="rh-title">RESUMEN DE TICKETS DE SOPORTE</div>
            <div className="rh-period">📅 PERIODO: <b>{fmtPeriod(d.minDate, d.maxDate)}</b></div>
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
                <p>Todos los tickets del período {fmtPeriod(d.minDate, d.maxDate)} fueron atendidos y cerrados satisfactoriamente.</p>
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

Mesa de ayuda. El componente `SlaCell` local pinta el chip de SLA de cada fila. Los filtros se aplican en memoria sobre el resultado de `getTickets()`.

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

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

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

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mesa de ayuda</h1>
          <div className="sub">Tickets de soporte de todas las empresas</div>
        </div>
        <div className="push">
          <CollaboratorsDialog collaborators={collaborators} companies={companies} />
          <NewTicketDialog companies={companies} categories={categories} collaborators={collaborators} />
        </div>
      </div>

      <div className="content">
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
                    <td className="mono" style={{ color: "var(--muted)" }}>{t.id}</td>
                    <td><TicketOpenLink id={t.id} title={t.title} /></td>
                    <td><RequesterControl id={t.id} requester={t.requester} collaborators={collaborators} /></td>
                    <td><span className="chip" style={{ background: t.company_color }}>{t.company}</span></td>
                    <td className="cat-tag">{t.category || "Otros"}</td>
                    <td><span className={"pri " + (t.priority || "Baja")}>{t.priority || "Baja"}</span></td>
                    <td><SlaCell t={t} /></td>
                    <td className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(t.created_at)}</td>
                    <td><StatusControl id={t.id} status={t.status} /></td>
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

Rutas de trabajo. Agrupa las iniciativas por empresa en un objeto `groups` y delega el checklist en `<TaskList>`.

```tsx
import { hasDb } from "@/lib/db";
import { getInitiatives, getCompanies } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { NewInitiativeDialog } from "@/components/NewInitiativeDialog";
import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { InitiativeStatusControl } from "@/components/InitiativeStatusControl";
import { DeleteInitiativeButton } from "@/components/DeleteInitiativeButton";
import { FiltersCompanyClient } from "@/components/FiltersCompanyClient";

export const dynamic = "force-dynamic";

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
                {g.items.map((i) => (
                  <article className="card init-card" key={i.id}>
                    <div className="init-top">
                      <div>
                        <div className="init-title">{i.title}</div>
                        <div className="init-sub">
                          {i.area ? <span className="area-tag">{i.area}</span> : null}
                          {i.owner ? <span className="mono" style={{ color: "var(--muted)" }}> · {i.owner}</span> : null}
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
                ))}
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

Configuración. Cuatro bloques CRUD; los formularios se enlazan directo a las Server Actions, sin JavaScript de cliente.

```tsx
import { hasDb } from "@/lib/db";
import { getCompanies, getCategories, getCollaborators, getCanned } from "@/lib/data";
import { Setup } from "@/components/Setup";
import { SlaInput } from "@/components/SlaInput";
import {
  createCompany, updateCompany, deleteCompany,
  createCategory, deleteCategory,
  createCollaborator, deleteCollaborator,
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

  const companyName = (id: number | null) => companies.find((c) => c.id === id)?.name || "—";

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Configuración</h1>
          <div className="sub">Personaliza empresas, categorías, SLA, colaboradores y respuestas rápidas</div>
        </div>
      </div>

      <div className="content">
        <div className="grid g3">

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
                  <span className="cfg-name">{c.name}</span>
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

          {/* ---------- Colaboradores ---------- */}
          <div className="card cfg-card">
            <div className="cfg-head">Colaboradores <span className="cfg-count">{collaborators.length}</span></div>
            <div className="cfg-list">
              {collaborators.map((c) => (
                <div className="cfg-row" key={c.id}>
                  <span className="cfg-name">{c.name}</span>
                  <span className="pv-meta">{companyName(c.company_id)}</span>
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
              <button type="submit" className="btn primary sm">Agregar</button>
            </form>
          </div>

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

## 14.5 Hoja de estilos

### `app/globals.css`

**Todo el CSS del proyecto en un solo archivo.** Las variables de `:root` son el sistema de diseño completo (§8).

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
.brand .logo { width: 30px; height: 30px; border-radius: 8px; background: var(--accent); display: grid; place-items: center; color: #0A0E15; font-family: var(--font-mono); font-weight: 700; font-size: 15px; box-shadow: 0 0 0 3px var(--accent-wash); }
.brand .bt { font-family: var(--font-mono); font-size: 13px; font-weight: 700; letter-spacing: .02em; line-height: 1.1; }
.brand .bs { font-size: 10.5px; color: var(--muted); font-family: var(--font-mono); letter-spacing: .04em; }
.nav-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--faint); padding: 14px 10px 6px; }
.navlink { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px; color: var(--ink-soft); font-size: 14px; font-weight: 500; }
.navlink:hover { background: var(--surface-2); color: var(--ink); }
.navlink.active { background: var(--accent-wash); color: var(--accent-ink); font-weight: 600; }
.navlink .ic { width: 17px; height: 17px; opacity: .85; }
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
.content { padding: 24px 28px 60px; max-width: 1320px; width: 100%; }

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
.area-tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase; color: var(--accent-ink); background: var(--accent-wash); padding: 2px 7px; border-radius: 5px; }

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
```

---

## 14.6 Componentes

### `components/NavLink.tsx`

Enlace de la barra lateral. Los iconos son SVG en línea dentro del objeto `icons`; marca activo comparando con `usePathname()`.

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

export function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link href={href} className={"navlink" + (active ? " active" : "")}>
      {icons[icon]}
      {label}
    </Link>
  );
}
```

### `components/Setup.tsx`

Pantalla que se muestra en las cuatro páginas cuando no hay base de datos conectada. Explica al usuario cómo conectarla él mismo desde Vercel.

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

Rango de fechas del dashboard (`?from=`/`?to=`).

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateRangeFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  const clear = () => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.delete("from");
    p.delete("to");
    router.push(pathname + (p.toString() ? "?" + p.toString() : ""));
  };

  return (
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
  );
}
```

### `components/Filters.tsx`

Los cinco filtros de la bandeja de tickets.

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

Filtro de empresa de `/rutas` (versión reducida del anterior).

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

Diálogo de alta de ticket. Une las categorías de la base con las de `TICKET_CATEGORIES` para no quedarse nunca sin opciones.

```tsx
"use client";

import { useRef, useState } from "react";
import { createTicket } from "@/app/actions";
import { TICKET_CATEGORIES } from "@/lib/priority";

export function NewTicketDialog({ companies, categories, collaborators }: { companies: any[]; categories: string[]; collaborators: any[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  const catOptions = Array.from(new Set([...(categories || []), ...TICKET_CATEGORIES]));

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
                  {catOptions.map((c) => (
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

Convierte el asunto del ticket en un botón que añade `?ticket=N` a la URL.

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

Diálogo de detalle: edición completa, insignia de SLA (`SlaBadge`), hilo de comentarios e inserción de respuestas rápidas mediante `commentTextRef`.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { updateTicket, addComment } from "@/app/actions";
import { StatusControl } from "@/components/StatusControl";
import { slaInfo, fmtSlaHours } from "@/lib/priority";

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

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

### `components/StatusControl.tsx`

Select de estado de ticket que se auto-envía al cambiar.

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

Select de solicitante. Si el ticket tiene un solicitante que ya no está en la lista de colaboradores, lo añade como opción extra para no perder el dato.

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

Alta rápida de colaboradores desde la cabecera de `/tickets`.

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

Input numérico de horas de SLA por categoría. Guarda al perder el foco.

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

Diálogo de alta de ruta. El textarea de tareas se parte por saltos de línea y crea una tarea por línea.

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
            <div className="field">
              <label>Responsable</label>
              <input type="text" name="owner" placeholder="Quien lidera" />
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

### `components/DeleteInitiativeButton.tsx`

Botón ✕ que elimina una ruta completa (las tareas caen por `ON DELETE CASCADE`). Pide confirmación.

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

Envuelve las tareas y gestiona el arrastrar-soltar con la API nativa de HTML5. Reordena de forma optimista en el cliente y persiste con `reorderTasks`. Se resincroniza con el servidor mediante `useEffect` sobre `tasks`.

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
          <TaskItem id={t.id} done={t.done} title={t.title} />
        </div>
      ))}
    </div>
  );
}
```

### `components/TaskItem.tsx`

Una tarea: casilla, título editable en línea (Enter confirma, Escape revierte) y botón de borrar que aparece al pasar el ratón.

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

Input "+ Agregar tarea" al pie de cada ruta.

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

### `components/TaskToggle.tsx`

⚠️ **ARCHIVO HUÉRFANO.** Versión antigua de la tarea, solo permitía marcar/desmarcar. Lo sustituyeron `TaskItem` + `TaskList`. Nadie lo importa; se puede borrar sin consecuencias. Se incluye aquí solo para que el inventario esté completo.

```tsx
"use client";

import { useRef } from "react";
import { toggleTask } from "@/app/actions";

export function TaskToggle({ id, done, title }: { id: number; done: boolean; title: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={toggleTask} className="task-row">
      <input type="hidden" name="id" value={id} />
      <label className={"task-check" + (done ? " done" : "")}>
        <input
          type="checkbox"
          defaultChecked={done}
          onChange={() => ref.current?.requestSubmit()}
        />
        <span className="box" aria-hidden="true" />
        <span className="task-title">{title}</span>
      </label>
    </form>
  );
}
```

---

*Fin del traspaso. 33 archivos, 2860 líneas de código fuente.*
