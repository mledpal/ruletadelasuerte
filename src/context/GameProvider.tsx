import { useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { GameState, GameAction, LetterCell } from '../types/game';
import { GameContext } from './GameContext';

const SAVE_KEY = 'ruleta:state';

function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as GameState;
    // Sanear estado transitorio de animación
    return {
      ...saved,
      isRevealing: false,
      cells: saved.cells.map((c) =>
        c.state === 'revealing' ? { ...c, state: 'visible' } : c
      ),
    };
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
  phrase: 'LA RULETA DE LA FORTUNA',
  hint: 'Nombre del programa',
  category: 'TELEVISIÓN',
  cells: createCellsFromPhrase('LA RULETA DE LA FORTUNA'),
  currentPlayer: 0,
  players: [
    { id: 0, name: 'Jugador 1', score: 0, wallet: 0, hasWildcard: false },
    { id: 1, name: 'Jugador 2', score: 0, wallet: 0, hasWildcard: false },
    { id: 2, name: 'Jugador 3', score: 0, wallet: 0, hasWildcard: false },
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
  guessedLetters: [],
  config: {
    letterRevealDelay: 250,
    turnChangeDelay: 1000,
    victoryRevealDelay: 250,
    totalRounds: 3,
  },
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME': {
      const count = action.payload;
      const players = Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Jugador ${i + 1}`,
        score: 0,
        wallet: 0,
        hasWildcard: false,
      }));
      return {
        ...initialState,
        players,
        wildcardAvailable: count > 1,
      };
    }

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

    case 'RESET_WHEEL':
      return {
        ...state,
        hasSpunWheel: false,
        wheelValue: 0,
        lastWheelResult: null,
      };

    case 'ADD_SCORE':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload.playerId
            ? { ...player, score: player.score + action.payload.amount }
            : player
        ),
      };

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

    case 'COMPLETE_ROUND':
      return {
        ...state,
        roundComplete: true,
        players: state.players.map((player) => {
          if (player.id === action.payload) {
            return {
              ...player,
              wallet: player.wallet + player.score,
            };
          }
          return {
            ...player,
            score: 0,
          };
        }),
      };

    case 'NEXT_ROUND':
      if (state.currentRound >= state.totalRounds) {
        return {
          ...state,
          gameComplete: true,
        };
      }
      return {
        ...state,
        currentRound: state.currentRound + 1,
        currentPlayer: (state.currentPlayer + 1) % state.players.length,
        roundComplete: false,
        hasSpunWheel: false,
        wheelValue: 0,
        lastWheelResult: null,
        turnPhase: 'spin',
        wildcardAvailable: state.players.length > 1,
        guessedLetters: [],
        players: state.players.map((player) => ({
          ...player,
          score: 0,
        })),
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
        wildcardAvailable: state.players.length > 1,
        players: state.players.map((p) => ({ ...p, score: 0, wallet: 0, hasWildcard: false })),
      };

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadSavedState() ?? initialState);

  const wrappedDispatch = useCallback((action: GameAction) => {
    if (action.type === 'RESET_GAME' || action.type === 'INIT_GAME') {
      localStorage.removeItem(SAVE_KEY);
    }
    dispatch(action);
  }, []);

  useEffect(() => {
    if (state.isRevealing) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // localStorage no disponible o lleno — ignorar
    }
  }, [state]);

  return <GameContext.Provider value={{ state, dispatch: wrappedDispatch }}>{children}</GameContext.Provider>;
}
