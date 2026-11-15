import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameProvider } from './context/GameProvider';
import { useGame } from './context/GameContext';
import { OnlineProvider } from './online/OnlineProvider';
import { useOnline } from './online/OnlineContext';
import { loadOnlineName, MAX_ONLINE_PLAYERS, roomStorageKey } from './online/identity';
import { usePhrases } from './hooks/usePhrases';
import { usePhrasePicker } from './hooks/usePhrasePicker';
import { useCategories } from './hooks/useCategories';
import { useTheme } from './hooks/useTheme';
import { LetterPanel } from './components/LetterPanel/LetterPanel';
import { PlayerInfo } from './components/PlayerInfo/PlayerInfo';
import { GameControls } from './components/GameControls/GameControls';
import { WinnerModal } from './components/WinnerModal/WinnerModal';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { Dialog } from './components/Dialog/Dialog';
import { OnlineEntry } from './components/OnlineEntry/OnlineEntry';
import { OnlineLobby } from './components/OnlineLobby/OnlineLobby';
import { Reactions } from './components/Reactions/Reactions';
import type { Peer } from './types/online';

/** Frases ya usadas en la partida de la sala (las elige el anfitrión) */
const usedKey = (room: string) => `${roomStorageKey(room)}:used`;

/** Pausa entre el panel resuelto y la siguiente ronda (como en la partida local) */
const NEXT_ROUND_DELAY_MS = 3000;

/** Jugadores de la partida: el anfitrión primero y después por orden de llegada */
function seatedPeers(peers: Peer[]): Peer[] {
  return [...peers]
    .sort((a, b) => Number(b.host) - Number(a.host) || a.joinedAt - b.joinedAt)
    .slice(0, MAX_ONLINE_PLAYERS);
}

/** Nombres únicos para la partida ("Ana", "Ana (2)"...) */
function uniqueNames(peers: Peer[]): string[] {
  const seen = new Map<string, number>();
  return peers.map((p) => {
    const key = p.name.toLocaleLowerCase('es');
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? p.name : `${p.name} (${n})`;
  });
}

/** Configuración y arranque de la partida (solo el anfitrión, en la sala de espera) */
function HostSetup() {
  const { dispatch } = useGame();
  const online = useOnline();
  const room = online?.room ?? '';
  const { phrases } = usePhrases();
  const categories = useCategories(phrases);
  const { pickPhrase, resetUsed, setCategories } = usePhrasePicker(usedKey(room));

  const players = useMemo(() => seatedPeers(online?.peers ?? []), [online?.peers]);
  const names = useMemo(() => uniqueNames(players), [players]);

  const blocked =
    online?.status !== 'connected'
      ? 'Conectando con la sala…'
      : players.length < 2
        ? 'Comparte el enlace: hace falta al menos otro jugador conectado.'
        : null;

  const handleStart = (
    _names: string[],
    rounds: number,
    wildcardEnabled: boolean,
    boteRoundEnabled: boolean,
    selectedCategories: string[],
    consonantTimeLimit: number,
  ) => {
    resetUsed();
    setCategories(selectedCategories);
    const castuloMode = selectedCategories.length === 1 && selectedCategories[0] === 'CASTULO';
    dispatch({
      type: 'INIT_GAME',
      payload: {
        playerNames: names,
        rounds,
        wildcardEnabled,
        boteRoundEnabled,
        castuloMode,
        consonantTimeLimit,
        seats: players.map((p) => p.clientId),
      },
    });
    pickPhrase(phrases);
  };

  return (
    <PlayerSetup
      availableCategories={categories}
      onStart={handleStart}
      fixedPlayerNames={names}
      startBlockedReason={blocked}
    />
  );
}

/** El anfitrión pasa de ronda y elige la frase siguiente */
function HostDirector() {
  const { state, dispatch } = useGame();
  const online = useOnline();
  const { phrases } = usePhrases();
  const { pickPhrase } = usePhrasePicker(usedKey(online?.room ?? ''));
  const { roundComplete, gameComplete, currentRound, totalRounds } = state;

  useEffect(() => {
    if (!roundComplete || gameComplete) return;
    const timer = window.setTimeout(() => {
      if (currentRound >= totalRounds) {
        dispatch({ type: 'COMPLETE_GAME' });
      } else {
        dispatch({ type: 'NEXT_ROUND' });
        pickPhrase(phrases);
      }
    }, NEXT_ROUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [roundComplete, gameComplete, currentRound, totalRounds, phrases, pickPhrase, dispatch]);

  return null;
}

interface OnlineGameProps {
  onExit: () => void;
  onChangeName: () => void;
}

function OnlineGame({ onExit, onChangeName }: OnlineGameProps) {
  const { state, dispatch } = useGame();
  const online = useOnline();
  const { theme, toggle: toggleTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const inLobby = state.seats.length === 0;
  const isHost = online?.isHost ?? false;

  const handleExit = useCallback(() => {
    if (inLobby || state.gameComplete) onExit();
    else setConfirmExit(true);
  }, [inLobby, state.gameComplete, onExit]);

  if (showHelp) {
    return (
      <div className="appSetup">
        <HowToPlay onBack={() => setShowHelp(false)} />
      </div>
    );
  }

  return (
    <>
      {inLobby ? (
        <div className="appSetup">
          <OnlineLobby hostSetup={<HostSetup />} onExit={onExit} onChangeName={onChangeName} />
        </div>
      ) : (
        <div className="app" data-castulo={state.castuloMode ? 'true' : undefined}>
          {state.gameComplete && (
            <WinnerModal
              gameId={state.gameId}
              totalRounds={state.totalRounds}
              players={state.players}
              boteAmount={state.boteAmount}
              boteWinnerId={state.boteWinnerId ?? null}
              castulo={state.castuloMode}
              submitRanking={isHost}
              newGameLabel={isHost ? 'Otra partida en esta sala' : 'Salir de la sala'}
              footerNote={isHost ? undefined : 'El anfitrión puede empezar otra partida en esta sala.'}
              onNewGame={isHost ? () => dispatch({ type: 'RESET_GAME' }) : onExit}
            />
          )}
          <header className="header">
            <button className="themeToggle" onClick={toggleTheme} title="Cambiar tema">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <h1>{state.castuloMode ? 'La Ruleta de Cástulo' : 'La Ruleta de la Fortuna'}</h1>
            <div className="headerRight">
              <span className="roomBadge" title="Código de la sala">🌐 {online?.room}</span>
              <button className="managePhrases" onClick={handleExit} title="Salir de la sala">
                Salir
              </button>
              <button className="howToPlay" onClick={() => setShowHelp(true)} title="Cómo se juega">
                ?
              </button>
            </div>
          </header>
          <main className="main">
            <PlayerInfo />
            <LetterPanel />
            <div className="gameWrapper">
              <GameControls />
            </div>
          </main>
          {isHost && <HostDirector />}
        </div>
      )}

      <Reactions />

      {confirmExit && (
        <Dialog
          message="¿Salir de la sala? La partida quedará en pausa hasta que vuelvas a entrar con el mismo enlace."
          confirmLabel="Salir"
          cancelLabel="Seguir jugando"
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </>
  );
}

interface OnlineAppProps {
  room: string;
  onExit: () => void;
}

/** Partida online en la sala `room`: pide el nombre si hace falta y conecta */
export function OnlineApp({ room, onExit }: OnlineAppProps) {
  const [name, setName] = useState(loadOnlineName);
  const [editingName, setEditingName] = useState(false);

  if (!name || editingName) {
    return (
      <div className="appSetup">
        <OnlineEntry
          room={room}
          onEnter={() => {
            setName(loadOnlineName());
            setEditingName(false);
          }}
          onBack={name ? () => setEditingName(false) : onExit}
        />
      </div>
    );
  }

  return (
    <GameProvider storageKey={roomStorageKey(room)} repairOnLoad={false}>
      <OnlineProvider room={room} name={name}>
        <OnlineGame onExit={onExit} onChangeName={() => setEditingName(true)} />
      </OnlineProvider>
    </GameProvider>
  );
}
