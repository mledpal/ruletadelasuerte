import type { GameState, TurnUi } from '../types/game';
import { newGameId } from '../utils/id';
import { DEFAULT_CONSONANT_TIME } from '../utils/consonantTimer';

export const initialTurnUi: TurnUi = {
  message: null,
  pendingSpecial: null,
  pendingBote: false,
  dialog: null,
  failedLetterType: null,
  targetMode: null,
  changingTurn: false,
  wheelOpen: false,
};

/** Campos del turno que se limpian al pasar al siguiente jugador */
export const turnUiAfterTurnChange: Partial<TurnUi> = {
  message: null,
  pendingSpecial: null,
  pendingBote: false,
  dialog: null,
  failedLetterType: null,
  targetMode: null,
  changingTurn: false,
  wheelOpen: false,
};

/**
 * Repara un estado guardado o recibido que pudo quedarse a medias (animación de
 * letras, cambio de turno en curso, ruleta abierta tras girar) y completa los campos
 * que no existían en guardados antiguos. Devuelve el mismo objeto si no cambia nada
 * relevante para la partida.
 */
export function sanitizeState(saved: GameState): GameState {
  const turnUi: TurnUi = { ...initialTurnUi, ...saved.turnUi };
  let state: GameState = {
    ...saved,
    gameId: saved.gameId ?? newGameId(), // guardados antiguos no tienen este campo
    rev: saved.rev ?? 0,
    seats: saved.seats ?? [],
    isRevealing: false,
    // guardados antiguos no tienen límite de tiempo configurado
    config: { ...saved.config, consonantTimeLimit: saved.config?.consonantTimeLimit ?? DEFAULT_CONSONANT_TIME },
    wheelStop: saved.wheelStop ?? null, // guardados antiguos no tienen este campo
    players: saved.players.map((p) => ({ ...p, hasAllVowels: p.hasAllVowels ?? false })),
    cells: saved.cells.map((c) => (c.state === 'revealing' ? { ...c, state: 'visible' } : c)),
    turnUi,
  };

  if (turnUi.changingTurn) {
    // El temporizador del cambio de turno se perdió: completarlo ahora
    state = {
      ...state,
      currentPlayer: (state.currentPlayer + 1) % state.players.length,
      hasSpunWheel: false,
      wheelValue: 0,
      lastWheelResult: null,
      turnPhase: 'spin',
      turnUi: { ...turnUi, ...turnUiAfterTurnChange },
    };
  } else if (turnUi.wheelOpen && state.hasSpunWheel) {
    // La ruleta ya giró: no reabrirla (permitiría un segundo giro)
    state = { ...state, turnUi: { ...turnUi, wheelOpen: false } };
  }
  return state;
}

/** ¿Hacía falta reparar el estado? (animación o cambio de turno a medias) */
export function needsRepair(state: GameState): boolean {
  return (
    state.isRevealing ||
    state.cells.some((c) => c.state === 'revealing') ||
    Boolean(state.turnUi?.changingTurn) ||
    Boolean(state.turnUi?.wheelOpen && state.hasSpunWheel)
  );
}
