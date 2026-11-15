import type { GameState } from './game';
import type { SharedSound } from '../utils/audio';

/** Jugador conectado a la sala (presence de Supabase Realtime) */
export interface Peer {
  clientId: string;
  name: string;
  host: boolean;
  /** Momento de entrada en la sala: ordena los asientos al empezar */
  joinedAt: number;
}

/** Giro de la ruleta lanzado por el jugador en turno, para animarlo igual en los demás */
export interface RemoteSpin {
  /** Grados (acumulados) desde los que se lanzó y en los que se detendrá */
  from: number;
  to: number;
  duration: number;
  power: number;
}

export interface Reaction {
  id: string;
  name: string;
  text: string;
}

export type OnlineMessage =
  /** Estado completo de la partida (lo envía quien la cambia) */
  | { kind: 'state'; state: GameState }
  /** Alguien acaba de conectarse: los demás le responden con su estado */
  | { kind: 'hello' }
  | { kind: 'spin'; spin: RemoteSpin }
  | { kind: 'sfx'; sound: SharedSound }
  | { kind: 'reaction'; reaction: Reaction };

export type ConnectionStatus = 'connecting' | 'connected' | 'error';
