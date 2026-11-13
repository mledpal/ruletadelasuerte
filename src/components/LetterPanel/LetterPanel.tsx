import { useGame } from '../../context/GameContext';
import { LetterCell } from './LetterCell';
import type { CSSProperties } from 'react';
import type { LetterCell as LetterCellType } from '../../types/game';
import styles from './LetterPanel.module.css';

export function LetterPanel() {
  const { state } = useGame();

  // Agrupar celdas por palabras (separadas por celdas de espacio)
  const words: LetterCellType[][] = [];
  let current: LetterCellType[] = [];
  for (const cell of state.cells) {
    if (cell.letter === null) {
      if (current.length > 0) {
        words.push(current);
        current = [];
      }
    } else {
      current.push(cell);
    }
  }
  if (current.length > 0) words.push(current);

  // Longitud de la palabra más larga: el CSS ajusta el tamaño de casilla para que quepa
  const maxLetters = Math.max(1, ...words.map((w) => w.length));
  const lettersVars = { '--max-letters': maxLetters } as CSSProperties;

  return (
    <div className={styles.panel}>
      <div className={styles.hintSection}>
        <div className={styles.category}>{state.category}</div>
        <div className={styles.hint}>{state.hint}</div>
      </div>
      <div className={styles.letters} style={lettersVars}>
        {words.map((word, wi) => (
          <div key={wi} className={styles.word}>
            {word.map((cell) => (
              <LetterCell key={cell.id} cell={cell} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
