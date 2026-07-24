import { describe, expect, it } from "vitest";
import { createDeck, deal } from "../lib/guandan/cards";
import { createGame, pass, play } from "../lib/guandan/game";
import {
  canBeat,
  enumeratePatterns,
  isBomb,
  legalPatterns,
} from "../lib/guandan/patterns";
import {
  chooseAiMove,
  explainMove,
  scoreLegalMoves,
} from "../lib/guandan/strategy";
import {
  questionForSession,
  trainingBank,
  trainingBankStats,
  trainingDifficultyMeta,
  trainingTopics,
} from "../lib/guandan/training";
import { Card, CardRank, GameState, Pattern, Rank, Suit } from "../lib/guandan/types";

let id = 0;

function card(rank: CardRank, suit: Suit = "spades", deck: 0 | 1 = 0): Card {
  id += 1;
  return { id: `test-${id}`, rank, suit, deck };
}

function cards(
  ranks: CardRank[],
  suit: Suit = "spades"
): Card[] {
  return ranks.map((rank, index) => card(rank, suit, (index % 2) as 0 | 1));
}

function find(
  hand: Card[],
  level: Rank,
  type: Pattern["type"],
  size?: number
): Pattern {
  const pattern = enumeratePatterns(hand, level).find(
    (candidate) =>
      candidate.type === type &&
      (size === undefined || candidate.size === size)
  );
  expect(pattern, `应当生成 ${type}`).toBeDefined();
  return pattern as Pattern;
}

describe("双副牌与发牌", () => {
  it("生成 108 张互不重复的牌", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((candidate) => candidate.id)).size).toBe(108);
  });

  it("固定种子发出四手 27 张且结果可复现", () => {
    const first = deal(20260722);
    const second = deal(20260722);
    expect(first.map((hand) => hand.length)).toEqual([27, 27, 27, 27]);
    expect(first).toEqual(second);
    expect(new Set(first.flat().map((candidate) => candidate.id)).size).toBe(108);
  });
});

describe("竞技牌型边界", () => {
  it("A2345 是最低顺子", () => {
    const hand = cards(["A", "2", "3", "4", "5"]);
    expect(find(hand, "7", "straight").resolvedRanks).toEqual([
      "A",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("23456 不能组成顺子", () => {
    const hand = cards(["2", "3", "4", "5", "6"]);
    expect(
      enumeratePatterns(hand, "7").some((pattern) => pattern.type === "straight")
    ).toBe(false);
  });

  it("AABBCC 型 A2233 合法，而 223344 不合法", () => {
    const low = cards(["A", "A", "2", "2", "3", "3"]);
    const invalid = cards(["2", "2", "3", "3", "4", "4"]);
    expect(find(low, "7", "threePairs").resolvedRanks).toEqual([
      "A",
      "A",
      "2",
      "2",
      "3",
      "3",
    ]);
    expect(
      enumeratePatterns(invalid, "7").some(
        (pattern) => pattern.type === "threePairs"
      )
    ).toBe(false);
  });

  it("两张红桃级牌既能作为逢人配，也能作为级牌对子", () => {
    const hand = [
      card("7", "hearts", 0),
      card("7", "hearts", 1),
    ];
    const pair = find(hand, "7", "pair");
    expect(pair.resolvedRanks).toEqual(["7", "7"]);
    expect(pair.wildUsed).toBe(2);
  });

  it("逢人配可以补成四张炸弹", () => {
    const hand = [
      card("9", "spades", 0),
      card("9", "spades", 1),
      card("9", "clubs", 0),
      card("7", "hearts", 0),
    ];
    const bomb = find(hand, "7", "bomb", 4);
    expect(bomb.resolvedRanks).toEqual(["9", "9", "9", "9"]);
    expect(bomb.wildUsed).toBe(1);
  });

  it("六炸大于同花顺，同花顺大于五炸，五炸大于四炸", () => {
    const four = find(cards(["4", "4", "4", "4"]), "7", "bomb", 4);
    const five = find(cards(["5", "5", "5", "5", "5"]), "7", "bomb", 5);
    const six = find(cards(["6", "6", "6", "6", "6", "6"]), "7", "bomb", 6);
    const straightFlush = find(
      cards(["6", "7", "8", "9", "10"], "hearts"),
      "2",
      "straightFlush"
    );
    expect(canBeat(five, four)).toBe(true);
    expect(canBeat(straightFlush, five)).toBe(true);
    expect(canBeat(six, straightFlush)).toBe(true);
    expect(isBomb(straightFlush)).toBe(true);
  });

  it("普通牌型只能用同型同张数或炸弹压制", () => {
    const pairNine = find(cards(["9", "9"]), "7", "pair");
    const pairTen = find(cards(["10", "10"]), "7", "pair");
    const triple = find(cards(["J", "J", "J"]), "7", "triple");
    const bomb = find(cards(["3", "3", "3", "3"]), "7", "bomb");
    expect(canBeat(pairTen, pairNine)).toBe(true);
    expect(canBeat(triple, pairNine)).toBe(false);
    expect(canBeat(bomb, pairNine)).toBe(true);
  });
});

describe("轮次、接风与名次", () => {
  function compactState(hands: GameState["hands"]): GameState {
    return {
      seed: 9,
      level: "7",
      hands,
      currentSeat: 0,
      passCount: 0,
      finished: [],
      records: [],
      turn: 0,
    };
  }

  it("常规一轮需要其余三家全部过牌才重置", () => {
    const state = compactState([
      cards(["3", "4"]),
      cards(["5", "6"]),
      cards(["7", "8"]),
      cards(["9", "10"]),
    ]);
    const opener = find(state.hands[0], state.level, "single");
    const afterPlay = play(state, 0, opener);
    const afterOne = pass(afterPlay, 1);
    const afterTwo = pass(afterOne, 2);
    expect(afterTwo.target).toBeDefined();
    const afterThree = pass(afterTwo, 3);
    expect(afterThree.target).toBeUndefined();
    expect(afterThree.currentSeat).toBe(0);
  });

  it("头游出完后仍给其余三家完整接牌机会，最终由搭档接风", () => {
    const state = compactState([
      cards(["3"]),
      cards(["4", "5"]),
      cards(["6", "7"]),
      cards(["8", "9"]),
    ]);
    const opener = find(state.hands[0], state.level, "single");
    const afterFinish = play(state, 0, opener);
    expect(afterFinish.finished).toEqual([0]);
    const afterOne = pass(afterFinish, 1);
    const afterTwo = pass(afterOne, 2);
    expect(afterTwo.currentSeat).toBe(3);
    expect(afterTwo.target).toBeDefined();
    const afterThree = pass(afterTwo, 3);
    expect(afterThree.currentSeat).toBe(2);
    expect(afterThree.target).toBeUndefined();
  });

  it("同队前两名立即按双下结束并升三级", () => {
    const state = compactState([
      cards(["3"]),
      cards(["4", "5"]),
      cards(["6"]),
      cards(["7", "8"]),
    ]);
    const first = play(state, 0, find(state.hands[0], "7", "single"));
    const secondReady: GameState = {
      ...first,
      currentSeat: 2,
      target: undefined,
      targetSeat: undefined,
      passCount: 0,
    };
    const result = play(
      secondReady,
      2,
      find(secondReady.hands[2], "7", "single")
    );
    expect(result.winnerTeam).toBe(0);
    expect(result.levelGain).toBe(3);
    expect(result.finished.slice(0, 2)).toEqual([0, 2]);
  });
});

describe("AI 合法性与性能", () => {
  it("实时教练给出依据、风险、下一步和可试选路线", () => {
    const state = createGame(20260724, "7");
    const candidates = scoreLegalMoves(state, 0, "master");
    expect(candidates.length).toBeGreaterThan(2);
    const explanation = explainMove(state, 0, candidates[0].pattern);
    expect(explanation.evidence.length).toBeGreaterThanOrEqual(4);
    expect(explanation.risks.length).toBeGreaterThanOrEqual(1);
    expect(explanation.nextSteps).toHaveLength(3);
    expect(explanation.reason).toContain("综合评分");
    expect(explanation.partnerRead).toContain("搭档");
  });

  it("AI 在完整模拟中始终选择合法动作", () => {
    for (const seed of [11, 97, 2026]) {
      let state = createGame(seed, "7");
      let guard = 0;
      while (state.winnerTeam === undefined && guard < 500) {
        const seat = state.currentSeat;
        const legal = legalPatterns(state.hands[seat], state.target, state.level);
        const choice = chooseAiMove(state, seat, "master");
        if (choice.pattern) {
          expect(legal.some((pattern) => pattern.id === choice.pattern?.id)).toBe(
            true
          );
          state = play(state, seat, choice.pattern);
        } else {
          expect(state.target).toBeDefined();
          state = pass(state, seat);
        }
        guard += 1;
      }
      expect(state.winnerTeam).toBeDefined();
      expect(guard).toBeLessThan(500);
    }
  }, 20_000);

  it("100 手牌型枚举在交互预算内完成", () => {
    const started = performance.now();
    let total = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const hands = deal(seed);
      for (const hand of hands) {
        total += enumeratePatterns(hand, "7").length;
      }
    }
    const elapsed = performance.now() - started;
    expect(total).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(2500);
  });
});

describe("分层训练题库", () => {
  it("题库达到三个原始题目的两个至三个数量级扩充", () => {
    expect(trainingBank.length).toBeGreaterThanOrEqual(1500);
    expect(trainingBankStats.total).toBe(trainingBank.length);
    for (const difficulty of Object.keys(trainingDifficultyMeta)) {
      expect(
        trainingBankStats.byDifficulty[
          difficulty as keyof typeof trainingBankStats.byDifficulty
        ]
      ).toBeGreaterThanOrEqual(300);
    }
    for (const topic of trainingTopics) {
      expect(trainingBankStats.byTopic[topic]).toBeGreaterThanOrEqual(100);
    }
  });

  it("题目编号与选项稳定且没有重复答案", () => {
    expect(new Set(trainingBank.map((question) => question.id)).size).toBe(
      trainingBank.length
    );
    for (const question of trainingBank) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size, question.id).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(4);
      expect(question.options[question.answer]).toBeTruthy();
      expect(question.hint.length).toBeGreaterThan(6);
      expect(question.explanation.length).toBeGreaterThan(8);
    }
  });

  it("所有带牌型标注的题目都能由正式规则引擎验证", () => {
    const patternQuestions = trainingBank.filter(
      (question) => question.expectedPatternType
    );
    expect(patternQuestions.length).toBeGreaterThanOrEqual(300);
    for (const question of patternQuestions) {
      const selected = new Set(question.cards.map((candidate) => candidate.id));
      const valid = enumeratePatterns(question.cards, question.level).some(
        (pattern) =>
          pattern.type === question.expectedPatternType &&
          pattern.cards.length === question.cards.length &&
          pattern.cards.every((candidate) => selected.has(candidate.id))
      );
      expect(valid, question.id).toBe(true);
    }
  });

  it("每个难度只开放真实有题的主题", () => {
    for (const difficulty of Object.keys(trainingDifficultyMeta)) {
      const typedDifficulty =
        difficulty as keyof typeof trainingBankStats.byDifficultyAndTopic;
      const total = Object.values(
        trainingBankStats.byDifficultyAndTopic[typedDifficulty]
      ).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(trainingBankStats.byDifficulty[typedDifficulty]);
    }
  });

  it("一次训练会遍历完整题池后才重复", () => {
    const pool = trainingBank.filter(
      (question) => question.difficulty === "foundation"
    );
    for (const seed of [0, 1, 41, 2026]) {
      const ids = Array.from({ length: pool.length }, (_, index) =>
        questionForSession(pool, index, seed).id
      );
      expect(new Set(ids).size).toBe(pool.length);
      expect(questionForSession(pool, pool.length, seed).id).toBe(ids[0]);
    }
  });

  it("空题池不再悄悄回退到固定首题", () => {
    expect(() => questionForSession([], 0, 1)).toThrow("训练题池不能为空");
  });
});
