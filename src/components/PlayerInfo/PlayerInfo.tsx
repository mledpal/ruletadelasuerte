import { useGame } from '../../context/GameContext';
import styles from './PlayerInfo.module.css';

export function PlayerInfo() {
  const { state } = useGame();

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

  return (
    <>
      {isBoteRound && (
        <div className={styles.boteBanner}>
          🏆 BOTE COMÚN: {state.boteAmount.toLocaleString('es-ES')}€
        </div>
      )}
      <div className={styles.players}>
      {state.players.map((player, index) => (
        <div
          key={player.id}
          className={`${styles.player} ${index === state.currentPlayer ? styles.active : ''}`}
        >
          <div className={styles.name}>{player.name}</div>
          <div className={styles.score}>{player.score} €</div>
          <div className={styles.wallet}>Cartera: {player.wallet} €</div>
          {player.hasWildcard && <div className={styles.wildcard}>Comodín</div>}
        </div>
      ))}
      </div>
    </>
  );
}
