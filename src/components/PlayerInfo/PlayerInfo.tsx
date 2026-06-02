import { useGame } from '../../context/GameContext';
import { currencyUnit } from '../../utils/currency';
import styles from './PlayerInfo.module.css';

export function PlayerInfo() {
  const { state } = useGame();
  const castulo = state.castuloMode;
  const unit = currencyUnit(castulo);

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

  return (
    <>
      {isBoteRound && (
        <div className={styles.boteBanner}>
          🏆 BOTE COMÚN: {state.boteAmount.toLocaleString('es-ES')} {unit}
        </div>
      )}
      <div className={styles.players}>
      {state.players.map((player, index) => (
        <div
          key={player.id}
          className={`${styles.player} ${index === state.currentPlayer ? styles.active : ''}`}
        >
          <div className={styles.name}>{player.name}</div>
          <div className={styles.score}>{player.score} {unit}</div>
          <div className={styles.wallet}>Cartera: {player.wallet} {unit}</div>
          <div className={styles.tokens}>
            {player.hasWildcard && <span className={styles.wildcard}>Comodín</span>}
            {player.hasAnibal && <span className={styles.token}>Aníbal</span>}
            {player.hasHimilce && <span className={styles.token}>Himilce</span>}
            {player.hasEscipion && <span className={styles.tokenEscipion}>⚔️ Escipión</span>}
          </div>
        </div>
      ))}
      </div>
    </>
  );
}
