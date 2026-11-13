/** Segundos por defecto para pulsar la consonante tras girar la ruleta */
export const DEFAULT_CONSONANT_TIME = 30;

/** Opciones del selector en el setup (0 = sin límite) */
export const CONSONANT_TIME_OPTIONS = [0, 15, 30, 45, 60];

const TIME_KEY = 'ruleta:consonantTime';

/** Último tiempo elegido en este dispositivo */
export function loadConsonantTime(): number {
  try {
    const value = Number(localStorage.getItem(TIME_KEY));
    return CONSONANT_TIME_OPTIONS.includes(value) && localStorage.getItem(TIME_KEY) !== null
      ? value
      : DEFAULT_CONSONANT_TIME;
  } catch {
    return DEFAULT_CONSONANT_TIME;
  }
}

export function saveConsonantTime(seconds: number): void {
  try {
    localStorage.setItem(TIME_KEY, String(seconds));
  } catch { /* ignorar */ }
}
