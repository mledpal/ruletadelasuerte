// Conexión a una sala del modo online mediante Supabase Realtime:
// - broadcast: estado de la partida y eventos efímeros (giro, sonidos, reacciones)
// - presence: quién está conectado
import { RealtimeClient, type RealtimeChannel } from '@supabase/realtime-js';
import { SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from '../utils/supabaseConfig';
import type { ConnectionStatus, OnlineMessage, Peer } from '../types/online';

export const onlineEnabled = supabaseEnabled;

const EVENT = 'msg';

interface RoomHandlers {
  onMessage: (message: OnlineMessage) => void;
  onPeers: (peers: Peer[]) => void;
  onStatus: (status: ConnectionStatus) => void;
}

export interface RoomConnection {
  send: (message: OnlineMessage) => void;
  leave: () => void;
}

let client: RealtimeClient | null = null;

function getClient(): RealtimeClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Modo online no configurado');
  client ??= new RealtimeClient(`${SUPABASE_URL}/realtime/v1`, {
    // Las animaciones de letras generan varios estados por segundo
    params: { apikey: SUPABASE_KEY, eventsPerSecond: 30 },
  });
  return client;
}

function peersFrom(channel: RealtimeChannel): Peer[] {
  const state = channel.presenceState<Peer>();
  const peers: Peer[] = [];
  for (const entries of Object.values(state)) {
    // Varias pestañas del mismo navegador comparten clientId: basta con una
    const first = entries[0];
    if (first) peers.push({ clientId: first.clientId, name: first.name, host: first.host, joinedAt: first.joinedAt });
  }
  return peers.sort((a, b) => a.joinedAt - b.joinedAt);
}

export function connectRoom(room: string, me: Peer, handlers: RoomHandlers): RoomConnection {
  const channel = getClient().channel(`ruleta-${room}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: me.clientId },
    },
  });

  channel.on('broadcast', { event: EVENT }, ({ payload }) => {
    handlers.onMessage(payload as OnlineMessage);
  });
  channel.on('presence', { event: 'sync' }, () => {
    handlers.onPeers(peersFrom(channel));
  });

  handlers.onStatus('connecting');
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.track({ ...me });
      handlers.onStatus('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // realtime-js reintenta solo; mientras tanto se avisa en pantalla
      handlers.onStatus('error');
    }
  });

  return {
    send: (message) => {
      void channel.send({ type: 'broadcast', event: EVENT, payload: message });
    },
    leave: () => {
      void channel.untrack();
      void getClient().removeChannel(channel);
    },
  };
}
