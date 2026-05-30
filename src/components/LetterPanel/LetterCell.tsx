import type { LetterCell as LetterCellType } from '../../types/game';
import styles from './LetterCell.module.css';

interface LetterCellProps {
  cell: LetterCellType;
}

export function LetterCell({ cell }: LetterCellProps) {
  if (cell.letter === null) {
    return <div className={`${styles.cell} ${styles.space}`} />;
  }

  return (
    <div className={`${styles.cell} ${styles[cell.state]}`}>
      {cell.state === 'visible' || cell.state === 'revealing' ? cell.letter : ''}
    </div>
  );
}
