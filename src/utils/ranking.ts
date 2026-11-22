// Cliente mínimo (sin dependencias) de la API REST de Supabase para el ranking global.
// La configuración viene de VITE_SUPABASE_URL y VITE_SUPABASE_KEY (ver supabase/README.md).
// Si faltan, el ranking queda desactivado y el juego funciona igual.
import type { RankingEntry, RankingGameInfo, RankingMode } from '../types/game';
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig';

/** Número de puestos de cada tabla. Debe coincidir con el de supabase/ranking.sql */
export const RANKING_SIZE = 10;
export const MAX_NAME_LENGTH = 20;

const URL = SUPABASE_URL;
const KEY = SUPABASE_KEY;
const TIMEOUT_MS = 8000;

export const rankingEnabled = Boolean(URL && KEY);

interface RankingRow {
  game_id: string;
  name: string;
  score: number;
  rounds: number;
  created_at: string;
  players: number | null;
  online: boolean | null;
  opponents: string[] | null;
  wildcard: boolean | null;
  bote: boolean | null;
  bote_won: boolean | null;
}

/** Partida en grupo (2+ jugadores). Las antiguas, sin nº de jugadores, no cuentan. */
export function isGroupGame(entry: Pick<RankingGameInfo, 'players'>): boolean {
  return (entry.players ?? 0) >= 2;
}

/**
 * Orden del top (el mismo que en supabase/ranking.sql): primero las partidas en
 * grupo, luego las demás; dentro de cada grupo, por puntuación. Negativo si `a` va antes.
 */
function compareEntries(a: { group: boolean; score: number }, b: { group: boolean; score: number }): number {
  if (a.group !== b.group) return a.group ? -1 : 1;
  return b.score - a.score;
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

/** Top de un modo: partidas en grupo primero y luego por puntuación (a igualdad, gana el más antiguo). */
export async function fetchRanking(mode: RankingMode): Promise<RankingEntry[]> {
  const query = new URLSearchParams({
    select: 'game_id,name,score,rounds,created_at,players,online,opponents,wildcard,bote,bote_won',
    mode: `eq.${mode}`,
    order: 'group_game.desc,score.desc,created_at.asc,id.asc',
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
    players: r.players,
    online: r.online,
    opponents: r.opponents,
    wildcard: r.wildcard,
    bote: r.bote,
    boteWon: r.bote_won,
  }));
}

/** ¿Entraría esta puntuación en la tabla actual? (el servidor lo vuelve a comprobar) */
export function qualifies(entries: RankingEntry[], score: number, players: number): boolean {
  if (score <= 0) return false;
  if (entries.length < RANKING_SIZE) return true;
  const last = entries[entries.length - 1];
  return (
    compareEntries({ group: players >= 2, score }, { group: isGroupGame(last), score: last.score }) < 0
  );
}

/**
 * Envía la puntuación del ganador. El servidor solo la guarda si entra en el top
 * y si esa partida no se había enviado ya. Devuelve true si se ha guardado.
 */
export interface ScoreSubmission {
  gameId: string;
  name: string;
  score: number;
  mode: RankingMode;
  rounds: number;
  players: number;
  online: boolean;
  opponents: string[];
  wildcard: boolean;
  bote: boolean;
  boteWon: boolean;
}

export async function submitScore(params: ScoreSubmission): Promise<boolean> {
  const res = await request('rpc/submit_score', {
    method: 'POST',
    body: JSON.stringify({
      p_game_id: params.gameId,
      p_name: params.name,
      p_score: params.score,
      p_mode: params.mode,
      p_rounds: params.rounds,
      p_players: params.players,
      p_online: params.online,
      p_opponents: params.opponents,
      p_wildcard: params.wildcard,
      p_bote: params.bote,
      p_bote_won: params.boteWon,
    }),
  });
  return (await res.json()) as boolean;
}
