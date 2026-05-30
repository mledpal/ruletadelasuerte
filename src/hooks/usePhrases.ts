import { useState, useCallback } from 'react';
import type { Phrase } from '../types/game';

const STORAGE_KEY = 'ruleta_phrases';

const DEFAULT_PHRASES: Phrase[] = [
  { phrase: 'LA RULETA DE LA FORTUNA', category: 'TELEVISIÓN', hint: 'Nombre del programa' },
  { phrase: 'EL SEÑOR DE LOS ANILLOS', category: 'PELÍCULAS', hint: 'Saga de fantasía protagonizada por Frodo' },
  { phrase: 'HAKUNA MATATA', category: 'PELÍCULAS', hint: 'Frase famosa de El Rey León' },
  { phrase: 'EN UN LUGAR DE LA MANCHA', category: 'LITERATURA', hint: 'Inicio de Don Quijote' },
  { phrase: 'QUE LA FUERZA TE ACOMPAÑE', category: 'PELÍCULAS', hint: 'Frase icónica de Star Wars' },
  { phrase: 'MAS VALE TARDE QUE NUNCA', category: 'REFRANES', hint: 'Justifica la demora' },
  { phrase: 'NO HAY MAL QUE POR BIEN NO VENGA', category: 'REFRANES', hint: 'Optimismo ante la adversidad' },
  { phrase: 'A QUIEN MADRUGA DIOS LE AYUDA', category: 'REFRANES', hint: 'Elogio de la madrugada' },
  { phrase: 'EL TIEMPO ES ORO', category: 'REFRANES', hint: 'El recurso más valioso' },
  { phrase: 'JUEGO DE TRONOS', category: 'TELEVISIÓN', hint: 'Serie épica de HBO basada en los libros de George R.R. Martin' },
  { phrase: 'LA CASA DE PAPEL', category: 'TELEVISIÓN', hint: 'Atraco al Banco de España' },
  { phrase: 'BREAKING BAD', category: 'TELEVISIÓN', hint: 'Walter White cocina metanfetamina' },
  { phrase: 'EL REY LEON', category: 'PELÍCULAS', hint: 'Simba recupera su reino' },
  { phrase: 'TITANIC', category: 'PELÍCULAS', hint: 'Jack y Rose en el barco más famoso del cine' },
  { phrase: 'EL PADRINO', category: 'PELÍCULAS', hint: 'Clásico de Coppola sobre la mafia italiana' },
  { phrase: 'FORREST GUMP', category: 'PELÍCULAS', hint: 'La vida es como una caja de bombones' },
  { phrase: 'BIENVENIDO MISTER MARSHALL', category: 'PELÍCULAS', hint: 'Comedia española de Berlanga' },
  { phrase: 'LA GRAN BARRERA DE CORAL', category: 'GEOGRAFÍA', hint: 'Ecosistema marino en Australia' },
  { phrase: 'TORRE EIFFEL', category: 'MONUMENTOS', hint: 'Símbolo de París construido por Gustave' },
  { phrase: 'LA SAGRADA FAMILIA', category: 'MONUMENTOS', hint: 'Basílica de Gaudí en Barcelona' },
  { phrase: 'MACHU PICCHU', category: 'MONUMENTOS', hint: 'Ciudad inca en los Andes peruanos' },
  { phrase: 'CAFE CON LECHE', category: 'GASTRONOMÍA', hint: 'Desayuno español por excelencia' },
  { phrase: 'TORTILLA DE PATATAS', category: 'GASTRONOMÍA', hint: 'El debate es con o sin cebolla' },
  { phrase: 'PAELLA VALENCIANA', category: 'GASTRONOMÍA', hint: 'Arroz con pollo y conejo' },
  { phrase: 'PAN CON TOMATE', category: 'GASTRONOMÍA', hint: 'Pa amb tomàquet, aperitivo catalán' },
  { phrase: 'CIEN ANOS DE SOLEDAD', category: 'LITERATURA', hint: 'Obra cumbre de García Márquez' },
  { phrase: 'LA ODISEA', category: 'LITERATURA', hint: 'Las aventuras de Ulises en el Mediterráneo' },
  { phrase: 'HARRY POTTER Y LA PIEDRA FILOSOFAL', category: 'LITERATURA', hint: 'El primer libro del mago más famoso' },
  { phrase: 'EL PRINCIPITO', category: 'LITERATURA', hint: 'Saint-Exupéry y su pequeño viajero interplanetario' },
  { phrase: 'BEETHOVEN QUINTA SINFONIA', category: 'MÚSICA', hint: 'Ta-ta-ta-taaaan' },
  { phrase: 'BOHEMIAN RHAPSODY', category: 'MÚSICA', hint: 'Obra maestra de Freddie Mercury y Queen' },
  { phrase: 'LA BAMBA', category: 'MÚSICA', hint: 'Canción folclórica mexicana popularizada por Ritchie Valens' },
  { phrase: 'VINCENT VAN GOGH', category: 'ARTE', hint: 'Pintor postimpresionista de La noche estrellada' },
  { phrase: 'LA GIOCONDA', category: 'ARTE', hint: 'Retrato de Leonardo Da Vinci en el Louvre' },
  { phrase: 'EL GUERNICA', category: 'ARTE', hint: 'Mural de Picasso sobre el bombardeo de una ciudad vasca' },
  { phrase: 'REAL MADRID CAMPEON', category: 'DEPORTES', hint: 'Grito en el Bernabéu' },
  { phrase: 'RAFA NADAL REY DE LA TIERRA', category: 'DEPORTES', hint: 'El mejor tenista en Roland Garros' },
  { phrase: 'MICHAEL JORDAN SEIS ANILLOS', category: 'DEPORTES', hint: 'Leyenda de los Chicago Bulls' },
  { phrase: 'FORMULA UNO GRAN PREMIO', category: 'DEPORTES', hint: 'Carreras de coches a máxima velocidad' },
  { phrase: 'INTERNET DE LAS COSAS', category: 'TECNOLOGÍA', hint: 'Dispositivos conectados entre sí' },
  { phrase: 'INTELIGENCIA ARTIFICIAL', category: 'TECNOLOGÍA', hint: 'Máquinas que aprenden y razonan' },
  { phrase: 'REALIDAD AUMENTADA', category: 'TECNOLOGÍA', hint: 'Capas digitales sobre el mundo real' },
];

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

export function usePhrases() {
  const [phrases, setPhrases] = useState<Phrase[]>(loadPhrases);

  const update = useCallback((updater: (prev: Phrase[]) => Phrase[]) => {
    setPhrases((prev) => {
      const next = updater(prev);
      savePhrases(next);
      return next;
    });
  }, []);

  const addPhrase = useCallback((phrase: string, category: string, hint: string) => {
    update((prev) => [
      ...prev,
      {
        phrase: phrase.toUpperCase().trim(),
        category: category.toUpperCase().trim(),
        hint: hint.trim(),
      },
    ]);
  }, [update]);

  const deletePhrase = useCallback((index: number) => {
    update((prev) => prev.filter((_, i) => i !== index));
  }, [update]);

  const editPhrase = useCallback((index: number, phrase: string, category: string, hint: string) => {
    update((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              phrase: phrase.toUpperCase().trim(),
              category: category.toUpperCase().trim(),
              hint: hint.trim(),
            }
          : p
      )
    );
  }, [update]);

  return { phrases, addPhrase, deletePhrase, editPhrase };
}
