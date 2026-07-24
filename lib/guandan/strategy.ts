import { partnerOf, rankStrength, seatTeam } from "./cards";
import { isBomb, legalPatterns, patternTypeLabel } from "./patterns";
import {
  DecisionExplanation,
  Difficulty,
  GameState,
  Pattern,
  ScoredMove,
  Seat,
} from "./types";

const seatDisplayNames: Record<Seat, string> = {
  0: "你",
  1: "北家",
  2: "搭档",
  3: "南家",
};

function nextActiveSeat(state: GameState, from: Seat): Seat {
  let seat = ((from + 1) % 4) as Seat;
  while (state.finished.includes(seat)) seat = ((seat + 1) % 4) as Seat;
  return seat;
}

function deterministicNoise(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000 - 0.5;
}

function scorePattern(
  state: GameState,
  seat: Seat,
  pattern: Pattern,
  difficulty: Difficulty
): ScoredMove {
  const remaining = state.hands[seat].length - pattern.cards.length;
  const partner = partnerOf(seat);
  const nextSeat = nextActiveSeat(state, seat);
  const nextRest = state.hands[nextSeat].length;
  const partnerRest = state.hands[partner].length;
  const targetIsPartner =
    state.targetSeat !== undefined && seatTeam(state.targetSeat) === seatTeam(seat);
  const bomb = isBomb(pattern);
  const controlCost = pattern.power / 5;
  const structureGain = Math.max(0, pattern.cards.length - 1) * 2.4;
  const finishBonus = remaining === 0 ? 36 : remaining <= 2 ? 10 : remaining <= 5 ? 4 : 0;
  const dangerBonus =
    seatTeam(nextSeat) !== seatTeam(seat) && nextRest <= 3
      ? Math.max(0, 9 - nextRest * 2)
      : 0;
  const partnerPenalty =
    targetIsPartner && partnerRest <= 8 && remaining > 0 && nextRest > 3 ? -10 : 0;
  const bombPenalty = bomb && remaining > 0 && nextRest > 3 ? -8 : 0;
  const wildPenalty = pattern.wildUsed * 1.7;
  const combinationBonus =
    pattern.type === "straight" ||
    pattern.type === "threePairs" ||
    pattern.type === "steelPlate" ||
    pattern.type === "threeWithPair"
      ? 2.8
      : 0;
  const leadEfficiency = state.target ? 0 : pattern.cards.length * 0.8;

  let noise = 0;
  if (difficulty === "beginner") {
    noise = deterministicNoise(`${state.seed}:${state.turn}:${pattern.id}`) * 12;
  } else if (difficulty === "advanced") {
    noise = deterministicNoise(`${state.seed}:${state.turn}:${pattern.id}`) * 3;
  }

  const score =
    structureGain +
    finishBonus +
    dangerBonus +
    partnerPenalty +
    bombPenalty -
    wildPenalty -
    controlCost +
    combinationBonus +
    leadEfficiency +
    noise;

  return {
    pattern,
    score,
    factors: [
      {
        label: "减少手数",
        value: Math.round((structureGain + leadEfficiency) * 10) / 10,
        tone: structureGain > 5 ? "positive" : "neutral",
      },
      {
        label: "保留控制",
        value: Math.round((-controlCost - wildPenalty) * 10) / 10,
        tone: controlCost + wildPenalty > 4 ? "negative" : "neutral",
      },
      {
        label: "搭档协同",
        value: partnerPenalty,
        tone: partnerPenalty < 0 ? "negative" : "neutral",
      },
      {
        label: "残局压力",
        value: finishBonus + dangerBonus,
        tone: finishBonus + dangerBonus > 0 ? "positive" : "neutral",
      },
    ],
    summary:
      remaining === 0
        ? "直接走完手牌"
        : bomb && bombPenalty < 0
          ? "能够压制，但会提前消耗炸弹"
          : targetIsPartner && partnerPenalty < 0
            ? "会盖住搭档已经取得的牌权"
            : `一次处理 ${pattern.cards.length} 张牌`,
  };
}

export function scoreLegalMoves(
  state: GameState,
  seat: Seat,
  difficulty: Difficulty = "master"
): ScoredMove[] {
  const patterns = legalPatterns(state.hands[seat], state.target, state.level);
  const scored = patterns.map((pattern) =>
    scorePattern(state, seat, pattern, difficulty)
  );

  if (state.target) {
    const targetIsPartner =
      state.targetSeat !== undefined && seatTeam(state.targetSeat) === seatTeam(seat);
    const nextSeat = nextActiveSeat(state, seat);
    const nextRest = state.hands[nextSeat].length;
    scored.push({
      pattern: undefined,
      score: targetIsPartner && nextRest > 3 ? 7 : nextRest <= 2 ? -7 : -1,
      factors: [
        {
          label: "保留牌力",
          value: 4,
          tone: "positive",
        },
        {
          label: "放弃牌权",
          value: nextRest <= 2 ? -9 : -2,
          tone: nextRest <= 2 ? "negative" : "neutral",
        },
        {
          label: "搭档协同",
          value: targetIsPartner ? 5 : 0,
          tone: targetIsPartner ? "positive" : "neutral",
        },
      ],
      summary: targetIsPartner ? "让搭档继续控制本轮" : "保留组合等待更合适的时机",
    });
  }

  return scored.sort((left, right) => right.score - left.score);
}

export function chooseAiMove(
  state: GameState,
  seat: Seat,
  difficulty: Difficulty
): ScoredMove {
  return (
    scoreLegalMoves(state, seat, difficulty)[0] ?? {
      score: 0,
      factors: [],
      summary: "没有可用动作",
    }
  );
}

export function explainMove(
  state: GameState,
  seat: Seat,
  pattern: Pattern | undefined
): DecisionExplanation {
  const ranked = scoreLegalMoves(state, seat, "master");
  const chosen =
    ranked.find((candidate) => candidate.pattern?.id === pattern?.id) ??
    ranked.find((candidate) => !candidate.pattern && !pattern) ??
    ranked.at(-1);
  const best = ranked[0];
  const second = ranked[1];
  const gap = best && chosen ? best.score - chosen.score : 0;
  const quality: DecisionExplanation["quality"] =
    gap < 0.8
      ? "精确"
      : gap < 3
        ? "稳健"
        : gap < 6
          ? "可行"
          : gap < 10
            ? "冒险"
            : "失误";
  const targetIsPartner =
    state.targetSeat !== undefined && seatTeam(state.targetSeat) === seatTeam(seat);
  const label = pattern ? patternTypeLabel(pattern.type) : "过牌";
  const remaining = state.hands[seat].length - (pattern?.cards.length ?? 0);
  const partner = partnerOf(seat);
  const opponents = ([0, 1, 2, 3] as Seat[]).filter(
    (candidate) => seatTeam(candidate) !== seatTeam(seat)
  );
  const nextSeat = nextActiveSeat(state, seat);
  const positiveFactors = (chosen?.factors ?? []).filter(
    (factor) => factor.value > 0
  );
  const negativeFactors = (chosen?.factors ?? []).filter(
    (factor) => factor.value < 0
  );
  const chosenLabel = pattern?.label ?? "过牌";
  const bestLabel = best?.pattern?.label ?? "过牌";
  const actorName = seatDisplayNames[seat];
  const nextOpponentDanger =
    seatTeam(nextSeat) !== seatTeam(seat) && state.hands[nextSeat].length <= 5;
  const evidence = [
    state.target && state.targetSeat !== undefined
      ? `桌面是${state.target.label}，由${seatDisplayNames[state.targetSeat]}持有牌权`
      : `当前没有桌面牌型限制，${actorName}拥有新一轮先手`,
    pattern
      ? `这手${chosenLabel}，一次处理 ${pattern.cards.length} 张，出完后${actorName}剩 ${remaining} 张`
      : `${actorName}选择过牌后仍保留 ${remaining} 张，等待下一次接牌窗口`,
    `搭档剩 ${state.hands[partner].length} 张，两名对手分别剩 ${state.hands[opponents[0]].length} 张和 ${state.hands[opponents[1]].length} 张`,
    positiveFactors.length > 0
      ? `主要收益来自${positiveFactors
          .map((factor) => `${factor.label} ${factor.value > 0 ? "+" : ""}${factor.value}`)
          .join("、")}`
      : "这手没有明显的即时收益，价值主要来自保留后续选择",
  ];
  const risks = [
    ...(gap >= 0.8
      ? [`当前首选是${bestLabel}，这条路线少 ${Math.round(gap * 10) / 10} 分`]
      : ["当前选择接近评分首选，没有明显的路线损失"]),
    ...negativeFactors.map(
      (factor) => `${factor.label}会产生 ${Math.abs(factor.value)} 分代价`
    ),
    ...(nextOpponentDanger
      ? [`下一位对手只剩 ${state.hands[nextSeat].length} 张，必须防止其一手或两手走完`]
      : []),
    ...(pattern && isBomb(pattern) && remaining > 0
      ? ["炸弹一旦使用就失去后续强制夺权能力，需要确认炸后出口"]
      : []),
  ];
  const nextSteps = [
    state.target
      ? `先确认${chosenLabel}能否合法压过${state.target.label}`
      : `先比较${chosenLabel}与其他先手路线能处理的张数`,
    remaining <= 5
      ? `再安排剩余 ${remaining} 张的具体出完顺序`
      : `再检查出牌后是否保留对子、连续结构或高级控制牌`,
    targetIsPartner
      ? "最后确认覆盖搭档是否真的能带来走完或紧急阻断"
      : `最后观察搭档 ${state.hands[partner].length} 张是否有接风机会`,
  ];

  return {
    headline: `${label} · ${quality}`,
    reason: chosen
      ? `${chosen.summary}，综合评分 ${Math.round(chosen.score * 10) / 10} 分`
      : pattern
        ? "这手牌改变了当前牌权结构"
        : "保留牌力等待下一次机会",
    consequence:
      remaining === 0
        ? "这一步完成出完，直接锁定一个名次"
        : pattern
          ? `出牌后还剩 ${remaining} 张，接下来要验证能否继续组织下一手，而不是只看这一手压得多大`
          : `过牌后仍剩 ${remaining} 张，收益是保留结构，代价是暂时放弃本轮控制`,
    partnerRead: targetIsPartner
      ? pattern
        ? "当前最大牌来自搭档，主动盖牌需要有明确的走完或拦截理由"
        : "让牌能够保留搭档牌权，是合作型牌局中的重要选择"
      : `搭档还剩 ${state.hands[partner].length} 张，需要判断你的路线是在为搭档创造接风，还是独自消耗控制牌`,
    evidence,
    risks,
    nextSteps,
    confidence: Math.max(
      38,
      Math.min(96, Math.round(64 + ((best?.score ?? 0) - (second?.score ?? 0)) * 4))
    ),
    quality,
    factors: chosen?.factors ?? [],
    alternative:
      best && chosen && best !== chosen
        ? {
            label: best.pattern?.label ?? "过牌",
            reason: best.summary,
            delta: Math.round(gap * 10) / 10,
          }
        : second
          ? {
              label: second.pattern?.label ?? "过牌",
              reason: second.summary,
              delta: Math.round(((best?.score ?? 0) - second.score) * 10) / 10,
            }
          : undefined,
  };
}

export function publicSituation(state: GameState, seat: Seat): string {
  const partner = partnerOf(seat);
  const opponents = ([0, 1, 2, 3] as Seat[]).filter(
    (candidate) => seatTeam(candidate) !== seatTeam(seat)
  );
  const danger = opponents
    .map((candidate) => state.hands[candidate].length)
    .sort((a, b) => a - b)[0];
  const highCards = state.hands[seat].filter(
    (card) => rankStrength(card.rank, state.level) >= 14
  ).length;
  return `搭档剩 ${state.hands[partner].length} 张，对手最少剩 ${danger} 张，你有 ${highCards} 张高级控制牌`;
}
