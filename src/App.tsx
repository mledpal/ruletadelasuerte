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
import type { Phrase } from './types/game';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { Dialog } from './components/Dialog/Dialog';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import './App.css';

const VIEW_KEY = 'ruleta:view';
const USED_KEY = 'ruleta:usedPhrases';

type AppView = 'setup' | 'game' | 'phrases' | 'instructions';

function GameApp() {
  const { state, dispatch } = useGame();
  const { theme, toggle: toggleTheme } = useTheme();
  const { phrases, addPhrase, deletePhrase, editPhrase, syncStatus } = usePhrases();

  const hasSavedGame = useMemo(
    () => localStorage.getItem(VIEW_KEY) === 'game' && !state.gameComplete,
    // Solo evaluar en el primer render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [view, setView] = useState<AppView>(hasSavedGame ? 'game' : 'setup');
  const [showResumeDialog, setShowResumeDialog] = useState(hasSavedGame);

  const usedRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem(USED_KEY);
        return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })()
  );
  const initializedRef = useRef(false);
  const previousViewRef = useRef<AppView>('setup');

  const pickPhrase = useCallback((phraseList: Phrase[]) => {
    const available = phraseList.filter((p) => !usedRef.current.has(p.phrase));
    if (available.length === 0) return;

    const selected = available[Math.floor(Math.random() * available.length)];
    usedRef.current = new Set([...usedRef.current, selected.phrase]);
    try {
      localStorage.setItem(USED_KEY, JSON.stringify(Array.from(usedRef.current)));
    } catch { /* ignorar */ }

    dispatch({
      type: 'SET_PHRASE',
      payload: { phrase: selected.phrase, category: selected.category, hint: selected.hint },
    });
  }, [dispatch]);

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
    localStorage.removeItem(USED_KEY);
    usedRef.current = new Set();
    dispatch({ type: 'RESET_GAME' });
    setShowResumeDialog(false);
    setView('setup');
  }, [dispatch]);

  const handleInitGame = useCallback((playerCount: number) => {
    localStorage.removeItem(VIEW_KEY);
    localStorage.removeItem(USED_KEY);
    usedRef.current = new Set();
    dispatch({ type: 'INIT_GAME', payload: playerCount });
    pickPhrase(phrases);
    setView('game');
  }, [phrases, dispatch, pickPhrase]);

  const handleStartGame = useCallback(() => {
    localStorage.removeItem(VIEW_KEY);
    localStorage.removeItem(USED_KEY);
    usedRef.current = new Set();
    dispatch({ type: 'RESET_GAME' });
    pickPhrase(phrases);
  }, [phrases, dispatch, pickPhrase]);

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

  if (view === 'setup') {
    return (
      <div className="appSetup">
        <PlayerSetup onStart={handleInitGame} onHowToPlay={handleOpenInstructions} />
      </div>
    );
  }

  return (
    <div className="app">
      {state.gameComplete && (
        <WinnerModal players={state.players} onNewGame={() => setView('setup')} />
      )}
      <header className="header">
        <button className="themeToggle" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <h1>La Ruleta de la Fortuna</h1>
        {syncStatus === 'loading' && (
          <span className="syncBadge">Sincronizando frases…</span>
        )}
        <div className="headerRight">
          {view === 'game' && (
            <button className="managePhrases" onClick={() => setView('phrases')}>
              Gestionar Frases
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
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}

export default App;
