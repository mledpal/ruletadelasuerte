import { Fragment, useState } from 'react';
import type { RankingEntry, RankingMode } from '../../types/game';
import { useRankingBoard } from '../../hooks/useRanking';
import { formatMoney } from '../../utils/currency';
import { isGroupGame, RANKING_SIZE } from '../../utils/ranking';
import styles from './Ranking.module.css';

interface RankingTableProps {
  entries: RankingEntry[];
  castulo: boolean;
  /** gameId de la fila a resaltar (la partida recién terminada) */
  highlightId?: string;
}

const dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Nº de jugadores y tipo de partida: «👥 3 jugadores · 🌐 Online» */
function describeGame(e: RankingEntry): string {
  const parts: string[] = [];
  if (e.players === null) parts.push('👥 ? jugadores');
  else if (e.players === 1) parts.push('👤 Individual');
  else parts.push(`👥 ${e.players} jugadores`);
  if (e.online !== null) parts.push(e.online ? '🌐 Online' : '🏠 Local');
  parts.push(`${e.rounds} ${e.rounds === 1 ? 'ronda' : 'rondas'}`);
  parts.push(dateFormat.format(new Date(e.createdAt)));
  return parts.join(' · ');
}

/** Rivales y extras: «vs Ana, Luis · 🃏 Comodín · 💰 Bote ganado» */
function describeExtras(e: RankingEntry): string {
  const parts: string[] = [];
  if (e.opponents && e.opponents.length > 0) parts.push(`vs ${e.opponents.join(', ')}`);
  if (e.wildcard) parts.push('🃏 Comodín');
  if (e.bote) parts.push(e.boteWon ? '💰 Bote ganado' : '💰 Bote');
  return parts.join(' · ');
}

/** Tabla del top global: partidas en grupo primero y después las individuales. */
export function RankingTable({ entries, castulo, highlightId }: RankingTableProps) {
  if (entries.length === 0) {
    return <div className={styles.empty}>Todavía no hay puntuaciones. ¡Sé el primero!</div>;
  }

  // Primera entrada que no es en grupo: ahí empieza la sección de individuales
  const firstSolo = entries.findIndex((e) => !isGroupGame(e));

  return (
    <ol className={styles.table}>
      {entries.map((e, i) => {
        const extras = describeExtras(e);
        return (
          <Fragment key={e.gameId}>
            {i === firstSolo && (
              <li className={styles.divider} aria-hidden="true">
                {i === 0 ? 'Sin partidas en grupo todavía' : 'Partidas individuales'}
              </li>
            )}
            <li
              className={`${styles.row} ${i < 3 ? styles.podium : ''} ${e.gameId === highlightId ? styles.highlight : ''}`}
            >
              <span className={styles.pos}>{i + 1}</span>
              <span className={styles.name}>{e.name}</span>
              <span className={styles.meta}>{describeGame(e)}</span>
              {extras && (
                <span className={styles.extras} title={extras}>
                  {extras}
                </span>
              )}
              <span className={styles.score}>{formatMoney(e.score, castulo)}</span>
            </li>
          </Fragment>
        );
      })}
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
        <div className={styles.note}>Las partidas en grupo van siempre por delante de las individuales</div>

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
