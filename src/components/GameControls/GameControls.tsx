import { useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useLetterReveal } from '../../hooks/useLetterReveal';
import { playSuccess, playTransition, playError } from '../../utils/audio';
import { Dialog } from '../Dialog/Dialog';
import { Wheel } from '../Wheel/Wheel';
import type { WheelResult, LetterCell } from '../../types/game';
import styles from './GameControls.module.css';

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const VOWEL_COST = 50;

const ALL_VOWELS     = ['A', 'E', 'I', 'O', 'U'];
const ALL_CONSONANTS = ['B','C','D','F','G','H','J','K','L','M','N','Ñ','P','Q','R','S','T','V','W','X','Y','Z'];

interface UsedLettersProps {
  guessed: string[];
  cells: LetterCell[];
}

function UsedLetters({ guessed, cells }: UsedLettersProps) {
  const foundSet = new Set(
    cells.filter((c) => c.letter && c.state !== 'hidden').map((c) => c.letter as string)
  );

  const renderChip = (letter: string) => {
    if (!guessed.includes(letter)) return null;
    const found = foundSet.has(letter);
    return (
      <span
        key={letter}
        className={`${styles.letterChip} ${found ? styles.chipFound : styles.chipMissed}`}
      >
        {letter}
      </span>
    );
  };

  const usedVowels     = ALL_VOWELS.filter((l) => guessed.includes(l));
  const usedConsonants = ALL_CONSONANTS.filter((l) => guessed.includes(l));

  return (
    <div className={styles.usedLetters}>
      <div className={styles.usedLettersTitle}>Letras pedidas</div>
      {usedVowels.length > 0 && (
        <div className={styles.letterRow}>
          <span className={styles.letterRowLabel}>Vocales</span>
          <div className={styles.letterChips}>{usedVowels.map(renderChip)}</div>
        </div>
      )}
      {usedConsonants.length > 0 && (
        <div className={styles.letterRow}>
          <span className={styles.letterRowLabel}>Consonantes</span>
          <div className={styles.letterChips}>{usedConsonants.map(renderChip)}</div>
        </div>
      )}
    </div>
  );
}

type DialogType = 'letter-fail' | 'wheel-special' | null;

export function GameControls() {
  const { state, dispatch } = useGame();
  const { revealLetter, revealAll, isRevealing } = useLetterReveal();
  const [consonant, setConsonant] = useState('');
  const [vowel, setVowel] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [solvePhrase, setSolvePhrase] = useState('');
  const [failedLetterType, setFailedLetterType] = useState<'consonant' | 'vowel' | null>(null);
  const [pendingSpecialResult, setPendingSpecialResult] = useState<'QUIEBRA' | 'PIERDE_TURNO' | 'COMODIN' | null>(null);

  const [showWheelModal, setShowWheelModal] = useState(false);

  const currentPlayer = state.players[state.currentPlayer];
  const canBuyVowel = currentPlayer.score >= VOWEL_COST;
  const hasHiddenConsonants = state.cells.some(
    (cell) => cell.state === 'hidden' && cell.letter !== null && !VOWELS.includes(cell.letter ?? '')
  );
  const canSpin = state.turnPhase === 'spin' || state.turnPhase === 'next-action';
  const allVowelsGuessed = VOWELS.every((v) => state.guessedLetters.includes(v));

  const handleChangeTurn = useCallback(async () => {
    playTransition();
    await new Promise((resolve) => setTimeout(resolve, state.config.turnChangeDelay));
    dispatch({ type: 'NEXT_TURN' });
    setMessage(null);
    setFailedLetterType(null);
  }, [dispatch, state.config.turnChangeDelay]);

  const handleWheelResult = useCallback((result: WheelResult) => {
    if (result === 'QUIEBRA' || result === 'PIERDE_TURNO') {
      setPendingSpecialResult(result);
      
      if (currentPlayer.hasWildcard) {
        setDialogType('wheel-special');
      } else {
        if (result === 'QUIEBRA') {
          dispatch({ type: 'BANKRUPT', payload: currentPlayer.id });
          setMessage({ text: '¡QUIEBRA! Has perdido todo tu dinero', type: 'error' });
        } else {
          setMessage({ text: '¡PIERDE TURNO!', type: 'error' });
        }
        playError();
        setTimeout(() => {
          handleChangeTurn();
        }, 2000);
      }
    } else if (result === 'COMODIN') {
      setPendingSpecialResult(result);
      setMessage({ text: '¡COMODÍN! Si aciertas la consonante, ganarás el comodín', type: 'info' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    } else {
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    }
  }, [currentPlayer.hasWildcard, currentPlayer.id, dispatch, handleChangeTurn]);

  const handleGuessConsonant = async () => {
    if (!consonant || isRevealing || state.turnPhase !== 'consonant') return;

    const upperLetter = consonant.toUpperCase();
    if (VOWELS.includes(upperLetter)) {
      setMessage({ text: 'Las vocales se compran, no se prueban', type: 'error' });
      return;
    }

    const result = await revealLetter(upperLetter);

    if (result.success) {
      if (pendingSpecialResult === 'COMODIN') {
        dispatch({ type: 'AWARD_WILDCARD', payload: currentPlayer.id });
        setMessage({
          text: `¡COMODÍN GANADO! ${result.count} aparición(es). El comodín ahora es tuyo y se reemplaza por 100€.`,
          type: 'success',
        });
        setPendingSpecialResult(null);
      } else {
        const winnings = state.wheelValue * result.count;
        dispatch({ type: 'ADD_SCORE', payload: { playerId: currentPlayer.id, amount: winnings } });
        setMessage({
          text: allVowelsGuessed
            ? `¡Correcto! ${result.count} aparición(es). +${winnings} €`
            : `¡Correcto! ${result.count} aparición(es). +${winnings} €. Ahora puedes comprar vocales.`,
          type: 'success',
        });
      }
      dispatch({ type: 'SET_TURN_PHASE', payload: allVowelsGuessed ? 'next-action' : 'vowels' });
    } else {
      setFailedLetterType('consonant');
      if (pendingSpecialResult === 'COMODIN') {
        setMessage({ text: 'La letra no está presente. El comodín sigue en la ruleta.', type: 'error' });
        setPendingSpecialResult(null);
      } else {
        setMessage({ text: 'La letra no está presente', type: 'error' });
      }
      if (currentPlayer.hasWildcard) {
        setDialogType('letter-fail');
      } else {
        handleChangeTurn();
      }
    }

    setConsonant('');
    dispatch({ type: 'GUESS_LETTER', payload: upperLetter });
  };

  const canBuyVowelNow = (state.turnPhase === 'vowels' || state.turnPhase === 'spin') && canBuyVowel && !allVowelsGuessed;

  const handleBuyVowel = async () => {
    if (!vowel || isRevealing || !canBuyVowelNow) return;

    const upperLetter = vowel.toUpperCase();
    if (!VOWELS.includes(upperLetter)) {
      setMessage({ text: 'Solo puedes comprar vocales', type: 'error' });
      return;
    }

    dispatch({ type: 'DEDUCT_SCORE', payload: { playerId: currentPlayer.id, amount: VOWEL_COST } });

    const result = await revealLetter(upperLetter);

    if (result.success) {
      setMessage({
        text: `Vocal comprada: ${result.count} aparición(es). -${VOWEL_COST} €. Puedes seguir comprando vocales.`,
        type: 'success',
      });
    } else {
      setFailedLetterType('vowel');
      setMessage({ text: `La vocal no está presente. -${VOWEL_COST} €`, type: 'error' });
      // En fase 'spin' el fallo no cambia de turno; solo en 'vowels'
      if (state.turnPhase === 'vowels') {
        if (currentPlayer.hasWildcard) {
          setDialogType('letter-fail');
        } else {
          dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
          handleChangeTurn();
        }
      }
    }

    setVowel('');
    dispatch({ type: 'GUESS_LETTER', payload: upperLetter });
  };

  const handleFinishVowels = () => {
    dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
    setMessage({ text: 'Ahora puedes girar la ruleta de nuevo o resolver el panel', type: 'info' });
  };

  const handleWildcardConfirm = () => {
    dispatch({ type: 'USE_WILDCARD', payload: currentPlayer.id });
    if (pendingSpecialResult === 'QUIEBRA') {
      dispatch({ type: 'BANKRUPT', payload: currentPlayer.id });
    }
    setDialogType(null);
    setFailedLetterType(null);
    setPendingSpecialResult(null);
    setMessage({ text: 'Comodín usado. Puedes continuar tu turno.', type: 'info' });
  };

  const handleWildcardCancel = () => {
    setDialogType(null);
    
    if (pendingSpecialResult) {
      if (pendingSpecialResult === 'QUIEBRA') {
        dispatch({ type: 'BANKRUPT', payload: currentPlayer.id });
        setMessage({ text: '¡QUIEBRA! Has perdido todo tu dinero', type: 'error' });
      } else {
        setMessage({ text: '¡PIERDE TURNO!', type: 'error' });
      }
      setPendingSpecialResult(null);
      handleChangeTurn();
    } else {
      setFailedLetterType(null);
      dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
      handleChangeTurn();
    }
  };

  const handleSolve = async () => {
    if (!solvePhrase || isRevealing) return;

    if (solvePhrase.toUpperCase() === state.phrase.toUpperCase()) {
      playSuccess();
      dispatch({ type: 'SET_REVEALING', payload: true });
      await revealAll();
      dispatch({ type: 'COMPLETE_ROUND', payload: currentPlayer.id });
      setMessage({ text: `¡Correcto! ${currentPlayer.name} gana la ronda y acumula ${currentPlayer.score}€ en su cartera`, type: 'success' });
    } else {
      setMessage({ text: 'Respuesta incorrecta', type: 'error' });
      handleChangeTurn();
    }

    setSolvePhrase('');
  };

  const getDialogMessage = () => {
    if (dialogType === 'wheel-special' && pendingSpecialResult) {
      return `¡${pendingSpecialResult === 'QUIEBRA' ? 'QUIEBRA' : 'PIERDE TURNO'}! ¿Deseas utilizar tu comodín para mantener el turno?`;
    }
    return `La ${failedLetterType === 'vowel' ? 'vocal' : 'letra'} no está presente. ¿Deseas utilizar tu comodín?`;
  };

  const getPhaseIndicator = () => {
    switch (state.turnPhase) {
      case 'spin':
        return 'Fase: Girar la ruleta · comprar vocales · o resolver';
      case 'consonant':
        return 'Fase: Decir una consonante';
      case 'vowels':
        return 'Fase: Comprar vocales (opcional)';
      case 'next-action':
        return 'Fase: Girar de nuevo o resolver';
      default:
        return '';
    }
  };

  return (
    <>
      {showWheelModal && (
        <Wheel
          autoSpin
          onResult={handleWheelResult}
          onClose={() => setShowWheelModal(false)}
        />
      )}
      <div className={styles.controls}>
        <div className={styles.phaseIndicator}>
          {getPhaseIndicator()}
        </div>

        {canSpin && (
          <div className={styles.spinSection}>
            <button
              onClick={() => setShowWheelModal(true)}
              className={`${styles.button} ${styles.openWheelButton}`}
              disabled={isRevealing || !hasHiddenConsonants}
            >
              🎡 {state.turnPhase === 'next-action' ? 'Girar de Nuevo' : 'Girar la Ruleta'}
            </button>
            {!hasHiddenConsonants && (
              <div className={styles.warning}>No quedan consonantes ocultas</div>
            )}
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Probar Consonante
            {state.wheelValue > 0 && <span className={styles.cost}>{state.wheelValue} € por letra</span>}
          </div>
          {state.turnPhase === 'spin' && (
            <div className={styles.warning}>Debes girar la ruleta primero</div>
          )}
          {state.turnPhase === 'consonant' && (
            <div className={styles.info}>Di una consonante</div>
          )}
          {state.turnPhase === 'vowels' && (
            <div className={styles.info}>Ya has dicho tu consonante. Ahora puedes comprar vocales.</div>
          )}
          {state.turnPhase === 'next-action' && (
            <div className={styles.info}>Ya has dicho tu consonante. Gira la ruleta de nuevo o resuelve.</div>
          )}
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={consonant}
              onChange={(e) => setConsonant(e.target.value.slice(0, 1))}
              className={styles.input}
              placeholder="Ej: R, S, T..."
              maxLength={1}
              disabled={isRevealing || state.turnPhase !== 'consonant'}
            />
            <button
              onClick={handleGuessConsonant}
              className={`${styles.button} ${styles.consonantButton}`}
              disabled={isRevealing || !consonant || state.turnPhase !== 'consonant'}
            >
              Probar Consonante
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Comprar Vocal
            <span className={styles.cost}>{VOWEL_COST} €</span>
          </div>
          {!canBuyVowelNow && state.turnPhase !== 'vowels' && state.turnPhase !== 'spin' && (
            <div className={styles.warning}>Solo disponible antes de lanzar o tras acertar una consonante</div>
          )}
          {allVowelsGuessed && (
            <div className={styles.warning}>Ya has pedido todas las vocales</div>
          )}
          {!allVowelsGuessed && (state.turnPhase === 'vowels' || state.turnPhase === 'spin') && !canBuyVowel && (
            <div className={styles.warning}>No tienes suficiente dinero ({currentPlayer.score} €)</div>
          )}
          {canBuyVowelNow && (
            <div className={styles.info}>Tienes {currentPlayer.score} €. Puedes comprar tantas vocales como quieras.</div>
          )}
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={vowel}
              onChange={(e) => setVowel(e.target.value.slice(0, 1))}
              className={styles.input}
              placeholder="Ej: A, E, I, O, U"
              maxLength={1}
              disabled={isRevealing || !canBuyVowelNow}
            />
            <button
              onClick={handleBuyVowel}
              className={`${styles.button} ${styles.vowelButton}`}
              disabled={isRevealing || !vowel || !canBuyVowelNow}
            >
              Comprar Vocal
            </button>
          </div>
          {state.turnPhase === 'vowels' && (
            <button
              onClick={handleFinishVowels}
              className={`${styles.button} ${styles.finishButton}`}
            >
              Terminar compra de vocales
            </button>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Resolver el Panel</div>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={solvePhrase}
              onChange={(e) => setSolvePhrase(e.target.value)}
              className={styles.input}
              placeholder="Escribe la frase completa"
              disabled={isRevealing}
            />
            <button
              onClick={handleSolve}
              className={`${styles.button} ${styles.solveButton}`}
              disabled={isRevealing || !solvePhrase}
            >
              Resolver
            </button>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={handleChangeTurn} className={styles.button} disabled={isRevealing}>
            Pasar Turno
          </button>
        </div>

        {state.guessedLetters.length > 0 && (
          <UsedLetters
            guessed={state.guessedLetters}
            cells={state.cells}
          />
        )}

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
        )}

        {dialogType && (
          <Dialog
            message={getDialogMessage()}
            onConfirm={handleWildcardConfirm}
            onCancel={handleWildcardCancel}
          />
        )}
      </div>
    </>
  );
}
