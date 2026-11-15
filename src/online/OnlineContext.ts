import { createContext, useContext } from 'react';
import type { ConnectionStatus, Peer, Reaction, RemoteSpin } from '../types/online';

export type SpinListener = (spin: RemoteSpin, elapsedMs: number) => void;

export interface OnlineSession {
  room: string;
  clientId: string;
  name: string;
  /** Configura y arranca la partida; entre rondas elige la frase */
  isHost: boolean;
  status: ConnectionStatus;
  peers: Peer[];
  /** Cliente que puede jugar ahora mismo (null en la sala de espera) */
  controllerId: string | null;
  /** Este cliente puede jugar ahora mismo */
  canAct: boolean;
  /** El jugador que debe jugar se ha desconectado: la partida espera */
  paused: boolean;
  /** Índice del jugador de este cliente (null si solo mira) */
  mySeat: number | null;
  sendSpin: (spin: RemoteSpin) => void;
  /** Escucha giros remotos; si hubo uno hace un momento, se notifica enseguida con su retraso */
  subscribeSpin: (listener: SpinListener) => () => void;
  reactions: Reaction[];
  sendReaction: (text: string) => void;
}

export const OnlineContext = createContext<OnlineSession | null>(null);

/** Sesión online, o null en una partida local */
export function useOnline(): OnlineSession | null {
  return useContext(OnlineContext);
}
