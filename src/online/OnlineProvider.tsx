import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GameContext, useGame } from '../context/GameContext';
import { needsRepair, sanitizeState } from '../context/sanitize';
import type { GameAction, GameState } from '../types/game';
import type { ConnectionStatus, OnlineMessage, Peer, Reaction, RemoteSpin } from '../types/online';
import { playRemoteSound, setSoundRelay } from '../utils/audio';
import { newGameId } from '../utils/id';
import { controllerOf } from './control';
import { getClientId, isHostOf } from './identity';
import { OnlineContext, type OnlineSession, type SpinListener } from './OnlineContext';
import { connectRoom, type RoomConnection } from './realtime';

/** Separación mínima entre dos envíos de estado (los cambios intermedios se agrupan) */
const SEND_INTERVAL_MS = 80;
/** Tras conectar, tiempo para recibir el estado de los demás antes de reparar el propio */
const INITIAL_SYNC_MS = 1500;
/** Un giro recibido hace menos de esto se reproduce si la ruleta se abre tarde */
const SPIN_REPLAY_MS = 6000;
const REACTION_MS = 4500;
const MAX_REACTIONS = 6;

/** Acciones que el anfitrión puede lanzar aunque no tenga el turno (rondas y frases) */
const HOST_ACTIONS = new Set<GameAction['type']>(['INIT_GAME', 'RESET_GAME', 'SET_PHRASE', 'NEXT_ROUND', 'COMPLETE_GAME']);

function hostOf(state: GameState, clientId: string, hostMarker: boolean): boolean {
  return state.seats.length > 0 ? state.seats[0] === clientId : hostMarker;
}

interface OnlineProviderProps {
  room: string;
  name: string;
  children: ReactNode;
}

/**
 * Conecta la partida (GameProvider) a una sala online:
 * - Solo el cliente con el turno puede despachar acciones; cada cambio se difunde entero.
 * - Los estados recibidos sustituyen al local si son más recientes (rev mayor).
 * - Vuelve a proporcionar GameContext con el dispatch protegido para que los
 *   componentes del juego no necesiten saber si la partida es online.
 */
export function OnlineProvider({ room, name, children }: OnlineProviderProps) {
  const { state, dispatch } = useGame();
  const [clientId] = useState(getClientId);
  const [hostMarker] = useState(() => isHostOf(room));
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [peersReady, setPeersReady] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const connRef = useRef<RoomConnection | null>(null);
  const stateRef = useRef(state);
  const remoteRevRef = useRef(-1);
  // El estado cargado del guardado no se difunde por iniciativa propia: se envía al saludar
  const sentRevRef = useRef(state.rev);
  const sendTimerRef = useRef<number | null>(null);
  const lastSendAtRef = useRef(0);
  const localActionRef = useRef(false);
  const spinListenersRef = useRef(new Set<SpinListener>());
  const lastSpinRef = useRef<{ spin: RemoteSpin; at: number } | null>(null);

  // ─── Envío de estado ────────────────────────────────────────────────────
  const sendState = useCallback(() => {
    if (sendTimerRef.current !== null) {
      clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    const current = stateRef.current;
    sentRevRef.current = Math.max(sentRevRef.current, current.rev);
    lastSendAtRef.current = Date.now();
    connRef.current?.send({ kind: 'state', state: current });
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (state.rev === remoteRevRef.current || state.rev <= sentRevRef.current) return;
    // Cambio propio: difundirlo (agrupando los que llegan muy seguidos)
    if (sendTimerRef.current !== null) return;
    const wait = Math.max(0, SEND_INTERVAL_MS - (Date.now() - lastSendAtRef.current));
    sendTimerRef.current = window.setTimeout(sendState, wait);
  }, [state, sendState]);

  // ─── Reacciones ─────────────────────────────────────────────────────────
  const addReaction = useCallback((reaction: Reaction) => {
    setReactions((prev) => [...prev.slice(-(MAX_REACTIONS - 1)), reaction]);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, REACTION_MS);
  }, []);

  // ─── Conexión a la sala ─────────────────────────────────────────────────
  useEffect(() => {
    const me: Peer = { clientId, name, host: hostMarker, joinedAt: Date.now() };
    let firstSubscribe = true;
    let repairTimer: number | null = null;

    const applyRemote = (remote: GameState) => {
      if (remote.rev <= stateRef.current.rev) return;
      remoteRevRef.current = remote.rev;
      stateRef.current = remote;
      dispatch({ type: 'REPLACE_STATE', payload: { state: remote } });
    };

    const onMessage = (message: OnlineMessage) => {
      switch (message.kind) {
        case 'state':
          applyRemote(message.state);
          break;
        case 'hello':
          // Alguien ha (re)entrado: que reciba la partida tal como está
          connRef.current?.send({ kind: 'state', state: stateRef.current });
          break;
        case 'spin':
          lastSpinRef.current = { spin: message.spin, at: performance.now() };
          spinListenersRef.current.forEach((listener) => listener(message.spin, 0));
          break;
        case 'sfx':
          playRemoteSound(message.sound);
          break;
        case 'reaction':
          addReaction(message.reaction);
          break;
      }
    };

    const conn = connectRoom(room, me, {
      onMessage,
      onPeers: (list) => {
        setPeers(list);
        setPeersReady(true);
      },
      onStatus: (next) => {
        setStatus(next);
        if (next !== 'connected') return;
        conn.send({ kind: 'hello' });
        // Si se jugó sin conexión, que los demás reciban lo último
        if (stateRef.current.seats.length > 0) conn.send({ kind: 'state', state: stateRef.current });
        if (!firstSubscribe) return;
        firstSubscribe = false;
        // Tras recargar a mitad de una animación o un cambio de turno, quien tiene
        // el turno completa lo que quedó pendiente (los demás esperan)
        repairTimer = window.setTimeout(() => {
          const current = stateRef.current;
          if (!localActionRef.current && needsRepair(current) && controllerOf(current) === clientId) {
            dispatch({ type: 'REPLACE_STATE', payload: { state: sanitizeState(current), bump: true } });
          }
        }, INITIAL_SYNC_MS);
      },
    });
    connRef.current = conn;

    return () => {
      if (repairTimer !== null) clearTimeout(repairTimer);
      if (sendTimerRef.current !== null) {
        clearTimeout(sendTimerRef.current);
        sendTimerRef.current = null;
      }
      conn.leave();
      connRef.current = null;
    };
  }, [room, name, clientId, hostMarker, dispatch, addReaction]);

  // Los sonidos de las acciones del jugador en turno se oyen también en las demás casas
  useEffect(() => {
    setSoundRelay((sound) => {
      if (controllerOf(stateRef.current) === clientId) connRef.current?.send({ kind: 'sfx', sound });
    });
    return () => setSoundRelay(null);
  }, [clientId]);

  // ─── Dispatch protegido ────────────────────────────────────────────────
  const guardedDispatch = useCallback((action: GameAction) => {
    const current = stateRef.current;
    const allowed =
      action.type === 'REPLACE_STATE' ||
      controllerOf(current) === clientId ||
      (hostOf(current, clientId, hostMarker) && HOST_ACTIONS.has(action.type));
    if (!allowed) return;
    localActionRef.current = true;
    dispatch(action);
  }, [clientId, hostMarker, dispatch]);

  const sendSpin = useCallback((spin: RemoteSpin) => {
    // Que los demás tengan ya la ruleta abierta antes de recibir el giro
    sendState();
    connRef.current?.send({ kind: 'spin', spin });
  }, [sendState]);

  const subscribeSpin = useCallback((listener: SpinListener) => {
    spinListenersRef.current.add(listener);
    const last = lastSpinRef.current;
    if (last) {
      const elapsed = performance.now() - last.at;
      if (elapsed < SPIN_REPLAY_MS) listener(last.spin, elapsed);
      lastSpinRef.current = null;
    }
    return () => {
      spinListenersRef.current.delete(listener);
    };
  }, []);

  const sendReaction = useCallback((text: string) => {
    const reaction: Reaction = { id: newGameId(), name, text };
    addReaction(reaction);
    connRef.current?.send({ kind: 'reaction', reaction });
  }, [name, addReaction]);

  const controllerId = controllerOf(state);
  const isHost = hostOf(state, clientId, hostMarker);
  const seat = state.seats.indexOf(clientId);
  const paused =
    peersReady &&
    controllerId !== null &&
    controllerId !== clientId &&
    !peers.some((p) => p.clientId === controllerId);

  const session = useMemo<OnlineSession>(() => ({
    room,
    clientId,
    name,
    isHost,
    status,
    peers,
    controllerId,
    canAct: status === 'connected' && controllerId === clientId,
    paused,
    mySeat: seat >= 0 ? seat : null,
    sendSpin,
    subscribeSpin,
    reactions,
    sendReaction,
  }), [room, clientId, name, isHost, status, peers, controllerId, paused, seat, sendSpin, subscribeSpin, reactions, sendReaction]);

  const gameValue = useMemo(() => ({ state, dispatch: guardedDispatch }), [state, guardedDispatch]);

  return (
    <OnlineContext.Provider value={session}>
      <GameContext.Provider value={gameValue}>{children}</GameContext.Provider>
    </OnlineContext.Provider>
  );
}
