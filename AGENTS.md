# La Ruleta de la Fortuna — Agent Instructions

Juego interactivo basado en el programa de TV, implementado con **React 19 + TypeScript 6 + Vite**.
Sin librerías de UI externas; todo el estilado es con CSS Modules y SVG puro.

## Comandos esenciales

```bash
yarn dev           # Servidor de desarrollo en http://localhost:5173
yarn build         # Comprobación de tipos + bundle de producción (tsc -b && vite build)
yarn lint          # ESLint (flat config)
yarn preview       # Vista previa del build de producción
```

> Gestor de paquetes: **Yarn** (`yarn.lock`). No usar `npm install` ni `npm run`.  
> No hay tests configurados (sin Jest/Vitest).

## Arquitectura

### Estado global: Context + useReducer

Todo el estado del juego vive en `src/context/`:

- **`GameContext.ts`** — Crea el contexto y exporta el hook `useGame()` (lanza error si se usa fuera del provider).
- **`GameProvider.tsx`** — Contiene `gameReducer` (21 tipos de acción) y el estado inicial. Es el único lugar donde se mutará el estado.

Accede al estado y dispatch siempre mediante `useGame()`:
```tsx
const { state, dispatch } = useGame();
```

### Tipos: fuente única de verdad

Todos los tipos del juego están en [`src/types/game.ts`](src/types/game.ts). Nunca definas tipos de juego en los componentes; añádelos aquí.

Tipos principales:
- `GameState` — Estado completo del juego
- `GameAction` — Unión discriminada con los 21 tipos de acción del reducer
- `Phrase` → `{ phrase: string; category: string; hint: string }`
- `TurnPhase` → `'spin' | 'consonant' | 'vowels' | 'next-action'`
- `WheelResult` → `number | 'QUIEBRA' | 'PIERDE_TURNO' | 'COMODIN'`
- `CellState` → `'hidden' | 'revealing' | 'visible' | 'highlighted'`

### Flujo de turnos

El juego avanza por fases estrictas controladas por `state.turnPhase`:
```
'spin' → (gira ruleta) → 'consonant' → (acierta) → 'vowels'* → 'next-action'
```
- `'vowels'` se salta automáticamente si todas las vocales ya están visibles.
- El botón de girar se deshabilita si no quedan consonantes ocultas en el panel.

El dispatch `SET_TURN_PHASE` controla qué acciones están disponibles.

### Mecánica de rondas

- 3 rondas por partida (`state.totalRounds = 3`).
- Al resolver el panel: `COMPLETE_ROUND` mueve `score → wallet` del ganador y marca `roundComplete: true`.
- Tras 3 s, `GameApp` (en `App.tsx`) dispara `NEXT_ROUND` + selecciona nueva frase aleatoria sin repetir.
- `NEXT_ROUND` avanza automáticamente `currentPlayer` al siguiente jugador.
- Al terminar la ronda 3: `COMPLETE_GAME` → aparece el modal `WinnerModal` con el podio de ganancias.
- `RESET_GAME` reinicia el estado completo (incluyendo carteras) para una nueva partida.

### Selección de frases

- Las frases disponibles y el historial de frases usadas se gestionan en `GameApp` (`App.tsx`), **no** en el reducer ni en `PhraseManager`.
- `usedRef` (un `useRef<Set<string>>`) rastrea las frases jugadas en la partida actual.
- Nunca se repite una frase dentro de la misma partida.
- Al iniciar la app se carga una frase aleatoria automáticamente.
- `PhraseManager` recibe `phrases`, `onAddPhrase`, `onDeletePhrase` y `onStartGame` como props; no gestiona estado de frases internamente.

### Distinciones clave de estado

- `player.score` — puntos de la ronda actual (se resetea al cambiar de ronda)
- `player.wallet` — dinero acumulado entre rondas (persiste hasta `RESET_GAME`)
- `state.isRevealing` — lock de animación; deshabilita botones durante el revelado de letras
- `state.roundComplete` — indica que la ronda ha terminado; activa el temporizador de avance
- `state.gameComplete` — activa el `WinnerModal`

## Tema visual (claro / oscuro)

- El hook `src/hooks/useTheme.ts` alterna el atributo `data-theme="light"` en `<html>` y persiste en `localStorage`.
- Todas las variables de color están definidas en `:root` (modo oscuro por defecto) y sobreescritas en `[data-theme="light"]` dentro de `src/index.css`.
- El botón de alternancia (☀️/🌙) está en la esquina izquierda del header en `App.tsx`.
- **No toques colores en hexadecimal directamente en los componentes**; usa siempre las variables CSS (`var(--color-gold)`, `var(--color-text)`, etc.).

## Convenciones de código

### Componentes

- **Carpetas PascalCase** en `src/components/`, cada una con su `.tsx` y `.module.css` correspondiente
- **Exportaciones nombradas** (no `export default`)
- Props tipadas con `interface` local en el mismo archivo
- Usa `import type { ... }` para importaciones de solo tipos

```tsx
interface MyProps {
  value: string;
  onClick: () => void;
}
export function MyComponent({ value, onClick }: MyProps) { ... }
```

### CSS

- **Solo CSS Modules** — no estilos inline, no librerías de CSS-in-JS
- Clases de estado dinámicas vía interpolación: `` `${styles.cell} ${styles[cell.state]}` ``
- Variables globales, reset y tema en `src/index.css`; layout de la app en `src/App.css`
- Paleta oscura: `--color-bg: #080818`, `--color-gold: #ffd700`, `--color-danger: #ff4757`
- Paleta clara: `--color-bg: #f0f2fa`, `--color-gold: #b8860b` (en `[data-theme="light"]`)
- Fuentes: **Bebas Neue** (`--font-display`) para títulos, **Poppins** (`--font-body`) para texto

### Estado: reducer inmutable

Nunca mutes el estado directamente. Usa spread en el reducer:
```ts
case 'UPDATE_CELL':
  return { ...state, cells: state.cells.map(c => c.id === id ? { ...c, ...changes } : c) };
```

### Audio

Síntesis con Web Audio API en `src/utils/audio.ts` (sin librerías). Funciones disponibles: `playDing()`, `playError()`, `playSuccess()`, `playTransition()`. El `AudioContext` es un singleton inicializado de forma perezosa.

### Animaciones y bloqueos

- Antes de una secuencia de revelado: `dispatch({ type: 'SET_REVEALING', payload: true })`
- Al finalizar: `dispatch({ type: 'SET_REVEALING', payload: false })`
- Los retrasos de animación están centralizados en `state.config` (`letterRevealDelay: 250ms`, `turnChangeDelay: 1000ms`)

## Ruleta SVG

- **24 casillas** definidas como array estático en `Wheel.tsx` dentro de `useMemo`.
- Distribución de casillas especiales:
  - `QUIEBRA` → posiciones **0 y 12** (exactamente opuestas, 180°)
  - `PIERDE_TURNO` → posiciones **7, 15 y 23** (equidistantes, cada 8 posiciones = 120°)
  - `COMODÍN` → posición **22** (reemplazado por `400€` cuando ya fue otorgado)
- El cálculo de rotación normaliza el ángulo acumulado para evitar desfase visual tras múltiples giros.
- El resultado anterior se oculta durante el giro (`!isSpinning` guarda el render de value/result).

## Estructura de directorios

```
src/
  types/game.ts          # Todos los tipos del juego (incluye Phrase, RESET_GAME)
  context/
    GameContext.ts        # Contexto + hook useGame()
    GameProvider.tsx      # Reducer (21 acciones) + estado inicial
  components/
    Dialog/               # Modal genérico (confirmar/cancelar con comodín)
    GameControls/         # Lógica principal de turno (girar, consonante, vocal, resolver)
    LetterPanel/          # Tablero de letras agrupadas por palabra (LetterPanel + LetterCell)
    PlayerInfo/           # Puntuaciones y wallets de los 3 jugadores
    PhraseManager/        # CRUD de frases — recibe frases como props desde App.tsx
    Wheel/                # Ruleta SVG de 24 casillas con animación de giro
    WinnerModal/          # Modal de podio al terminar la partida
  hooks/
    useLetterReveal.ts    # Hook para secuencia de revelado de letras
    useTheme.ts           # Hook para alternar tema claro/oscuro y persistirlo
  utils/
    audio.ts              # Síntesis de audio (Web Audio API)
  App.tsx                 # GameApp (lógica de frases, tema, rondas) + App (provider)
  App.css                 # Layout global, header, botón de tema
  index.css               # Variables CSS, reset, tema oscuro (:root) y claro ([data-theme="light"])
```

## TypeScript — configuración estricta

El proyecto usa `"strict": true` junto con `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` y `erasableSyntaxOnly`. El build fallará si hay errores de tipos. Comprueba siempre con `yarn build` antes de dar por terminado un cambio.
