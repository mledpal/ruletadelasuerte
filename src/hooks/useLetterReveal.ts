import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { playDing, playError } from '../utils/audio';
import type { RevealResult } from '../types/game';

export function useLetterReveal() {
  const { state, dispatch } = useGame();

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const revealLetter = useCallback(
    async (letter: string): Promise<RevealResult> => {
      const upperLetter = letter.toUpperCase();
      const matches = state.cells.filter(
        (cell) => cell.letter === upperLetter && cell.state === 'hidden'
      );

      if (matches.length === 0) {
        playError();
        return { success: false, count: 0 };
      }

      dispatch({ type: 'SET_REVEALING', payload: true });

      for (const match of matches) {
        dispatch({ type: 'UPDATE_CELL', payload: { id: match.id, state: 'revealing' } });
        playDing();
        await delay(state.config.letterRevealDelay);
        dispatch({ type: 'UPDATE_CELL', payload: { id: match.id, state: 'visible' } });
      }

      dispatch({ type: 'SET_REVEALING', payload: false });

      return { success: true, count: matches.length };
    },
    [state.cells, state.config.letterRevealDelay, dispatch]
  );

  const revealAll = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_REVEALING', payload: true });

    const hiddenCells = state.cells.filter((cell) => cell.state === 'hidden' && cell.letter !== null);

    for (const cell of hiddenCells) {
      dispatch({ type: 'UPDATE_CELL', payload: { id: cell.id, state: 'revealing' } });
      playDing();
      await delay(state.config.victoryRevealDelay);
      dispatch({ type: 'UPDATE_CELL', payload: { id: cell.id, state: 'visible' } });
    }

    dispatch({ type: 'SET_REVEALING', payload: false });
  }, [state.cells, state.config.victoryRevealDelay, dispatch]);

  return {
    revealLetter,
    revealAll,
    isRevealing: state.isRevealing,
  };
}
