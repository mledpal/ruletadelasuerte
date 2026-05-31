import { useState } from 'react';
import styles from './PlayerSetup.module.css';

interface PlayerSetupProps {
  onStart: (playerCount: number, rounds: number, wildcardEnabled: boolean, boteRoundEnabled: boolean) => void;
  onHowToPlay: () => void;
}

export function PlayerSetup({ onStart, onHowToPlay }: PlayerSetupProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [rounds, setRounds] = useState<number | null>(null);
  const [wildcardEnabled, setWildcardEnabled] = useState(true);
  const [boteRoundEnabled, setBoteRoundEnabled] = useState(false);

  const handleNext = () => {
    if (playerCount !== null) {
      if (playerCount < 2) setBoteRoundEnabled(false);
      setStep(2);
    }
  };

  const handleStart = () => {
    if (playerCount !== null && rounds !== null) {
      onStart(playerCount, rounds, wildcardEnabled, boteRoundEnabled);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>La Ruleta de la Fortuna</div>

        {step === 1 ? (
          <>
            <div className={styles.subtitle}>¿Cuántos jugadores van a participar?</div>

            <div className={styles.grid}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  className={`${styles.option} ${playerCount === n ? styles.active : ''}`}
                  onClick={() => setPlayerCount(n)}
                >
                  <span className={styles.number}>{n}</span>
                  <span className={styles.label}>
                    {n === 1 ? 'jugador' : 'jugadores'}
                  </span>
                </button>
              ))}
            </div>

            <button
              className={styles.startButton}
              disabled={playerCount === null}
              onClick={handleNext}
            >
              Siguiente
            </button>

            <button className={styles.howToPlayLink} onClick={onHowToPlay}>
              ¿Cómo se juega?
            </button>
          </>
        ) : (
          <>
            <div className={styles.subtitle}>Configuración de la partida</div>

            <div className={styles.sectionLabel}>¿Cuántas rondas?</div>
            <div className={`${styles.grid} ${styles.gridRounds}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`${styles.option} ${rounds === n ? styles.active : ''}`}
                  onClick={() => setRounds(n)}
                >
                  <span className={styles.number}>{n}</span>
                  <span className={styles.label}>{n === 1 ? 'ronda' : 'rondas'}</span>
                </button>
              ))}
            </div>

            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={wildcardEnabled}
                  onChange={(e) => setWildcardEnabled(e.target.checked)}
                />
                <span className={styles.checkboxText}>Usar comodines</span>
              </label>
            </div>

            {playerCount !== null && playerCount >= 2 && (
              <div className={styles.checkboxWrapper}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={boteRoundEnabled}
                    onChange={(e) => setBoteRoundEnabled(e.target.checked)}
                  />
                  <span className={styles.checkboxText}>🏆 Añadir ronda del BOTE como última ronda</span>
                </label>
              </div>
            )}

            <button
              className={styles.startButton}
              disabled={rounds === null}
              onClick={handleStart}
            >
              Comenzar partida
            </button>

            <button className={styles.backLink} onClick={() => setStep(1)}>
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
