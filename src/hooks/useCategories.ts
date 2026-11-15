import { useMemo } from 'react';
import type { Phrase } from '../types/game';

export interface CategoryInfo {
  name: string;
  count: number;
}

/** Categorías disponibles con su número de frases, ordenadas alfabéticamente */
export function useCategories(phrases: Phrase[]): CategoryInfo[] {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of phrases) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [phrases]);
}
