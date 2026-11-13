// Cliente mínimo (sin dependencias) de la API REST de Supabase para el ranking global.
// La configuración viene de VITE_SUPABASE_URL y VITE_SUPABASE_KEY (ver supabase/README.md).
// Si faltan, el ranking queda desactivado y el juego funciona igual.
import type { RankingEntry, RankingMode } from '../types/game';

/** Número de puestos de cada tabla. Debe coincidir con el de supabase/ranking.sql */
export const RANKING_SIZE = 10;
export const MAX_NAME_LENGTH = 20;

// Se admite tanto la Project URL como la URL de la API (acabada en /rest/v1/)
const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '');
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
const TIMEOUT_MS = 8000;

export const rankingEnabled = Boolean(URL && KEY);

interface RankingRow {
  game_id: string;
  name: string;
  score: number;
  rounds: number;
  created_at: string;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  if (!URL || !KEY) throw new Error('Ranking no configurado');
  const headers: Record<string, string> = {
    apikey: KEY,
    'Content-Type': 'application/json',
  };
  // Las claves "anon" antiguas son JWT y también van en Authorization;
  // las nuevas "publishable" (sb_publishable_...) solo en apikey.
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;

  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

/** Top de un modo, de mayor a menor puntuación (a igualdad, gana el más antiguo). */
export async function fetchRanking(mode: RankingMode): Promise<RankingEntry[]> {
  const query = new URLSearchParams({
    select: 'game_id,name,score,rounds,created_at',
    mode: `eq.${mode}`,
    order: 'score.desc,created_at.asc,id.asc',
    limit: String(RANKING_SIZE),
  });
  const res = await request(`ranking?${query}`);
  const rows = (await res.json()) as RankingRow[];
  return rows.map((r) => ({
    gameId: r.game_id,
    name: r.name,
    score: r.score,
    rounds: r.rounds,
    createdAt: r.created_at,
  }));
}

/** ¿Entraría esta puntuación en la tabla actual? (el servidor lo vuelve a comprobar) */
export function qualifies(entries: RankingEntry[], score: number): boolean {
  if (score <= 0) return false;
  if (entries.length < RANKING_SIZE) return true;
  return score > entries[entries.length - 1].score;
}

/**
 * Envía la puntuación del ganador. El servidor solo la guarda si entra en el top
 * y si esa partida no se había enviado ya. Devuelve true si se ha guardado.
 */
export async function submitScore(params: {
  gameId: string;
  name: string;
  score: number;
  mode: RankingMode;
  rounds: number;
}): Promise<boolean> {
  const res = await request('rpc/submit_score', {
    method: 'POST',
    body: JSON.stringify({
      p_game_id: params.gameId,
      p_name: params.name,
      p_score: params.score,
      p_mode: params.mode,
      p_rounds: params.rounds,
    }),
  });
  return (await res.json()) as boolean;
}
