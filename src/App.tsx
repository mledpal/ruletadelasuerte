import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameProvider } from './context/GameProvider';
import { LetterPanel } from './components/LetterPanel/LetterPanel';
import { PlayerInfo } from './components/PlayerInfo/PlayerInfo';
import { GameControls } from './components/GameControls/GameControls';
import { PhraseManager } from './components/PhraseManager/PhraseManager';
import { WinnerModal } from './components/WinnerModal/WinnerModal';
import { useGame } from './context/GameContext';
import { useTheme } from './hooks/useTheme';
import { usePhrases } from './hooks/usePhrases';
import { usePhrasePicker } from './hooks/usePhrasePicker';
import { useCategories } from './hooks/useCategories';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { Dialog } from './components/Dialog/Dialog';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { RankingScreen } from './components/Ranking/Ranking';
import { OnlineEntry } from './components/OnlineEntry/OnlineEntry';
import { OnlineApp } from './OnlineApp';
import { onlineEnabled } from './online/realtime';
import { markHostOf, readRoomFromUrl, setRoomInUrl } from './online/identity';
import './App.css';

const VIEW_KEY = 'ruleta:view';
const USED_KEY = 'ruleta:usedPhrases';

type AppView = 'setup' | 'game' | 'phrases' | 'instructions' | 'ranking' | 'online';

interface GameAppProps {
  /** Entrar en una sala online (como anfitrión si `host`) */
  onEnterRoom: (room: string, host: boolean) => void;
}

function GameApp({ onEnterRoom }: GameAppProps) {
  const { state, dispatch } = useGame();
  const { theme, toggle: toggleTheme } = useTheme();
  const { phrases, addPhrase, deletePhrase, editPhrase, syncStatus } = usePhrases();
  const { pickPhrase, resetUsed, setCategories } = usePhrasePicker(USED_KEY);

  const hasSavedGame = useMemo(
    () => localStorage.getItem(VIEW_KEY) === 'game' && !state.gameComplete,
    // Solo evaluar en el primer render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [view, setView] = useState<AppView>(hasSavedGame ? 'game' : 'setup');
  const [showResumeDialog, setShowResumeDialog] = useState(hasSavedGame);

  const initializedRef = useRef(false);
  const previousViewRef = useRef<AppView>('setup');

  const availableCategories = useCategories(phrases);

  // Guardar view en localStorage al cambiar
  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  // Seleccionar frase aleatoria al montar la app (solo si no hay partida guardada)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!hasSavedGame) {
        pickPhrase(phrases);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextRound = useCallback(() => {
    if (state.currentRound >= state.totalRounds) {
      dispatch({ type: 'COMPLETE_GAME' });
      return;
    }
    dispatch({ type: 'NEXT_ROUND' });
    pickPhrase(phrases);
  }, [dispatch, state.currentRound, state.totalRounds, phrases, pickPhrase]);

  useEffect(() => {
    if (state.roundComplete && !state.gameComplete) {
      const timer = setTimeout(handleNextRound, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.roundComplete, state.gameComplete, handleNextRound]);

  const handleOpenInstructions = useCallback(() => {
    previousViewRef.current = view;
    setView('instructions');
  }, [view]);

  const handleCloseInstructions = useCallback(() => {
    setView(previousViewRef.current);
  }, []);

  const handleResume = useCallback(() => {
    setShowResumeDialog(false);
  }, []);

  const handleDiscardSaved = useCallback(() => {
    localStorage.removeItem(VIEW_KEY);
    resetUsed();
    setCategories([]);
    dispatch({ type: 'RESET_GAME' });
    setShowResumeDialog(false);
    setView('setup');
  }, [dispatch, resetUsed, setCategories]);

  const handleInitGame = useCallback((playerNames: string[], rounds: number, wildcardEnabled: boolean, boteRoundEnabled: boolean, selectedCategories: string[], consonantTimeLimit: number) => {
    localStorage.removeItem(VIEW_KEY);
    resetUsed();
    setCategories(selectedCategories);
    // El modo Cástulo se activa solo si se elige exclusivamente la categoría CASTULO.
    const castuloMode = selectedCategories.length === 1 && selectedCategories[0] === 'CASTULO';
    dispatch({ type: 'INIT_GAME', payload: { playerNames, rounds, wildcardEnabled, boteRoundEnabled, castuloMode, consonantTimeLimit } });
    pickPhrase(phrases);
    setView('game');
  }, [phrases, dispatch, pickPhrase, resetUsed, setCategories]);

  const handleStartGame = useCallback(() => {
    localStorage.removeItem(VIEW_KEY);
    resetUsed();
    dispatch({ type: 'RESET_GAME' });
    pickPhrase(phrases);
  }, [phrases, dispatch, pickPhrase, resetUsed]);

  if (showResumeDialog) {
    return (
      <div className="appSetup">
        <Dialog
          message="Se ha encontrado una partida guardada. ¿Quieres continuar donde lo dejaste?"
          confirmLabel="Continuar partida"
          cancelLabel="Nueva partida"
          onConfirm={handleResume}
          onCancel={handleDiscardSaved}
        />
      </div>
    );
  }

  if (view === 'instructions') {
    return (
      <div className="appSetup">
        <HowToPlay onBack={handleCloseInstructions} />
      </div>
    );
  }

  if (view === 'ranking') {
    return (
      <div className="appSetup">
        <RankingScreen onBack={() => setView('setup')} />
      </div>
    );
  }

  if (view === 'online') {
    return (
      <div className="appSetup">
        <OnlineEntry onEnter={onEnterRoom} onBack={() => setView('setup')} />
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="appSetup">
        <PlayerSetup
          availableCategories={availableCategories}
          onStart={handleInitGame}
          onHowToPlay={handleOpenInstructions}
          onRanking={() => setView('ranking')}
          onOnline={onlineEnabled ? () => setView('online') : undefined}
        />
      </div>
    );
  }

  return (
    <div className="app" data-castulo={state.castuloMode ? 'true' : undefined}>
      {state.gameComplete && (
        <WinnerModal
          gameId={state.gameId}
          totalRounds={state.totalRounds}
          players={state.players}
          boteAmount={state.boteAmount}
          boteWinnerId={state.boteWinnerId ?? null}
          wildcardEnabled={state.wildcardEnabled}
          boteRoundEnabled={state.boteRoundEnabled}
          castulo={state.castuloMode}
          onNewGame={() => setView('setup')}
        />
      )}
      <header className="header">
        <button className="themeToggle" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <h1>{state.castuloMode ? 'La Ruleta de Cástulo' : 'La Ruleta de la Fortuna'}</h1>
        {syncStatus === 'loading' && (
          <span className="syncBadge">Sincronizando frases…</span>
        )}
        <div className="headerRight">
          {view === 'game' && (
            <button className="managePhrases" onClick={() => setView('phrases')} title="Gestionar frases">
              <span className="labelLong">Gestionar Frases</span>
              <span className="labelShort">Frases</span>
            </button>
          )}
          <button className="howToPlay" onClick={handleOpenInstructions} title="Cómo se juega">
            ?
          </button>
        </div>
      </header>
      {view === 'game' ? (
        <main className="main">
          <PlayerInfo />
          <LetterPanel />
          <div className="gameWrapper">
            <GameControls />
          </div>
        </main>
      ) : (
        <PhraseManager
          onBack={() => setView('game')}
          phrases={phrases}
          onAddPhrase={addPhrase}
          onDeletePhrase={deletePhrase}
          onEditPhrase={editPhrase}
          onStartGame={handleStartGame}
          syncStatus={syncStatus}
        />
      )}
    </div>
  );
}

function App() {
  const [room, setRoom] = useState(readRoomFromUrl);

  // Atrás/adelante del navegador entre la sala y la partida local
  useEffect(() => {
    const onPopState = () => setRoom(readRoomFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const enterRoom = useCallback((code: string, host: boolean) => {
    if (host) markHostOf(code);
    setRoomInUrl(code);
    setRoom(code);
  }, []);

  const exitRoom = useCallback(() => {
    setRoomInUrl(null);
    setRoom(null);
  }, []);

  if (room && onlineEnabled) {
    return <OnlineApp key={room} room={room} onExit={exitRoom} />;
  }

  return (
    <GameProvider>
      <GameApp onEnterRoom={enterRoom} />
    </GameProvider>
  );
}

export default App;
