import { useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useLetterReveal } from '../../hooks/useLetterReveal';
import { playSuccess, playTransition, playError } from '../../utils/audio';
import { Dialog } from '../Dialog/Dialog';
import { Wheel } from '../Wheel/Wheel';
import { TargetPicker } from '../TargetPicker/TargetPicker';
import { ConsonantTimer } from '../ConsonantTimer/ConsonantTimer';
import type { WheelResult, LetterCell, SpecialWheelResult } from '../../types/game';
import { formatMoney, currencyUnit } from '../../utils/currency';
import { baseLetter, normalizeText } from '../../utils/letters';
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
    cells.filter((c) => c.letter && c.state !== 'hidden').map((c) => baseLetter(c.letter as string))
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

type DialogType = 'letter-fail' | 'wheel-special' | 'no-money-vowel' | 'bote-fail' | null;

export function GameControls() {
  const { state, dispatch } = useGame();
  const { revealLetter, revealVowels, revealAll, isRevealing } = useLetterReveal();
  const [letter, setLetter] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [solvePhrase, setSolvePhrase] = useState('');
  const [failedLetterType, setFailedLetterType] = useState<'consonant' | 'vowel' | null>(null);
  const [pendingSpecialResult, setPendingSpecialResult] = useState<SpecialWheelResult | null>(null);
  const [pendingBote, setPendingBote] = useState(false);
  const [targetMode, setTargetMode] = useState<'asedio' | 'escipion' | null>(null);

  const [showWheelModal, setShowWheelModal] = useState(false);
  // Hay un cambio de turno en marcha (evita que el temporizador se reactive durante la espera)
  const [changingTurn, setChangingTurn] = useState(false);

  const castulo = state.castuloMode;
  const unit = currencyUnit(castulo);
  const currentPlayer = state.players[state.currentPlayer];
  const canBuyVowel = currentPlayer.score >= VOWEL_COST;
  const hasHiddenConsonants = state.cells.some(
    (cell) => cell.state === 'hidden' && cell.letter !== null && !VOWELS.includes(baseLetter(cell.letter))
  );
  const canSpin = state.turnPhase === 'spin' || state.turnPhase === 'next-action';
  const allVowelsGuessed = VOWELS.every((v) => state.guessedLetters.includes(v));
  const hasHiddenVowels = state.cells.some(
    (cell) => cell.state === 'hidden' && cell.letter !== null && VOWELS.includes(baseLetter(cell.letter))
  );
  // Se usa en los mismos momentos en que se puede comprar una vocal
  const canUseAllVowels =
    currentPlayer.hasAllVowels &&
    (state.turnPhase === 'spin' || state.turnPhase === 'vowels') &&
    hasHiddenVowels &&
    !isRevealing;

  const handleChangeTurn = useCallback(async () => {
    playTransition();
    setChangingTurn(true);
    setPendingBote(false);
    setPendingSpecialResult(null);
    await new Promise((resolve) => setTimeout(resolve, state.config.turnChangeDelay));
    dispatch({ type: 'NEXT_TURN' });
    setChangingTurn(false);
    setMessage(null);
    setFailedLetterType(null);
  }, [dispatch, state.config.turnChangeDelay]);

  // Se agotó el tiempo para pulsar la consonante: el jugador pierde el turno
  const handleConsonantTimeout = useCallback(() => {
    playError();
    setLetter('');
    setMessage({ text: `⏱️ ¡Se acabó el tiempo! ${currentPlayer.name} pierde el turno`, type: 'error' });
    setTimeout(() => {
      handleChangeTurn();
    }, 1500);
    setChangingTurn(true);
  }, [currentPlayer.name, handleChangeTurn]);

  const handleWheelResult = useCallback((result: WheelResult) => {
    setPendingBote(false);
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
    } else if (result === 'TODAS_VOCALES') {
      setPendingSpecialResult(result);
      setMessage({ text: '¡TODAS LAS VOCALES! Si aciertas la consonante, lo guardarás en tu atril', type: 'info' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    } else if (result === 'ANIBAL' || result === 'HIMILCE' || result === 'ESCIPION') {
      const name = result === 'ANIBAL' ? 'Aníbal' : result === 'HIMILCE' ? 'Himilce' : 'Escipión';
      setPendingSpecialResult(result);
      setMessage({ text: `¡${name.toUpperCase()}! Si aciertas la consonante, conseguirás a ${name}`, type: 'info' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    } else if (result === 'ASEDIO') {
      setPendingSpecialResult(null);
      if (state.players.length < 2) {
        // Sin rivales no hay a quién entregar: continúa el turno.
        setMessage({ text: '¡ASEDIO! No hay otros jugadores. Puedes volver a girar.', type: 'info' });
        dispatch({ type: 'RESET_WHEEL' });
        dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
      } else {
        playError();
        setMessage({ text: '¡ASEDIO! Entrega tu dinero temporal y tus gajos a otro jugador.', type: 'error' });
        setTargetMode('asedio');
      }
    } else if (result === 'BOTE') {
      setPendingSpecialResult('BOTE');
      setMessage({ text: `¡BOTE! Acierte una consonante para optar al premio de ${formatMoney(state.boteAmount, castulo)}`, type: 'info' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    } else {
      dispatch({ type: 'SET_TURN_PHASE', payload: 'consonant' });
    }
  }, [currentPlayer.hasWildcard, currentPlayer.id, dispatch, handleChangeTurn, state.boteAmount, state.players.length, castulo]);

  const handleGuessLetter = async (directLetter?: string) => {
    const letterToGuess = (directLetter || letter || '').trim();
    if (!letterToGuess || isRevealing || changingTurn) return;

    const upperLetter = baseLetter(letterToGuess);
    setLetter('');

    if (VOWELS.includes(upperLetter)) {
      // ── Ruta vocal ──────────────────────────────────────────────
      const canBuyPhase = state.turnPhase === 'vowels' || state.turnPhase === 'spin';
      if (!canBuyPhase) {
        setMessage({ text: 'Las vocales solo se pueden comprar antes de girar o tras acertar una consonante', type: 'error' });
        return;
      }
      if (allVowelsGuessed) {
        setMessage({ text: 'Ya has pedido todas las vocales', type: 'error' });
        return;
      }
      if (!canBuyVowel) {
        setDialogType('no-money-vowel');
        return;
      }

      dispatch({ type: 'DEDUCT_SCORE', payload: { playerId: currentPlayer.id, amount: VOWEL_COST } });
      const result = await revealLetter(upperLetter);

      if (result.success) {
        setMessage({
          text: `Vocal comprada: ${result.count} aparición(es). -${formatMoney(VOWEL_COST, castulo)}. Puedes seguir comprando vocales.`,
          type: 'success',
        });
      } else {
        setFailedLetterType('vowel');
        setMessage({ text: `La vocal no está presente. -${formatMoney(VOWEL_COST, castulo)}`, type: 'error' });
        if (state.turnPhase === 'vowels') {
          if (currentPlayer.hasWildcard) {
            setDialogType('letter-fail');
          } else {
            dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
            handleChangeTurn();
          }
        }
      }
      dispatch({ type: 'GUESS_LETTER', payload: upperLetter });
    } else {
      // ── Ruta consonante ─────────────────────────────────────────
      if (state.turnPhase !== 'consonant') {
        setMessage({ text: 'Debes girar la ruleta primero para poder decir una consonante', type: 'error' });
        return;
      }

      const result = await revealLetter(upperLetter);

      if (result.success) {
        if (pendingSpecialResult === 'COMODIN') {
          dispatch({ type: 'AWARD_WILDCARD', payload: currentPlayer.id });
          setMessage({
            text: `¡COMODÍN GANADO! ${result.count} aparición(es). El comodín ahora es tuyo y se reemplaza por ${formatMoney(100, castulo)}.`,
            type: 'success',
          });
          setPendingSpecialResult(null);
        } else if (pendingSpecialResult === 'TODAS_VOCALES') {
          dispatch({ type: 'AWARD_ALL_VOWELS', payload: currentPlayer.id });
          setMessage({
            text: `¡TODAS LAS VOCALES GANADO! ${result.count} aparición(es). Úsalo en tu turno cuando puedas comprar vocales.`,
            type: 'success',
          });
          setPendingSpecialResult(null);
        } else if (
          pendingSpecialResult === 'ANIBAL' ||
          pendingSpecialResult === 'HIMILCE' ||
          pendingSpecialResult === 'ESCIPION'
        ) {
          const token = pendingSpecialResult;
          const name = token === 'ANIBAL' ? 'Aníbal' : token === 'HIMILCE' ? 'Himilce' : 'Escipión';
          dispatch({ type: 'AWARD_TOKEN', payload: { playerId: currentPlayer.id, token } });
          const extra =
            token === 'ESCIPION'
              ? ' En tu turno podrás usarlo para arrasar a un rival.'
              : ' Reúne a Aníbal y Himilce y gana la ronda para llevarte 1.000 As.';
          setMessage({
            text: `¡${name.toUpperCase()} CONSEGUIDO! ${result.count} aparición(es).${extra}`,
            type: 'success',
          });
          setPendingSpecialResult(null);
        } else if (pendingSpecialResult === 'BOTE') {
          setPendingBote(true);
          setPendingSpecialResult(null);
          setMessage({
            text: `¡Consonante correcta! ${result.count} aparición(es). Resuelve el panel para ganar el BOTE de ${formatMoney(state.boteAmount, castulo)}`,
            type: 'success',
          });
        } else {
          const winnings = state.wheelValue * result.count;
          dispatch({ type: 'ADD_SCORE', payload: { playerId: currentPlayer.id, amount: winnings } });
          setMessage({
            text: allVowelsGuessed
              ? `¡Correcto! ${result.count} aparición(es). +${formatMoney(winnings, castulo)}`
              : `¡Correcto! ${result.count} aparición(es). +${formatMoney(winnings, castulo)}. Ahora puedes comprar vocales.`,
            type: 'success',
          });
        }
        dispatch({ type: 'SET_TURN_PHASE', payload: allVowelsGuessed ? 'next-action' : 'vowels' });
      } else {
        setFailedLetterType('consonant');
        if (pendingSpecialResult === 'BOTE') {
          setMessage({ text: 'La letra no está presente. Has perdido la opción al BOTE.', type: 'error' });
          setPendingSpecialResult(null);
          if (currentPlayer.hasWildcard) {
            setDialogType('bote-fail');
          } else {
            handleChangeTurn();
          }
        } else {
          // Fallar la consonante siempre cuesta el turno, salvo que se use el comodín.
          // Si era un gajo especial, se mantiene pendiente: con el comodín se reintenta por el mismo gajo.
          const specialName =
            pendingSpecialResult === 'COMODIN' ? 'El comodín'
            : pendingSpecialResult === 'TODAS_VOCALES' ? '«Todas las vocales»'
            : pendingSpecialResult === 'ANIBAL' ? 'Aníbal'
            : pendingSpecialResult === 'HIMILCE' ? 'Himilce'
            : pendingSpecialResult === 'ESCIPION' ? 'Escipión'
            : null;
          setMessage({
            text: specialName
              ? `La letra no está presente. ${specialName} sigue en la ruleta.`
              : 'La letra no está presente',
            type: 'error',
          });
          if (currentPlayer.hasWildcard) {
            setDialogType('letter-fail');
          } else {
            setPendingSpecialResult(null);
            handleChangeTurn();
          }
        }
      }
      dispatch({ type: 'GUESS_LETTER', payload: upperLetter });
    }
  };

  const handleUseAllVowels = async () => {
    if (!canUseAllVowels) return;
    const result = await revealVowels();
    dispatch({ type: 'USE_ALL_VOWELS', payload: currentPlayer.id });
    setMessage({
      text: `¡TODAS LAS VOCALES! ${result.count} vocal(es) descubierta(s).`,
      type: 'success',
    });
    // Ya no quedan vocales: tras acertar consonante se pasa directamente a girar o resolver
    if (state.turnPhase === 'vowels') {
      dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
    }
  };

  const handleFinishVowels = () => {
    dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
    setMessage({ text: 'Ahora puedes girar la ruleta de nuevo o resolver el panel', type: 'info' });
  };

  const handleWildcardConfirm = () => {
    if (dialogType === 'no-money-vowel') {
      setDialogType(null);
      return;
    }
    if (dialogType === 'bote-fail') {
      dispatch({ type: 'USE_WILDCARD', payload: currentPlayer.id });
      dispatch({ type: 'RESET_WHEEL' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'spin' });
      setDialogType(null);
      setFailedLetterType(null);
      setMessage({ text: 'Comodín usado. Gira de nuevo para intentar el BOTE.', type: 'info' });
      return;
    }
    dispatch({ type: 'USE_WILDCARD', payload: currentPlayer.id });
    if (dialogType === 'wheel-special') {
      if (pendingSpecialResult === 'QUIEBRA') {
        dispatch({ type: 'BANKRUPT', payload: currentPlayer.id });
      }
      setPendingSpecialResult(null);
    }
    // En 'letter-fail' se conserva el gajo especial pendiente para reintentar la consonante
    setDialogType(null);
    setFailedLetterType(null);
    setMessage({ text: 'Comodín usado. Puedes continuar tu turno.', type: 'info' });
  };

  const handleWildcardCancel = () => {
    if (dialogType === 'no-money-vowel') {
      setDialogType(null);
      return;
    }
    if (dialogType === 'bote-fail') {
      setDialogType(null);
      handleChangeTurn();
      return;
    }
    setDialogType(null);

    if (dialogType === 'wheel-special') {
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
      setPendingSpecialResult(null);
      dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
      handleChangeTurn();
    }
  };

  const handleSolve = async () => {
    if (!solvePhrase || isRevealing) return;

    if (normalizeText(solvePhrase) === normalizeText(state.phrase)) {
      playSuccess();
      dispatch({ type: 'SET_REVEALING', payload: true });
      await revealAll();
      const bonusText =
        currentPlayer.hasAnibal && currentPlayer.hasHimilce
          ? ` ¡Reúne a Aníbal y Himilce: +${formatMoney(1000, castulo)} de bono!`
          : '';
      if (pendingBote) {
        dispatch({ type: 'WIN_BOTE', payload: currentPlayer.id });
        setMessage({ text: `¡BOTE GANADO! ${currentPlayer.name} se lleva ${formatMoney(state.boteAmount, castulo)} del bote.${bonusText}`, type: 'success' });
        setPendingBote(false);
      } else {
        dispatch({ type: 'COMPLETE_ROUND', payload: currentPlayer.id });
        setMessage({ text: `¡Correcto! ${currentPlayer.name} gana la ronda y acumula ${formatMoney(currentPlayer.score, castulo)} en su cartera.${bonusText}`, type: 'success' });
      }
    } else {
      setPendingBote(false);
      setMessage({ text: 'Respuesta incorrecta', type: 'error' });
      handleChangeTurn();
    }

    setSolvePhrase('');
  };

  const handleTargetSelect = (targetId: number) => {
    if (targetMode === 'asedio') {
      dispatch({ type: 'ASEDIO_TRANSFER', payload: { sourceId: currentPlayer.id, targetId } });
      dispatch({ type: 'RESET_WHEEL' });
      dispatch({ type: 'SET_TURN_PHASE', payload: 'next-action' });
      const target = state.players.find((p) => p.id === targetId);
      setMessage({ text: `¡ASEDIO! Has entregado tu botín a ${target?.name ?? 'otro jugador'}. Puedes volver a girar.`, type: 'info' });
    } else if (targetMode === 'escipion') {
      dispatch({ type: 'USE_ESCIPION', payload: { sourceId: currentPlayer.id, targetId } });
      const target = state.players.find((p) => p.id === targetId);
      setMessage({ text: `¡ESCIPIÓN ataca! ${target?.name ?? 'El rival'} pierde su dinero temporal y todos sus gajos.`, type: 'success' });
    }
    setTargetMode(null);
  };

  const handleUseEscipion = () => {
    setTargetMode('escipion');
  };

  const getDialogMessage = () => {
    if (dialogType === 'no-money-vowel') {
      return `No tienes suficiente dinero (${formatMoney(currentPlayer.score, castulo)}). Necesitas al menos ${formatMoney(VOWEL_COST, castulo)} para comprar una vocal.`;
    }
    if (dialogType === 'bote-fail') {
      return `¡Has fallado la consonante del BOTE! ¿Deseas usar tu comodín para volver a girar la ruleta?`;
    }
    if (dialogType === 'wheel-special' && pendingSpecialResult) {
      return `¡${pendingSpecialResult === 'QUIEBRA' ? 'QUIEBRA' : 'PIERDE TURNO'}! ¿Deseas utilizar tu comodín para mantener el turno?`;
    }
    return `La ${failedLetterType === 'vowel' ? 'vocal' : 'letra'} no está presente. ¿Deseas utilizar tu comodín?`;
  };

  const getPhaseIndicator = () => {
    const who = currentPlayer.name;
    if (pendingBote) return '🏆 ¡Resuelve el panel para ganar el BOTE!';
    switch (state.turnPhase) {
      case 'spin':
        return `${who}: gira, compra vocal o resuelve`;
      case 'consonant':
        return `${who}: di una consonante${state.wheelValue > 0 ? ` (${state.wheelValue} ${unit})` : ''}`;
      case 'vowels':
        return `${who}: compra vocales (${VOWEL_COST} ${unit} c/u)`;
      case 'next-action':
        return `${who}: gira de nuevo o resuelve`;
      default:
        return '';
    }
  };

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

  // Letras ya pedidas que aparecen en el panel (para colorear las teclas usadas)
  const foundLetters = new Set(
    state.cells.filter((c) => c.letter && c.state !== 'hidden').map((c) => baseLetter(c.letter as string))
  );
  const usedKeyClass = (l: string) =>
    state.guessedLetters.includes(l)
      ? `${styles.keyUsed} ${foundLetters.has(l) ? styles.keyFound : styles.keyMissed}`
      : '';

  const isConsonantTurn = state.turnPhase === 'consonant';
  // La cuenta atrás corre solo mientras el jugador puede pulsar la consonante:
  // con la ruleta cerrada y sin diálogos, revelados ni cambios de turno pendientes.
  const consonantTimeLimit = state.config.consonantTimeLimit;
  const consonantTimerActive =
    consonantTimeLimit > 0 &&
    isConsonantTurn &&
    !showWheelModal &&
    !dialogType &&
    !targetMode &&
    !isRevealing &&
    !changingTurn &&
    !state.roundComplete;
  const isVowelAllowed = (state.turnPhase === 'vowels' || state.turnPhase === 'spin') && !allVowelsGuessed && canBuyVowel;

  return (
    <>
      {showWheelModal && (
        <Wheel
          onResult={handleWheelResult}
          onClose={() => setShowWheelModal(false)}
        />
      )}
      <div className={styles.controls}>
        {isBoteRound && (
          <div className={styles.boteBanner}>
            🏆 RONDA DEL BOTE — {formatMoney(state.boteAmount, castulo)}
          </div>
        )}
        <div className={styles.phaseIndicator}>
          {getPhaseIndicator()}
        </div>

        {/* Justo bajo la fase para que se vea sin hacer scroll en el móvil */}
        <div className={styles.messageSlot} aria-live="polite">
          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
          )}
        </div>

        {consonantTimerActive && (
          <ConsonantTimer
            key={`${state.currentPlayer}-${state.guessedLetters.length}`}
            seconds={consonantTimeLimit}
            onExpire={handleConsonantTimeout}
          />
        )}

        {castulo && currentPlayer.hasEscipion && (
          <div className={styles.spinSection}>
            <button
              onClick={handleUseEscipion}
              className={`${styles.button} ${styles.escipionButton}`}
              disabled={isRevealing || state.players.length < 2}
            >
              ⚔️ Usar a Escipión
            </button>
          </div>
        )}

        {currentPlayer.hasAllVowels && (
          <div className={styles.spinSection}>
            <button
              onClick={handleUseAllVowels}
              className={`${styles.button} ${styles.allVowelsButton}`}
              disabled={!canUseAllVowels}
            >
              🔤 Usar «Todas las vocales»
            </button>
          </div>
        )}

        {canSpin && (
          <div className={styles.spinSection}>
            <button
              onClick={() => setShowWheelModal(true)}
              className={`${styles.button} ${styles.openWheelButton}`}
              disabled={isRevealing || !hasHiddenConsonants}
            >
              🎡 {state.turnPhase === 'next-action' ? 'GIRAR DE NUEVO' : '¡GIRAR LA RULETA!'}
            </button>
            {!hasHiddenConsonants && (
              <div className={styles.warning}>No quedan consonantes ocultas</div>
            )}
          </div>
        )}

        {/* Teclado Virtual Interactivo */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>Letras del concurso</span>
            {isConsonantTurn && <span className={styles.cost}>{state.wheelValue} {unit} / consonante</span>}
            {(state.turnPhase === 'vowels' || state.turnPhase === 'spin') && <span className={styles.costVowel}>{VOWEL_COST} {unit} / vocal</span>}
          </div>

          <div className={styles.keyboardGroup}>
            {/* Fila de Vocales */}
            <div className={styles.keyboardRow}>
              <span className={styles.keyboardRowLabel}>Vocales:</span>
              <div className={styles.keyboardKeys}>
                {ALL_VOWELS.map((v) => {
                  const isGuessed = state.guessedLetters.includes(v);
                  const canClick = isVowelAllowed && !isGuessed && !isRevealing;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.keyBtn} ${styles.vowelKey} ${usedKeyClass(v)}`}
                      disabled={!canClick}
                      onClick={() => handleGuessLetter(v)}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fila de Consonantes */}
            <div className={styles.keyboardRow}>
              <span className={styles.keyboardRowLabel}>Consonantes:</span>
              <div className={styles.keyboardKeys}>
                {ALL_CONSONANTS.map((c) => {
                  const isGuessed = state.guessedLetters.includes(c);
                  const canClick = isConsonantTurn && !isGuessed && !isRevealing && !changingTurn;
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.keyBtn} ${styles.consonantKey} ${usedKeyClass(c)}`}
                      disabled={!canClick}
                      onClick={() => handleGuessLetter(c)}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* O entrada manual con teclado físico (oculta en pantallas táctiles) */}
          <div className={`${styles.inputGroup} ${styles.manualInput}`}>
            <input
              type="text"
              value={letter}
              onChange={(e) => setLetter(e.target.value.slice(0, 1))}
              onKeyDown={(e) => e.key === 'Enter' && handleGuessLetter()}
              className={styles.input}
              placeholder="O teclea una letra..."
              maxLength={1}
              disabled={isRevealing}
            />
            <button
              onClick={() => handleGuessLetter()}
              className={`${styles.button} ${letter && VOWELS.includes(baseLetter(letter)) ? styles.vowelButton : styles.consonantButton}`}
              disabled={isRevealing || !letter}
            >
              Probar Letra
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

        {/* Sección de Resolver */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Resolver el Panel</div>
          <div className={`${styles.inputGroup} ${styles.solveGroup}`}>
            <input
              type="text"
              value={solvePhrase}
              onChange={(e) => setSolvePhrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSolve()}
              className={styles.input}
              placeholder="Escribe la frase completa"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              disabled={isRevealing}
            />
            <button
              onClick={handleSolve}
              className={`${styles.button} ${styles.solveButton}`}
              disabled={isRevealing || !solvePhrase}
            >
              ¡RESOLVER!
            </button>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={handleChangeTurn} className={`${styles.button} ${styles.passButton}`} disabled={isRevealing}>
            Pasar Turno
          </button>
        </div>

        {state.guessedLetters.length > 0 && (
          <div className={styles.usedLettersDesktop}>
            <UsedLetters
              guessed={state.guessedLetters}
              cells={state.cells}
            />
          </div>
        )}


        {dialogType && (
          <Dialog
            message={getDialogMessage()}
            onConfirm={handleWildcardConfirm}
            onCancel={handleWildcardCancel}
            singleAction={dialogType === 'no-money-vowel'}
          />
        )}

        {targetMode && (
          <TargetPicker
            title={targetMode === 'asedio' ? '¡ASEDIO!' : '⚔️ Escipión ataca'}
            message={
              targetMode === 'asedio'
                ? 'Elige al jugador que recibirá tu dinero temporal y tus gajos.'
                : 'Elige al rival al que arrebatar su dinero temporal y todos sus gajos.'
            }
            players={state.players}
            sourceId={currentPlayer.id}
            onSelect={handleTargetSelect}
            onCancel={targetMode === 'escipion' ? () => setTargetMode(null) : undefined}
            castulo={castulo}
          />
        )}
      </div>
    </>
  );
}

