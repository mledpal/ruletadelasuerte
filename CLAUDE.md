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
- `src/context/GameProvider.tsx` — `gameReducer` (24 tipos de acción) + estado inicial. **Único lugar donde se modifica el estado**, siempre de forma inmutable (spread).
- El estado completo se **persiste en localStorage** en cada cambio (`SAVE_KEY` en GameProvider) para poder reanudar la partida tras recargar. `RESET_GAME` limpia el guardado. Al añadir campos a `GameState`, ten en cuenta que un guardado antiguo puede no tenerlos.

### Tipos: fuente única de verdad

Todos los tipos del juego viven en `src/types/game.ts` (`GameState`, `GameAction`, `Phrase`, `TurnPhase`, `WheelResult`, `CastuloToken`...). Nunca definas tipos de juego en componentes.

### Flujo de la app (App.tsx)

`GameApp` gestiona las vistas (`'setup' | 'game' | 'phrases' | 'instructions'`) y la lógica de rondas/frases:

- Al arrancar, si hay partida guardada (`ruleta:view === 'game'`), muestra un diálogo de reanudar/descartar.
- `PlayerSetup` configura jugadores, rondas, comodín, ronda de bote y **categorías seleccionadas**; lanza `INIT_GAME`.
- La selección de frases (aleatoria, sin repetir dentro de la partida, filtrada por categorías) vive en `App.tsx` con `usedRef` + `selectedCategoriesRef`, **no** en el reducer.
- Al resolver el panel: `COMPLETE_ROUND` mueve `score → wallet` del ganador; tras 3 s `GameApp` dispara `NEXT_ROUND` + nueva frase, o `COMPLETE_GAME` (→ `WinnerModal`) en la última ronda.

### Flujo de turno (estricto)

`state.turnPhase` controla qué acciones están disponibles:
```
'spin' → (gira ruleta) → 'consonant' → (acierta) → 'vowels' → 'next-action'
```
La fase `'vowels'` se salta si no quedan vocales ocultas. `state.isRevealing` es el lock de animación que deshabilita botones durante el revelado de letras.

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

### Distinciones clave de estado

- `player.score` — puntos de la ronda actual (se pierde si otro resuelve).
- `player.wallet` — dinero acumulado entre rondas; solo el que resuelve consolida su score.

## Convenciones de código

- Componentes en carpetas PascalCase bajo `src/components/`, cada una con `.tsx` + `.module.css`. **Exportaciones nombradas** (no `export default`, salvo `App`). Props con `interface` local. `import type` para tipos.
- **Solo CSS Modules**, sin estilos inline. Tema claro/oscuro vía variables CSS en `src/index.css` (`:root` = oscuro, `[data-theme="light"]` = claro, alternado por `useTheme`). **Nunca colores en hexadecimal en componentes**: usa `var(--color-gold)`, `var(--color-text)`, etc.
- Audio sintetizado con Web Audio API en `src/utils/audio.ts` (`playDing`, `playError`, `playSuccess`, `playTransition`); sin librerías.
- La ruleta es un SVG de 24 casillas definidas como array estático en `Wheel.tsx`; la rotación normaliza el ángulo acumulado para evitar desfase tras varios giros.
