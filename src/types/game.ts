export interface Phrase {
  phrase: string;
  category: string;
  hint: string;
}

export type CellState = 'hidden' | 'revealing' | 'visible' | 'highlighted';

export type WheelResult = number | 'QUIEBRA' | 'PIERDE_TURNO' | 'COMODIN';

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
}

export interface GameState {
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
  config: GameConfig;
  guessedLetters: string[];
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: number }
  | { type: 'SET_PHRASE'; payload: { phrase: string; hint: string; category: string } }
  | { type: 'UPDATE_CELL'; payload: { id: string; state: CellState } }
  | { type: 'SET_REVEALING'; payload: boolean }
  | { type: 'SPIN_WHEEL'; payload: number }
  | { type: 'SPIN_WHEEL_SPECIAL'; payload: 'QUIEBRA' | 'PIERDE_TURNO' | 'COMODIN' }
  | { type: 'RESET_WHEEL' }
  | { type: 'ADD_SCORE'; payload: { playerId: number; amount: number } }
  | { type: 'DEDUCT_SCORE'; payload: { playerId: number; amount: number } }
  | { type: 'BANKRUPT'; payload: number }
  | { type: 'NEXT_TURN' }
  | { type: 'USE_WILDCARD'; payload: number }
  | { type: 'AWARD_WILDCARD'; payload: number }
  | { type: 'COMPLETE_ROUND'; payload: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'COMPLETE_GAME' }
  | { type: 'SET_TURN_PHASE'; payload: TurnPhase }
  | { type: 'REVEAL_ALL' }
  | { type: 'RESET_GAME' }
  | { type: 'GUESS_LETTER'; payload: string };
