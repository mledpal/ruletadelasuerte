import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { Phrase } from '../../types/game';
import styles from './PhraseManager.module.css';

interface PhraseManagerProps {
  onBack?: () => void;
  phrases: Phrase[];
  onAddPhrase: (phrase: string, category: string, hint: string) => void;
  onDeletePhrase: (index: number) => void;
  onEditPhrase: (index: number, phrase: string, category: string, hint: string) => void;
  onStartGame: () => void;
}

interface EditState {
  index: number;
  phrase: string;
  category: string;
  hint: string;
}

export function PhraseManager({ onBack, phrases, onAddPhrase, onDeletePhrase, onEditPhrase, onStartGame }: PhraseManagerProps) {
  const { state } = useGame();
  const [newPhrase, setNewPhrase] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newHint, setNewHint] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const openEdit = (index: number) => {
    const p = phrases[index];
    setEditState({ index, phrase: p.phrase, category: p.category, hint: p.hint });
  };

  const closeEdit = () => setEditState(null);

  const handleSaveEdit = () => {
    if (!editState) return;
    const { index, phrase, category, hint } = editState;
    if (!phrase.trim() || !category.trim() || !hint.trim()) {
      setMessage({ text: 'Todos los campos son obligatorios', type: 'error' });
      return;
    }
    onEditPhrase(index, phrase, category, hint);
    setEditState(null);
    setMessage({ text: 'Frase actualizada correctamente', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddPhrase = () => {
    if (!newPhrase.trim() || !newCategory.trim() || !newHint.trim()) {
      setMessage({ text: 'Todos los campos son obligatorios', type: 'error' });
      return;
    }

    onAddPhrase(newPhrase, newCategory, newHint);
    setNewPhrase('');
    setNewCategory('');
    setNewHint('');
    setMessage({ text: 'Frase añadida correctamente', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStartGame = () => {
    if (phrases.length < state.totalRounds) {
      setMessage({
        text: `Necesitas al menos ${state.totalRounds} frases para comenzar`,
        type: 'error',
      });
      return;
    }

    onStartGame();
    setMessage({ text: '¡Juego iniciado! Ronda 1 de 3', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className={`${styles.container}${onBack ? ` ${styles.pageView}` : ''}`}>
      {onBack ? (
        <div className={styles.pageHeader}>
          <button className={`${styles.button} ${styles.backButton}`} onClick={onBack}>
            ← Volver al juego
          </button>
          <div className={styles.title}>Gestionar Frases</div>
        </div>
      ) : (
        <div className={styles.title}>Gestionar Frases</div>
      )}

      <div className={styles.gameInfo}>
        <div className={styles.roundInfo}>
          Ronda {state.currentRound} de {state.totalRounds}
        </div>
        {state.gameComplete && (
          <div className={styles.gameComplete}>
            ¡Juego completado! Revisa las puntuaciones finales.
          </div>
        )}
      </div>

      <button
        onClick={handleStartGame}
        className={`${styles.button} ${styles.startButton}`}
        disabled={state.isRevealing || phrases.length < state.totalRounds}
      >
        Iniciar Nuevo Juego
      </button>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Frase</label>
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            className={styles.input}
            placeholder="Ej: EL SEÑOR DE LOS ANILLOS"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Categoría</label>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={styles.input}
            placeholder="Ej: PELÍCULAS"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Pista</label>
          <input
            type="text"
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
            className={styles.input}
            placeholder="Ej: Saga de fantasía protagonizada por Frodo"
          />
        </div>

        <button onClick={handleAddPhrase} className={`${styles.button} ${styles.addButton}`}>
          Añadir Frase
        </button>
      </div>

      <div className={styles.phraseList}>
        <div className={styles.phraseCount}>
          {phrases.length} frase{phrases.length !== 1 ? 's' : ''} disponible{phrases.length !== 1 ? 's' : ''}
        </div>
        {phrases.map((phrase, index) => (
          <div key={index} className={styles.phraseItem}>
            <div className={styles.phraseContent}>
              <div className={styles.phraseText}>{phrase.phrase}</div>
              <div className={styles.phraseMeta}>
                <span className={styles.category}>{phrase.category}</span>
                <span className={styles.hint}>{phrase.hint}</span>
              </div>
            </div>
            <div className={styles.phraseActions}>
              <button
                onClick={() => openEdit(index)}
                className={`${styles.button} ${styles.editButton}`}
              >
                Editar
              </button>
              <button
                onClick={() => onDeletePhrase(index)}
                className={`${styles.button} ${styles.deleteButton}`}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editState !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <div className={styles.modalTitle}>Editar Frase</div>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Frase</label>
                <input
                  type="text"
                  value={editState.phrase}
                  onChange={(e) => setEditState({ ...editState, phrase: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Categoría</label>
                <input
                  type="text"
                  value={editState.category}
                  onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Pista</label>
                <input
                  type="text"
                  value={editState.hint}
                  onChange={(e) => setEditState({ ...editState, hint: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.modalButtons}>
              <button onClick={handleSaveEdit} className={`${styles.button} ${styles.addButton}`}>
                Guardar
              </button>
              <button onClick={closeEdit} className={`${styles.button} ${styles.cancelButton}`}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}
    </div>
  );
}
