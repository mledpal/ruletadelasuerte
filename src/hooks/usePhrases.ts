import { useState, useCallback, useEffect } from 'react';
import type { Phrase } from '../types/game';

const STORAGE_KEY = 'ruleta_phrases';
const DELETED_KEY = 'ruleta_phrases_deleted';
const ONLINE_URL = 'https://ruleta.ledemar.es/frases.json';
const FETCH_TIMEOUT_MS = 5000;

export type SyncStatus = 'idle' | 'loading' | 'done' | 'error';

const DEFAULT_PHRASES: Phrase[] = [
  { phrase: 'LA RULETA DE LA FORTUNA', category: 'TELEVISIÓN', hint: 'Nombre del programa', source: 'default' },
  { phrase: 'EL SEÑOR DE LOS ANILLOS', category: 'PELÍCULAS', hint: 'Saga de fantasía protagonizada por Frodo', source: 'default' },
  { phrase: 'HAKUNA MATATA', category: 'PELÍCULAS', hint: 'Frase famosa de El Rey León', source: 'default' },
  { phrase: 'EN UN LUGAR DE LA MANCHA', category: 'LITERATURA', hint: 'Inicio de Don Quijote', source: 'default' },
  { phrase: 'QUE LA FUERZA TE ACOMPAÑE', category: 'PELÍCULAS', hint: 'Frase icónica de Star Wars', source: 'default' },
  { phrase: 'MAS VALE TARDE QUE NUNCA', category: 'REFRANES', hint: 'Justifica la demora', source: 'default' },
  { phrase: 'NO HAY MAL QUE POR BIEN NO VENGA', category: 'REFRANES', hint: 'Optimismo ante la adversidad', source: 'default' },
  { phrase: 'A QUIEN MADRUGA DIOS LE AYUDA', category: 'REFRANES', hint: 'Elogio de la madrugada', source: 'default' },
  { phrase: 'EL TIEMPO ES ORO', category: 'REFRANES', hint: 'El recurso más valioso', source: 'default' },
  { phrase: 'JUEGO DE TRONOS', category: 'TELEVISIÓN', hint: 'Serie épica de HBO basada en los libros de George R.R. Martin', source: 'default' },
  { phrase: 'LA CASA DE PAPEL', category: 'TELEVISIÓN', hint: 'Atraco al Banco de España', source: 'default' },
  { phrase: 'BREAKING BAD', category: 'TELEVISIÓN', hint: 'Walter White cocina metanfetamina', source: 'default' },
  { phrase: 'EL REY LEON', category: 'PELÍCULAS', hint: 'Simba recupera su reino', source: 'default' },
  { phrase: 'TITANIC', category: 'PELÍCULAS', hint: 'Jack y Rose en el barco más famoso del cine', source: 'default' },
  { phrase: 'EL PADRINO', category: 'PELÍCULAS', hint: 'Clásico de Coppola sobre la mafia italiana', source: 'default' },
  { phrase: 'FORREST GUMP', category: 'PELÍCULAS', hint: 'La vida es como una caja de bombones', source: 'default' },
  { phrase: 'BIENVENIDO MISTER MARSHALL', category: 'PELÍCULAS', hint: 'Comedia española de Berlanga', source: 'default' },
  { phrase: 'LA GRAN BARRERA DE CORAL', category: 'GEOGRAFÍA', hint: 'Ecosistema marino en Australia', source: 'default' },
  { phrase: 'TORRE EIFFEL', category: 'MONUMENTOS', hint: 'Símbolo de París construido por Gustave', source: 'default' },
  { phrase: 'LA SAGRADA FAMILIA', category: 'MONUMENTOS', hint: 'Basílica de Gaudí en Barcelona', source: 'default' },
  { phrase: 'MACHU PICCHU', category: 'MONUMENTOS', hint: 'Ciudad inca en los Andes peruanos', source: 'default' },
  { phrase: 'CAFE CON LECHE', category: 'GASTRONOMÍA', hint: 'Desayuno español por excelencia', source: 'default' },
  { phrase: 'TORTILLA DE PATATAS', category: 'GASTRONOMÍA', hint: 'El debate es con o sin cebolla', source: 'default' },
  { phrase: 'PAELLA VALENCIANA', category: 'GASTRONOMÍA', hint: 'Arroz con pollo y conejo', source: 'default' },
  { phrase: 'PAN CON TOMATE', category: 'GASTRONOMÍA', hint: 'Pa amb tomàquet, aperitivo catalán', source: 'default' },
  { phrase: 'CIEN ANOS DE SOLEDAD', category: 'LITERATURA', hint: 'Obra cumbre de García Márquez', source: 'default' },
  { phrase: 'LA ODISEA', category: 'LITERATURA', hint: 'Las aventuras de Ulises en el Mediterráneo', source: 'default' },
  { phrase: 'HARRY POTTER Y LA PIEDRA FILOSOFAL', category: 'LITERATURA', hint: 'El primer libro del mago más famoso', source: 'default' },
  { phrase: 'EL PRINCIPITO', category: 'LITERATURA', hint: 'Saint-Exupéry y su pequeño viajero interplanetario', source: 'default' },
  { phrase: 'BEETHOVEN QUINTA SINFONIA', category: 'MÚSICA', hint: 'Ta-ta-ta-taaaan', source: 'default' },
  { phrase: 'BOHEMIAN RHAPSODY', category: 'MÚSICA', hint: 'Obra maestra de Freddie Mercury y Queen', source: 'default' },
  { phrase: 'LA BAMBA', category: 'MÚSICA', hint: 'Canción folclórica mexicana popularizada por Ritchie Valens', source: 'default' },
  { phrase: 'VINCENT VAN GOGH', category: 'ARTE', hint: 'Pintor postimpresionista de La noche estrellada', source: 'default' },
  { phrase: 'LA GIOCONDA', category: 'ARTE', hint: 'Retrato de Leonardo Da Vinci en el Louvre', source: 'default' },
  { phrase: 'EL GUERNICA', category: 'ARTE', hint: 'Mural de Picasso sobre el bombardeo de una ciudad vasca', source: 'default' },
  { phrase: 'REAL MADRID CAMPEON', category: 'DEPORTES', hint: 'Grito en el Bernabéu', source: 'default' },
  { phrase: 'RAFA NADAL REY DE LA TIERRA', category: 'DEPORTES', hint: 'El mejor tenista en Roland Garros', source: 'default' },
  { phrase: 'MICHAEL JORDAN SEIS ANILLOS', category: 'DEPORTES', hint: 'Leyenda de los Chicago Bulls', source: 'default' },
  { phrase: 'FORMULA UNO GRAN PREMIO', category: 'DEPORTES', hint: 'Carreras de coches a máxima velocidad', source: 'default' },
  { phrase: 'INTERNET DE LAS COSAS', category: 'TECNOLOGÍA', hint: 'Dispositivos conectados entre sí', source: 'default' },
  { phrase: 'INTELIGENCIA ARTIFICIAL', category: 'TECNOLOGÍA', hint: 'Máquinas que aprenden y razonan', source: 'default' },
  { phrase: 'REALIDAD AUMENTADA', category: 'TECNOLOGÍA', hint: 'Capas digitales sobre el mundo real', source: 'default' },
];

function normalizeKey(text: string): string {
  return text.toUpperCase().trim();
}

function loadPhrases(): Phrase[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Phrase[];
      }
    }
  } catch {
    // localStorage no disponible o JSON inválido — se usan las frases por defecto
  }
  return DEFAULT_PHRASES;
}

function savePhrases(phrases: Phrase[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  } catch {
    // Fallo silencioso si localStorage no está disponible
  }
}

function loadDeletedSet(): Set<string> {
  try {
    const stored = localStorage.getItem(DELETED_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) return new Set(parsed as string[]);
    }
  } catch {
    // Fallo silencioso
  }
  return new Set();
}

function addToDeletedSet(text: string): void {
  try {
    const set = loadDeletedSet();
    set.add(normalizeKey(text));
    localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
  } catch {
    // Fallo silencioso
  }
}

export function usePhrases() {
  const [phrases, setPhrases] = useState<Phrase[]>(loadPhrases);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const update = useCallback((updater: (prev: Phrase[]) => Phrase[]) => {
    setPhrases((prev) => {
      const next = updater(prev);
      savePhrases(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function syncOnlinePhrases() {
      setSyncStatus('loading');
      try {
        const response = await fetch(ONLINE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          setSyncStatus('error');
          return;
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          setSyncStatus('error');
          return;
        }

        const deletedSet = loadDeletedSet();

        setPhrases((prev) => {
          const existingKeys = new Set(prev.map((p) => normalizeKey(p.phrase)));
          const newPhrases: Phrase[] = [];

          for (const item of data) {
            if (
              typeof item !== 'object' ||
              item === null ||
              typeof (item as Record<string, unknown>).phrase !== 'string' ||
              typeof (item as Record<string, unknown>).category !== 'string' ||
              typeof (item as Record<string, unknown>).hint !== 'string'
            ) {
              continue;
            }

            const raw = item as { phrase: string; category: string; hint: string };
            const key = normalizeKey(raw.phrase);

            if (deletedSet.has(key)) continue;
            if (existingKeys.has(key)) continue;

            newPhrases.push({
              phrase: key,
              category: normalizeKey(raw.category),
              hint: raw.hint.trim(),
              source: 'online',
            });
          }

          if (newPhrases.length === 0) return prev;

          const merged = [...prev, ...newPhrases];
          savePhrases(merged);
          return merged;
        });

        setSyncStatus('done');
      } catch {
        clearTimeout(timeoutId);
        setSyncStatus('error');
      }
    }

    void syncOnlinePhrases();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const addPhrase = useCallback((phrase: string, category: string, hint: string) => {
    update((prev) => [
      ...prev,
      {
        phrase: phrase.toUpperCase().trim(),
        category: category.toUpperCase().trim(),
        hint: hint.trim(),
        source: 'user' as const,
      },
    ]);
  }, [update]);

  const deletePhrase = useCallback((index: number) => {
    update((prev) => {
      const target = prev[index];
      if (target && target.source !== 'user') {
        addToDeletedSet(target.phrase);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [update]);

  const editPhrase = useCallback((index: number, phrase: string, category: string, hint: string) => {
    update((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              phrase: phrase.toUpperCase().trim(),
              category: category.toUpperCase().trim(),
              hint: hint.trim(),
              source: p.source,
            }
          : p
      )
    );
  }, [update]);

  return { phrases, addPhrase, deletePhrase, editPhrase, syncStatus };
}
