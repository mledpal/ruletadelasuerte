// Moneda del juego: € en modo normal, "As" (moneda de Cástulo) en modo Cástulo.

/** Símbolo/unidad monetaria según el modo de juego. */
export function currencyUnit(castulo: boolean): string {
  return castulo ? 'As' : '€';
}

/**
 * Formatea una cantidad con separador de miles español y la unidad monetaria
 * correspondiente al modo de juego. Ej.: formatMoney(1000, true) → "1.000 As".
 */
export function formatMoney(amount: number, castulo: boolean): string {
  return `${amount.toLocaleString('es-ES')} ${currencyUnit(castulo)}`;
}
