import type { GameState } from '../types/game';

/**
 * Cliente que manda en este momento: el dueño del jugador en turno o, entre
 * rondas y al acabar, el anfitrión (asiento 0), que es quien elige las frases.
 * null en la sala de espera (aún no hay asientos).
 */
export function controllerOf(state: GameState): string | null {
  if (state.seats.length === 0) return null;
  if (state.roundComplete || state.gameComplete) return state.seats[0];
  return state.seats[state.currentPlayer] ?? null;
}
