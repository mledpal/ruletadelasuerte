import { useState, useCallback, useEffect, useRef } from 'react';
import { GameProvider } from './context/GameProvider';
import { LetterPanel } from './components/LetterPanel/LetterPanel';
import { PlayerInfo } from './components/PlayerInfo/PlayerInfo';
import { GameControls } from './components/GameControls/GameControls';
import { PhraseManager } from './components/PhraseManager/PhraseManager';
import { WinnerModal } from './components/WinnerModal/WinnerModal';
import { useGame } from './context/GameContext';
import { useTheme } from './hooks/useTheme';
import { usePhrases } from './hooks/usePhrases';
import './App.css';

type AppView = 'game' | 'phrases';

function GameApp() {
  const [view, setView] = useState<AppView>('game');
  const { state, dispatch } = useGame();
  const { theme, toggle: toggleTheme } = useTheme();
  const { phrases, addPhrase, deletePhrase, editPhrase } = usePhrases();
  const usedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const pickPhrase = useCallback((phraseList: Phrase[]) => {
    const available = phraseList.filter((p) => !usedRef.current.has(p.phrase));
    if (available.length === 0) return;

    const selected = available[Math.floor(Math.random() * available.length)];
    usedRef.current = new Set([...usedRef.current, selected.phrase]);

    dispatch({
      type: 'SET_PHRASE',
      payload: { phrase: selected.phrase, category: selected.category, hint: selected.hint },
    });
  }, [dispatch]);

  // Seleccionar frase aleatoria al montar la app por primera vez
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      pickPhrase(phrases);
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

  const handleStartGame = useCallback(() => {
    usedRef.current = new Set();
    dispatch({ type: 'RESET_GAME' });
    pickPhrase(phrases);
  }, [phrases, dispatch, pickPhrase]);

  return (
    <div className="app">
      {state.gameComplete && (
        <WinnerModal players={state.players} onNewGame={handleStartGame} />
      )}
      <header className="header">
        <button className="themeToggle" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <h1>La Ruleta de la Fortuna</h1>
        {view === 'game' && (
          <button className="managePhrases" onClick={() => setView('phrases')}>
            Gestionar Frases
          </button>
        )}
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
