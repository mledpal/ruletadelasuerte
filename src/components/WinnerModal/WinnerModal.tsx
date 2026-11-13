import type { Player } from '../../types/game';
import { currencyUnit } from '../../utils/currency';
import { useSubmitWinner } from '../../hooks/useRanking';
import { RankingTable } from '../Ranking/Ranking';
import { RANKING_SIZE } from '../../utils/ranking';
import styles from './WinnerModal.module.css';

interface WinnerModalProps {
  gameId: string;
  totalRounds: number;
  players: Player[];
  boteAmount: number;
  boteWinnerId: number | null;
  onNewGame: () => void;
  castulo?: boolean;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function WinnerModal({ gameId, totalRounds, players, boteAmount, boteWinnerId, onNewGame, castulo = false }: WinnerModalProps) {
  const ranked = [...players].sort((a, b) => b.wallet - a.wallet);
  const boteWinner = boteWinnerId !== null ? players.find((p) => p.id === boteWinnerId) : null;
  const unit = currencyUnit(castulo);

  // Solo el ganador (y con algo de dinero) opta al ranking global
  const winner = ranked[0];
  const ranking = useSubmitWinner(
    winner && winner.wallet > 0
      ? { gameId, name: winner.name, score: winner.wallet, mode: castulo ? 'castulo' : 'normal', rounds: totalRounds }
      : null
  );

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
              <span className={styles.wallet}>{player.wallet.toLocaleString('es-ES')} {unit}</span>
            </div>
          ))}
        </div>

        {boteAmount > 0 && (
          <div className={styles.boteResult}>
            {boteWinner ? (
              <span className={styles.boteWon}>
                🏆 El bote de {boteAmount.toLocaleString('es-ES')} {unit} fue ganado por <strong>{boteWinner.name}</strong>
              </span>
            ) : (
              <span className={styles.boteUnclaimed}>
                💸 El bote de {boteAmount.toLocaleString('es-ES')} {unit} no fue reclamado
              </span>
            )}
          </div>
        )}

        {ranking.status !== 'disabled' && (
          <section className={styles.ranking}>
            <div className={styles.rankingTitle}>Top {RANKING_SIZE} global{castulo ? ' · Cástulo' : ''}</div>
            {ranking.status === 'sending' && <div className={styles.rankingMsg}>Consultando la clasificación…</div>}
            {ranking.status === 'entered' && (
              <div className={`${styles.rankingMsg} ${styles.rankingEntered}`}>
                🎉 <strong>{winner.name}</strong> entra en la clasificación en el puesto {ranking.position}
              </div>
            )}
            {ranking.status === 'not-qualified' && (
              <div className={styles.rankingMsg}>La puntuación de {winner.name} no alcanza el Top {RANKING_SIZE}</div>
            )}
            {ranking.status === 'error' && (
              <div className={styles.rankingMsg}>
                No se ha podido conectar con la clasificación.{' '}
                <button className={styles.retry} onClick={ranking.retry}>Reintentar</button>
              </div>
            )}
            {(ranking.status === 'entered' || ranking.status === 'not-qualified') && (
              <RankingTable entries={ranking.entries} castulo={castulo} highlightId={gameId} />
            )}
          </section>
        )}

        <button className={styles.button} onClick={onNewGame}>
          Nuevo Juego
        </button>
      </div>
    </div>
  );
}
