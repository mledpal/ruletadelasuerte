import { useState } from 'react';
import { MAX_NAME_LENGTH, rankingEnabled } from '../../utils/ranking';
import { CONSONANT_TIME_OPTIONS, loadConsonantTime, saveConsonantTime } from '../../utils/consonantTimer';
import styles from './PlayerSetup.module.css';

const NAMES_KEY = 'ruleta:playerNames';

/** Nombres usados en la última partida en este dispositivo, para no reescribirlos */
function loadLastNames(): string[] {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

/** Quita espacios sobrantes: "  Ana   María " → "Ana María" */
function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

interface CategoryInfo {
  name: string;
  count: number;
}

interface PlayerSetupProps {
  availableCategories: CategoryInfo[];
  onStart: (playerNames: string[], rounds: number, wildcardEnabled: boolean, boteRoundEnabled: boolean, selectedCategories: string[], consonantTimeLimit: number) => void;
  onHowToPlay: () => void;
  onRanking: () => void;
}

export function PlayerSetup({ availableCategories, onStart, onHowToPlay, onRanking }: PlayerSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>(loadLastNames);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    () => availableCategories.map((c) => c.name)
  );
  const [rounds, setRounds] = useState<number | null>(null);
  const [wildcardEnabled, setWildcardEnabled] = useState(true);
  const [boteRoundEnabled, setBoteRoundEnabled] = useState(false);
  const [consonantTime, setConsonantTime] = useState(loadConsonantTime);

  const allSelected =
    availableCategories.length > 0 &&
    availableCategories.every((c) => selectedCategories.includes(c.name));

  const totalAvailable = availableCategories
    .filter((c) => selectedCategories.includes(c.name))
    .reduce((sum, c) => sum + c.count, 0);

  const maxRounds = Math.min(5, totalAvailable);

  // Nombres de los jugadores de esta partida (obligatorios y sin repetir)
  const playerNames = Array.from({ length: playerCount ?? 0 }, (_, i) => cleanName(names[i] ?? ''));
  const isDuplicate = (i: number) =>
    playerNames[i] !== '' &&
    playerNames.findIndex((n) => n.toLocaleLowerCase('es') === playerNames[i].toLocaleLowerCase('es')) !== i;
  const namesValid = playerNames.length > 0 && playerNames.every((n, i) => n !== '' && !isDuplicate(i));

  const setName = (index: number, value: string) => {
    setNames((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push('');
      next[index] = value.slice(0, MAX_NAME_LENGTH);
      return next;
    });
  };

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

  const handleNextFromCount = () => {
    if (playerCount !== null) {
      if (playerCount < 2) setBoteRoundEnabled(false);
      setStep(2);
    }
  };

  const handleNextFromNames = () => {
    if (!namesValid) return;
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(playerNames));
    } catch { /* ignorar */ }
    setStep(3);
  };

  const handleNextFromCategories = () => {
    if (selectedCategories.length === 0) return;
    if (rounds !== null && rounds > maxRounds) {
      setRounds(maxRounds > 0 ? maxRounds : null);
    }
    setStep(4);
  };

  const handleStart = () => {
    if (namesValid && rounds !== null) {
      saveConsonantTime(consonantTime);
      onStart(playerNames, rounds, wildcardEnabled, boteRoundEnabled, selectedCategories, consonantTime);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${step === 3 ? styles.cardWide : ''}`}>
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
              onClick={handleNextFromCount}
            >
              Siguiente
            </button>

            <button className={styles.howToPlayLink} onClick={onHowToPlay}>
              ¿Cómo se juega?
            </button>

            {rankingEnabled && (
              <button className={styles.backLink} onClick={onRanking}>
                🏆 Clasificación
              </button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.subtitle}>
              {playerNames.length === 1 ? '¿Cómo te llamas?' : '¿Cómo os llamáis?'}
            </div>

            <form
              className={styles.names}
              onSubmit={(e) => {
                e.preventDefault();
                handleNextFromNames();
              }}
            >
              {playerNames.map((_, i) => (
                <label key={i} className={styles.nameField}>
                  <span className={styles.nameNumber}>{i + 1}</span>
                  <input
                    className={`${styles.nameInput} ${isDuplicate(i) ? styles.nameInvalid : ''}`}
                    type="text"
                    value={names[i] ?? ''}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={`Nombre del jugador ${i + 1}`}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    autoFocus={i === 0}
                    aria-invalid={isDuplicate(i)}
                  />
                  {isDuplicate(i) && <span className={styles.nameError}>Nombre repetido</span>}
                </label>
              ))}

              <button type="submit" className={styles.startButton} disabled={!namesValid}>
                Siguiente
              </button>
            </form>

            <button className={styles.backLink} onClick={() => setStep(1)}>
              ← Volver
            </button>
          </>
        )}

        {step === 3 && (
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
              onClick={handleNextFromCategories}
            >
              Siguiente
            </button>

            <button className={styles.backLink} onClick={() => setStep(2)}>
              ← Volver
            </button>
          </>
        )}

        {step === 4 && (
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

            <div className={styles.sectionLabel}>⏱️ Tiempo para pulsar la consonante</div>
            <div className={styles.timeOptions}>
              {CONSONANT_TIME_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`${styles.timeOption} ${consonantTime === s ? styles.timeActive : ''}`}
                  onClick={() => setConsonantTime(s)}
                >
                  {s === 0 ? 'Sin límite' : `${s} s`}
                </button>
              ))}
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

            <button className={styles.backLink} onClick={() => setStep(3)}>
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
