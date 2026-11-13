import { useState } from 'react';
import type { RankingEntry, RankingMode } from '../../types/game';
import { useRankingBoard } from '../../hooks/useRanking';
import { formatMoney } from '../../utils/currency';
import { RANKING_SIZE } from '../../utils/ranking';
import styles from './Ranking.module.css';

interface RankingTableProps {
  entries: RankingEntry[];
  castulo: boolean;
  /** gameId de la fila a resaltar (la partida recién terminada) */
  highlightId?: string;
}

const dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Tabla del top global. */
export function RankingTable({ entries, castulo, highlightId }: RankingTableProps) {
  if (entries.length === 0) {
    return <div className={styles.empty}>Todavía no hay puntuaciones. ¡Sé el primero!</div>;
  }

  return (
    <ol className={styles.table}>
      {entries.map((e, i) => (
        <li
          key={e.gameId}
          className={`${styles.row} ${i < 3 ? styles.podium : ''} ${e.gameId === highlightId ? styles.highlight : ''}`}
        >
          <span className={styles.pos}>{i + 1}</span>
          <span className={styles.name}>{e.name}</span>
          <span className={styles.meta}>
            {e.rounds} {e.rounds === 1 ? 'ronda' : 'rondas'} · {dateFormat.format(new Date(e.createdAt))}
          </span>
          <span className={styles.score}>{formatMoney(e.score, castulo)}</span>
        </li>
      ))}
    </ol>
  );
}

interface RankingScreenProps {
  onBack: () => void;
}

/** Pantalla de consulta del ranking, con una pestaña por modo de juego. */
export function RankingScreen({ onBack }: RankingScreenProps) {
  const [mode, setMode] = useState<RankingMode>('normal');
  const { entries, status, retry } = useRankingBoard(mode);
  const castulo = mode === 'castulo';

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>Clasificación</div>
        <div className={styles.subtitle}>Top {RANKING_SIZE} global</div>

        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'normal'}
            className={`${styles.tab} ${mode === 'normal' ? styles.tabActive : ''}`}
            onClick={() => setMode('normal')}
          >
            Ruleta de la Fortuna
          </button>
          <button
            role="tab"
            aria-selected={castulo}
            className={`${styles.tab} ${castulo ? styles.tabActive : ''}`}
            onClick={() => setMode('castulo')}
          >
            Cástulo
          </button>
        </div>

        {status === 'disabled' && <div className={styles.empty}>El ranking online no está configurado.</div>}
        {status === 'loading' && <div className={styles.empty}>Cargando…</div>}
        {status === 'error' && (
          <div className={styles.empty}>
            No se ha podido cargar la clasificación.{' '}
            <button className={styles.retry} onClick={retry}>Reintentar</button>
          </div>
        )}
        {status === 'ready' && <RankingTable entries={entries} castulo={castulo} />}

        <button className={styles.backLink} onClick={onBack}>
          ← Volver
        </button>
      </div>
    </div>
  );
}
