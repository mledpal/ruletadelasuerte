# Ranking global con Supabase

El juego guarda la puntuación del ganador de cada partida en un **Top 10 global**
(uno para el modo normal y otro para el modo Cástulo). Los datos viven en una base
de datos PostgreSQL gratuita de [Supabase](https://supabase.com); el juego habla con
ella directamente mediante su API REST (sin librerías).

Si no se configura, el juego funciona igual pero sin ranking.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto

1. Entra en <https://supabase.com> y regístrate (sirve la cuenta de GitHub).
2. **New project**:
   - *Name*: `ruleta`
   - *Database password*: genera una y guárdala (no la usa el juego).
   - *Region*: la más cercana, p. ej. **West EU (Ireland)** o **Central EU (Frankfurt)**.
   - Plan **Free**.
3. Espera 1-2 minutos a que se cree.

### 2. Crear la tabla y la función

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Pega el contenido completo de [`ranking.sql`](./ranking.sql) y pulsa **Run**.
3. Debe responder `Success. No rows returned`.
4. Comprueba en **Table Editor** que aparece la tabla `ranking` (vacía).

### 3. Copiar la URL y la clave pública

**Project Settings** (engranaje) → **API Keys** / **Data API**:

- **Project URL**: `https://<algo>.supabase.co`
- **Publishable key** (`sb_publishable_...`). En proyectos antiguos se llama
  **anon public** (empieza por `eyJ...`); también vale.

> ⚠️ **Nunca** uses la *secret key* ni la *service_role*: saltan toda la seguridad.

### 4. Configurar el juego

En la raíz del proyecto, copia `.env.example` como `.env` y rellena:

```env
VITE_SUPABASE_URL=https://<algo>.supabase.co
VITE_SUPABASE_KEY=sb_publishable_...
```

`.env` está en `.gitignore`. Vite incrusta estos valores al compilar, así que hay que
reiniciar `yarn dev` tras cambiarlos y volver a hacer `yarn deploy` para publicarlos.

### 5. Probar

1. `yarn dev`, juega una partida corta (1 jugador, 1 ronda).
2. Al terminar, la pantalla final debe mostrar «entra en la clasificación en el puesto 1».
3. En Supabase → **Table Editor → ranking** aparece la fila.
4. En la pantalla inicial, **🏆 Clasificación** muestra las dos tablas.

## Mantenimiento

- **Borrar una entrada** (p. ej. un nombre ofensivo): Table Editor → fila → *Delete*.
- **Vaciar el ranking**: SQL Editor → `delete from ranking;`
- **Pausa por inactividad**: en el plan gratuito, un proyecto sin peticiones durante
  7 días se pausa. Se reactiva desde el panel (*Restore project*). Mientras esté
  pausado, el juego muestra «No se ha podido conectar con la clasificación».

## Seguridad y límites

- La tabla es de solo lectura para el público (RLS). La única escritura posible es la
  función `submit_score`, que valida nombre (1-20 caracteres), modo, rondas y
  puntuación, comprueba en el servidor si entra en el top y recorta lo demás.
- Cada partida tiene un `game_id` único: recargar la pantalla final no duplica entradas.
- Como todo juego que calcula la puntuación en el navegador, alguien con
  conocimientos podría llamar a la API con una puntuación inventada. Para un juego
  entre amigos es suficiente; si apareciera una trampa, se borra desde el panel.
