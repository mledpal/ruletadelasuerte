import { useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';
import type { Phrase } from '../types/game';

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch { /* ignorar */ }
}

/**
 * Elige frases al azar sin repetir dentro de la partida, filtradas por las
 * categorías elegidas. Frases usadas y categorías se guardan en localStorage
 * (`usedKey` y `usedKey:categories`) para seguir igual tras recargar.
 */
export function usePhrasePicker(usedKey: string) {
  const { dispatch } = useGame();
  const categoriesKey = `${usedKey}:categories`;
  const usedRef = useRef<Set<string> | null>(null);
  const categoriesRef = useRef<string[] | null>(null);

  const pickPhrase = useCallback((phraseList: Phrase[]) => {
    const used = (usedRef.current ??= new Set(loadList(usedKey)));
    const cats = (categoriesRef.current ??= loadList(categoriesKey));
    const filtered = cats.length > 0 ? phraseList.filter((p) => cats.includes(p.category)) : phraseList;
    const available = filtered.filter((p) => !used.has(p.phrase));
    if (available.length === 0) return;

    const selected = available[Math.floor(Math.random() * available.length)];
    usedRef.current = new Set([...used, selected.phrase]);
    saveList(usedKey, Array.from(usedRef.current));

    dispatch({
      type: 'SET_PHRASE',
      payload: { phrase: selected.phrase, category: selected.category, hint: selected.hint },
    });
  }, [dispatch, usedKey, categoriesKey]);

  /** Empieza una partida nueva: olvida las frases usadas */
  const resetUsed = useCallback(() => {
    usedRef.current = new Set();
    try {
      localStorage.removeItem(usedKey);
    } catch { /* ignorar */ }
  }, [usedKey]);

  const setCategories = useCallback((selected: string[]) => {
    categoriesRef.current = selected;
    saveList(categoriesKey, selected);
  }, [categoriesKey]);

  return { pickPhrase, resetUsed, setCategories };
}
