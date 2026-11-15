# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"La Ruleta de la Fortuna" — juego basado en el concurso de TV, con **React 19 + TypeScript + Vite**. Sin librerías de UI: CSS Modules y SVG puro. Documentación y comentarios del código en **español**.

> `AGENTS.md` contiene documentación más detallada pero está parcialmente desactualizado (no cubre el modo Cástulo, el bote, ni la persistencia en localStorage). Este archivo tiene prioridad en caso de conflicto.

## Comandos

```bash
yarn dev           # Servidor de desarrollo en http://localhost:5173
yarn build         # tsc -b && vite build (la comprobación de tipos es parte del build)
yarn lint          # ESLint (flat config)
yarn preview       # Vista previa del build
yarn deploy        # Build + scp a ruleta.ledemar.es (servidor personal)
```

- Gestor de paquetes: **Yarn**. No usar `npm install` ni `npm run`.
- **No hay tests** configurados. La verificación es `yarn build` (TypeScript estricto: `strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`) + `yarn lint`.

## Arquitectura

### Estado global: Context + useReducer

- `src/context/GameContext.ts` — contexto + hook `useGame()` (lanza error fuera del provider).
- `src/context/GameProvider.tsx` — `gameReducer` (29 tipos de acción) + estado inicial. Cada acción incrementa `state.rev` (salvo `REPLACE_STATE`). **Único lugar donde se modifica el estado**, siempre de forma inmutable (spread).
- El estado completo se **persiste en localStorage** en cada cambio (`SAVE_KEY` en GameProvider) para poder reanudar la partida tras recargar. `RESET_GAME` limpia el guardado. Al añadir campos a `GameState`, ten en cuenta que un guardado antiguo puede no tenerlos.

### Tipos: fuente única de verdad

Todos los tipos del juego viven en `src/types/game.ts` (`GameState`, `GameAction`, `Phrase`, `TurnPhase`, `WheelResult`, `CastuloToken`...). Nunca definas tipos de juego en componentes.

### Flujo de la app (App.tsx)

`App` decide entre la partida local (`GameApp`) y la online (`OnlineApp`, si la URL lleva `?sala=CÓDIGO`).

`GameApp` gestiona las vistas (`'setup' | 'game' | 'phrases' | 'instructions' | 'ranking' | 'online'`) y la lógica de rondas/frases:

- Al arrancar, si hay partida guardada (`ruleta:view === 'game'`), muestra un diálogo de reanudar/descartar.
- `PlayerSetup` configura jugadores (número y nombres), rondas, comodín, ronda de bote y **categorías seleccionadas**; lanza `INIT_GAME`.
- La selección de frases (aleatoria, sin repetir dentro de la partida, filtrada por categorías) vive en el hook `usePhrasePicker` (frases usadas y categorías en localStorage), **no** en el reducer.
- Al resolver el panel: `COMPLETE_ROUND` mueve `score → wallet` del ganador; tras 3 s `GameApp` dispara `NEXT_ROUND` + nueva frase, o `COMPLETE_GAME` (→ `WinnerModal`) en la última ronda.

### Flujo de turno (estricto)

`state.turnPhase` controla qué acciones están disponibles:
```
'spin' → (gira ruleta) → 'consonant' → (acierta) → 'vowels' → 'next-action'
```
La fase `'vowels'` se salta si no quedan vocales ocultas. En `'consonant'` corre una cuenta atrás (`ConsonantTimer`, `state.config.consonantTimeLimit`, 30 s por defecto, 0 = sin límite, elegible en el setup); si se agota, el jugador pierde el turno. `state.isRevealing` es el lock de animación que deshabilita botones durante el revelado de letras.

El estado de la interfaz del turno (mensaje, gajo especial pendiente, bote pendiente, diálogo del comodín, selector de Asedio/Escipión, cambio de turno en curso, ruleta abierta) está en `state.turnUi` y se cambia con `SET_TURN_UI`, para que sobreviva a una recarga y se comparta en online. `src/context/sanitize.ts` repara lo que quedó a medias al cargar (animación, cambio de turno).

### Frases: hook usePhrases

`src/hooks/usePhrases.ts` gestiona el CRUD de frases:

- Frases por defecto + frases del usuario en localStorage (`ruleta_phrases`).
- **Sincronización online** al montar: fetch de `https://ruleta.ledemar.es/frases.json` (timeout 5 s), fusiona las nuevas sin duplicar y respeta una lista de borradas (`ruleta_phrases_deleted`) para que no reaparezcan.
- Cada frase tiene `source: 'default' | 'online' | 'user'`.

### Modo Cástulo

Modo temático especial (historia de la ciudad iberorromana de Cástulo, Linares):

- Se activa **solo** si en el setup se elige exclusivamente la categoría `CASTULO`.
- Añade casillas especiales a la ruleta y fichas de personaje (`ANIBAL`, `HIMILCE`, `ESCIPION`) con acciones propias (`AWARD_TOKEN`, `USE_ESCIPION`, `ASEDIO_TRANSFER`).
- Cambia título y estilos vía el atributo `data-castulo` en el contenedor `.app`.

### Bote (ronda final)

Si `boteRoundEnabled` (requiere ≥2 jugadores), la última ronda acumula un bote (base 1000 €) que se lleva quien la resuelve (`WIN_BOTE`).

### Ranking global (Supabase)

- Top 10 global por modo (`'normal' | 'castulo'`) con la puntuación (`wallet`) del ganador de cada partida. Puesta en marcha y mantenimiento: `supabase/README.md`; esquema: `supabase/ranking.sql`.
- Cliente REST sin dependencias en `src/utils/ranking.ts`; config por `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` en `.env` (ver `.env.example`). Sin ellas, `rankingEnabled = false` y el ranking se oculta.
- La tabla es de solo lectura pública; la única escritura es la RPC `submit_score`, que valida, decide si entra en el top y poda el resto.
- `state.gameId` (UUID, nuevo en cada `INIT_GAME`/`RESET_GAME`) hace el envío idempotente. `useSubmitWinner` (en `src/hooks/useRanking.ts`) se ejecuta desde `WinnerModal`.
- Los nombres de jugador son obligatorios y únicos (paso 2 de `PlayerSetup`, máx. `MAX_NAME_LENGTH`) y se recuerdan en `ruleta:playerNames`.

### Modo online (Supabase Realtime)

2-6 jugadores, cada uno en su casa. Entrada: botón «Jugar online» del setup → crear sala o unirse con código; el enlace es `?sala=CÓDIGO`.

- `src/online/realtime.ts` — canal `ruleta-<CÓDIGO>` de Supabase Realtime (`@supabase/realtime-js`): *broadcast* para mensajes (`OnlineMessage` en `src/types/online.ts`) y *presence* para saber quién está conectado. Mismas variables `VITE_SUPABASE_*` que el ranking (`src/utils/supabaseConfig.ts`); sin ellas, `onlineEnabled = false` y no se muestra.
- `src/online/OnlineProvider.tsx` — va dentro de `GameProvider` y vuelve a proporcionar `GameContext` con un **dispatch protegido**: solo despacha el **controlador** (`controllerOf` en `src/online/control.ts`: el dueño de `players[currentPlayer]`; entre rondas y al acabar, el anfitrión = `seats[0]`). El anfitrión puede además lanzar `INIT_GAME`, `RESET_GAME`, `SET_PHRASE`, `NEXT_ROUND`, `COMPLETE_GAME`.
- Cada cambio local se difunde con el **estado completo** (agrupando envíos cada 80 ms); al recibir uno con `rev` mayor se aplica con `REPLACE_STATE`. Al conectar se envía `hello` y los demás responden con su estado (así se reanuda tras recargar).
- `state.seats` (clientId por jugador, vacío = sala de espera) se fija en `INIT_GAME`; `RESET_GAME` los vacía y todos vuelven a la sala. `clientId` estable en `ruleta:clientId`; cada sala se guarda en `ruleta:online:<CÓDIGO>`.
- Si el controlador se desconecta, la partida queda en pausa (`online.paused`) hasta que vuelva con el mismo enlace. Tras reconectar, si quedó algo a medias, lo repara el controlador (no `GameProvider`, que en online se monta con `repairOnLoad={false}`).
- Eventos efímeros: `spin` (la ruleta de los demás se monta con `remote` y reproduce el giro), `sfx` (los sonidos de acciones de juego usan `playShared` de `audio.ts`, que se reenvían; los de la ruleta y el temporizador no) y `reaction` (componente `Reactions`: emojis, frases rápidas y chat corto).
- Los componentes saben si hay partida online con `useOnline()` (null en local). `GameControls` deshabilita los controles con un `<fieldset>` si `!online.canAct`.
- El anfitrión elige las frases (`HostSetup` / `HostDirector` en `src/OnlineApp.tsx`) y es el único que envía la puntuación al ranking.

### Distinciones clave de estado

- `player.score` — puntos de la ronda actual (se pierde si otro resuelve).
- `player.wallet` — dinero acumulado entre rondas; solo el que resuelve consolida su score.

## Convenciones de código

- Componentes en carpetas PascalCase bajo `src/components/`, cada una con `.tsx` + `.module.css`. **Exportaciones nombradas** (no `export default`, salvo `App`). Props con `interface` local. `import type` para tipos.
- **Solo CSS Modules**, sin estilos inline. Tema claro/oscuro vía variables CSS en `src/index.css` (`:root` = oscuro, `[data-theme="light"]` = claro, alternado por `useTheme`). **Nunca colores en hexadecimal en componentes**: usa `var(--color-gold)`, `var(--color-text)`, etc.
- Audio sintetizado con Web Audio API en `src/utils/audio.ts` (`playDing`, `playError`, `playSuccess`, `playTransition`); sin librerías.
- La ruleta (`Wheel.tsx`) es una escena **Three.js** (24 casillas, más las de Cástulo) con un único bucle `requestAnimationFrame`; el estado por frame vive en refs, no en React.
  - Lanzamiento por potencia: mantener **barra espaciadora** (o el botón) carga una energía que sube y baja a velocidad variable; al soltar, recorre de ¼ de vuelta (0 %) a 1½ vueltas (100 %). La casilla resultante sale del ángulo final, no se sortea.
  - La posición final se guarda en `state.wheelStop` (`SET_WHEEL_STOP`) y el siguiente giro parte de esa misma casilla.
