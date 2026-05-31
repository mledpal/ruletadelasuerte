import { useState } from 'react';
import styles from './PlayerSetup.module.css';

interface CategoryInfo {
  name: string;
  count: number;
}

interface PlayerSetupProps {
  availableCategories: CategoryInfo[];
  onStart: (playerCount: number, rounds: number, wildcardEnabled: boolean, boteRoundEnabled: boolean, selectedCategories: string[]) => void;
  onHowToPlay: () => void;
}

export function PlayerSetup({ availableCategories, onStart, onHowToPlay }: PlayerSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    () => availableCategories.map((c) => c.name)
  );
  const [rounds, setRounds] = useState<number | null>(null);
  const [wildcardEnabled, setWildcardEnabled] = useState(true);
  const [boteRoundEnabled, setBoteRoundEnabled] = useState(false);

  const allSelected =
    availableCategories.length > 0 &&
    availableCategories.every((c) => selectedCategories.includes(c.name));

  const totalAvailable = availableCategories
    .filter((c) => selectedCategories.includes(c.name))
    .reduce((sum, c) => sum + c.count, 0);

  const maxRounds = Math.min(5, totalAvailable);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(availableCategories.map((c) => c.name));
    }
  };

  const handleNextFromStep1 = () => {
    if (playerCount !== null) {
      if (playerCount < 2) setBoteRoundEnabled(false);
      setStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (selectedCategories.length === 0) return;
    if (rounds !== null && rounds > maxRounds) {
      setRounds(maxRounds > 0 ? maxRounds : null);
    }
    setStep(3);
  };

  const handleStart = () => {
    if (playerCount !== null && rounds !== null) {
      onStart(playerCount, rounds, wildcardEnabled, boteRoundEnabled, selectedCategories);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${step === 2 ? styles.cardWide : ''}`}>
        <div className={styles.title}>La Ruleta de la Fortuna</div>

        {step === 1 && (
          <>
            <div className={styles.subtitle}>¿Cuántos jugadores van a participar?</div>

            <div className={styles.grid}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  className={`${styles.option} ${playerCount === n ? styles.active : ''}`}
                  onClick={() => setPlayerCount(n)}
                >
                  <span className={styles.number}>{n}</span>
                  <span className={styles.label}>
                    {n === 1 ? 'jugador' : 'jugadores'}
                  </span>
                </button>
              ))}
            </div>

            <button
              className={styles.startButton}
              disabled={playerCount === null}
              onClick={handleNextFromStep1}
            >
              Siguiente
            </button>

            <button className={styles.howToPlayLink} onClick={onHowToPlay}>
              ¿Cómo se juega?
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.subtitle}>¿Qué temas quieres jugar?</div>

            <button
              className={`${styles.allCategoriesBtn} ${allSelected ? styles.allActive : ''}`}
              onClick={toggleAll}
            >
              {allSelected ? '✓ Todos los temas seleccionados' : 'Seleccionar todos los temas'}
            </button>

            <div className={styles.categoriesGrid}>
              {availableCategories.map((cat) => {
                const isActive = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    className={`${styles.categoryChip} ${isActive ? styles.chipActive : ''}`}
                    onClick={() => toggleCategory(cat.name)}
                  >
                    <span className={styles.chipName}>{cat.name}</span>
                    <span className={styles.chipCount}>{cat.count}</span>
                  </button>
                );
              })}
            </div>

            <button
              className={styles.startButton}
              disabled={selectedCategories.length === 0}
              onClick={handleNextFromStep2}
            >
              Siguiente
            </button>

            <button className={styles.backLink} onClick={() => setStep(1)}>
              ← Volver
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.subtitle}>Configuración de la partida</div>

            <div className={styles.sectionLabel}>¿Cuántas rondas?</div>
            <div className={`${styles.grid} ${styles.gridRounds}`}>
              {[1, 2, 3, 4, 5].filter((n) => n <= maxRounds).map((n) => (
                <button
                  key={n}
                  className={`${styles.option} ${rounds === n ? styles.active : ''}`}
                  onClick={() => setRounds(n)}
                >
                  <span className={styles.number}>{n}</span>
                  <span className={styles.label}>{n === 1 ? 'ronda' : 'rondas'}</span>
                </button>
              ))}
            </div>

            <div className={styles.phrasesNote}>
              {totalAvailable} frase{totalAvailable !== 1 ? 's' : ''} disponible{totalAvailable !== 1 ? 's' : ''} con los temas elegidos
            </div>

            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={wildcardEnabled}
                  onChange={(e) => setWildcardEnabled(e.target.checked)}
                />
                <span className={styles.checkboxText}>Usar comodines</span>
              </label>
            </div>

            {playerCount !== null && playerCount >= 2 && (
              <div className={styles.checkboxWrapper}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={boteRoundEnabled}
                    onChange={(e) => setBoteRoundEnabled(e.target.checked)}
                  />
                  <span className={styles.checkboxText}>🏆 Añadir ronda del BOTE como última ronda</span>
                </label>
              </div>
            )}

            <button
              className={styles.startButton}
              disabled={rounds === null}
              onClick={handleStart}
            >
              Comenzar partida
            </button>

            <button className={styles.backLink} onClick={() => setStep(2)}>
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
