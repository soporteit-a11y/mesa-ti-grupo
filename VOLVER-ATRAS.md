# Cómo volver atrás si algo se rompe

Este archivo existe para un momento concreto: algo salió mal en producción y hay que dejar el
sistema como estaba **ya**, sin leer código ni entender qué pasó. Empieza por la sección 1, que
tarda menos de un minuto y no toca el repositorio.

Hay que separar dos cosas que se recuperan de manera muy distinta:

| Qué | Se recupera | Cómo |
|---|---|---|
| **El código** (pantallas, cálculos, estilos) | Sí, en un minuto | Sección 1 o 2 |
| **Los datos** (tickets, tareas marcadas, fechas) | **Solo si hay respaldo** | Sección 4 |

Esa diferencia es lo importante de esta página. Volver el código atrás **no deshace** un cambio
en la base de datos: si una migración escribió algo, sigue escrito aunque se despliegue el
código de ayer.

---

## PUNTO DE RETORNO CONOCIDO BUENO

Estado verificado en producción el **3 de septiembre de 2026**, antes de reordenar el Gantt y
corregir las fechas de las etapas 3, 8 y 9.

```
Commit      71c48dd8830efc81ddd95581df00dc2df2d3a811
Mensaje     Actualizar CONTINUIDAD: P2 y P5 ya estaban hechos, y falta CRON_SECRET
Despliegue  dpl_GPQ11yPjLPfmRYF84HnNa5caLXhn
URL         mesa-ti-grupo-oi2xf65ck-helpdesk10.vercel.app
```

Qué funcionaba en ese punto: login con tres roles, asignación de usuarios a fases y tareas,
retraso por etapa, fecha coordinada frente a realizada, aviso de vencimientos en pantalla, rango
de fechas por etapa afectando al Gantt, responsive de portátiles, y la pantalla de error que
muestra el mensaje real en vez de quedarse en negro.

---

## 1. Lo más rápido — Rollback instantáneo de Vercel

**Esto es lo que hay que hacer primero.** No toca el repositorio, no requiere consola, y se
deshace igual de fácil si no era eso.

1. Entra en [vercel.com](https://vercel.com) → proyecto **mesa-ti-grupo** → pestaña
   **Deployments**
2. Busca en la lista el despliegue que sí funcionaba (por la hora, o por el `dpl_...` de arriba)
3. En su menú `···` → **Instant Rollback** (o *Promote to Production*)
4. Confirma. En segundos, `mesa-ti-grupo-delta.vercel.app` vuelve a servir esa versión

El repositorio no cambia: `main` sigue teniendo el código nuevo. Es un cambio de qué versión se
sirve, no de qué versión existe. Por eso es tan seguro y por eso va primero.

---

## 2. Deshacer en el repositorio

Cuando ya no hay prisa y quieres que `main` deje de tener el cambio malo.

**Deshacer el último commit** (lo normal):

```bash
git revert HEAD
git push origin main
```

**Deshacer varios**, del más nuevo al más viejo:

```bash
git revert --no-commit <sha-nuevo> <sha-viejo>
git commit -m "Revertir el cambio que rompio X"
git push origin main
```

**Volver `main` exactamente al punto de retorno de arriba:**

```bash
git revert --no-commit 71c48dd..HEAD
git commit -m "Volver al estado del 3-sep antes de reordenar el Gantt"
git push origin main
```

Se usa `revert` y no `reset --hard` a propósito: `revert` **añade** un commit que deshace, así
que el historial de lo que pasó se conserva y se puede volver a aplicar. `reset --hard` sobre
una rama ya publicada borra historia y obliga a un push forzado, que es cómo se pierde trabajo
de verdad.

Ver qué cambió antes de decidir:

```bash
git log --oneline 71c48dd..HEAD
git diff 71c48dd..HEAD -- app components lib
```

---

## 3. Antes de dar por bueno el rollback

Un despliegue "READY" no significa que la aplicación funcione — solo que compiló.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://mesa-ti-grupo-delta.vercel.app/login
```

Debe dar **200**. Después, entra y abre **Cronogramas**, que es la pantalla con más piezas y
donde primero se nota si algo falta.

Si sale una pantalla de error, ahora muestra **el mensaje real** (`app/error.tsx`), no un negro
mudo. Ese texto es el diagnóstico: cópialo.

---

## 4. Los datos NO vuelven solos

Volver el código atrás no deshace nada que se haya escrito en la base. Las correcciones de
fechas y las migraciones de `ensureSchema()` **escriben en Postgres**, y ahí se quedan.

Cada migración está protegida por una clave en la tabla `meta`, así que no se repite; pero
tampoco se deshace sola. Para deshacer una hay que escribir el SQL contrario a mano.

**No hay ningún respaldo de la base de datos ahora mismo.** Es lo único verdaderamente
irrecuperable de este proyecto: el repositorio no contiene los datos reales. Hacerlo:

```bash
# Cadena de conexión: Vercel → mesa-ti-grupo → Storage → Postgres → .env.local
pg_dump "postgresql://usuario:clave@host/basedatos?sslmode=require" > respaldo-mesa-ti.sql
```

Guárdalo **fuera** de Vercel y fuera de esta máquina. Mientras eso no exista, el rollback de
código está resuelto y el de datos no.

---

## 5. Cómo pedirlo

Basta con decir **«vuelve a la versión anterior»**. Con eso se aplica la sección 1. Si el
problema es de un cambio concreto y prefieres conservar el resto, dilo así: *«deshaz solo lo del
orden del Gantt»*.
