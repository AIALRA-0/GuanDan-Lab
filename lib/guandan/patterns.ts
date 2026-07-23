import {
  Card,
  CardRank,
  Pattern,
  PatternType,
  Rank,
  Suit,
} from "./types";
import { isWild, naturalRankIndex, rankStrength } from "./cards";

const TYPE_LABELS: Record<PatternType, string> = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  threeWithPair: "三带二",
  straight: "顺子",
  threePairs: "三连对",
  steelPlate: "钢板",
  bomb: "炸弹",
  straightFlush: "同花顺",
  jokerBomb: "四王炸",
};

const WINDOWS: Rank[][] = [
  ["A", "2", "3", "4", "5"],
  ["3", "4", "5", "6", "7"],
  ["4", "5", "6", "7", "8"],
  ["5", "6", "7", "8", "9"],
  ["6", "7", "8", "9", "10"],
  ["7", "8", "9", "10", "J"],
  ["8", "9", "10", "J", "Q"],
  ["9", "10", "J", "Q", "K"],
  ["10", "J", "Q", "K", "A"],
];

const PAIR_WINDOWS: Rank[][] = [
  ["A", "2", "3"],
  ["3", "4", "5"],
  ["4", "5", "6"],
  ["5", "6", "7"],
  ["6", "7", "8"],
  ["7", "8", "9"],
  ["8", "9", "10"],
  ["9", "10", "J"],
  ["10", "J", "Q"],
  ["J", "Q", "K"],
  ["Q", "K", "A"],
];

const TRIPLE_WINDOWS: Rank[][] = [
  ["A", "2"],
  ["2", "3"],
  ["3", "4"],
  ["4", "5"],
  ["5", "6"],
  ["6", "7"],
  ["7", "8"],
  ["8", "9"],
  ["9", "10"],
  ["10", "J"],
  ["J", "Q"],
  ["Q", "K"],
  ["K", "A"],
];

function choose<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  const result: T[][] = [];
  const walk = (start: number, selected: T[]) => {
    if (selected.length === count) {
      result.push([...selected]);
      return;
    }
    for (
      let index = start;
      index <= items.length - (count - selected.length);
      index += 1
    ) {
      selected.push(items[index]);
      walk(index + 1, selected);
      selected.pop();
    }
  };
  walk(0, []);
  return result;
}

function patternId(type: PatternType, cards: Card[], resolved: CardRank[]): string {
  return `${type}:${cards
    .map((card) => card.id)
    .sort()
    .join(",")}:${resolved.join(",")}`;
}

function sequencePower(ranks: Rank[]): number {
  const key = ranks.join("-");
  if (key === "A-2-3-4-5" || key === "A-2-3" || key === "A-2") return 4;
  return naturalRankIndex(ranks.at(-1) ?? "2") + 1;
}

function createPattern(
  type: PatternType,
  cards: Card[],
  resolvedRanks: CardRank[],
  power: number,
  wildUsed: number
): Pattern {
  return {
    id: patternId(type, cards, resolvedRanks),
    type,
    cards,
    resolvedRanks,
    power,
    size: cards.length,
    wildUsed,
    label: `${TYPE_LABELS[type]} · ${
      type === "jokerBomb"
        ? "最高"
        : type === "bomb"
          ? `${cards.length} 张 ${resolvedRanks[0]}`
          : resolvedRanks.join(" ")
    }`,
  };
}

function groupNatural(cards: Card[], level: Rank): Map<CardRank, Card[]> {
  const result = new Map<CardRank, Card[]>();
  for (const card of cards) {
    if (isWild(card, level)) continue;
    const bucket = result.get(card.rank) ?? [];
    bucket.push(card);
    result.set(card.rank, bucket);
  }
  return result;
}

function dedupe(patterns: Pattern[]): Pattern[] {
  return [...new Map(patterns.map((pattern) => [pattern.id, pattern])).values()];
}

function buildSameRankPatterns(
  natural: Map<CardRank, Card[]>,
  wilds: Card[],
  count: 1 | 2 | 3,
  type: "single" | "pair" | "triple",
  level: Rank
): Pattern[] {
  const output: Pattern[] = [];
  if (wilds.length >= count) {
    for (const selectedWilds of choose(wilds, count)) {
      output.push(
        createPattern(
          type,
          selectedWilds,
          Array(count).fill(level),
          rankStrength(level, level),
          count
        )
      );
    }
  }
  for (const [rank, cards] of natural) {
    for (let wildCount = 0; wildCount <= Math.min(wilds.length, count - 1); wildCount += 1) {
      const naturalCount = count - wildCount;
      for (const naturalCards of choose(cards, naturalCount)) {
        for (const selectedWilds of choose(wilds, wildCount)) {
          output.push(
            createPattern(
              type,
              [...naturalCards, ...selectedWilds],
              Array(count).fill(rank),
              rankStrength(rank, level),
              wildCount
            )
          );
        }
      }
    }
  }
  return output;
}

function buildWindowPatterns(
  natural: Map<CardRank, Card[]>,
  wilds: Card[],
  windows: Rank[][],
  perRank: number,
  type: "straight" | "threePairs" | "steelPlate"
): Pattern[] {
  const output: Pattern[] = [];
  for (const window of windows) {
    const candidates: { cards: Card[]; missing: number; resolved: CardRank[] }[] = [
      { cards: [], missing: 0, resolved: [] },
    ];
    for (const rank of window) {
      const options: { cards: Card[]; wilds: number }[] = [];
      const rankCards = natural.get(rank) ?? [];
      for (let wildCount = 0; wildCount <= Math.min(wilds.length, perRank); wildCount += 1) {
        const naturalCount = perRank - wildCount;
        for (const selected of choose(rankCards, naturalCount)) {
          options.push({ cards: selected, wilds: wildCount });
        }
      }
      const next: typeof candidates = [];
      for (const base of candidates) {
        for (const option of options) {
          if (base.missing + option.wilds > wilds.length) continue;
          next.push({
            cards: [...base.cards, ...option.cards],
            missing: base.missing + option.wilds,
            resolved: [...base.resolved, ...Array(perRank).fill(rank)],
          });
        }
      }
      candidates.splice(0, candidates.length, ...next);
    }
    for (const candidate of candidates) {
      for (const selectedWilds of choose(wilds, candidate.missing)) {
        output.push(
          createPattern(
            type,
            [...candidate.cards, ...selectedWilds],
            candidate.resolved,
            sequencePower(window),
            candidate.missing
          )
        );
      }
    }
  }
  return output;
}

function buildStraightFlushes(
  natural: Map<CardRank, Card[]>,
  wilds: Card[]
): Pattern[] {
  const output: Pattern[] = [];
  const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
  for (const suit of suits) {
    for (const window of WINDOWS) {
      const selected: Card[] = [];
      let missing = 0;
      for (const rank of window) {
        const card = (natural.get(rank) ?? []).find((candidate) => candidate.suit === suit);
        if (card) selected.push(card);
        else missing += 1;
      }
      if (missing > wilds.length) continue;
      for (const selectedWilds of choose(wilds, missing)) {
        output.push(
          createPattern(
            "straightFlush",
            [...selected, ...selectedWilds],
            window,
            sequencePower(window),
            missing
          )
        );
      }
    }
  }
  return output;
}

function buildBombs(
  natural: Map<CardRank, Card[]>,
  wilds: Card[],
  level: Rank
): Pattern[] {
  const output: Pattern[] = [];
  for (const [rank, cards] of natural) {
    if (rank === "SJ" || rank === "BJ") continue;
    for (let total = 4; total <= Math.min(10, cards.length + wilds.length); total += 1) {
      for (let wildCount = 0; wildCount <= Math.min(wilds.length, total - 1); wildCount += 1) {
        const naturalCount = total - wildCount;
        if (naturalCount > cards.length) continue;
        for (const selectedNatural of choose(cards, naturalCount)) {
          for (const selectedWilds of choose(wilds, wildCount)) {
            output.push(
              createPattern(
                "bomb",
                [...selectedNatural, ...selectedWilds],
                Array(total).fill(rank),
                rankStrength(rank, level),
                wildCount
              )
            );
          }
        }
      }
    }
  }
  return output;
}

function buildFullHouses(
  natural: Map<CardRank, Card[]>,
  wilds: Card[],
  level: Rank
): Pattern[] {
  const triples = buildSameRankPatterns(natural, wilds, 3, "triple", level);
  const pairs = buildSameRankPatterns(natural, wilds, 2, "pair", level);
  const output: Pattern[] = [];
  for (const triple of triples) {
    for (const pair of pairs) {
      if (triple.resolvedRanks[0] === pair.resolvedRanks[0]) continue;
      const ids = new Set([...triple.cards, ...pair.cards].map((card) => card.id));
      if (ids.size !== 5) continue;
      output.push(
        createPattern(
          "threeWithPair",
          [...triple.cards, ...pair.cards],
          [...triple.resolvedRanks, ...pair.resolvedRanks],
          triple.power,
          triple.wildUsed + pair.wildUsed
        )
      );
    }
  }
  return output;
}

export function enumeratePatterns(hand: Card[], level: Rank): Pattern[] {
  const wilds = hand.filter((card) => isWild(card, level));
  const natural = groupNatural(hand, level);
  const patterns: Pattern[] = [];

  for (const card of hand) {
    patterns.push(
      createPattern(
        "single",
        [card],
        [card.rank],
        rankStrength(card.rank, level),
        isWild(card, level) ? 1 : 0
      )
    );
  }
  patterns.push(...buildSameRankPatterns(natural, wilds, 2, "pair", level));
  patterns.push(...buildSameRankPatterns(natural, wilds, 3, "triple", level));
  patterns.push(...buildFullHouses(natural, wilds, level));
  patterns.push(...buildWindowPatterns(natural, wilds, WINDOWS, 1, "straight"));
  patterns.push(...buildWindowPatterns(natural, wilds, PAIR_WINDOWS, 2, "threePairs"));
  patterns.push(...buildWindowPatterns(natural, wilds, TRIPLE_WINDOWS, 3, "steelPlate"));
  patterns.push(...buildBombs(natural, wilds, level));
  patterns.push(...buildStraightFlushes(natural, wilds));

  const jokers = hand.filter((card) => card.rank === "SJ" || card.rank === "BJ");
  if (jokers.length === 4) {
    patterns.push(
      createPattern("jokerBomb", jokers, jokers.map((card) => card.rank), 99, 0)
    );
  }

  return dedupe(patterns);
}

function bombTier(pattern: Pattern): number {
  if (pattern.type === "jokerBomb") return 100;
  if (pattern.type === "straightFlush") return 70;
  if (pattern.type !== "bomb") return 0;
  if (pattern.size >= 6) return 80 + pattern.size;
  if (pattern.size === 5) return 60;
  return 50;
}

export function isBomb(pattern: Pattern): boolean {
  return pattern.type === "bomb" || pattern.type === "straightFlush" || pattern.type === "jokerBomb";
}

export function comparePatterns(left: Pattern, right: Pattern): number {
  const leftBomb = bombTier(left);
  const rightBomb = bombTier(right);
  if (leftBomb || rightBomb) {
    if (!leftBomb) return -1;
    if (!rightBomb) return 1;
    if (leftBomb !== rightBomb) return leftBomb - rightBomb;
    if (left.type === "bomb" && right.type === "bomb" && left.size !== right.size) {
      return left.size - right.size;
    }
    return left.power - right.power;
  }
  if (left.type !== right.type || left.size !== right.size) return -1;
  return left.power - right.power;
}

export function canBeat(candidate: Pattern, target?: Pattern): boolean {
  if (!target) return true;
  return comparePatterns(candidate, target) > 0;
}

export function findSelectedPattern(
  hand: Card[],
  selectedIds: string[],
  level: Rank
): Pattern | undefined {
  const key = [...selectedIds].sort().join(",");
  return enumeratePatterns(hand, level).find(
    (pattern) => pattern.cards.map((card) => card.id).sort().join(",") === key
  );
}

export function legalPatterns(hand: Card[], target: Pattern | undefined, level: Rank): Pattern[] {
  return enumeratePatterns(hand, level)
    .filter((pattern) => canBeat(pattern, target))
    .sort((left, right) => {
      const leftBomb = isBomb(left) ? 1 : 0;
      const rightBomb = isBomb(right) ? 1 : 0;
      return leftBomb - rightBomb || left.size - right.size || left.power - right.power;
    });
}

export function patternTypeLabel(type: PatternType): string {
  return TYPE_LABELS[type];
}
