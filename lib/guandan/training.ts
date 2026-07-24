import {
  Card,
  NORMAL_RANKS,
  PatternType,
  Rank,
  Suit,
} from "./types";

export type TrainingDifficulty =
  | "foundation"
  | "intermediate"
  | "advanced"
  | "master";

export type TrainingTopic =
  | "牌型识别"
  | "逢人配"
  | "牌权控制"
  | "搭档协同"
  | "记牌推理"
  | "炸弹管理"
  | "残局处理"
  | "进贡还贡"
  | "组牌规划"
  | "风险判断";

export interface TrainingQuestion {
  id: string;
  title: string;
  prompt: string;
  context: string;
  level: Rank;
  cards: Card[];
  options: string[];
  answer: number;
  explanation: string;
  principle: string;
  hint: string;
  difficulty: TrainingDifficulty;
  topic: TrainingTopic;
  estimatedSeconds: number;
  expectedPatternType?: PatternType;
}

export const trainingDifficultyMeta: Record<
  TrainingDifficulty,
  { name: string; description: string; score: number }
> = {
  foundation: {
    name: "筑基",
    description: "规则与牌型",
    score: 1,
  },
  intermediate: {
    name: "进阶",
    description: "组合与牌权",
    score: 2,
  },
  advanced: {
    name: "高阶",
    description: "信息与残局",
    score: 3,
  },
  master: {
    name: "大师",
    description: "团队与反事实",
    score: 4,
  },
};

export const trainingTopics: TrainingTopic[] = [
  "牌型识别",
  "逢人配",
  "牌权控制",
  "搭档协同",
  "记牌推理",
  "炸弹管理",
  "残局处理",
  "进贡还贡",
  "组牌规划",
  "风险判断",
];

export const trainingTopicTips: Record<
  TrainingTopic,
  { cue: string; steps: [string, string, string] }
> = {
  牌型识别: {
    cue: "先定长度，再看结构，最后处理逢人配",
    steps: ["数张数", "识别重复与连续", "确认万能牌用途"],
  },
  逢人配: {
    cue: "逢人配不是自动补最大牌型，要比较机会成本",
    steps: ["列出可替代位置", "比较成型强度", "保留更稀缺结构"],
  },
  牌权控制: {
    cue: "牌权的价值取决于下一手能否继续组织",
    steps: ["确认谁持权", "检查下一手出口", "评估夺权成本"],
  },
  搭档协同: {
    cue: "己方已经控牌时，不要为了赢一手而覆盖搭档",
    steps: ["辨认搭档信号", "观察两家张数", "决定让牌或接管"],
  },
  记牌推理: {
    cue: "只记会改变决策的牌，级牌、王、炸弹和终局张数",
    steps: ["统计已见关键牌", "推算未见数量", "更新危险组合"],
  },
  炸弹管理: {
    cue: "炸弹不是分数，是交换牌权和阻断终局的资源",
    steps: ["判断是否必须阻断", "比较炸后出口", "保留更高层级"],
  },
  残局处理: {
    cue: "对手进入一手走完区间后，常规保牌逻辑需要重估",
    steps: ["确认最少剩余手数", "封锁对应牌型", "安排搭档接风"],
  },
  进贡还贡: {
    cue: "进贡看最高牌，还贡看最小破坏而不是单看最小点数",
    steps: ["确认抗贡条件", "识别必须交出的牌", "选择低结构损失还牌"],
  },
  组牌规划: {
    cue: "好牌型不等于好计划，目标是减少总手数并保留出口",
    steps: ["估算最少手数", "标记关键连接牌", "比较两条出牌顺序"],
  },
  风险判断: {
    cue: "选择要同时考虑收益、失败代价和搭档补救能力",
    steps: ["写出首选收益", "检查最坏反击", "保留可恢复方案"],
  },
};

const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
const straightWindows: Rank[][] = [
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
const pairWindows: Rank[][] = [
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
const steelWindows: Rank[][] = [
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

function card(
  id: string,
  rank: Card["rank"],
  suit: Suit,
  deck: 0 | 1 = 0
): Card {
  return { id, rank, suit, deck };
}

function normalCards(id: string, rank: Rank, count: number): Card[] {
  return Array.from({ length: count }, (_, index) =>
    card(
      `${id}-${index}`,
      rank,
      suits[index % suits.length],
      index >= suits.length ? 1 : 0
    )
  );
}

function sequenceCards(
  id: string,
  ranks: Rank[],
  perRank: number,
  sameSuit?: Suit
): Card[] {
  return ranks.flatMap((rank, rankIndex) =>
    Array.from({ length: perRank }, (_, copyIndex) =>
      card(
        `${id}-${rankIndex}-${copyIndex}`,
        rank,
        sameSuit ?? suits[(rankIndex + copyIndex) % suits.length],
        copyIndex > 0 ? 1 : 0
      )
    )
  );
}

function safeLevel(excluded: Array<Card["rank"]>, offset: number): Rank {
  return (
    NORMAL_RANKS.find(
      (rank, index) =>
        !excluded.includes(rank) && index >= offset % NORMAL_RANKS.length
    ) ??
    NORMAL_RANKS.find((rank) => !excluded.includes(rank)) ??
    "2"
  );
}

function otherRank(rank: Rank, offset: number): Rank {
  return (
    NORMAL_RANKS.find(
      (candidate, index) =>
        candidate !== rank && index >= offset % NORMAL_RANKS.length
    ) ??
    NORMAL_RANKS.find((candidate) => candidate !== rank) ??
    "2"
  );
}

function threeOtherOptions(correct: string, candidates: string[]): [
  string,
  string,
  string,
] {
  const unique = [...new Set(candidates.filter((item) => item !== correct))];
  if (unique.length < 3) {
    throw new Error(`题目选项不足: ${correct}`);
  }
  return [unique[0], unique[1], unique[2]];
}

function rotatedOptions(
  correct: string,
  distractors: readonly [string, string, string],
  rotation: number
): { options: string[]; answer: number } {
  const source = [correct, ...distractors];
  const amount = rotation % source.length;
  const options = [...source.slice(amount), ...source.slice(0, amount)];
  return { options, answer: options.indexOf(correct) };
}

function question(
  input: Omit<TrainingQuestion, "options" | "answer"> & {
    correct: string;
    distractors: readonly [string, string, string];
    rotation: number;
  }
): TrainingQuestion {
  const { correct, distractors, rotation, ...rest } = input;
  return {
    ...rest,
    ...rotatedOptions(correct, distractors, rotation),
  };
}

function patternRecognition(index: number): TrainingQuestion {
  const id = `foundation-pattern-${index}`;
  const patternIndex = index % 10;
  const rank = NORMAL_RANKS[(index * 3 + 2) % NORMAL_RANKS.length];
  const pairRank = NORMAL_RANKS[(index * 5 + 7) % NORMAL_RANKS.length];
  const straight = straightWindows[index % straightWindows.length];
  const pairs = pairWindows[index % pairWindows.length];
  const steels = steelWindows[index % steelWindows.length];
  const suit = suits[index % 4];
  let cards: Card[];
  let correct: string;
  let expectedPatternType: PatternType;

  switch (patternIndex) {
    case 0:
      cards = normalCards(id, rank, 1);
      correct = "单张";
      expectedPatternType = "single";
      break;
    case 1:
      cards = normalCards(id, rank, 2);
      correct = "对子";
      expectedPatternType = "pair";
      break;
    case 2:
      cards = normalCards(id, rank, 3);
      correct = "三张";
      expectedPatternType = "triple";
      break;
    case 3:
      cards = [
        ...normalCards(`${id}-triple`, rank, 3),
        ...normalCards(
          `${id}-pair`,
          pairRank === rank ? otherRank(rank, index + 1) : pairRank,
          2
        ),
      ];
      correct = "三带二";
      expectedPatternType = "threeWithPair";
      break;
    case 4:
      cards = sequenceCards(id, straight, 1);
      correct = "五张顺子";
      expectedPatternType = "straight";
      break;
    case 5:
      cards = sequenceCards(id, pairs, 2);
      correct = "三连对";
      expectedPatternType = "threePairs";
      break;
    case 6:
      cards = sequenceCards(id, steels, 3);
      correct = "钢板";
      expectedPatternType = "steelPlate";
      break;
    case 7:
      cards = normalCards(id, rank, 4);
      correct = "四张炸弹";
      expectedPatternType = "bomb";
      break;
    case 8:
      cards = sequenceCards(id, straight, 1, suit);
      correct = "同花顺";
      expectedPatternType = "straightFlush";
      break;
    default:
      cards = [
        card(`${id}-sj0`, "SJ", "joker", 0),
        card(`${id}-sj1`, "SJ", "joker", 1),
        card(`${id}-bj0`, "BJ", "joker", 0),
        card(`${id}-bj1`, "BJ", "joker", 1),
      ];
      correct = "四王炸";
      expectedPatternType = "jokerBomb";
  }

  const level = safeLevel(
    cards.map((item) => item.rank),
    index
  );
  return question({
    id,
    title: "看结构认牌型",
    prompt: "这组牌完整选中后，应当识别为什么牌型",
    context: `当前打 ${level}，先数张数，再识别重复和连续结构`,
    level,
    cards,
    correct,
    distractors: threeOtherOptions(correct, [
      "单张",
      "对子",
      "三张",
      "三带二",
      "五张顺子",
      "三连对",
      "钢板",
      "四张炸弹",
      "同花顺",
      "四王炸",
      "普通散牌",
    ]),
    rotation: index,
    explanation: `完整选中后构成${correct}，判断时不能只看其中一部分`,
    principle: "牌型识别先看总张数，再看相同点数与连续关系",
    hint: `先从 ${cards.length} 张这个长度排除不可能的牌型`,
    difficulty: "foundation",
    topic: "牌型识别",
    estimatedSeconds: 20,
    expectedPatternType,
  });
}

function remainingCards(index: number): TrainingQuestion {
  const id = `foundation-count-${index}`;
  const rank = NORMAL_RANKS[(index * 5) % NORMAL_RANKS.length];
  const seen = 1 + (index % 7);
  const remaining = 8 - seen;
  const level = NORMAL_RANKS[(index * 7 + 3) % NORMAL_RANKS.length];
  const cards = normalCards(id, rank, Math.min(seen, 6));
  return question({
    id,
    title: "关键牌计数",
    prompt: `两副牌共有 8 张 ${rank}，你已经确认看见 ${seen} 张，还有多少张未见`,
    context: `已见数量包含自己手牌、桌面出牌和明确暴露的信息`,
    level,
    cards,
    correct: `${remaining} 张`,
    distractors: threeOtherOptions(
      `${remaining} 张`,
      Array.from({ length: 9 }, (_, amount) => `${amount} 张`)
    ),
    rotation: index + 1,
    explanation: `普通点数在两副牌中共有 8 张，8 减去 ${seen} 等于 ${remaining}`,
    principle: "记牌不是背完整牌谱，而是持续更新关键牌的未见数量",
    hint: `用总数 8 减去已见的 ${seen}`,
    difficulty: "foundation",
    topic: "记牌推理",
    estimatedSeconds: 15,
  });
}

const ruleCases = [
  {
    title: "搭档位置",
    prompt: "四人掼蛋中，哪一位玩家是你的固定搭档",
    correct: "与你相对而坐的玩家",
    distractors: ["你的上家", "你的下家", "每轮随机指定"] as [
      string,
      string,
      string,
    ],
    explanation: "面对面的两位玩家组成固定搭档",
    principle: "所有局面判断都必须从团队而不是单手视角出发",
  },
  {
    title: "发牌数量",
    prompt: "两副牌共 108 张，四人均分后每人有多少张",
    correct: "27 张",
    distractors: ["25 张", "26 张", "28 张"] as [string, string, string],
    explanation: "108 除以 4 等于 27",
    principle: "准确的总量是记牌和残局推算的基础",
  },
  {
    title: "接风规则",
    prompt: "某玩家出完牌后，其余玩家都不压制，下一轮通常由谁先出",
    correct: "仍在场的搭档接风",
    distractors: ["固定由上家先出", "固定由下家先出", "重新随机"] as [
      string,
      string,
      string,
    ],
    explanation: "出完者的搭档仍在场时，由搭档接风取得下一轮牌权",
    principle: "接风使出完顺序与团队牌权直接相连",
  },
  {
    title: "升级判断",
    prompt: "同队取得第一名和第二名时，通常升几级",
    correct: "升三级",
    distractors: ["升一级", "升两级", "不升级"] as [string, string, string],
    explanation: "同队包揽前两名属于双下，升三级",
    principle: "残局目标不是只争第一，还要安排搭档名次",
  },
  {
    title: "逢人配边界",
    prompt: "红桃级牌作为逢人配时，不能替代哪类牌",
    correct: "大小王",
    distractors: ["普通点数牌", "顺子中的缺张", "对子中的同点牌"] as [
      string,
      string,
      string,
    ],
    explanation: "逢人配可以替代大小王之外的普通牌",
    principle: "先确认万能牌边界，再寻找最高价值组合",
  },
] as const;

function ruleFoundation(index: number): TrainingQuestion {
  const item = ruleCases[index % ruleCases.length];
  const level = NORMAL_RANKS[(index * 3 + 1) % NORMAL_RANKS.length];
  const perspective = ["本家先手", "搭档持权", "下家临近出完", "新一轮开始"][
    Math.floor(index / ruleCases.length) % 4
  ];
  return question({
    id: `foundation-rule-${index}`,
    title: item.title,
    prompt: item.prompt,
    context: `规则检查 · ${perspective} · 当前打 ${level}`,
    level,
    cards: [],
    correct: item.correct,
    distractors: item.distractors,
    rotation: index + 2,
    explanation: item.explanation,
    principle: item.principle,
    hint: "先回到规则本身，不要把经验习惯当成正式规则",
    difficulty: "foundation",
    topic: index % 2 === 0 ? "牌型识别" : "牌权控制",
    estimatedSeconds: 18,
  });
}

function basicPlanning(index: number): TrainingQuestion {
  const rank = NORMAL_RANKS[(index * 7 + 2) % NORMAL_RANKS.length];
  const opponent = 4 + (index % 9);
  const partner = 7 + ((index * 3) % 12);
  const cases = [
    {
      prompt: `你取得新一轮牌权，对手最少剩 ${opponent} 张，手里有连续小单张和完整对子，优先目标是什么`,
      correct: "先处理最难衔接的小单张",
      distractors: ["立即拆掉所有对子", "无条件先出最大牌", "先消耗炸弹"] as [
        string,
        string,
        string,
      ],
      explanation: "先手阶段应优先改善最难处理的结构，同时保留可连续组织的对子",
    },
    {
      prompt: `搭档剩 ${partner} 张并持有牌权，对手尚未进入一手走完区间，你能用高级牌盖住搭档，通常怎么做`,
      correct: "过牌保留搭档牌权",
      distractors: ["立刻盖住搭档", "拆炸弹抢权", "随机选择"] as [
        string,
        string,
        string,
      ],
      explanation: "己方已经控牌且没有紧急威胁时，覆盖搭档通常只会浪费控制牌",
    },
    {
      prompt: `你有一个完整顺子和两张可连接散牌，对手最少剩 ${opponent} 张，规划时先比较什么`,
      correct: "比较拆顺与保顺后的总手数",
      distractors: ["只比较本手牌点大小", "只保留最大单张", "一定拆顺子"] as [
        string,
        string,
        string,
      ],
      explanation: "结构选择要比较两条完整出牌路线，而不是只评估当前一手",
    },
    {
      prompt: `你有炸弹但炸后没有顺畅出口，对手仍有 ${opponent} 张且搭档可以跟进，通常怎么做`,
      correct: "保留炸弹并观察搭档",
      distractors: ["立即炸掉任何牌", "拆炸弹出单张", "放弃记牌"] as [
        string,
        string,
        string,
      ],
      explanation: "没有紧急阻断需求且炸后出口差时，保留炸弹的团队价值更高",
    },
  ][index % 4];
  const level = safeLevel([rank], index);
  return question({
    id: `foundation-plan-${index}`,
    title: "三步出牌规划",
    prompt: cases.prompt,
    context: `当前打 ${level}，先看结构，再看牌权，最后看搭档`,
    level,
    cards: normalCards(`foundation-plan-${index}`, rank, 2 + (index % 2)),
    correct: cases.correct,
    distractors: cases.distractors,
    rotation: index + 3,
    explanation: cases.explanation,
    principle: "每手牌都要服务于后续出口和团队牌权",
    hint: "先问自己，这手之后最难处理的牌还剩什么",
    difficulty: "foundation",
    topic: "组牌规划",
    estimatedSeconds: 25,
  });
}

function wildRecognition(index: number): TrainingQuestion {
  const id = `intermediate-wild-${index}`;
  const level = NORMAL_RANKS[(index * 5 + 4) % NORMAL_RANKS.length];
  const target =
    NORMAL_RANKS.find(
      (rank, rankIndex) =>
        rank !== level && rankIndex >= (index * 3) % NORMAL_RANKS.length
    ) ?? "9";
  const kind = index % 5;
  let cards: Card[];
  let correct: string;
  let expectedPatternType: PatternType;

  if (kind === 0) {
    cards = [
      ...normalCards(`${id}-n`, target, 3),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    correct = `四张 ${target} 炸弹`;
    expectedPatternType = "bomb";
  } else if (kind === 1) {
    cards = [
      ...normalCards(`${id}-n`, target, 2),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    correct = `三张 ${target}`;
    expectedPatternType = "triple";
  } else if (kind === 2) {
    cards = [
      ...normalCards(`${id}-n`, target, 1),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    correct = `${target} 对`;
    expectedPatternType = "pair";
  } else if (kind === 3) {
    const window = straightWindows[index % straightWindows.length];
    const missing = index % window.length;
    cards = [
      ...sequenceCards(
        `${id}-n`,
        window.filter((_, position) => position !== missing),
        1
      ),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    correct = "五张顺子";
    expectedPatternType = "straight";
  } else {
    const window = pairWindows[index % pairWindows.length];
    cards = [
      ...sequenceCards(`${id}-n`, window, 2).slice(0, 5),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    correct = "三连对";
    expectedPatternType = "threePairs";
  }

  return question({
    id,
    title: "逢人配成型",
    prompt: "完整使用这组牌，逢人配的最高价值合法用途是什么",
    context: `当前打 ${level}，红桃 ${level} 是逢人配`,
    level,
    cards,
    correct,
    distractors: ["只能作为级牌单张", "普通散牌", "四王炸"],
    rotation: index,
    explanation: `红桃 ${level} 可以补齐缺失位置，使整组牌形成${correct}`,
    principle: "逢人配先用于减少手数或形成关键控制结构",
    hint: "把红桃级牌暂时当成缺少的那张牌，再重新识别整组结构",
    difficulty: "intermediate",
    topic: "逢人配",
    estimatedSeconds: 28,
    expectedPatternType,
  });
}

function partnership(index: number): TrainingQuestion {
  const target = NORMAL_RANKS[(index * 3 + 5) % NORMAL_RANKS.length];
  const opponent = 4 + (index % 10);
  const partner = 5 + ((index * 7) % 18);
  const urgent = opponent <= 5;
  const level = safeLevel([target], index);
  const correct = urgent ? "接管牌权并阻断下家" : "过牌让搭档继续";
  return question({
    id: `intermediate-partner-${index}`,
    title: urgent ? "紧急接管" : "搭档让牌",
    prompt: `搭档刚用 ${target} 对取得牌权，下家剩 ${opponent} 张，搭档剩 ${partner} 张，你有更大的对子，通常如何处理`,
    context: urgent
      ? "下家已经接近一至两手走完，需要提高阻断优先级"
      : "下家尚未进入紧急区间，己方已经控制本轮",
    level,
    cards: normalCards(`intermediate-partner-${index}`, target, 2),
    correct,
    distractors: urgent
      ? ["无条件过牌", "拆掉所有对子", "立即使用最高炸弹"]
      : ["盖住搭档证明牌大", "立即使用炸弹", "拆对出单张"],
    rotation: index + 1,
    explanation: urgent
      ? "对手接近出完时，阻断终局的价值可能高于常规让牌"
      : "搭档已经持有牌权且没有紧急威胁，过牌可以保留己方控制资源",
    principle: "让牌与接管的分界线由对手剩余手数决定",
    hint: `先判断下家的 ${opponent} 张大约还需要几手才能走完`,
    difficulty: "intermediate",
    topic: "搭档协同",
    estimatedSeconds: 30,
  });
}

function sequenceTraining(index: number): TrainingQuestion {
  const id = `intermediate-sequence-${index}`;
  const kind = index % 3;
  const window =
    kind === 0
      ? straightWindows[index % straightWindows.length]
      : kind === 1
        ? pairWindows[index % pairWindows.length]
        : steelWindows[index % steelWindows.length];
  const perRank = kind === 0 ? 1 : kind === 1 ? 2 : 3;
  const correct = kind === 0 ? "五张顺子" : kind === 1 ? "三连对" : "钢板";
  const expectedPatternType =
    kind === 0 ? "straight" : kind === 1 ? "threePairs" : "steelPlate";
  const cards = sequenceCards(id, window, perRank);
  const level = safeLevel(
    cards.map((item) => item.rank),
    index
  );
  return question({
    id,
    title: "连续结构识别",
    prompt: "这组牌的连续关系对应哪一种合法牌型",
    context: `当前打 ${level}，连续结构的长度和每个点数张数都必须准确`,
    level,
    cards,
    correct,
    distractors: ["普通对子", "三带二", "不构成合法牌型"],
    rotation: index + 2,
    explanation: `${window.join("、")} 连续，每个点数各 ${perRank} 张，因此构成${correct}`,
    principle: "顺子看五个连续单点，三连对看三个连续对子，钢板看两个连续三张",
    hint: `每个点数出现 ${perRank} 次`,
    difficulty: "intermediate",
    topic: "牌型识别",
    estimatedSeconds: 24,
    expectedPatternType: expectedPatternType as PatternType,
  });
}

function controlComparison(index: number): TrainingQuestion {
  const level = NORMAL_RANKS[(index * 7 + 2) % NORMAL_RANKS.length];
  const ordered = NORMAL_RANKS.filter((rank) => rank !== level);
  const targetIndex = index % (ordered.length - 2);
  const target = ordered[targetIndex];
  const higher = ordered[targetIndex + 1];
  const lower = ordered[Math.max(0, targetIndex - 1)];
  return question({
    id: `intermediate-control-${index}`,
    title: "同型压制",
    prompt: `对手打出 ${target} 对，不考虑炸弹时，哪一项可以合法压制`,
    context: `当前打 ${level}，级牌高于普通 A，大小王仍然更高`,
    level,
    cards: normalCards(`intermediate-control-${index}`, target, 2),
    correct: `${higher} 对`,
    distractors: [`${lower} 对`, `${higher} 单张`, `${target} 三张`],
    rotation: index + 3,
    explanation: `非炸弹情况下必须同牌型同长度比较，${higher} 对高于 ${target} 对`,
    principle: "普通牌只能由同型同长度的更大牌压制",
    hint: "先排除不同张数和不同牌型",
    difficulty: "intermediate",
    topic: "牌权控制",
    estimatedSeconds: 22,
  });
}

function bombManagement(index: number): TrainingQuestion {
  const ownSize = 4 + (index % 5);
  const opponent = 2 + ((index * 3) % 12);
  const partnerCanCover = index % 2 === 0;
  const urgent = opponent <= 4;
  const level = NORMAL_RANKS[(index * 5 + 1) % NORMAL_RANKS.length];
  const correct = urgent
    ? "立即阻断并准备炸后出口"
    : partnerCanCover
      ? "先让搭档处理，保留炸弹"
      : "继续观察，不为普通牌轻易交炸";
  return question({
    id: `advanced-bomb-${index}`,
    title: "炸弹交换价值",
    prompt: `你有 ${ownSize} 张炸弹，下家剩 ${opponent} 张，${
      partnerCanCover ? "搭档仍有明显控制牌" : "搭档控制牌信息不明"
    }，当前没有必炸规则，通常优先怎么做`,
    context: "炸弹决策必须同时看终局威胁、搭档覆盖和炸后出口",
    level,
    cards: normalCards(`advanced-bomb-${index}`, level === "9" ? "8" : "9", ownSize),
    correct,
    distractors: ["看见可炸就立刻炸", "拆炸弹出小牌", "永远不用炸弹"],
    rotation: index,
    explanation: urgent
      ? "对手进入一手走完区间时，阻断价值显著上升，但仍要安排炸后的下一手"
      : "没有紧急终局威胁时，炸弹应保留给换取关键牌权或保护搭档",
    principle: "炸弹的价值来自改变终局，而不是赢下一轮普通比较",
    hint: `先把下家的 ${opponent} 张换算成可能的最少手数`,
    difficulty: "advanced",
    topic: "炸弹管理",
    estimatedSeconds: 35,
  });
}

function endgame(index: number): TrainingQuestion {
  const remaining = 1 + (index % 3);
  const targetType = ["单张", "对子", "三张"][remaining - 1];
  const canBlock = index % 4 !== 0;
  const partnerHasLead = index % 5 === 0;
  const level = NORMAL_RANKS[(index * 3 + 6) % NORMAL_RANKS.length];
  const correct = canBlock
    ? "优先阻断对手一手走完"
    : partnerHasLead
      ? "过牌并让搭档尝试接管"
      : "保留能改变下一轮牌型的控制牌";
  return question({
    id: `advanced-endgame-${index}`,
    title: "终局拦截阈值",
    prompt: `下家只剩 ${remaining} 张，最可能以${targetType}走完，${
      canBlock ? "你有对应同型控制牌" : "你没有直接同型压制"
    }，优先策略是什么`,
    context: `当前打 ${level}，对手已经进入一手走完区间`,
    level,
    cards: normalCards(
      `advanced-endgame-${index}`,
      level === "A" ? "K" : "A",
      Math.max(1, remaining)
    ),
    correct,
    distractors: ["只考虑保留最大牌", "无条件让搭档", "拆掉全部组合"],
    rotation: index + 1,
    explanation: canBlock
      ? "对手只剩一手时，直接阻断通常高于常规保留牌力"
      : "无法直接压制时，应围绕搭档接管和下一轮牌型进行防守",
    principle: "残局先判断对手最少手数，再决定是否改变常规出牌优先级",
    hint: "把剩余张数直接映射到最危险的牌型",
    difficulty: "advanced",
    topic: "残局处理",
    estimatedSeconds: 32,
  });
}

function memoryInference(index: number): TrainingQuestion {
  const rank = NORMAL_RANKS[(index * 9 + 1) % NORMAL_RANKS.length];
  const seen = 3 + (index % 5);
  const unseen = 8 - seen;
  const hand = 1 + ((index * 3) % Math.max(1, unseen));
  const outside = Math.max(0, unseen - hand);
  const level = NORMAL_RANKS[(index * 5 + 7) % NORMAL_RANKS.length];
  return question({
    id: `advanced-memory-${index}`,
    title: "外部牌力推算",
    prompt: `两副牌共有 8 张 ${rank}，已公开见到 ${seen} 张，你手里另有 ${hand} 张，外部最多还剩多少张 ${rank}`,
    context: "公开已见与自己持有都应从总数中扣除",
    level,
    cards: normalCards(`advanced-memory-${index}`, rank, hand),
    correct: `${outside} 张`,
    distractors: threeOtherOptions(
      `${outside} 张`,
      Array.from({ length: 9 }, (_, amount) => `${amount} 张`)
    ),
    rotation: index + 2,
    explanation: `8 减公开的 ${seen} 张，再减你手里的 ${hand} 张，外部最多剩 ${outside} 张`,
    principle: "外部牌力推算必须同时扣除公开牌和自己的隐藏信息",
    hint: `先算 8 - ${seen}，再减去手里的 ${hand}`,
    difficulty: "advanced",
    topic: "记牌推理",
    estimatedSeconds: 28,
  });
}

function tribute(index: number): TrainingQuestion {
  const level = NORMAL_RANKS[(index * 7 + 4) % NORMAL_RANKS.length];
  const hasJokerBomb = index % 7 === 0;
  const pairRisk = index % 3 === 0;
  const correct = hasJokerBomb
    ? "先确认是否满足抗贡条件"
    : pairRisk
      ? "在合法范围内选择结构损失最小的还牌"
      : "按规则交出应贡的最高牌";
  return question({
    id: `advanced-tribute-${index}`,
    title: hasJokerBomb ? "抗贡检查" : pairRisk ? "还贡选择" : "进贡顺序",
    prompt: hasJokerBomb
      ? "上一局需要进贡，但你持有两张大王和两张小王，第一步应该做什么"
      : pairRisk
        ? `还贡时两张低牌中，一张连接顺子，另一张是孤张，通常优先还哪张`
        : "需要进贡且不满足抗贡时，应优先交出什么",
    context: `当前打 ${level}，先执行规则，再优化剩余手牌结构`,
    level,
    cards: hasJokerBomb
      ? [
          card(`advanced-tribute-${index}-sj0`, "SJ", "joker", 0),
          card(`advanced-tribute-${index}-sj1`, "SJ", "joker", 1),
          card(`advanced-tribute-${index}-bj0`, "BJ", "joker", 0),
          card(`advanced-tribute-${index}-bj1`, "BJ", "joker", 1),
        ]
      : [],
    correct,
    distractors: hasJokerBomb
      ? ["直接交出大王", "任意交一张小牌", "跳过本轮出牌"]
      : pairRisk
        ? ["还连接顺子的那张", "随机选择", "还出最高牌"]
        : ["任意最小牌", "红桃级牌", "由搭档代贡"],
    rotation: index + 3,
    explanation: hasJokerBomb
      ? "持有两张大王和两张小王时，应先依据规则检查抗贡"
      : pairRisk
        ? "还贡应尽量避免破坏顺子、对子和炸弹等完整结构"
        : "不满足抗贡时，进贡必须先按规则交出应贡的最高牌",
    principle: "进贡重规则正确，还贡重结构损失最小",
    hint: "把规则义务与策略优化分成两个步骤",
    difficulty: "advanced",
    topic: "进贡还贡",
    estimatedSeconds: 30,
  });
}

function minimumTurns(index: number): TrainingQuestion {
  const rankA = NORMAL_RANKS[(index * 3 + 1) % NORMAL_RANKS.length];
  const rankB = NORMAL_RANKS[(index * 5 + 6) % NORMAL_RANKS.length];
  const structure = index % 4;
  const level = safeLevel([rankA, rankB], index);
  const cases = [
    {
      cards: [
        ...normalCards(`master-turns-${index}-a`, rankA, 3),
        ...normalCards(`master-turns-${index}-b`, rankB === rankA ? "K" : rankB, 2),
      ],
      correct: "1 手",
      explanation: "三张加另一点数对子可以作为三带二一次出完",
    },
    {
      cards: sequenceCards(
        `master-turns-${index}`,
        straightWindows[index % straightWindows.length],
        1
      ),
      correct: "1 手",
      explanation: "五个连续点数可以作为五张顺子一次出完",
    },
    {
      cards: [
        ...normalCards(`master-turns-${index}-a`, rankA, 2),
        ...normalCards(`master-turns-${index}-b`, rankB === rankA ? "Q" : rankB, 2),
        card(`master-turns-${index}-c`, "BJ", "joker", 0),
      ],
      correct: "3 手",
      explanation: "两组对子加一张大王，在没有连续三对时最少需要三手",
    },
    {
      cards: [
        ...normalCards(`master-turns-${index}-a`, rankA, 4),
        ...normalCards(`master-turns-${index}-b`, rankB === rankA ? "J" : rankB, 2),
      ],
      correct: "2 手",
      explanation: "四张炸弹与一组对子可以用两手保持完整结构出完",
    },
  ][structure];
  return question({
    id: `master-turns-${index}`,
    title: "最少手数规划",
    prompt: "不考虑被压制，只计算合法拆分，这组牌最少需要几手出完",
    context: `当前打 ${level}，优先寻找能覆盖全部牌的完整组合`,
    level,
    cards: cases.cards,
    correct: cases.correct,
    distractors: threeOtherOptions(cases.correct, [
      "1 手",
      "2 手",
      "3 手",
      "4 手",
    ]),
    rotation: index,
    explanation: cases.explanation,
    principle: "最少手数是组牌规划的基线，但实战还要加入牌权与搭档因素",
    hint: "尝试用一个完整牌型覆盖尽可能多的牌",
    difficulty: "master",
    topic: "组牌规划",
    estimatedSeconds: 38,
  });
}

function counterfactual(index: number): TrainingQuestion {
  const opponent = 3 + (index % 9);
  const partner = 4 + ((index * 5) % 18);
  const advantage = index % 2 === 0;
  const level = NORMAL_RANKS[(index * 11 + 2) % NORMAL_RANKS.length];
  return question({
    id: `master-counterfactual-${index}`,
    title: "反事实比较",
    prompt: `首选方案能处理 5 张牌并保留控制牌，备选方案能处理 6 张牌但失去牌权，搭档剩 ${partner} 张，对手最少剩 ${opponent} 张，${
      advantage ? "己方当前持权" : "下家接近连续出牌"
    }，应优先比较什么`,
    context: "不要只比较本手处理张数，要比较整条后续路线",
    level,
    cards: [],
    correct: "比较两种方案的后续出口与团队牌权",
    distractors: ["只选一次出牌张数更多的", "只选点数最大的", "随机保留一张王"],
    rotation: index + 1,
    explanation: "处理张数多一张不一定更优，失去牌权可能让后续结构完全无法兑现",
    principle: "反事实训练比较的是两条完整路线，而不是两个孤立动作",
    hint: "分别写出两种选择之后，谁先出牌以及你还剩哪些组合",
    difficulty: "master",
    topic: "风险判断",
    estimatedSeconds: 42,
  });
}

function partnerInference(index: number): TrainingQuestion {
  const repeatedPasses = 1 + (index % 3);
  const partnerRemaining = 3 + ((index * 5) % 16);
  const opponentRemaining = 2 + ((index * 7) % 14);
  const level = NORMAL_RANKS[(index * 3 + 8) % NORMAL_RANKS.length];
  const urgent = opponentRemaining <= 4;
  return question({
    id: `master-partner-${index}`,
    title: "搭档意图推断",
    prompt: `搭档连续 ${repeatedPasses} 次没有覆盖己方牌权，目前剩 ${partnerRemaining} 张，下家剩 ${opponentRemaining} 张，最稳健的解释是什么`,
    context: urgent
      ? "对手已经接近出完，不能只依赖搭档的历史让牌"
      : "没有立即终局威胁，可以继续观察搭档的牌型偏好",
    level,
    cards: [],
    correct: urgent
      ? "搭档可能缺少对应牌型，你应准备主动阻断"
      : "搭档可能在保留控制牌或等待更合适的接管点",
    distractors: ["搭档一定没有大牌", "搭档已经放弃本局", "所有过牌都没有信息"],
    rotation: index + 2,
    explanation: urgent
      ? "连续过牌只能说明搭档没有选择当前方式接管，终局威胁出现后要降低等待成本"
      : "过牌是一条弱信号，需要结合张数、牌型和后续行动更新，而不能做绝对判断",
    principle: "搭档推理使用可更新的概率判断，不把一次行动解释成确定事实",
    hint: "区分没有对应牌型、选择保留和无法出牌三种可能",
    difficulty: "master",
    topic: "搭档协同",
    estimatedSeconds: 40,
  });
}

function riskDecision(index: number): TrainingQuestion {
  const confidence = 52 + (index % 41);
  const downside = 2 + ((index * 3) % 10);
  const recoverable = index % 3 !== 0;
  const level = NORMAL_RANKS[(index * 5 + 10) % NORMAL_RANKS.length];
  const correct = recoverable
    ? "选择可恢复方案，并保留一次控制资源"
    : "降低风险，避免把失败直接变成对手出完";
  return question({
    id: `master-risk-${index}`,
    title: "风险与可恢复性",
    prompt: `激进方案成功概率约 ${confidence}%，成功可减少一手，失败可能让下家连续处理 ${downside} 张，${
      recoverable ? "搭档仍能补一次牌权" : "搭档没有明显补救牌"
    }，应如何决策`,
    context: "大师级判断不追求每次最大收益，而追求可解释的长期稳定性",
    level,
    cards: [],
    correct,
    distractors: ["只看成功概率超过一半", "只要能少一手就冒险", "完全忽略搭档资源"],
    rotation: index + 3,
    explanation: recoverable
      ? "有搭档补救时可以保留适度进攻，但应避免同时耗尽全部控制资源"
      : "失败会直接触发终局且没有补救时，应显著提高安全阈值",
    principle: "风险判断要把失败代价和可恢复性放进同一张决策表",
    hint: "先描述最坏结果，再判断己方还有没有第二道防线",
    difficulty: "master",
    topic: "风险判断",
    estimatedSeconds: 45,
  });
}

function masterCardReading(index: number): TrainingQuestion {
  const rank = NORMAL_RANKS[(index * 7 + 9) % NORMAL_RANKS.length];
  const seen = 4 + (index % 4);
  const outside = 8 - seen;
  const opponentCards = 2 + ((index * 5) % 9);
  const level = NORMAL_RANKS[(index * 11 + 1) % NORMAL_RANKS.length];
  return question({
    id: `master-reading-${index}`,
    title: "信息集更新",
    prompt: `关键点数 ${rank} 已见 ${seen} 张，外部最多剩 ${outside} 张，下家共剩 ${opponentCards} 张，哪一种推断最严谨`,
    context: "未见牌分布未知，只能给出上限和相对风险，不能直接看穿手牌",
    level,
    cards: normalCards(`master-reading-${index}`, rank, Math.min(3, seen)),
    correct: `下家可能持有 0 至 ${Math.min(outside, opponentCards)} 张 ${rank}`,
    distractors: [
      `下家一定持有 ${outside} 张 ${rank}`,
      `搭档一定持有全部 ${rank}`,
      `${rank} 已经全部出完`,
    ],
    rotation: index,
    explanation: "公开信息只能确定剩余总量，无法确定每位玩家的精确分布",
    principle: "科学记牌区分确定事实、数量上限和概率判断",
    hint: "把能确定的总数与不能确定的分布分开",
    difficulty: "master",
    topic: "记牌推理",
    estimatedSeconds: 38,
  });
}

function advancedControl(index: number): TrainingQuestion {
  const level = NORMAL_RANKS[(index * 5 + 6) % NORMAL_RANKS.length];
  const opponent = 5 + (index % 8);
  const partner = 4 + ((index * 7) % 15);
  const haveExit = index % 2 === 0;
  return question({
    id: `advanced-control-${index}`,
    title: "夺权后的出口",
    prompt: `你可以用高级对子夺回牌权，对手最少剩 ${opponent} 张，搭档剩 ${partner} 张，${
      haveExit ? "夺权后还有顺子出口" : "夺权后只剩难处理的散牌"
    }，通常如何选择`,
    context: `当前打 ${level}，夺权不是终点，下一手能否组织决定它的真实价值`,
    level,
    cards: [],
    correct: haveExit ? "夺权并衔接顺子" : "优先让牌或等待更好的接管点",
    distractors: ["只要牌大就夺权", "立即拆掉所有组合", "忽略搭档张数"],
    rotation: index + 1,
    explanation: haveExit
      ? "夺权后存在清晰出口，可以把控制牌转换为实际减手"
      : "没有后续出口时，单纯赢一手可能只是把难题留给自己",
    principle: "任何夺权决策都必须同时写出下一手计划",
    hint: "先回答夺权成功之后你准备出什么",
    difficulty: "advanced",
    topic: "牌权控制",
    estimatedSeconds: 34,
  });
}

function masterPlan(index: number): TrainingQuestion {
  const opponent = 3 + (index % 10);
  const partner = 5 + ((index * 9) % 18);
  const level = NORMAL_RANKS[(index * 7 + 5) % NORMAL_RANKS.length];
  const preserveBomb = index % 2 === 0;
  return question({
    id: `master-plan-${index}`,
    title: "团队最少手数",
    prompt: `个人最快路线需要 3 手但会覆盖搭档，团队路线需要 4 手且能让搭档接风，搭档剩 ${partner} 张，对手最少剩 ${opponent} 张，通常优先比较什么`,
    context: preserveBomb
      ? "团队路线还能保留一组炸弹作为终局保险"
      : "个人路线成功后缺少继续控制的出口",
    level,
    cards: [],
    correct: "比较两条路线让己方两手牌共同出完的概率",
    distractors: ["只选择个人手数更少的", "只选择牌点更大的", "完全忽略接风"],
    rotation: index + 2,
    explanation: "掼蛋的优化目标是团队名次，不是单个玩家的最少手数",
    principle: "个人牌效必须服从团队出完顺序和接风机会",
    hint: "分别计算你和搭档在两条路线下的剩余手数",
    difficulty: "master",
    topic: "组牌规划",
    estimatedSeconds: 44,
  });
}

function createTrainingBank(): TrainingQuestion[] {
  const generators: Array<(index: number) => TrainingQuestion> = [
    patternRecognition,
    remainingCards,
    ruleFoundation,
    basicPlanning,
    wildRecognition,
    partnership,
    sequenceTraining,
    controlComparison,
    bombManagement,
    endgame,
    memoryInference,
    tribute,
    minimumTurns,
    counterfactual,
    partnerInference,
    riskDecision,
    masterCardReading,
    advancedControl,
    masterPlan,
  ];
  return generators.flatMap((generator) =>
    Array.from({ length: 100 }, (_, index) => generator(index))
  );
}

export const trainingBank = createTrainingBank();

export const trainingBankStats = {
  total: trainingBank.length,
  byDifficulty: Object.fromEntries(
    (Object.keys(trainingDifficultyMeta) as TrainingDifficulty[]).map(
      (difficulty) => [
        difficulty,
        trainingBank.filter((question) => question.difficulty === difficulty)
          .length,
      ]
    )
  ) as Record<TrainingDifficulty, number>,
  byTopic: Object.fromEntries(
    trainingTopics.map((topic) => [
      topic,
      trainingBank.filter((question) => question.topic === topic).length,
    ])
  ) as Record<TrainingTopic, number>,
  byDifficultyAndTopic: Object.fromEntries(
    (Object.keys(trainingDifficultyMeta) as TrainingDifficulty[]).map(
      (difficulty) => [
        difficulty,
        Object.fromEntries(
          trainingTopics.map((topic) => [
            topic,
            trainingBank.filter(
              (question) =>
                question.difficulty === difficulty && question.topic === topic
            ).length,
          ])
        ),
      ]
    )
  ) as Record<TrainingDifficulty, Record<TrainingTopic, number>>,
};

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function sessionStep(length: number, seed: number): number {
  if (length <= 1) return 1;
  let step = (Math.abs(seed) * 2 + 97) % length;
  if (step === 0) step = 1;
  while (greatestCommonDivisor(step, length) !== 1) {
    step = (step + 1) % length || 1;
  }
  return step;
}

export function questionForSession(
  questions: TrainingQuestion[],
  index: number,
  seed: number
): TrainingQuestion {
  if (questions.length === 0) {
    throw new Error("训练题池不能为空");
  }
  const start =
    ((seed % questions.length) + questions.length) % questions.length;
  return questions[
    (start + index * sessionStep(questions.length, seed)) % questions.length
  ];
}
