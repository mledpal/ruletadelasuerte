// Configuración de Supabase (ranking global y modo online).
// Viene de VITE_SUPABASE_URL y VITE_SUPABASE_KEY (ver supabase/README.md).

// Se admite tanto la Project URL como la URL de la API (acabada en /rest/v1/)
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '');
export const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_KEY as string | undefined)?.trim();

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
