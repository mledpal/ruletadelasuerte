import type { Player } from '../../types/game';
import styles from './TargetPicker.module.css';

interface TargetPickerProps {
  title: string;
  message?: string;
  players: Player[];
  /** Jugador que realiza la acción; se excluye de la lista. */
  sourceId: number;
  onSelect: (targetId: number) => void;
  /** Si se proporciona, se muestra un botón de cancelar (acción opcional). */
  onCancel?: () => void;
  castulo: boolean;
}

export function TargetPicker({ title, message, players, sourceId, onSelect, onCancel, castulo }: TargetPickerProps) {
  const targets = players.filter((p) => p.id !== sourceId);
  const unit = castulo ? 'As' : '€';

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.title}>{title}</div>
        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.players}>
          {targets.map((p) => {
            const tokens: string[] = [];
            if (p.hasWildcard) tokens.push('Comodín');
            if (p.hasAnibal) tokens.push('Aníbal');
            if (p.hasHimilce) tokens.push('Himilce');
            if (p.hasEscipion) tokens.push('Escipión');
            return (
              <button key={p.id} className={styles.playerBtn} onClick={() => onSelect(p.id)}>
                <span className={styles.playerName}>{p.name}</span>
                <span className={styles.playerScore}>
                  {p.score.toLocaleString('es-ES')} {unit}
                </span>
                {tokens.length > 0 && (
                  <span className={styles.playerTokens}>{tokens.join(' · ')}</span>
                )}
              </button>
            );
          })}
        </div>

        {onCancel && (
          <button className={styles.cancel} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
