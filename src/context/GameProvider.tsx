import { useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { GameState, GameAction, LetterCell } from '../types/game';
import { GameContext } from './GameContext';
import { newGameId } from '../utils/id';
import { DEFAULT_CONSONANT_TIME } from '../utils/consonantTimer';
import { initialTurnUi, needsRepair, sanitizeState, turnUiAfterTurnChange } from './sanitize';

const SAVE_KEY = 'ruleta:state';

function loadSavedState(key: string, repair: boolean): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as GameState;
    // En online lo repara el cliente con el turno, una vez sincronizado (OnlineProvider)
    if (!repair) return saved;
    const repaired = sanitizeState(saved);
    // Si había algo a medias, la reparación cuenta como un cambio (en online se difunde)
    return needsRepair(saved) ? { ...repaired, rev: repaired.rev + 1 } : repaired;
  } catch {
    return null;
  }
}

function createCellsFromPhrase(phrase: string): LetterCell[] {
  return phrase.split('').map((char, index) => ({
    id: `cell-${index}`,
    letter: char === ' ' ? null : char.toUpperCase(),
    state: char === ' ' ? 'visible' : 'hidden',
    position: index,
  }));
}

const initialState: GameState = {
  gameId: '',
  rev: 0,
  seats: [],
  turnUi: initialTurnUi,
  phrase: 'LA RULETA DE LA FORTUNA',
  hint: 'Nombre del programa',
  category: 'TELEVISIÓN',
  cells: createCellsFromPhrase('LA RULETA DE LA FORTUNA'),
  currentPlayer: 0,
  players: [
    { id: 0, name: 'Jugador 1', score: 0, wallet: 0, hasWildcard: false, hasAllVowels: false, hasAnibal: false, hasHimilce: false, hasEscipion: false },
    { id: 1, name: 'Jugador 2', score: 0, wallet: 0, hasWildcard: false, hasAllVowels: false, hasAnibal: false, hasHimilce: false, hasEscipion: false },
    { id: 2, name: 'Jugador 3', score: 0, wallet: 0, hasWildcard: false, hasAllVowels: false, hasAnibal: false, hasHimilce: false, hasEscipion: false },
  ],
  wheelValue: 0,
  lastWheelResult: null,
  hasSpunWheel: false,
  turnPhase: 'spin',
  isRevealing: false,
  roundComplete: false,
  currentRound: 1,
  totalRounds: 3,
  gameComplete: false,
  wildcardAvailable: true,
  wildcardEnabled: true,
  guessedLetters: [],
  boteAmount: 0,
  boteWinnerId: null,
  boteRoundEnabled: false,
  castuloMode: false,
  wheelStop: null,
  config: {
    letterRevealDelay: 250,
    turnChangeDelay: 1000,
    victoryRevealDelay: 250,
    totalRounds: 3,
    consonantTimeLimit: DEFAULT_CONSONANT_TIME,
  },
};

/** Aplica la acción y numera el cambio (rev) para la sincronización online */
function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'REPLACE_STATE') {
    const { state: next, bump } = action.payload;
    return bump ? { ...next, rev: Math.max(next.rev, state.rev) + 1 } : next;
  }
  const next = applyAction(state, action);
  return next === state ? state : { ...next, rev: state.rev + 1 };
}

function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME': {
      const { playerNames, rounds, wildcardEnabled, boteRoundEnabled, castuloMode, consonantTimeLimit, seats } = action.payload;
      const playerCount = playerNames.length;
      const players = playerNames.map((name, i) => ({
        id: i,
        name,
        score: 0,
        wallet: 0,
        hasWildcard: false,
        hasAllVowels: false,
        hasAnibal: false,
        hasHimilce: false,
        hasEscipion: false,
      }));
      const isBoteActive = boteRoundEnabled && playerCount >= 2;
      return {
        ...initialState,
        gameId: newGameId(),
        seats: seats ?? [],
        players,
        totalRounds: rounds,
        wildcardEnabled,
        wildcardAvailable: wildcardEnabled && playerCount > 1,
        boteRoundEnabled: isBoteActive,
        boteAmount: isBoteActive && rounds === 1 ? 1000 : 0,
        boteWinnerId: null,
        castuloMode,
        config: { ...initialState.config, totalRounds: rounds, consonantTimeLimit },
      };
    }

    case 'SET_TURN_UI':
      return {
        ...state,
        turnUi: { ...state.turnUi, ...action.payload },
      };

    case 'SET_PHRASE':
      return {
        ...state,
        phrase: action.payload.phrase,
        hint: action.payload.hint,
        category: action.payload.category,
        cells: createCellsFromPhrase(action.payload.phrase),
        roundComplete: false,
        hasSpunWheel: false,
        wheelValue: 0,
        guessedLetters: [],
      };

    case 'UPDATE_CELL':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.id === action.payload.id ? { ...cell, state: action.payload.state } : cell
        ),
      };

    case 'SET_REVEALING':
      return {
        ...state,
        isRevealing: action.payload,
      };

    case 'SPIN_WHEEL':
      return {
        ...state,
        wheelValue: action.payload,
        lastWheelResult: action.payload,
        hasSpunWheel: true,
      };

    case 'SPIN_WHEEL_SPECIAL':
      return {
        ...state,
        wheelValue: 0,
        lastWheelResult: action.payload,
        hasSpunWheel: true,
      };

    case 'SET_WHEEL_STOP':
      return {
        ...state,
        wheelStop: action.payload,
      };

    case 'RESET_WHEEL':
      return {
        ...state,
        hasSpunWheel: false,
        wheelValue: 0,
        lastWheelResult: null,
      };

    case 'ADD_SCORE': {
      const isBoteRound =
        state.boteRoundEnabled &&
        state.currentRound === state.totalRounds &&
        state.players.length >= 2;
      return {
        ...state,
        boteAmount: isBoteRound
          ? state.boteAmount + action.payload.amount
          : state.boteAmount,
        players: state.players.map((player) =>
          player.id === action.payload.playerId
            ? { ...player, score: player.score + action.payload.amount }
            : player
        ),
      };
    }

    case 'DEDUCT_SCORE':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload.playerId
            ? { ...player, score: Math.max(0, player.score - action.payload.amount) }
            : player
        ),
      };

    case 'BANKRUPT':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload ? { ...player, score: 0 } : player
        ),
      };

    case 'NEXT_TURN':
      return {
        ...state,
        currentPlayer: (state.currentPlayer + 1) % state.players.length,
        hasSpunWheel: false,
        wheelValue: 0,
        lastWheelResult: null,
        turnPhase: 'spin',
        turnUi: { ...state.turnUi, ...turnUiAfterTurnChange },
      };

    case 'SET_TURN_PHASE':
      return {
        ...state,
        turnPhase: action.payload,
      };

    case 'USE_WILDCARD':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload ? { ...player, hasWildcard: false } : player
        ),
      };

    case 'AWARD_WILDCARD':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload ? { ...player, hasWildcard: true } : player
        ),
        wildcardAvailable: false,
      };

    case 'AWARD_ALL_VOWELS':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload ? { ...player, hasAllVowels: true } : player
        ),
      };

    case 'USE_ALL_VOWELS':
      // Consume el gajo y da por pedidas todas las vocales (el gajo vuelve a la ruleta)
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload ? { ...player, hasAllVowels: false } : player
        ),
        guessedLetters: [
          ...state.guessedLetters,
          ...['A', 'E', 'I', 'O', 'U'].filter((v) => !state.guessedLetters.includes(v)),
        ],
      };

    case 'AWARD_TOKEN': {
      const { playerId, token } = action.payload;
      const flag =
        token === 'ANIBAL' ? 'hasAnibal' : token === 'HIMILCE' ? 'hasHimilce' : 'hasEscipion';
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === playerId ? { ...player, [flag]: true } : player
        ),
      };
    }

    case 'USE_ESCIPION': {
      const { sourceId, targetId } = action.payload;
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === targetId) {
            return {
              ...player,
              score: 0,
              hasWildcard: false,
              hasAllVowels: false,
              hasAnibal: false,
              hasHimilce: false,
              hasEscipion: false,
            };
          }
          if (player.id === sourceId) {
            // Escipión se consume al usarlo
            return { ...player, hasEscipion: false };
          }
          return player;
        }),
      };
    }

    case 'ASEDIO_TRANSFER': {
      const { sourceId, targetId } = action.payload;
      const source = state.players.find((p) => p.id === sourceId);
      if (!source) return state;
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === targetId) {
            return {
              ...player,
              score: player.score + source.score,
              hasWildcard: player.hasWildcard || source.hasWildcard,
              hasAllVowels: player.hasAllVowels || source.hasAllVowels,
              hasAnibal: player.hasAnibal || source.hasAnibal,
              hasHimilce: player.hasHimilce || source.hasHimilce,
              hasEscipion: player.hasEscipion || source.hasEscipion,
            };
          }
          if (player.id === sourceId) {
            return {
              ...player,
              score: 0,
              hasWildcard: false,
              hasAllVowels: false,
              hasAnibal: false,
              hasHimilce: false,
              hasEscipion: false,
            };
          }
          return player;
        }),
      };
    }

    case 'COMPLETE_ROUND':
      return {
        ...state,
        roundComplete: true,
        players: state.players.map((player) => {
          if (player.id === action.payload) {
            const bonus = player.hasAnibal && player.hasHimilce ? 1000 : 0;
            return {
              ...player,
              wallet: player.wallet + player.score + bonus,
              // El bono consume Aníbal y Himilce; si no se cobró, se conservan
              hasAnibal: bonus > 0 ? false : player.hasAnibal,
              hasHimilce: bonus > 0 ? false : player.hasHimilce,
            };
          }
          return {
            ...player,
            score: 0,
          };
        }),
      };

    case 'NEXT_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return {
          ...state,
          gameComplete: true,
        };
      }
      const nextRound = state.currentRound + 1;
      const startBote =
        state.boteRoundEnabled &&
        nextRound === state.totalRounds &&
        state.players.length >= 2;
      return {
        ...state,
        currentRound: nextRound,
        currentPlayer: (state.currentPlayer + 1) % state.players.length,
        roundComplete: false,
        hasSpunWheel: false,
        wheelValue: 0,
        lastWheelResult: null,
        turnPhase: 'spin',
        wildcardAvailable: state.wildcardEnabled && state.players.length > 1,
        guessedLetters: [],
        // El mensaje de quién ganó la ronda sigue visible al empezar la siguiente
        turnUi: { ...initialTurnUi, message: state.turnUi.message },
        boteAmount: startBote ? 1000 : state.boteAmount,
        players: state.players.map((player) => ({
          ...player,
          score: 0,
        })),
      };
    }

    case 'WIN_BOTE':
      return {
        ...state,
        roundComplete: true,
        boteWinnerId: action.payload,
        players: state.players.map((player) => {
          if (player.id === action.payload) {
            const bonus = player.hasAnibal && player.hasHimilce ? 1000 : 0;
            return {
              ...player,
              wallet: player.wallet + state.boteAmount + player.score + bonus,
              hasAnibal: bonus > 0 ? false : player.hasAnibal,
              hasHimilce: bonus > 0 ? false : player.hasHimilce,
            };
          }
          return { ...player, score: 0 };
        }),
      };

    case 'COMPLETE_GAME':
      return {
        ...state,
        gameComplete: true,
      };

    case 'GUESS_LETTER':
      if (state.guessedLetters.includes(action.payload)) return state;
      return {
        ...state,
        guessedLetters: [...state.guessedLetters, action.payload],
      };

    case 'REVEAL_ALL':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.letter !== null ? { ...cell, state: 'visible' } : cell
        ),
      };

    case 'RESET_GAME':
      return {
        ...initialState,
        gameId: newGameId(),
        // Volver a la sala de espera en el modo online
        seats: [],
        wildcardAvailable: state.wildcardEnabled && state.players.length > 1,
        wildcardEnabled: state.wildcardEnabled,
        totalRounds: state.totalRounds,
        boteRoundEnabled: state.boteRoundEnabled,
        boteAmount: 0,
        boteWinnerId: null,
        castuloMode: state.castuloMode,
        config: { ...initialState.config, totalRounds: state.totalRounds, consonantTimeLimit: state.config.consonantTimeLimit },
        players: state.players.map((p) => ({
          ...p,
          score: 0,
          wallet: 0,
          hasWildcard: false,
          hasAllVowels: false,
          hasAnibal: false,
          hasHimilce: false,
          hasEscipion: false,
        })),
      };

    default:
      return state;
  }
}

interface GameProviderProps {
  children: ReactNode;
  /** Clave de guardado en localStorage (cada sala online tiene la suya) */
  storageKey?: string;
  /** Reparar al cargar lo que quedó a medias (false en online) */
  repairOnLoad?: boolean;
}

export function GameProvider({ children, storageKey = SAVE_KEY, repairOnLoad = true }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadSavedState(storageKey, repairOnLoad) ?? initialState);

  const wrappedDispatch = useCallback((action: GameAction) => {
    if (action.type === 'RESET_GAME' || action.type === 'INIT_GAME') {
      localStorage.removeItem(storageKey);
    }
    dispatch(action);
  }, [storageKey]);

  useEffect(() => {
    if (state.isRevealing) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage no disponible o lleno — ignorar
    }
  }, [state, storageKey]);

  return <GameContext.Provider value={{ state, dispatch: wrappedDispatch }}>{children}</GameContext.Provider>;
}
