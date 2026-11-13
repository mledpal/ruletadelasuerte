export interface Phrase {
  phrase: string;
  category: string;
  hint: string;
  source?: 'default' | 'online' | 'user';
}

export type CellState = 'hidden' | 'revealing' | 'visible' | 'highlighted';

export type WheelResult =
  | number
  | 'QUIEBRA'
  | 'PIERDE_TURNO'
  | 'COMODIN'
  | 'TODAS_VOCALES'
  | 'BOTE'
  | 'ANIBAL'
  | 'HIMILCE'
  | 'ESCIPION'
  | 'ASEDIO';

export type SpecialWheelResult =
  | 'QUIEBRA'
  | 'PIERDE_TURNO'
  | 'COMODIN'
  | 'TODAS_VOCALES'
  | 'BOTE'
  | 'ANIBAL'
  | 'HIMILCE'
  | 'ESCIPION'
  | 'ASEDIO';

export type CastuloToken = 'ANIBAL' | 'HIMILCE' | 'ESCIPION';

export type TurnPhase = 'spin' | 'consonant' | 'vowels' | 'next-action';

export interface LetterCell {
  id: string;
  letter: string | null;
  state: CellState;
  position: number;
}

export interface Player {
  id: number;
  name: string;
  score: number;
  wallet: number;
  hasWildcard: boolean;
  /** Gajo «Todas las vocales» guardado en el atril: descubre todas las vocales al usarlo */
  hasAllVowels: boolean;
  hasAnibal: boolean;
  hasHimilce: boolean;
  hasEscipion: boolean;
}

export interface RevealResult {
  success: boolean;
  count: number;
}

export interface GameConfig {
  letterRevealDelay: number;
  turnChangeDelay: number;
  victoryRevealDelay: number;
  totalRounds: number;
  /** Segundos para pulsar la consonante tras girar la ruleta (0 = sin límite) */
  consonantTimeLimit: number;
}

/** Posición en la que se detuvo la ruleta, para que el siguiente giro parta de ahí */
export interface WheelStop {
  rotation: number; // grados en sentido horario, normalizados a [0, 360)
  value: WheelResult;
  label: string;
}

export interface GameState {
  /** Identificador único de la partida (evita guardarla dos veces en el ranking) */
  gameId: string;
  phrase: string;
  hint: string;
  category: string;
  cells: LetterCell[];
  currentPlayer: number;
  players: Player[];
  wheelValue: number;
  lastWheelResult: WheelResult | null;
  hasSpunWheel: boolean;
  turnPhase: TurnPhase;
  isRevealing: boolean;
  roundComplete: boolean;
  currentRound: number;
  totalRounds: number;
  gameComplete: boolean;
  wildcardAvailable: boolean;
  wildcardEnabled: boolean;
  config: GameConfig;
  guessedLetters: string[];
  boteAmount: number;
  boteWinnerId: number | null;
  boteRoundEnabled: boolean;
  castuloMode: boolean;
  wheelStop: WheelStop | null;
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: { playerNames: string[]; rounds: number; wildcardEnabled: boolean; boteRoundEnabled: boolean; castuloMode: boolean; consonantTimeLimit: number } }
  | { type: 'SET_PHRASE'; payload: { phrase: string; hint: string; category: string } }
  | { type: 'UPDATE_CELL'; payload: { id: string; state: CellState } }
  | { type: 'SET_REVEALING'; payload: boolean }
  | { type: 'SPIN_WHEEL'; payload: number }
  | { type: 'SPIN_WHEEL_SPECIAL'; payload: SpecialWheelResult }
  | { type: 'RESET_WHEEL' }
  | { type: 'SET_WHEEL_STOP'; payload: WheelStop }
  | { type: 'ADD_SCORE'; payload: { playerId: number; amount: number } }
  | { type: 'DEDUCT_SCORE'; payload: { playerId: number; amount: number } }
  | { type: 'BANKRUPT'; payload: number }
  | { type: 'NEXT_TURN' }
  | { type: 'USE_WILDCARD'; payload: number }
  | { type: 'AWARD_WILDCARD'; payload: number }
  | { type: 'AWARD_ALL_VOWELS'; payload: number }
  | { type: 'USE_ALL_VOWELS'; payload: number }
  | { type: 'COMPLETE_ROUND'; payload: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'COMPLETE_GAME' }
  | { type: 'SET_TURN_PHASE'; payload: TurnPhase }
  | { type: 'REVEAL_ALL' }
  | { type: 'RESET_GAME' }
  | { type: 'GUESS_LETTER'; payload: string }
  | { type: 'WIN_BOTE'; payload: number }
  | { type: 'AWARD_TOKEN'; payload: { playerId: number; token: CastuloToken } }
  | { type: 'USE_ESCIPION'; payload: { sourceId: number; targetId: number } }
  | { type: 'ASEDIO_TRANSFER'; payload: { sourceId: number; targetId: number } };

/** Tabla del ranking global: el modo Cástulo tiene la suya propia */
export type RankingMode = 'normal' | 'castulo';

export interface RankingEntry {
  gameId: string;
  name: string;
  score: number;
  rounds: number;
  createdAt: string;
}
