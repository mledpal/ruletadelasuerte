import type { Player } from '../../types/game';
import styles from './WinnerModal.module.css';

interface WinnerModalProps {
  players: Player[];
  onNewGame: () => void;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function WinnerModal({ players, onNewGame }: WinnerModalProps) {
  const ranked = [...players].sort((a, b) => b.wallet - a.wallet);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.title}>¡Fin del juego!</div>
        <div className={styles.subtitle}>Clasificación final</div>

        <div className={styles.podium}>
          {ranked.map((player, i) => (
            <div
              key={player.id}
              className={`${styles.entry} ${i === 0 ? styles.first : i === 1 ? styles.second : styles.third}`}
            >
              <span className={styles.medal}>{MEDAL[i]}</span>
              <span className={styles.name}>{player.name}</span>
              <span className={styles.wallet}>{player.wallet.toLocaleString('es-ES')} €</span>
            </div>
          ))}
        </div>

        <button className={styles.button} onClick={onNewGame}>
          Nuevo Juego
        </button>
      </div>
    </div>
  );
}
