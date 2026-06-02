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
          Si juegas con frases de <strong>Cástulo</strong>, se activa un modo especial con nuevas
          reglas y piezas — descríbelo más abajo.
        </p>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🎯</span>
            <h2 className={styles.sectionTitle}>Objetivo</h2>
          </div>
          <p>
            Descubre la frase oculta antes que tus rivales y acumula más dinero en tu
            <strong> cartera</strong> al final de todas las rondas.
            Gana quien tenga más dinero al terminar la última ronda.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🎛️</span>
            <h2 className={styles.sectionTitle}>Configuración inicial</h2>
          </div>
          <p className={styles.sectionIntro}>Antes de empezar se pasa por tres pasos:</p>
          <ol className={styles.stepList}>
            <li>
              <strong>Jugadores</strong> — elige de 1 a 6 participantes.
            </li>
            <li>
              <strong>Temas</strong> — selecciona uno o varios temas (Televisión, Historia,
              Arte…). Solo se usarán frases de los temas elegidos. Cada tema muestra entre
              paréntesis cuántas frases tiene disponibles. Si eliges{' '}
              <strong>únicamente el tema Cástulo</strong>, se activa el modo especial.
            </li>
            <li>
              <strong>Rondas y opciones</strong> — elige el número de rondas (1–5, limitado
              al total de frases disponibles con los temas escogidos), activa o desactiva
              los <strong>comodines</strong> y la <strong>ronda del BOTE</strong> opcional.
            </li>
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🎡</span>
            <h2 className={styles.sectionTitle}>La ruleta</h2>
          </div>
          <p className={styles.sectionIntro}>
            La ruleta tiene 24 casillas (más en modo Cástulo). Cada casilla puede ser un valor
            monetario o una casilla especial:
          </p>
          <div className={styles.wheelTable}>
            <div className={styles.wheelRow}>
              <span className={styles.wheelBadgeGold}>25 – 750</span>
              <span>
                Ese valor se suma a tu marcador de ronda por cada consonante acertada.
                En modo Cástulo la cifra se expresa en <strong>Ases</strong>.
              </span>
            </div>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.danger}`}>QUIEBRA</span>
              <span>Pierdes todos los Ases / euros acumulados en la ronda y cedes el turno.</span>
            </div>
            <div className={`${styles.wheelRow}`}>
              <span className={`${styles.wheelBadge} ${styles.warning}`}>PIERDE TURNO</span>
              <span>Tu turno pasa al siguiente jugador sin perder tu marcador.</span>
            </div>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.comodin}`}>COMODÍN ★</span>
              <span>
                Si aciertas la consonante tras caer aquí, recibes el comodín. Puedes gastarlo
                para salvarte de una <em>Quiebra</em>, un <em>Pierde Turno</em> o un fallo
                de letra. Es de un solo uso y una vez agotado la casilla muestra 400.
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
              cuánto ganarás por consonante (o qué casilla especial te toca).
            </li>
            <li>
              <strong>Decir una consonante</strong> — escríbela en el campo de texto. Si
              aparece en la frase, ganas el valor de la casilla multiplicado por el número
              de veces que aparece. Si no está, el turno pasa al siguiente jugador.
            </li>
            <li>
              <strong>Comprar una vocal</strong> (opcional) — cuesta <strong>50</strong> de
              tu marcador de ronda (Ases o euros según el modo). Solo está disponible si tienes
              suficiente dinero y quedan vocales ocultas.
            </li>
            <li>
              <strong>Resolver o continuar</strong> — puedes intentar escribir la frase
              completa en cualquier momento, o seguir girando para acumular más.
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
              <span className={styles.scoreLabel}>Marcador de ronda</span>
              <span>
                Dinero acumulado <em>en la ronda actual</em>. Se pierde completamente con
                QUIEBRA. Si otro jugador resuelve la frase, tu marcador se resetea a cero.
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
            <li>
              La partida consta de las <strong>rondas elegidas en la configuración</strong>{' '}
              (entre 1 y 5, limitado por el número de frases disponibles).
            </li>
            <li>
              Al resolver el panel, el marcador de ronda pasa automáticamente a la{' '}
              <strong>cartera del ganador</strong>. El resto de jugadores lo pierden.
            </li>
            <li>
              Tras unos segundos, el juego avanza solo a la siguiente ronda con una{' '}
              <strong>frase nueva</strong>. Las frases no se repiten en la misma partida.
            </li>
            <li>
              Al terminar la última ronda aparece el <strong>podio final</strong>. Gana quien
              más dinero tenga en cartera.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.icon}>🏛️</span>
            <h2 className={styles.sectionTitle}>Modo Cástulo</h2>
          </div>
          <p className={styles.sectionIntro}>
            Se activa automáticamente cuando eliges <strong>solo el tema CASTULO</strong> en la
            pantalla de temas. La mecánica base es la misma, pero cambian la moneda, la ruleta
            y aparecen nuevas piezas que añaden estrategia y emoción:
          </p>

          <h3 className={styles.subSectionTitle}>💱 La moneda: el As</h3>
          <p>
            Todas las cantidades se expresan en <strong>Ases</strong>, la moneda que circulaba
            en Cástulo en la antigüedad. En la ruleta solo verás la cifra; en marcadores,
            mensajes y cartera aparecerá con el símbolo <em>As</em>.
          </p>

          <h3 className={styles.subSectionTitle}>🎡 Una ruleta más grande</h3>
          <p>
            La ruleta de Cástulo tiene más gajos que la estándar. Además de los habituales,
            incorpora cuatro casillas nuevas descritas a continuación. La ruleta se adapta
            automáticamente a todos los tamaños de pantalla.
          </p>

          <h3 className={styles.subSectionTitle}>🪙 Piezas coleccionables: Aníbal y Himilce</h3>
          <div className={styles.wheelTable}>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.comodin}`}>ANÍBAL</span>
              <span>
                Al caer en esta casilla, debes <strong>acertar una consonante</strong> para
                ganarte la ficha de Aníbal. Si fallas, la casilla permanece disponible para
                otros jugadores.
              </span>
            </div>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.comodin}`}>HIMILCE</span>
              <span>
                Igual que Aníbal. Al caerle y acertar consonante, la ficha de Himilce pasa
                a tu mesa.
              </span>
            </div>
          </div>
          <p>
            <strong>Bono de la pareja:</strong> si tienes <em>ambas fichas</em> cuando ganas
            una ronda, recibes <strong>+1.000 Ases extra</strong> en tu cartera. El bono
            consume las fichas, que vuelven a estar disponibles en la ruleta.
            Las fichas <em>persisten entre rondas</em>: no se pierden al empezar una nueva ronda.
          </p>

          <h3 className={styles.subSectionTitle}>⚔️ Pieza ofensiva: Escipión</h3>
          <div className={styles.wheelTable}>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.danger}`}>ESCIPIÓN</span>
              <span>
                Se gana como Aníbal y Himilce: caer en la casilla y acertar consonante.
                La ficha queda en tu mesa y <em>persiste entre rondas</em>.
              </span>
            </div>
          </div>
          <p>
            En <strong>cualquier momento de tu turno</strong> verás el botón{' '}
            <em>"⚔️ Usar a Escipión"</em>. Al pulsarlo, eliges a un rival: ese jugador pierde
            al instante su <strong>marcador de ronda completo</strong> y{' '}
            <strong>todas sus fichas</strong> (Aníbal, Himilce, Escipión y comodín). Escipión
            se consume al usarlo.
          </p>

          <h3 className={styles.subSectionTitle}>🏰 Casilla de castigo: Asedio</h3>
          <div className={styles.wheelTable}>
            <div className={styles.wheelRow}>
              <span className={`${styles.wheelBadge} ${styles.warning}`}>ASEDIO</span>
              <span>
                Al caer aquí <strong>no hay que decir consonante</strong>. Debes elegir a otro
                jugador y entregarle todo tu marcador de ronda y todas tus fichas. A cambio,{' '}
                <strong>no pierdes el turno</strong>: puedes volver a girar la ruleta
                inmediatamente.
              </span>
            </div>
          </div>

          <h3 className={styles.subSectionTitle}>📋 Resumen de las fichas</h3>
          <ul className={styles.bulletList}>
            <li>Solo puede haber <strong>una ficha de cada tipo</strong> en juego a la vez.</li>
            <li>
              Una casilla desaparece de la ruleta mientras alguien posea esa ficha; vuelve
              a aparecer en cuanto se pierde o se consume.
            </li>
            <li>Las fichas <strong>persisten entre rondas</strong> hasta usarse o perderse.</li>
            <li>
              Si Escipión o un Asedio te arrebatan las fichas, pasan directamente al rival
              elegido.
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
