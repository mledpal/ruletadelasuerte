import styles from './HowToPlay.module.css';

interface HowToPlayProps {
  onBack: () => void;
}

export function HowToPlay({ onBack }: HowToPlayProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button className={styles.backButton} onClick={onBack}>
            ← Volver
          </button>
        </div>

        <h1 className={styles.title}>Cómo se juega</h1>
        <p className={styles.intro}>
          La Ruleta de la Fortuna es un juego de palabras y estrategia para 1–6 jugadores.
          Adivina la frase oculta letra a letra y acumula el mayor dinero posible en tu cartera.
        </p>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🎯</span>
            <h2 className={styles.sectionTitle}>Objetivo</h2>
          </div>
          <p>
            Descubre la frase oculta antes que tus rivales y acumula más dinero en tu
            <strong> cartera</strong> al final de las <strong>3 rondas</strong>.
            Gana quien tenga más dinero al terminar la última ronda.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🎡</span>
            <h2 className={styles.sectionTitle}>La ruleta</h2>
          </div>
          <p className={styles.sectionIntro}>
            La ruleta tiene 24 casillas. Cada casilla puede ser un valor en euros o una
            casilla especial:
          </p>
          <div className={styles.wheelTable}>
            <div className={styles.wheelRow}>
              <span className={styles.wheelBadgeGold}>100€ – 900€</span>
              <span>Ese valor se suma a tu puntuación de ronda si adivinas una consonante.</span>
            </div>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.danger}`}>QUIEBRA</span>
              <span>Pierdes todos los puntos acumulados en la ronda actual y cedes el turno.</span>
            </div>
            <div className={`${styles.wheelRow}`}>
              <span className={`${styles.wheelBadge} ${styles.warning}`}>PIERDE TURNO</span>
              <span>Tu turno pasa al siguiente jugador sin perder puntos.</span>
            </div>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.comodin}`}>COMODÍN</span>
              <span>
                Recibes un comodín de un solo uso. Puedes gastarlo para <strong>resolver la frase
                directamente</strong> sin necesidad de girar la ruleta.
                Una vez usado, la casilla muestra 400€.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🔄</span>
            <h2 className={styles.sectionTitle}>Flujo de un turno</h2>
          </div>
          <ol className={styles.stepList}>
            <li>
              <strong>Girar la ruleta</strong> — pulsa "Girar ruleta". El resultado determina
              cuánto ganarás por cada consonante acertada (o si recibes una casilla especial).
            </li>
            <li>
              <strong>Adivinar una consonante</strong> — escribe o selecciona una consonante del
              teclado. Si aparece en la frase, suma el valor de la casilla por cada ocurrencia.
              Si no aparece, el turno pasa al siguiente jugador.
            </li>
            <li>
              <strong>Comprar una vocal</strong> (opcional) — cuesta <strong>50€</strong> de
              tu puntuación de ronda. Solo está disponible si tienes puntos suficientes y quedan
              vocales ocultas.
            </li>
            <li>
              <strong>Resolver o continuar</strong> — puedes intentar resolver la frase completa
              en cualquier momento, o seguir girando para acumular más puntos.
            </li>
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>💰</span>
            <h2 className={styles.sectionTitle}>Sistema de puntuación</h2>
          </div>
          <div className={styles.scoreTable}>
            <div className={styles.scoreRow}>
              <span className={styles.scoreLabel}>Puntuación de ronda</span>
              <span>
                Dinero acumulado <em>en la ronda actual</em>. Se pierde completamente con
                QUIEBRA. Si no eres tú quien resuelve la frase, tampoco pasa a tu cartera.
              </span>
            </div>
            <div className={styles.scoreRow}>
              <span className={`${styles.scoreLabel} ${styles.gold}`}>Cartera</span>
              <span>
                Dinero total acumulado entre rondas. <em>Solo aumenta cuando ganas una ronda</em>{' '}
                resolviendo la frase. La cartera nunca se pierde por QUIEBRA y persiste hasta
                el final de la partida.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🏆</span>
            <h2 className={styles.sectionTitle}>Mecánica de rondas</h2>
          </div>
          <ul className={styles.bulletList}>
            <li>La partida consta de <strong>3 rondas</strong>.</li>
            <li>
              Al resolver el panel, los puntos de la ronda pasan automáticamente a la{' '}
              <strong>cartera del ganador</strong>.
            </li>
            <li>
              Tras 3 segundos, el juego avanza solo a la siguiente ronda con una{' '}
              <strong>frase nueva</strong>. Las frases no se repiten en la misma partida.
            </li>
            <li>
              Al terminar la ronda 3 aparece el <strong>podio final</strong> con las carteras
              de todos los jugadores. ¡El que más tenga gana!
            </li>
          </ul>
        </section>

        <div className={styles.bottomBar}>
          <button className={styles.backButtonBottom} onClick={onBack}>
            ← Volver al juego
          </button>
        </div>
      </div>
    </div>
  );
}
