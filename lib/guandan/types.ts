export const NORMAL_RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export type Rank = (typeof NORMAL_RANKS)[number];
export type Suit = "spades" | "hearts" | "clubs" | "diamonds" | "joker";
export type JokerRank = "SJ" | "BJ";
export type CardRank = Rank | JokerRank;

export interface Card {
  id: string;
  rank: CardRank;
  suit: Suit;
  deck: 0 | 1;
}

export type PatternType =
  | "single"
  | "pair"
  | "triple"
  | "threeWithPair"
  | "straight"
  | "threePairs"
  | "steelPlate"
  | "bomb"
  | "straightFlush"
  | "jokerBomb";

export interface Pattern {
  id: string;
  type: PatternType;
  cards: Card[];
  resolvedRanks: CardRank[];
  power: number;
  size: number;
  wildUsed: number;
  label: string;
}

export type Difficulty = "beginner" | "advanced" | "master";
export type Seat = 0 | 1 | 2 | 3;

export interface TurnRecord {
  id: number;
  seat: Seat;
  action: "play" | "pass";
  pattern?: Pattern;
  at: number;
  explanation?: DecisionExplanation;
}

export interface DecisionFactor {
  label: string;
  value: number;
  tone: "positive" | "neutral" | "negative";
}

export interface DecisionExplanation {
  headline: string;
  reason: string;
  consequence: string;
  partnerRead: string;
  confidence: number;
  quality: "精确" | "稳健" | "可行" | "冒险" | "失误";
  factors: DecisionFactor[];
  alternative?: {
    label: string;
    reason: string;
    delta: number;
  };
}

export interface GameState {
  seed: number;
  level: Rank;
  hands: [Card[], Card[], Card[], Card[]];
  currentSeat: Seat;
  target?: Pattern;
  targetSeat?: Seat;
  passCount: number;
  finished: Seat[];
  records: TurnRecord[];
  winnerTeam?: 0 | 1;
  levelGain?: 1 | 2 | 3;
  turn: number;
}

export interface ScoredMove {
  pattern?: Pattern;
  score: number;
  factors: DecisionFactor[];
  summary: string;
}

export interface ProgressSummary {
  games: number;
  wins: number;
  decisions: number;
  strongDecisions: number;
  trainingCompleted: number;
  rating: number;
  streak: number;
}

