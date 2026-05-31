import type { Player } from '../../types/game';
import styles from './WinnerModal.module.css';

interface WinnerModalProps {
  players: Player[];
  boteAmount: number;
  boteWinnerId: number | null;
  onNewGame: () => void;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function WinnerModal({ players, boteAmount, boteWinnerId, onNewGame }: WinnerModalProps) {
  const ranked = [...players].sort((a, b) => b.wallet - a.wallet);
  const boteWinner = boteWinnerId !== null ? players.find((p) => p.id === boteWinnerId) : null;

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

        {boteAmount > 0 && (
          <div className={styles.boteResult}>
            {boteWinner ? (
              <span className={styles.boteWon}>
                🏆 El bote de {boteAmount.toLocaleString('es-ES')}€ fue ganado por <strong>{boteWinner.name}</strong>
              </span>
            ) : (
              <span className={styles.boteUnclaimed}>
                💸 El bote de {boteAmount.toLocaleString('es-ES')}€ no fue reclamado
              </span>
            )}
          </div>
        )}

        <button className={styles.button} onClick={onNewGame}>
          Nuevo Juego
        </button>
      </div>
    </div>
  );
}
