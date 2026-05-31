import { useState } from 'react';
import styles from './PlayerSetup.module.css';

interface PlayerSetupProps {
  onStart: (playerCount: number) => void;
  onHowToPlay: () => void;
}

export function PlayerSetup({ onStart, onHowToPlay }: PlayerSetupProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>La Ruleta de la Fortuna</div>
        <div className={styles.subtitle}>¿Cuántos jugadores van a participar?</div>

        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              className={`${styles.option} ${selected === n ? styles.active : ''}`}
              onClick={() => setSelected(n)}
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
          disabled={selected === null}
          onClick={() => selected !== null && onStart(selected)}
        >
          Comenzar partida
        </button>

        <button className={styles.howToPlayLink} onClick={onHowToPlay}>
          ¿Cómo se juega?
        </button>
      </div>
    </div>
  );
}
