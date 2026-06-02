import { useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useLetterReveal } from '../../hooks/useLetterReveal';
import { playSuccess, playTransition, playError } from '../../utils/audio';
import { Dialog } from '../Dialog/Dialog';
import { Wheel } from '../Wheel/Wheel';
import { TargetPicker } from '../TargetPicker/TargetPicker';
import type { WheelResult, LetterCell, SpecialWheelResult } from '../../types/game';
import { formatMoney, currencyUnit } from '../../utils/currency';
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

type DialogType = 'letter-fail' | 'wheel-special' | 'no-money-vowel' | 'bote-fail' | null;

export function GameControls() {
  const { state, dispatch } = useGame();
  const { revealLetter, revealAll, isRevealing } = useLetterReveal();
  const [letter, setLetter] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [solvePhrase, setSolvePhrase] = useState('');
  const [failedLetterType, setFailedLetterType] = useState<'consonant' | 'vowel' | null>(null);
  const [pendingSpecialResult, setPendingSpecialResult] = useState<SpecialWheelResult | null>(null);
  const [pendingBote, setPendingBote] = useState(false);
  const [targetMode, setTargetMode] = useState<'asedio' | 'escipion' | null>(null);

  const [showWheelModal, setShowWheelModal] = useState(false);

  const castulo = state.castuloMode;
  const unit = currencyUnit(castulo);
  const currentPlayer = state.players[state.currentPlayer];
  const canBuyVowel = currentPlayer.score >= VOWEL_COST;
  const hasHiddenConsonants = state.cells.some(
    (cell) => cell.state === 'hidden' && cell.letter !== null && !VOWELS.includes(cell.letter ?? '')
  );
  const canSpin = state.turnPhase === 'spin' || state.turnPhase === 'next-action';
  const allVowelsGuessed = VOWELS.every((v) => state.guessedLetters.includes(v));

  const handleChangeTurn = useCallback(async () => {
    playTransition();
    setPendingBote(false);
    await new Promise((resolve) => setTimeout(resolve, state.config.turnChangeDelay));
    dispatch({ type: 'NEXT_TURN' });
    setMessage(null);
    setFailedLetterType(null);
  }, [dispatch, state.config.turnChangeDelay]);

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

  const handleGuessLetter = async () => {
    if (!letter || isRevealing) return;

    const upperLetter = letter.toUpperCase();
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
        if (pendingSpecialResult === 'COMODIN') {
          setMessage({ text: 'La letra no está presente. El comodín sigue en la ruleta.', type: 'error' });
          setPendingSpecialResult(null);
        } else if (
          pendingSpecialResult === 'ANIBAL' ||
          pendingSpecialResult === 'HIMILCE' ||
          pendingSpecialResult === 'ESCIPION'
        ) {
          const name = pendingSpecialResult === 'ANIBAL' ? 'Aníbal' : pendingSpecialResult === 'HIMILCE' ? 'Himilce' : 'Escipión';
          setMessage({ text: `La letra no está presente. ${name} sigue en la ruleta.`, type: 'error' });
          setPendingSpecialResult(null);
        } else if (pendingSpecialResult === 'BOTE') {
          setMessage({ text: 'La letra no está presente. Has perdido la opción al BOTE.', type: 'error' });
          setPendingSpecialResult(null);
          if (currentPlayer.hasWildcard) {
            setDialogType('bote-fail');
          } else {
            handleChangeTurn();
          }
        } else {
          setMessage({ text: 'La letra no está presente', type: 'error' });
          if (currentPlayer.hasWildcard) {
            setDialogType('letter-fail');
          } else {
            handleChangeTurn();
          }
        }
      }
      dispatch({ type: 'GUESS_LETTER', payload: upperLetter });
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
    if (pendingSpecialResult === 'QUIEBRA') {
      dispatch({ type: 'BANKRUPT', payload: currentPlayer.id });
    }
    setDialogType(null);
    setFailedLetterType(null);
    setPendingSpecialResult(null);
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
    if (pendingBote) return '🏆 ¡Resuelve el panel para ganar el BOTE!';
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

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

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
        {isBoteRound && (
          <div className={styles.boteBanner}>
            🏆 RONDA DEL BOTE — {formatMoney(state.boteAmount, castulo)}
          </div>
        )}
        <div className={styles.phaseIndicator}>
          {getPhaseIndicator()}
        </div>

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
            {VOWELS.includes(letter.toUpperCase()) && letter
              ? <>¡Vocal! <span className={styles.cost}>{VOWEL_COST} {unit}</span></>
              : state.wheelValue > 0 && letter
                ? <>Consonante <span className={styles.cost}>{state.wheelValue} {unit} por letra</span></>
                : 'Escribe una letra'
            }
          </div>

          {state.turnPhase === 'spin' && !allVowelsGuessed && (
            <div className={styles.info}>Puedes comprar vocales ({VOWEL_COST} {unit} c/u) o girar la ruleta</div>
          )}
          {state.turnPhase === 'consonant' && (
            <div className={styles.info}>Debes decir una consonante ({state.wheelValue} {unit} por letra)</div>
          )}
          {state.turnPhase === 'vowels' && (
            <div className={styles.info}>Puedes comprar vocales. Tienes {currentPlayer.score} {unit}</div>
          )}
          {state.turnPhase === 'next-action' && (
            <div className={styles.info}>Gira de nuevo o resuelve el panel</div>
          )}
          {allVowelsGuessed && state.turnPhase !== 'consonant' && (
            <div className={styles.warning}>Ya has pedido todas las vocales</div>
          )}

          <div className={styles.inputGroup}>
            <input
              type="text"
              value={letter}
              onChange={(e) => setLetter(e.target.value.slice(0, 1))}
              onKeyDown={(e) => e.key === 'Enter' && handleGuessLetter()}
              className={styles.input}
              placeholder="Escribe una letra..."
              maxLength={1}
              disabled={isRevealing}
            />
            <button
              onClick={handleGuessLetter}
              className={`${styles.button} ${VOWELS.includes(letter.toUpperCase()) && letter ? styles.vowelButton : styles.consonantButton}`}
              disabled={isRevealing || !letter}
            >
              Probar letra
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
