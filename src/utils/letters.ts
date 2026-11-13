/**
 * Devuelve la letra base sin tilde ni diéresis (Á→A, É→E, Ü→U...),
 * en mayúsculas. La Ñ se conserva porque es una letra propia.
 */
export function baseLetter(char: string): string {
  const upper = char.toUpperCase();
  if (upper === 'Ñ') return upper;
  return upper.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza un texto completo para comparar resoluciones del panel:
 * mayúsculas, sin tildes (conservando Ñ) y espacios colapsados.
 */
export function normalizeText(text: string): string {
  return Array.from(text.trim().replace(/\s+/g, ' ')).map(baseLetter).join('');
}
