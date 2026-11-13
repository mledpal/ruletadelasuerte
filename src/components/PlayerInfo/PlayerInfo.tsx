import { useEffect, useRef } from 'react';
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

  // En el móvil la tira de marcadores se desplaza en horizontal: mantener visible al jugador en turno
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const card = strip?.children[state.currentPlayer] as HTMLElement | undefined;
    if (!strip || !card || strip.scrollWidth <= strip.clientWidth) return;
    const left = card.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + card.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: left - 8, behavior: 'smooth' });
    }
  }, [state.currentPlayer]);

  const playerColorClasses = [styles.playerBlue, styles.playerYellow, styles.playerPink, styles.playerGreen, styles.playerPurple, styles.playerOrange];

  return (
    <>
      {isBoteRound && (
        <div className={styles.boteBanner}>
          🏆 BOTE COMÚN: {state.boteAmount.toLocaleString('es-ES')} {unit}
        </div>
      )}
      <div ref={stripRef} className={styles.players}>
        {state.players.map((player, index) => {
          const isActive = index === state.currentPlayer;
          const colorClass = playerColorClasses[index % playerColorClasses.length];

          return (
            <div
              key={player.id}
              className={`${styles.player} ${colorClass} ${isActive ? styles.active : ''}`}
            >
              {isActive && <div className={styles.turnBadge}>TURNO ACTUAL</div>}
              <div className={styles.name}>{player.name}</div>
              <div className={styles.score}>{player.score.toLocaleString('es-ES')} {unit}</div>
              <div className={styles.wallet}>
                <span className={styles.walletLabel}>Cartera:</span> {player.wallet.toLocaleString('es-ES')} {unit}
              </div>
              <div className={styles.tokens}>
                {player.hasWildcard && <span className={styles.wildcard}>★ Comodín</span>}
                {player.hasAnibal && <span className={styles.token}>Aníbal</span>}
                {player.hasHimilce && <span className={styles.token}>Himilce</span>}
                {player.hasEscipion && <span className={styles.tokenEscipion}>⚔️ Escipión</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

