import {
  Card,
  CardRank,
  NORMAL_RANKS,
  Rank,
  Seat,
  Suit,
} from "./types";

export const SUITS: Suit[] = ["spades", "hearts", "clubs", "diamonds"];

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const deck of [0, 1] as const) {
    for (const suit of SUITS) {
      for (const rank of NORMAL_RANKS) {
        cards.push({
          id: `${deck}-${suit}-${rank}`,
          rank,
          suit,
          deck,
        });
      }
    }
    cards.push({ id: `${deck}-joker-SJ`, rank: "SJ", suit: "joker", deck });
    cards.push({ id: `${deck}-joker-BJ`, rank: "BJ", suit: "joker", deck });
  }
  return cards;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(cards: Card[], seed: number): Card[] {
  const random = mulberry32(seed);
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function deal(seed: number): [Card[], Card[], Card[], Card[]] {
  const deck = shuffleDeck(createDeck(), seed);
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  deck.forEach((card, index) => hands[(index % 4) as Seat].push(card));
  return hands;
}

export function isWild(card: Card, level: Rank): boolean {
  return card.suit === "hearts" && card.rank === level;
}

export function rankStrength(rank: CardRank, level: Rank): number {
  if (rank === "BJ") return 16;
  if (rank === "SJ") return 15;
  if (rank === level) return 14;
  return NORMAL_RANKS.indexOf(rank as Rank) + 1;
}

export function naturalRankIndex(rank: CardRank): number {
  if (rank === "SJ") return 13;
  if (rank === "BJ") return 14;
  return NORMAL_RANKS.indexOf(rank as Rank);
}

export function sortHand(hand: Card[], level: Rank): Card[] {
  const suitOrder: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
    joker: 4,
  };
  return [...hand].sort((left, right) => {
    const strength = rankStrength(left.rank, level) - rankStrength(right.rank, level);
    if (strength !== 0) return strength;
    if (left.rank !== right.rank) {
      return naturalRankIndex(left.rank) - naturalRankIndex(right.rank);
    }
    return suitOrder[left.suit] - suitOrder[right.suit] || left.deck - right.deck;
  });
}

export function seatTeam(seat: Seat): 0 | 1 {
  return (seat % 2) as 0 | 1;
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

export function cardLabel(card: Card): string {
  if (card.rank === "BJ") return "大王";
  if (card.rank === "SJ") return "小王";
  return `${card.rank}`;
}

