import { useCallback, useEffect, useState } from 'react';
import type { RankingEntry, RankingMode } from '../types/game';
import { fetchRanking, qualifies, rankingEnabled, submitScore } from '../utils/ranking';
import type { ScoreSubmission } from '../utils/ranking';

/**
 * Resultado de una petición asociado a su clave. Mientras la clave guardada no
 * coincida con la de la petición en curso, el estado se considera "cargando"
 * (así no hace falta llamar a setState de forma síncrona dentro del efecto).
 */
interface Result<S> {
  key: string;
  status: S;
  entries: RankingEntry[];
}

export type RankingLoadStatus = 'disabled' | 'loading' | 'ready' | 'error';

/** Carga el top de un modo para consultarlo (pantalla de clasificación). */
export function useRankingBoard(mode: RankingMode) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<RankingLoadStatus> | null>(null);
  const key = `${mode}:${attempt}`;

  useEffect(() => {
    if (!rankingEnabled) return;
    let cancelled = false;
    fetchRanking(mode)
      .then((entries) => {
        if (!cancelled) setResult({ key, status: 'ready', entries });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, status: 'error', entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [mode, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!rankingEnabled) return { entries: [], status: 'disabled' as const, retry };
  if (result?.key !== key) return { entries: [], status: 'loading' as const, retry };
  return { entries: result.entries, status: result.status, retry };
}

export type SubmitStatus = 'disabled' | 'sending' | 'entered' | 'not-qualified' | 'error';

/**
 * Al terminar la partida: carga el top y, si el ganador entra, lo envía.
 * Es idempotente (el servidor ignora un gameId repetido), así que no importa
 * que se ejecute dos veces (StrictMode) o que se reintente.
 */
export function useSubmitWinner(winner: ScoreSubmission | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<SubmitStatus> | null>(null);

  // El objeto se crea en cada render: se serializa para usarlo como dependencia
  const payload = winner ? JSON.stringify(winner) : null;
  const gameId = winner?.gameId;
  const key = `${gameId}:${attempt}`;

  useEffect(() => {
    if (!rankingEnabled || !payload) return;
    const data = JSON.parse(payload) as ScoreSubmission;
    let cancelled = false;

    (async () => {
      let entries = await fetchRanking(data.mode);
      const alreadyIn = entries.some((e) => e.gameId === data.gameId);
      if (!alreadyIn && qualifies(entries, data.score, data.players)) {
        await submitScore(data);
        entries = await fetchRanking(data.mode);
      }
      if (cancelled) return;
      const status = entries.some((e) => e.gameId === data.gameId) ? 'entered' : 'not-qualified';
      setResult({ key, status, entries });
    })().catch(() => {
      if (!cancelled) setResult({ key, status: 'error', entries: [] });
    });

    return () => {
      cancelled = true;
    };
  }, [key, payload]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!rankingEnabled || !winner) return { entries: [], status: 'disabled' as const, position: 0, retry };
  if (result?.key !== key) return { entries: [], status: 'sending' as const, position: 0, retry };
  const position = result.entries.findIndex((e) => e.gameId === gameId) + 1;
  return { entries: result.entries, status: result.status, position, retry };
}
