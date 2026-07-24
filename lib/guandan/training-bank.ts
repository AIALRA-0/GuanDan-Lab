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
  facts: string[];
  level: Rank;
  cards: Card[];
  options: string[];
  answer: number;
  explanation: string;
  reasoning: [string, string, string];
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
  foundation: { name: "筑基", description: "看清规则与已知信息", score: 1 },
  intermediate: { name: "进阶", description: "比较两种可行选择", score: 2 },
  advanced: { name: "高阶", description: "结合搭档与对手状态", score: 3 },
  master: { name: "大师", description: "评估整条出牌路线", score: 4 },
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
    cue: "先数牌，再看相同点数，最后检查是否连续",
    steps: ["确认总张数", "统计每个点数", "核对连续范围"],
  },
  逢人配: {
    cue: "先找缺口，再比较补牌后能少走几手",
    steps: ["标出红桃级牌", "列出可补位置", "选择最省手数的用途"],
  },
  牌权控制: {
    cue: "赢下这一手之前，先说清楚下一手准备出什么",
    steps: ["确认当前出牌者", "判断是否必须接管", "安排接管后的下一手"],
  },
  搭档协同: {
    cue: "搭档已经控制牌桌时，先判断有没有必要覆盖",
    steps: ["确认搭档是否持权", "观察两家剩余张数", "决定让牌或接管"],
  },
  记牌推理: {
    cue: "把确定数量与可能分布分开，不猜看不见的牌",
    steps: ["统计已公开牌", "扣除自己的手牌", "只得出允许的范围"],
  },
  炸弹管理: {
    cue: "炸弹要换来关键牌权，还要有下一手可走",
    steps: ["判断是否必须阻断", "检查炸后下一手", "比较搭档能否处理"],
  },
  残局处理: {
    cue: "先把对手剩余张数换成可能的一手牌型",
    steps: ["确认对手张数", "判断最危险牌型", "保留对应拦截牌"],
  },
  进贡还贡: {
    cue: "先执行规则，再选择对手牌结构伤害最小的牌",
    steps: ["检查是否抗贡", "确认必须交出的牌", "选择最少拆组的还牌"],
  },
  组牌规划: {
    cue: "比较完整出牌顺序，不只比较眼前一次能出几张",
    steps: ["列出两条路线", "计算各自总手数", "保留关键接管牌"],
  },
  风险判断: {
    cue: "收益、失败后果和补救能力必须一起比较",
    steps: ["写出成功收益", "写出最坏结果", "确认是否还有补救"],
  },
};

const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
const difficulties: TrainingDifficulty[] = [
  "foundation",
  "intermediate",
  "advanced",
  "master",
];
const topicIds: Record<TrainingTopic, string> = {
  牌型识别: "pattern",
  逢人配: "wild",
  牌权控制: "control",
  搭档协同: "partner",
  记牌推理: "memory",
  炸弹管理: "bomb",
  残局处理: "endgame",
  进贡还贡: "tribute",
  组牌规划: "planning",
  风险判断: "risk",
};
const difficultyTask: Record<TrainingDifficulty, string> = {
  foundation: "只依据明确规则完成一步判断",
  intermediate: "比较两种都能执行的选择",
  advanced: "把搭档和对手状态放进判断",
  master: "比较行动之后的完整出牌路线",
};
const estimatedSeconds: Record<TrainingDifficulty, number> = {
  foundation: 20,
  intermediate: 28,
  advanced: 36,
  master: 45,
};

function variantParts(variant: number) {
  return {
    index: variant % 10,
    cycle: Math.floor(variant / 10),
  };
}

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

function rotateOptions(
  correct: string,
  distractors: [string, string, string],
  rotation: number
): { options: string[]; answer: number } {
  const source = [correct, ...distractors];
  if (new Set(source).size !== 4) {
    throw new Error(`选项不唯一: ${correct}`);
  }
  const amount = rotation % source.length;
  const options = [...source.slice(amount), ...source.slice(0, amount)];
  return { options, answer: options.indexOf(correct) };
}

function countDistractors(
  correctAmount: number,
  render: (amount: number) => string
): [string, string, string] {
  const amounts = [
    correctAmount - 1,
    correctAmount + 1,
    correctAmount + 2,
    correctAmount - 2,
    ...Array.from({ length: 9 }, (_, amount) => amount),
  ].filter(
    (amount, index, source) =>
      amount >= 0 &&
      amount <= 8 &&
      amount !== correctAmount &&
      source.indexOf(amount) === index
  );
  return [render(amounts[0]), render(amounts[1]), render(amounts[2])];
}

interface QuestionDraft {
  caseName: string;
  task: string;
  facts: string[];
  level: Rank;
  cards?: Card[];
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  reasoning: [string, string, string];
  principle: string;
  hint: string;
  expectedPatternType?: PatternType;
}

function clearCaseName(caseName: string): string {
  return caseName
    .replace(
      /\s*·\s*(?:牌例|局面|协同|记录|路线|决策)\s*\d+\s*$/,
      ""
    )
    .replace(/\s*·\s*/g, "，")
    .replace(/\s+/g, " ")
    .trim();
}

function makeQuestion(
  topic: TrainingTopic,
  difficulty: TrainingDifficulty,
  variant: number,
  draft: QuestionDraft
): TrainingQuestion {
  const id = `${difficulty}-${topicIds[topic]}-${variant}`;
  const caseName = clearCaseName(draft.caseName);
  return {
    id,
    title: `${topic}：${caseName}`,
    prompt: draft.task,
    context: `${topic}训练｜${difficultyTask[difficulty]}`,
    facts: draft.facts,
    level: draft.level,
    cards: draft.cards ?? [],
    ...rotateOptions(draft.correct, draft.distractors, variant),
    explanation: draft.explanation,
    reasoning: draft.reasoning,
    principle: draft.principle,
    hint: draft.hint,
    difficulty,
    topic,
    estimatedSeconds: estimatedSeconds[difficulty],
    expectedPatternType: draft.expectedPatternType,
  };
}

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
];
const steelWindows: Rank[][] = [
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
];

const patternNames = [
  "单点核验",
  "成对核验",
  "三张核验",
  "三带二拆分",
  "五张连续",
  "三个连续对子",
  "两个连续三张",
  "同点四张",
  "同花连续",
  "四王组合",
];

function patternQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const id = `${difficulty}-pattern-${variant}`;
  const rank = NORMAL_RANKS[(variant * 3 + difficulties.indexOf(difficulty)) % 13];
  const pairRank =
    NORMAL_RANKS[(variant * 5 + difficulties.indexOf(difficulty) + 4) % 13];
  let cards: Card[];
  let correct: string;
  let expectedPatternType: PatternType;
  let structure: string;

  if (index === 0) {
    cards = normalCards(id, rank, 1);
    correct = "单张";
    expectedPatternType = "single";
    structure = "只有 1 张牌";
  } else if (index === 1) {
    cards = normalCards(id, rank, 2);
    correct = "对子";
    expectedPatternType = "pair";
    structure = "2 张牌点数相同";
  } else if (index === 2) {
    cards = normalCards(id, rank, 3);
    correct = "三张";
    expectedPatternType = "triple";
    structure = "3 张牌点数相同";
  } else if (index === 3) {
    const other = pairRank === rank ? NORMAL_RANKS[(variant + 7) % 13] : pairRank;
    cards = [
      ...normalCards(`${id}-a`, rank, 3),
      ...normalCards(`${id}-b`, other, 2),
    ];
    correct = "三带二";
    expectedPatternType = "threeWithPair";
    structure = "一个三张加一个不同点数的对子";
  } else if (index === 4) {
    cards = sequenceCards(id, straightWindows[variant % 9], 1);
    correct = "五张顺子";
    expectedPatternType = "straight";
    structure = "5 个点数连续且每个点数 1 张";
  } else if (index === 5) {
    cards = sequenceCards(id, pairWindows[variant % 10], 2);
    correct = "三连对";
    expectedPatternType = "threePairs";
    structure = "3 个连续点数且每个点数 2 张";
  } else if (index === 6) {
    cards = sequenceCards(id, steelWindows[variant % 10], 3);
    correct = "钢板";
    expectedPatternType = "steelPlate";
    structure = "2 个连续点数且每个点数 3 张";
  } else if (index === 7) {
    cards = normalCards(id, rank, 4);
    correct = "四张炸弹";
    expectedPatternType = "bomb";
    structure = "4 张牌点数相同";
  } else if (index === 8) {
    cards = sequenceCards(
      id,
      straightWindows[variant % 9],
      1,
      suits[variant % 4]
    );
    correct = "同花顺";
    expectedPatternType = "straightFlush";
    structure = "5 张牌点数连续且花色相同";
  } else {
    cards = [
      card(`${id}-sj0`, "SJ", "joker", 0),
      card(`${id}-sj1`, "SJ", "joker", 1),
      card(`${id}-bj0`, "BJ", "joker", 0),
      card(`${id}-bj1`, "BJ", "joker", 1),
    ];
    correct = "四王炸";
    expectedPatternType = "jokerBomb";
    structure = "两张小王加两张大王";
  }

  const level = safeLevel(
    cards.map((item) => item.rank),
    variant + difficulties.indexOf(difficulty)
  );
  const taskByDifficulty: Record<TrainingDifficulty, string> = {
    foundation: "一次选中全部牌时，应当认作哪一种牌型",
    intermediate: "如果要一次打出全部牌，出牌记录应标成哪一类",
    advanced: "对手要求同牌型跟牌时，这组牌属于哪一种结构",
    master: "为了避免只看局部牌，整组牌的最终分类是什么",
  };
  const distractorPool = [
    "对子",
    "三张",
    "三带二",
    "五张顺子",
    "三连对",
    "钢板",
    "四张炸弹",
    "同花顺",
    "四王炸",
    "不构成完整牌型",
  ].filter((item) => item !== correct);
  return makeQuestion("牌型识别", difficulty, variant, {
    caseName: `${patternNames[index]} · 牌例 ${variant + 1}`,
    task: taskByDifficulty[difficulty],
    facts: [
      `当前打 ${level}`,
      structure,
      `本题必须使用全部 ${cards.length} 张牌`,
      cycle === 0
        ? "当前是自由出牌，不需要比较桌面牌"
        : cycle === 1
          ? `桌面要求跟出同类型，牌点至少高于 ${
              NORMAL_RANKS[(variant + 2) % NORMAL_RANKS.length]
            }`
          : cycle === 2
            ? `下家剩 ${2 + (variant % 5)} 张，误判牌型会直接交出牌权`
            : `搭档剩 ${3 + (variant % 6)} 张，本题还要确认整组牌没有遗漏`,
    ],
    level,
    cards,
    correct,
    distractors: [
      distractorPool[(variant + 1) % distractorPool.length],
      distractorPool[(variant + 4) % distractorPool.length],
      distractorPool[(variant + 7) % distractorPool.length],
    ],
    explanation: `全部牌合在一起满足${structure}，所以应识别为${correct}`,
    reasoning: [
      `先确认总数为 ${cards.length} 张`,
      `再核对结构：${structure}`,
      `全部牌都被同一结构覆盖，结论是${correct}`,
    ],
    principle: "牌型判断必须覆盖全部选中牌，不能只挑其中一部分解释",
    hint: `先数每个点数分别出现几次，再看这些点数是否连续`,
    expectedPatternType,
  });
}

const wildCaseNames = [
  "补成四张同点",
  "补成三张同点",
  "补成一个对子",
  "补齐五张连续",
  "补齐三个连续对子",
  "把三张扩成炸弹",
  "为三张补最后一张",
  "为孤张配成对子",
  "补顺子中间缺口",
  "补连对最后缺口",
];

function wildQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const level = NORMAL_RANKS[(variant * 5 + 4) % 13];
  const target =
    NORMAL_RANKS.find(
      (rank, index) => rank !== level && index >= (variant * 3) % 13
    ) ?? "9";
  const id = `${difficulty}-wild-${variant}`;
  const kind = index % 5;
  let cards: Card[];
  let result: string;
  let expectedPatternType: PatternType;
  let missing: string;

  if (kind === 0) {
    cards = [
      ...normalCards(`${id}-n`, target, 3),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    result = `四张 ${target} 炸弹`;
    expectedPatternType = "bomb";
    missing = `第 4 张 ${target}`;
  } else if (kind === 1) {
    cards = [
      ...normalCards(`${id}-n`, target, 2),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    result = `三张 ${target}`;
    expectedPatternType = "triple";
    missing = `第 3 张 ${target}`;
  } else if (kind === 2) {
    cards = [
      ...normalCards(`${id}-n`, target, 1),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    result = `${target} 对`;
    expectedPatternType = "pair";
    missing = `另一张 ${target}`;
  } else if (kind === 3) {
    const window = straightWindows[variant % 9];
    const missingIndex = (variant + 1) % 5;
    cards = [
      ...sequenceCards(
        `${id}-n`,
        window.filter((_, index) => index !== missingIndex),
        1
      ),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    result = "五张顺子";
    expectedPatternType = "straight";
    missing = `顺子中的 ${window[missingIndex]}`;
  } else {
    const window = pairWindows[variant % 10];
    const all = sequenceCards(`${id}-n`, window, 2);
    const missingIndex = (variant * 2 + 1) % all.length;
    const missingCard = all[missingIndex];
    cards = [
      ...all.filter((_, index) => index !== missingIndex),
      card(`${id}-wild`, level, "hearts", 1),
    ];
    result = "三连对";
    expectedPatternType = "threePairs";
    missing = `连对中另一张 ${missingCard.rank}`;
  }

  const correctByDifficulty: Record<TrainingDifficulty, string> = {
    foundation: `把逢人配当作${missing}`,
    intermediate: `用逢人配补上${missing}，组成${result}`,
    advanced: `用逢人配补上${missing}，把${result}一次打完`,
    master: `用逢人配补上${missing}完成${result}，其余完整组合不拆`,
  };
  const correct = correctByDifficulty[difficulty];
  return makeQuestion("逢人配", difficulty, variant, {
    caseName: `${wildCaseNames[index]} · 牌例 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? "红桃级牌应替代哪一个缺口"
        : difficulty === "intermediate"
          ? "完整使用这组牌时，最直接的成型结果是什么"
          : difficulty === "advanced"
            ? "哪种用法能明确减少总手数"
            : "兼顾本组牌与其余手牌时，哪种用法最容易解释",
    facts: [
      `当前打 ${level}`,
      `红桃 ${level} 是逢人配`,
      `普通牌目前缺少${missing}`,
      cycle === 0
        ? "只比较这组牌能否合法成型"
        : cycle === 1
          ? `另一条合法路线会留下 ${3 + (variant % 3)} 手散牌`
          : cycle === 2
            ? `下家剩 ${4 + (variant % 5)} 张，必须优先减少自己的总手数`
            : `搭档剩 ${2 + (variant % 6)} 张，保留完整组合可以制造接风`,
    ],
    level,
    cards,
    correct,
    distractors:
      difficulty === "foundation"
        ? [
            `把逢人配当作大小王`,
            `仍按普通红桃 ${level} 计算`,
            `把逢人配移到另一组完整牌中`,
          ]
        : difficulty === "intermediate"
          ? [
              `把逢人配留成单张级牌，让${missing}继续缺失`,
              `拆开现有牌，分成两手而不组成${result}`,
              `把逢人配放进已经完整的牌组，仍留下${missing}`,
            ]
          : [
              `保留逢人配不补${missing}，把本组拆成多手`,
              `把逢人配放进已经完整的对子，放弃${result}`,
              `只追求牌点更大，却让${result}无法一次打完`,
            ],
    explanation: `逢人配正好补上${missing}，整组牌可以形成${result}`,
    reasoning: [
      `先标出唯一缺口：${missing}`,
      `红桃 ${level} 可以替代普通点数牌，但不能替代大小王`,
      `补齐后全部牌组成${result}，没有留下散牌`,
    ],
    principle: "逢人配优先补真正缺少的位置，并比较补牌前后的总手数",
    hint: "先把红桃级牌拿开，看看剩余牌只差哪一张",
    expectedPatternType,
  });
}

const tableCaseNames = [
  "下家一手牌警报",
  "搭档持权观察",
  "接管后有顺子",
  "接管后只剩散牌",
  "上家试探小单",
  "下家只剩一手对子",
  "搭档连续让牌",
  "高牌只能接一次",
  "己方双重控制",
  "最后一张拦截牌",
];
const leadPatterns = [
  "9 对",
  "K 单张",
  "7 三张",
  "6 对",
  "8 单张",
  "Q 对",
  "10 三张",
  "J 单张",
  "5 对",
  "A 单张",
];

function controlQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const stateIndex = (index + cycle * 3) % 10;
  const opponent =
    [3, 12, 8, 10, 14, 2, 7, 5, 9, 1][stateIndex] + cycle;
  const partner = Math.min(
    27,
    [11, 6, 15, 5, 13, 9, 4, 17, 8, 12][(stateIndex + cycle) % 10] +
      cycle
  );
  const urgent = opponent <= 3 || stateIndex === 7;
  const clearNext = [true, false, true, false, true, false, false, true, true, false][
    (stateIndex + cycle) % 10
  ];
  const partnerControls = [false, true, false, true, false, false, true, false, true, false][
    (stateIndex + cycle * 2) % 10
  ];
  const leadPattern = leadPatterns[(index + cycle * 2) % 10];
  const level = NORMAL_RANKS[(variant * 7 + 2) % 13];
  let correct: string;
  if (difficulty === "foundation") {
    correct = `用同型且更大的牌压制${leadPattern}`;
  } else if (urgent) {
    correct = clearNext
      ? `下家只剩 ${opponent} 张，先用能压过${leadPattern}的最低同型牌接管，再出完整组合`
      : `下家只剩 ${opponent} 张，先接管阻止其出完，同时保留最高控制牌`;
  } else if (partnerControls) {
    correct = `搭档还有明确控制牌，先让其处理${leadPattern}，自己保留接管牌`;
  } else if (clearNext) {
    correct = `用能压过${leadPattern}的最低同型牌接管，随后打出已有完整组合`;
  } else {
    correct = `现在接管${leadPattern}后没有顺畅下一手，先让过并等待更好的接管机会`;
  }
  return makeQuestion("牌权控制", difficulty, variant, {
    caseName: `${tableCaseNames[index]} · 局面 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? `如果不用炸弹，哪一种普通牌能合法压制桌面的${leadPattern}`
        : "你有更大的同型牌，现在最合理的选择是什么",
    facts: [
      `当前打 ${level}`,
      `桌面是${leadPattern}`,
      `下家剩 ${opponent} 张，搭档剩 ${partner} 张`,
      clearNext ? "接管后有一组完整牌可继续出" : "接管后没有顺畅的下一手",
      partnerControls ? "搭档还保留一张明确控制牌" : "搭档没有明确控制牌信息",
      cycle === 0
        ? "本轮只比较普通同型牌"
        : cycle === 1
          ? `你还有 ${1 + (variant % 3)} 张更高同型牌可选`
          : cycle === 2
            ? `对手此前已经连续取得 ${1 + (variant % 2)} 次牌权`
            : `本队下一次明确接管机会只剩 ${1 + (variant % 2)} 次`,
    ],
    level,
    correct,
    distractors:
      difficulty === "foundation"
        ? [
            `换成张数更多但不同类型的普通牌去压${leadPattern}`,
            `用同点数但张数不同的普通牌去压${leadPattern}`,
            `用比${leadPattern}更小的同型牌试着取得牌权`,
          ]
        : [
            `只因为能压过${leadPattern}就立即接管，不考虑下一手`,
            `拆开接管后本可保留的完整组合，只追求更高牌点`,
            `下家还剩 ${opponent} 张，却把本轮和后续拦截都交给搭档`,
          ],
    explanation:
      difficulty === "foundation"
        ? `普通牌必须与${leadPattern}牌型相同、张数相同且点数更大才能压制；本题虽然能合法接管，但${
            clearNext
              ? "接管后还有完整组合可走，牌权才容易继续产生价值"
              : "接管后只剩散牌，实战中还要继续判断这次接管是否值得"
          }`
        : urgent
          ? `下家只剩 ${opponent} 张，先用能压住${leadPattern}的最低成本路线阻断，再安排下一手`
          : clearNext
            ? `压过${leadPattern}后还有完整组合可出，这次接管才能真正缩短出完路线`
            : `压过${leadPattern}后没有完整组合可走，赢下这一手只会把散牌难题留给自己`,
    reasoning: [
      `先看威胁，下家剩 ${opponent} 张`,
      clearNext ? "再看后续，你有完整组合可继续出" : "再看后续，你没有顺畅的下一手",
      partnerControls ? "最后把搭档的控制牌算入选择" : "最后保留一张自己的后续控制牌",
    ],
    principle: "接管牌权的价值取决于威胁是否紧急，以及接管后能不能继续出牌",
    hint: "先回答接管成功后的下一手准备出什么",
  });
}

function partnerQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const stateIndex = (index + cycle * 2) % 10;
  const opponent =
    [4, 13, 6, 2, 11, 8, 3, 15, 5, 9][stateIndex] + (cycle % 2);
  const partner =
    [8, 5, 12, 10, 4, 16, 7, 6, 14, 3][(stateIndex + cycle) % 10] +
    cycle;
  const passes = [0, 1, 2, 1, 3, 0, 2, 1, 0, 3][
    (stateIndex + cycle * 2) % 10
  ];
  const urgent = opponent <= 4;
  const partnerHasLead = (variant + cycle) % 3 !== 1;
  const level = NORMAL_RANKS[(variant * 3 + 5) % 13];
  const foundationTasks = [
    "固定座位不变时，怎样确认自己的搭档",
    "对手刚赢下一手时，第一步应观察什么",
    "搭档已经持权且没有立即威胁时，应该怎样配合",
    "搭档持权但下家接近出完时，应该提前准备什么",
    "只看到搭档一次过牌时，能得出什么结论",
    "搭档持权且下家仍有多张牌时，是否需要覆盖",
    "下家进入一手出完范围时，如何帮助搭档防守",
    "对手持权但没有收尾威胁时，怎样保存己方实力",
    "己方已经控制这一手时，为什么不必重复抢牌",
    "搭档多次让牌后，应该怎样更新判断",
  ];
  const foundationAnswers = [
    "先认准正对面的玩家，他是整局固定不变的搭档",
    "先确认牌权在对方手里，再比较搭档与下家的剩余张数",
    `搭档已经持权且下家还有 ${opponent} 张，先让搭档继续出`,
    `下家只剩 ${opponent} 张，保留能接住其最后一手的同型牌`,
    `一次过牌只说明搭档这次没接，不能据此断定他没有大牌`,
    `下家还有 ${opponent} 张且搭档已持权，不覆盖搭档，保留自己的高牌`,
    `下家只剩 ${opponent} 张，提前准备接管，防止其一手出完`,
    `对手持权但下家还有 ${opponent} 张，先观察一轮并保留接管牌`,
    `搭档已经拿到牌权，自己重复盖牌只会消耗同队的控制牌`,
    `把连续 ${passes} 次让牌当作线索，再结合牌型和剩余张数判断`,
  ];
  const foundationExplanations = [
    "四人掼蛋中，对家是固定搭档，先认清队伍关系才能判断让牌和接风",
    "先分清牌权属于哪一队，再判断是否需要抢回，而不是一看到能压就出牌",
    "己方已经控制牌桌时，没有紧急威胁就应避免自己人互相盖牌",
    "对手接近出完时，即使搭档当前持权，也要提前保留对应拦截",
    "过牌是一条公开线索，不等于完整展示手牌，结论必须保留余地",
    "搭档能继续控制时，让牌可以保住自己的高牌，留给下一次真正危险的回合",
    "剩余张数已经进入一手牌范围时，协同重点从省牌转为阻断",
    "没有立即危险时，保存接管牌比无目的争一手更有价值",
    "同队重复使用高牌不会增加牌权，只会减少后续防守能力",
    "连续行动比单次行动更有参考价值，但仍不能替代牌型和张数判断",
  ];
  const correct =
    difficulty === "foundation"
      ? foundationAnswers[index]
      : urgent
        ? `下家只剩 ${opponent} 张，准备接管并阻止其一手出完`
        : partnerHasLead
          ? `搭档已经持权且还有 ${partner} 张，先让其继续出，自己保留高牌`
          : passes >= 2
            ? `搭档连续让牌 ${passes} 次，把它当作线索并继续结合牌型判断`
            : `对手当前持权，先观察一轮，不把搭档一次过牌当成确定事实`;
  return makeQuestion("搭档协同", difficulty, variant, {
    caseName: `${tableCaseNames[(variant + 6) % 10]} · 协同 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? foundationTasks[index]
        : "结合牌权和剩余张数，你应该如何配合",
    facts: [
      `当前打 ${level}`,
      partnerHasLead ? "搭档刚刚赢下当前一手" : "对手刚刚赢下当前一手",
      `搭档剩 ${partner} 张，下家剩 ${opponent} 张`,
      passes === 0 ? "搭档尚未出现连续让牌" : `搭档此前连续让牌 ${passes} 次`,
      cycle === 0
        ? "当前只使用固定座位与公开行动判断"
        : cycle === 1
          ? `你手中还保留 ${1 + (variant % 3)} 次普通接管机会`
          : cycle === 2
            ? `另一名对手剩 ${6 + (variant % 7)} 张`
            : `搭档下一轮最可能需要你保留 ${1 + (variant % 2)} 种同型拦截`,
    ],
    level,
    correct,
    distractors:
      difficulty === "foundation"
        ? index === 0
          ? ["把上家当作固定搭档", "把下家当作固定搭档", "每轮重新选择搭档"]
          : [
              `不管牌权在${partnerHasLead ? "搭档" : "对手"}手里，立即打出自己最大的牌`,
              `只看搭档还剩 ${partner} 张，不看下家还剩 ${opponent} 张`,
              `把搭档让牌 ${passes} 次直接解释成他完全没有控制牌`,
            ]
        : [
            `不看下家还剩 ${opponent} 张，立刻覆盖搭档并只减少自己一张牌`,
            `仅凭搭档让牌 ${passes} 次就断定他没有大牌`,
            `只看自己的牌，不比较搭档 ${partner} 张与下家 ${opponent} 张`,
          ],
    explanation:
      difficulty === "foundation"
        ? foundationExplanations[index]
        : urgent
          ? "下家进入一手出完范围后，阻断优先级高于平常让牌"
          : partnerHasLead
            ? `搭档已经控制当前一手，下家还有 ${opponent} 张时应节省重复控制`
            : `搭档让牌 ${passes} 次只能提供线索，还要结合其 ${partner} 张手牌和后续行动更新`,
    reasoning: [
      difficulty === "foundation"
        ? `先回答本题关注的是座位、牌权、张数还是公开行动`
        : "先确认当前牌权属于己方还是对手",
      `再比较搭档 ${partner} 张与下家 ${opponent} 张的紧迫程度`,
      difficulty === "foundation"
        ? `最后只根据已知信息选择，不把让牌 ${passes} 次解释成完整手牌`
        : "最后决定是保留控制牌，还是立即替搭档阻断",
    ],
    principle: "搭档协同依赖可更新的线索，不把一次过牌解释成确定手牌",
    hint: "先判断下家是否已经可能一手出完",
  });
}

const memoryCaseNames = [
  "未见单点数量",
  "外部对子上限",
  "三张组合可能",
  "炸弹剩余上限",
  "级牌公开统计",
  "大王分布范围",
  "小王分布范围",
  "下家最后一手点数",
  "搭档已出关键牌",
  "两轮公开牌合并",
];

function memoryQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const stateIndex = (index + cycle * 3) % 10;
  const rank = NORMAL_RANKS[(variant * 9 + 1) % 13];
  const seen = [1, 2, 3, 4, 5, 2, 6, 3, 4, 7][stateIndex];
  const own = Math.min(
    8 - seen,
    [2, 1, 2, 1, 1, 3, 1, 2, 2, 1][(stateIndex + cycle) % 10]
  );
  const outside = 8 - seen - own;
  const opponent = [9, 7, 5, 4, 11, 3, 8, 2, 6, 1][
    (stateIndex + cycle * 2) % 10
  ];
  const maxOpponent = Math.min(outside, opponent);
  const level = NORMAL_RANKS[(variant * 5 + 7) % 13];
  const correct =
    difficulty === "foundation"
      ? `还有 ${8 - seen} 张 ${rank} 未公开`
      : difficulty === "intermediate"
        ? `外部最多还有 ${outside} 张 ${rank}`
        : difficulty === "advanced"
          ? `下家可能持有 0 至 ${maxOpponent} 张 ${rank}`
          : maxOpponent >= opponent
            ? `保留能压制 ${rank} 组合的牌，并按高风险范围防守`
            : `按 0 至 ${maxOpponent} 张的范围防守，不假定下家一定持有`;
  return makeQuestion("记牌推理", difficulty, variant, {
    caseName: `${memoryCaseNames[index]} · ${rank} · 记录 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? "根据已公开数量，还有多少张未公开"
        : difficulty === "intermediate"
          ? "再扣除自己的手牌后，外部最多还有多少张"
          : difficulty === "advanced"
            ? "在不知道具体分布时，对下家能得出什么范围"
            : "这个数量范围应该怎样改变你的出牌计划",
    facts: [
      `两副牌共有 8 张 ${rank}`,
      `桌面和明牌已经确认 ${seen} 张`,
      `你手里另有 ${own} 张`,
      `下家总共剩 ${opponent} 张`,
      cycle === 0
        ? "没有额外位置分布信息"
        : cycle === 1
          ? `搭档曾公开打出其中 ${Math.min(seen, 1 + (variant % 2))} 张`
          : cycle === 2
            ? `上家最多还能容纳 ${Math.min(outside, 2 + (variant % 4))} 张同点牌`
            : `本轮只允许把未见牌记成 0 至 ${outside} 张的范围`,
    ],
    level,
    cards: normalCards(
      `${difficulty}-memory-${variant}`,
      rank,
      Math.max(1, own)
    ),
    correct,
    distractors:
      difficulty === "foundation"
        ? countDistractors(
            8 - seen,
            (amount) => `还有 ${amount} 张 ${rank} 未公开`
          )
        : difficulty === "intermediate"
          ? countDistractors(
              outside,
              (amount) => `外部最多还有 ${amount} 张 ${rank}`
            )
          : [
              `下家一定持有全部 ${outside} 张 ${rank}`,
              `搭档持有全部未见的 ${rank}`,
              `${rank} 已经全部出完`,
            ],
    explanation: `总数 8 减已公开 ${seen}，再减自己持有 ${own}，外部最多剩 ${outside}`,
    reasoning: [
      `先算未公开数量：8 - ${seen} = ${8 - seen}`,
      `再扣自己的 ${own} 张，外部上限是 ${outside}`,
      `具体分布未知，下家只能落在 0 至 ${maxOpponent} 张之间`,
    ],
    principle: "记牌只能推出数量和范围，不能把未见牌直接指定给某位玩家",
    hint: `先计算 8 - ${seen}，再减去自己手里的 ${own}`,
  });
}

function bombQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const stateIndex = (index + cycle * 3) % 10;
  const size = [4, 5, 6, 4, 7, 5, 8, 4, 6, 5][stateIndex];
  const opponent =
    [3, 12, 5, 2, 9, 7, 1, 11, 4, 8][(stateIndex + cycle) % 10] +
    (cycle % 2);
  const partnerCover = [false, true, false, false, true, true, false, true, false, false][
    (stateIndex + cycle * 2) % 10
  ];
  const hasNext = [true, false, true, false, true, false, true, true, false, true][
    (stateIndex + cycle * 3) % 10
  ];
  const urgent = opponent <= 3;
  const level = NORMAL_RANKS[(variant * 5 + 1) % 13];
  const bombRank = level === "9" ? "8" : "9";
  const correct =
    difficulty === "foundation"
      ? `${size} 张 ${bombRank} 构成炸弹；下家剩 ${opponent} 张不改变牌型结论`
      : urgent
        ? hasNext
          ? `下家只剩 ${opponent} 张，现在用 ${size} 张炸弹阻断，再接着出完整组合`
          : `下家只剩 ${opponent} 张，用较低层级炸弹阻断，同时保留最高控制牌`
        : partnerCover
          ? `搭档还有控制牌，先让其处理，保留 ${size} 张炸弹给收尾回合`
          : hasNext
            ? `确认炸后能接着出完整组合时，才使用这组 ${size} 张炸弹`
            : `炸后只剩散牌，暂时保留这组 ${size} 张炸弹等待关键牌权`;
  return makeQuestion("炸弹管理", difficulty, variant, {
    caseName: `${tableCaseNames[(variant + 3) % 10]} · ${size} 张炸弹`,
    task:
      difficulty === "foundation"
        ? "先确认手中同点牌属于什么结构"
        : "现在是否值得使用炸弹",
    facts: [
      `你有 ${size} 张同点炸弹`,
      `下家剩 ${opponent} 张`,
      partnerCover ? "搭档还有一张可确认的控制牌" : "搭档没有明确控制牌信息",
      hasNext ? "炸后可以继续出一组完整牌" : "炸后只剩难处理散牌",
      cycle === 0
        ? "当前只比较是否构成炸弹"
        : cycle === 1
          ? `桌面威胁牌型还有 ${1 + (variant % 3)} 种普通拦截方式`
          : cycle === 2
            ? `你还持有一组 ${4 + (variant % 3)} 张的次级炸弹`
            : `若现在使用，后续只剩 ${variant % 2} 次明确接管机会`,
    ],
    level,
    cards: normalCards(
      `${difficulty}-bomb-${variant}`,
      bombRank,
      size
    ),
    correct,
    distractors:
      difficulty === "foundation"
        ? [
            `把 ${size} 张 ${bombRank} 当成普通三张`,
            `把同点牌误认成三带二`,
            `只因花色不同就把它认成同花顺`,
          ]
        : [
            `现在使用 ${size} 张炸弹，但不安排炸后的下一手`,
            `拆开这组 ${size} 张炸弹，只为处理一张小牌`,
            `下家还剩 ${opponent} 张，却把阻断留到对手已经出完之后`,
          ],
    explanation: urgent
      ? `下家只剩 ${opponent} 张时，这组 ${size} 张炸弹的阻断价值上升，但仍应先用较低层级`
      : partnerCover
        ? `搭档能处理当前威胁，保留这组 ${size} 张炸弹可以覆盖更关键的收尾回合`
        : `下家还有 ${opponent} 张且炸后没有后续，现在使用 ${size} 张炸弹只赢一手，不能改善整手牌`,
    reasoning: [
      `先看威胁，下家剩 ${opponent} 张`,
      partnerCover ? "再看搭档，当前威胁还有第二种处理方式" : "再看搭档，当前没有明确替代控制",
      hasNext ? "最后确认炸后有完整下一手" : "最后发现炸后没有顺畅下一手",
    ],
    principle: "炸弹用来改变关键回合，不用来机械赢下每一次比较",
    hint: "分别回答不炸会发生什么，以及炸完下一手出什么",
  });
}

const endgameShapes = [
  "单张",
  "对子",
  "三张",
  "五张顺子",
  "三带二",
  "三连对",
  "钢板",
  "两手小单张",
  "对子加单张",
  "未知一手组合",
];

function endgameQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const stateIndex = (index + cycle * 2) % 10;
  const remaining = [1, 2, 3, 5, 5, 6, 6, 2, 3, 4][stateIndex];
  const canBlock = [true, true, false, true, false, true, false, false, true, false][
    (stateIndex + cycle) % 10
  ];
  const partnerLead = [false, true, true, false, true, false, true, false, false, true][
    (stateIndex + cycle * 2) % 10
  ];
  const endgameShape = endgameShapes[stateIndex];
  const level = NORMAL_RANKS[(variant * 3 + 6) % 13];
  const correct =
    difficulty === "foundation"
      ? `先按 ${remaining} 张判断最危险的${endgameShape}`
      : canBlock
        ? `下家可能用${endgameShape}一次走完，保留对应同型控制牌优先拦截`
        : partnerLead
          ? `你没有直接压制${endgameShape}，让搭档继续持权并准备接风后的拦截`
          : `无法直接压住${endgameShape}，改变出牌顺序迫使对手拆开这 ${remaining} 张`;
  return makeQuestion("残局处理", difficulty, variant, {
    caseName: `${endgameShape}收尾 · 剩 ${remaining} 张 · 局面 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? "先把剩余张数对应到最危险的出完方式"
        : "为了阻止下家一手出完，现在应怎样安排",
    facts: [
      `下家只剩 ${remaining} 张`,
      `已知最可能牌型是${endgameShape}`,
      canBlock ? "你有对应同型控制牌" : "你没有直接同型压制",
      partnerLead ? "搭档目前持有牌权" : "当前牌权不在搭档手中",
      cycle === 0
        ? "本题先完成剩余张数与牌型的对应"
        : cycle === 1
          ? `上家还剩 ${4 + (variant % 7)} 张，暂时不是首要威胁`
          : cycle === 2
            ? `你最多还能主动取得 ${1 + (variant % 2)} 次牌权`
            : `搭档若本轮让牌，下一次接风最早在 ${1 + (variant % 3)} 手后`,
    ],
    level,
    correct,
    distractors:
      difficulty === "foundation"
        ? [
            "只按最大牌点判断，不看剩余张数",
            "把所有剩余牌都当成单张",
            "先计算自己的牌点，不判断对手牌型",
          ]
        : [
            `下家只剩 ${remaining} 张，仍按中盘顺序出牌而不调整拦截`,
            `先拆掉能处理${endgameShape}的同型控制牌去处理散牌`,
            `只保存最高单张，不管对手最可能的${endgameShape}`,
          ],
    explanation: canBlock
      ? `下家只剩可能一次打完的${endgameShape}，对应同型拦截牌比中盘少走一手更重要`
      : partnerLead
        ? `你不能直接压住${endgameShape}，应利用搭档牌权改变下一轮的出牌类型`
        : `你不能直接压住这 ${remaining} 张，只能通过出牌顺序迫使对手拆开${endgameShape}`,
    reasoning: [
      `先把 ${remaining} 张映射到${endgameShape}`,
      canBlock ? "再确认你有对应同型控制牌" : "再确认你没有直接同型压制",
      partnerLead ? "最后利用搭档牌权安排下一轮" : "最后调整顺序，争取改变对手要跟的牌型",
    ],
    principle: "残局先判断对手最少还要几手，再决定哪些牌必须保留",
    hint: `问自己，对手能不能把这 ${remaining} 张一次打完`,
  });
}

interface TributeCase {
  name: string;
  fact: string;
  best: string;
  alternatives: [string, string, string];
  why: string;
}

const tributeCases: TributeCase[] = [
  {
    name: "四王抗贡检查",
    fact: "你同时持有两张大王和两张小王",
    best: "先确认满足抗贡条件，再进入下一步",
    alternatives: ["直接交出一张大王", "先选择一张还贡牌", "先交换两张级牌"],
    why: "持有四王时应先执行抗贡检查",
  },
  {
    name: "大王进贡顺序",
    fact: "你需要进贡且手中最高牌是大王",
    best: "按规则交出大王",
    alternatives: ["改交小王", "改交普通 A", "先保留最高牌再决定"],
    why: "不满足抗贡时必须交出应贡的最高牌",
  },
  {
    name: "孤张还贡选择",
    fact: "可还的两张低牌中，一张是孤张，一张连接顺子",
    best: "还出孤张，保留顺子连接牌",
    alternatives: ["还出顺子连接牌", "拆开一个对子还牌", "选择更高的单张还牌"],
    why: "孤张对原有组合破坏最小",
  },
  {
    name: "对子保护还贡",
    fact: "最低两张牌中，一张属于对子，另一张是孤张",
    best: "还出孤张，保留完整对子",
    alternatives: ["拆对还出其中一张", "还出更高的三张组件", "先拆顺子再比较"],
    why: "完整对子比同点孤张更容易一次处理",
  },
  {
    name: "顺子端点保护",
    fact: "一张低牌是顺子端点，另一张低牌不连接任何组合",
    best: "还出不连接组合的低牌",
    alternatives: ["还出顺子端点", "拆开一组三张", "还出级牌"],
    why: "保留端点可以维持五张连续结构",
  },
  {
    name: "炸弹组件保护",
    fact: "一张低牌属于四张同点，另一张是普通孤张",
    best: "还出普通孤张，保留四张同点",
    alternatives: ["拆开四张同点还牌", "改还一张王", "先拆对子再还牌"],
    why: "拆开四张同点会直接损失炸弹结构",
  },
  {
    name: "级牌还贡边界",
    fact: "红桃级牌是逢人配，另有一张合法普通低牌",
    best: "优先还普通低牌，保留逢人配",
    alternatives: ["优先还红桃级牌", "拆开一组连对还牌", "改还一张高牌"],
    why: "逢人配能补多个结构，保留价值通常更高",
  },
  {
    name: "双贡次序确认",
    fact: "上一局形成双下，本局需要按双贡规则执行",
    best: "先确认进贡对象和次序，再交对应最高牌",
    alternatives: ["两人把牌交给同一玩家", "先私下交换低牌", "跳过对象确认直接发牌"],
    why: "双贡需要先确定对应关系，不能只知道要交最高牌",
  },
  {
    name: "还贡后的手数比较",
    fact: "还 A 会留下 5 手，还是还 B 会留下 4 手",
    best: "在规则允许时还出 B，使剩余手牌保持 4 手",
    alternatives: ["还出 A 并接受多一手", "只比较 A 与 B 的牌点", "拆开更大的完整组合"],
    why: "还贡选择应比较剩余手牌总手数",
  },
  {
    name: "规则与策略分层",
    fact: "你既要完成进贡，又想保护自己的顺子",
    best: "先确定必须交出的最高牌，再规划剩余组合",
    alternatives: ["先保护顺子再决定是否进贡", "改用搭档的牌完成进贡", "先选择还贡牌再交最高牌"],
    why: "规则义务先于策略优化，两个步骤不能颠倒",
  },
];

function tributeQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const item = tributeCases[index];
  const level = NORMAL_RANKS[(variant * 7 + 4) % 13];
  return makeQuestion("进贡还贡", difficulty, variant, {
    caseName: `${item.name} · 局面 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? "第一步应当确认什么"
        : difficulty === "intermediate"
          ? "哪种选择对剩余牌结构伤害更小"
          : difficulty === "advanced"
            ? "同时满足规则和组牌目标时，应怎样处理"
            : "把规则义务和后续手数放在一起，最佳顺序是什么",
    facts: [
      `当前打 ${level}`,
      item.fact,
      "本题按标准进贡还贡流程判断",
      cycle === 0
        ? "先确认规则动作是否成立"
        : cycle === 1
          ? `两种合法还牌会分别留下 ${3 + (variant % 3)} 手与 ${
              4 + (variant % 3)
            } 手`
          : cycle === 2
            ? `下家剩 ${5 + (variant % 6)} 张，不能为还贡拆掉拦截组合`
            : `搭档剩 ${2 + (variant % 6)} 张，还牌后仍要保留一次接风机会`,
    ],
    level,
    cards:
      variant === 0
        ? [
            card(`${difficulty}-tribute-sj0`, "SJ", "joker", 0),
            card(`${difficulty}-tribute-sj1`, "SJ", "joker", 1),
            card(`${difficulty}-tribute-bj0`, "BJ", "joker", 0),
            card(`${difficulty}-tribute-bj1`, "BJ", "joker", 1),
          ]
        : [],
    correct: item.best,
    distractors: item.alternatives,
    explanation: item.why,
    reasoning: [
      "先判断是否存在抗贡或必须进贡的规则条件",
      `再看手牌结构：${item.fact}`,
      `最后选择既合法又少拆完整组合的处理方式`,
    ],
    principle: "进贡先保证规则正确，还贡再减少对完整组合的破坏",
    hint: "把必须做的规则动作和可以优化的策略动作分开",
  });
}

const planningCases = [
  {
    name: "顺子与孤张",
    routeA: "保留顺子，再分两手处理孤张",
    routeB: "拆顺子连接孤张，剩余需要四手",
    best: "保留顺子，按三手路线处理",
  },
  {
    name: "三带二成型",
    routeA: "三张和对子合成三带二，一手处理",
    routeB: "三张与对子分开，需要两手",
    best: "组成三带二，减少一手",
  },
  {
    name: "连对与两个对子",
    routeA: "保留三连对，一手处理六张",
    routeB: "拆成三个对子，需要三手",
    best: "保留三连对，按更少手数出牌",
  },
  {
    name: "钢板与散三张",
    routeA: "两个连续三张组成钢板",
    routeB: "把两组三张分两手处理",
    best: "组成钢板，一手处理六张",
  },
  {
    name: "炸弹后的下一手",
    routeA: "炸弹接管后还有完整顺子",
    routeB: "先拆炸弹处理两张孤牌",
    best: "保留炸弹完整性，并安排炸后顺子",
  },
  {
    name: "逢人配双用途",
    routeA: "补顺子后共剩三手",
    routeB: "补对子后共剩四手",
    best: "用逢人配补顺子，选择三手路线",
  },
  {
    name: "搭档接风路线",
    routeA: "自己三手出完，但会覆盖搭档",
    routeB: "自己四手出完，第三手让搭档接风",
    best: "比较团队共同出完概率，优先保留接风路线",
  },
  {
    name: "高牌保留顺序",
    routeA: "先出小组合，保留高对子接管",
    routeB: "先出高对子，后面只剩被动散牌",
    best: "先清理小组合，保留高对子接管",
  },
  {
    name: "最后一手牌型封锁",
    routeA: "保留对子，拦截下家的最后两张",
    routeB: "拆对处理孤张，失去同型拦截",
    best: "保留对子，优先阻止对手一手出完",
  },
  {
    name: "两条同手数路线",
    routeA: "三手出完并保留一张控制牌",
    routeB: "三手出完但第一手失去牌权",
    best: "选择保留控制牌的三手路线",
  },
];

function planningQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const item = planningCases[index];
  const level = NORMAL_RANKS[(variant * 7 + 5) % 13];
  return makeQuestion("组牌规划", difficulty, variant, {
    caseName: `${item.name} · 路线 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? "只计算合法拆分，哪条路线手数更少"
        : difficulty === "intermediate"
          ? "把下一手也算进去，哪条路线更顺"
          : difficulty === "advanced"
            ? "加入对手张数后，哪条路线保留更多控制"
            : "以己方两人共同出完为目标，应选择哪条路线",
    facts: [
      `当前打 ${level}`,
      `路线 A：${item.routeA}`,
      `路线 B：${item.routeB}`,
      difficulty === "foundation"
        ? "本题暂不考虑被压制"
        : difficulty === "intermediate"
          ? "两条路线当前都能合法执行"
          : difficulty === "advanced"
            ? "下家已经接近两手出完"
            : "搭档需要一次接风机会",
      cycle === 0
        ? `路线比较从第 ${1 + (variant % 2)} 手开始`
        : cycle === 1
          ? `路线 A 保留 ${1 + (variant % 2)} 张控制牌，路线 B 不保留控制牌`
          : cycle === 2
            ? `下家预计还需 ${1 + (variant % 3)} 手出完`
            : `搭档预计还需 ${2 + (variant % 3)} 手出完`,
    ],
    level,
    correct: item.best,
    distractors: [
      `只看路线 A 的第一手，不继续计算「${item.routeA}」之后剩什么`,
      `因为牌点更大就选路线 B，即使「${item.routeB}」需要更多手`,
      `先拆开${item.name}中的完整组合，再碰运气看能否重新组成`,
    ],
    explanation: `${item.best}，因为规划目标是减少整手牌的总手数并保留关键牌权`,
    reasoning: [
      `先写出路线 A：${item.routeA}`,
      `再写出路线 B：${item.routeB}`,
      `比较总手数、下一手和团队牌权后，选择${item.best}`,
    ],
    principle: "组牌规划比较完整顺序，不用眼前一次处理张数代替总手数",
    hint: "把两条路线都写到至少第二手，再比较剩余结构",
  });
}

const riskCases = [
  { name: "高收益可补救", success: 72, benefit: "减少一手", loss: "丢一次牌权", rescue: true },
  { name: "高收益无补救", success: 72, benefit: "减少一手", loss: "让下家直接出完", rescue: false },
  { name: "低概率小收益", success: 43, benefit: "少出一张", loss: "拆开完整顺子", rescue: true },
  { name: "五五开收尾", success: 51, benefit: "抢到先手", loss: "下家连续处理五张", rescue: false },
  { name: "稳定路线保控制", success: 81, benefit: "保留高对子", loss: "多走一手", rescue: true },
  { name: "激进路线耗尽控制", success: 64, benefit: "一次处理六张", loss: "用完全部高牌", rescue: false },
  { name: "搭档可二次接管", success: 58, benefit: "制造接风", loss: "自己多留一张", rescue: true },
  { name: "对手一手牌威胁", success: 67, benefit: "阻止下家出完", loss: "拆开一个炸弹", rescue: false },
  { name: "两条等收益路线", success: 76, benefit: "都能减少一手", loss: "其中一条没有下一手", rescue: true },
  { name: "信息不足先保守", success: 55, benefit: "可能抢到牌权", loss: "失败后没有已知拦截", rescue: false },
];

function riskQuestion(
  difficulty: TrainingDifficulty,
  variant: number
): TrainingQuestion {
  const { index, cycle } = variantParts(variant);
  const item = riskCases[index];
  const level = NORMAL_RANKS[(variant * 5 + 10) % 13];
  const shouldAttack =
    item.success >= 65 &&
    (item.rescue || item.benefit.includes("阻止") || !item.loss.includes("直接"));
  const foundationTasks = [
    "有收益也有损失时，第一步怎样比较",
    "失败会让对手直接出完时，最先确认什么",
    "成功机会不高且收益很小时，怎样判断是否值得",
    "接近五五开但失败后很危险时，应该关注什么",
    "稳定路线会多走一手时，为什么仍可能更好",
    "一次能出很多牌但会耗尽高牌时，怎样比较",
    "搭档能补救一次时，这次机会应该怎样使用",
    "对手即将出完时，什么时候可以承担结构损失",
    "两条路线收益相同时，应该用什么继续比较",
    "看不清对手分布时，怎样避免无依据冒险",
  ];
  const foundationAnswers = [
    `把成功时的「${item.benefit}」和失败时的「${item.loss}」放在一起比较`,
    `先确认失败会导致「${item.loss}」，并检查是否存在第二道防线`,
    `成功率只有 ${item.success}%，收益只是${item.benefit}，不值得用${item.loss}交换`,
    `不要只看 ${item.success}% 的成功率，先看失败后「${item.loss}」能否承受`,
    `稳定路线虽然会${item.loss}，但能${item.benefit}，后面仍有接管机会`,
    `一次处理六张不等于更好，先确认用完高牌后还能否重新拿到牌权`,
    `搭档的补救只算一次保险，当前路线仍要保留自己的退路`,
    `下家即将出完时，阻断收益足够大，可以为此承担一次拆弹代价`,
    `两条路线都能减少一手时，选择出完后仍有明确下一手的路线`,
    `信息不足且失败后没有拦截时，先选可回退的稳妥路线`,
  ];
  const foundationExplanations = [
    "风险不是单看成功率，而是把成功收益和失败后果放在同一个决定里",
    "会直接输掉收尾的失败后果必须优先检查，不能被表面的高成功率盖住",
    "小收益无法补偿明显的结构损失，尤其是在成功机会本来就不高时",
    "接近五五开的选择更要比较失败后果，因为概率本身不能替你承担损失",
    "稳定路线的价值在于保留下一次控制，而不是只追求少走一手",
    "一次多出几张只是眼前收益，耗尽高牌会让后续每一手都被动",
    "搭档能补救会降低风险，但这份补救不能被当成无限次数使用",
    "对手即将走完时，阻断的紧迫性可以高于保护一般牌组",
    "收益相同就继续比较失败后果、下一手和谁还握有牌权",
    "信息不足时应选择失败后仍能补救的路线，而不是猜一个最好结果",
  ];
  const correct =
    difficulty === "foundation"
      ? foundationAnswers[index]
      : shouldAttack
        ? item.rescue
          ? `选择能${item.benefit}的进攻路线，同时保留控制牌防止${item.loss}`
          : `为了${item.benefit}而承担一次风险，因为更需要避免${item.loss}`
        : item.rescue
          ? `选择较稳路线，避免${item.loss}，把搭档补救留给更关键回合`
          : `降低风险，不用${item.loss}去交换${item.benefit}`;
  return makeQuestion("风险判断", difficulty, variant, {
    caseName: `${item.name} · 决策 ${variant + 1}`,
    task:
      difficulty === "foundation"
        ? foundationTasks[index]
        : "在收益、失败后果和补救能力之间，哪种决策更稳健",
    facts: [
      `当前打 ${level}`,
      `进攻路线成功概率约 ${item.success}%`,
      `成功收益：${item.benefit}`,
      `失败后果：${item.loss}`,
      item.rescue ? "搭档还有一次明确补救" : "搭档没有明确补救牌",
      cycle === 0
        ? "本题先把收益和损失放在同一张表里"
        : cycle === 1
          ? `你还保留 ${1 + (variant % 3)} 张普通控制牌`
          : cycle === 2
            ? `下家最少还需 ${1 + (variant % 2)} 手出完`
            : `失败后重新取得牌权至少需要 ${2 + (variant % 3)} 手`,
    ],
    level,
    correct,
    distractors: [
      `只因为成功率是 ${item.success}% 就进攻，不看失败后会${item.loss}`,
      `只看成功时能${item.benefit}，不计算失败后果`,
      item.rescue
        ? `把搭档的一次补救当成每次都能成功，不保留自己的退路`
        : `搭档没有明确补救，仍假定失败后一定有人接管`,
    ],
    explanation:
      difficulty === "foundation"
        ? foundationExplanations[index]
        : item.rescue
          ? `搭档能补救一次，可以尝试${item.benefit}，但仍要保留至少一道控制避免${item.loss}`
          : `没有补救时，「${item.loss}」必须显著提高选择「${item.benefit}」的门槛`,
    reasoning: [
      `先看收益：${item.benefit}`,
      `再看最坏结果：${item.loss}`,
      item.rescue ? "最后确认搭档有一次补救，但不能重复透支" : "最后确认没有第二道防线，因此提高安全要求",
    ],
    principle: "风险判断把成功收益、失败后果和补救能力放在同一张表里",
    hint: "先用一句话说清楚失败时会发生什么",
  });
}

const builders: Record<
  TrainingTopic,
  (difficulty: TrainingDifficulty, variant: number) => TrainingQuestion
> = {
  牌型识别: patternQuestion,
  逢人配: wildQuestion,
  牌权控制: controlQuestion,
  搭档协同: partnerQuestion,
  记牌推理: memoryQuestion,
  炸弹管理: bombQuestion,
  残局处理: endgameQuestion,
  进贡还贡: tributeQuestion,
  组牌规划: planningQuestion,
  风险判断: riskQuestion,
};

function createTrainingBank(): TrainingQuestion[] {
  return difficulties.flatMap((difficulty, difficultyIndex) =>
    trainingTopics.flatMap((topic) =>
      Array.from({ length: 10 }, (_, variant) =>
        builders[topic](difficulty, difficultyIndex * 10 + variant)
      )
    )
  );
}

export const trainingBank = createTrainingBank();

export function normalizeTrainingText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9]+(?:\.[0-9]+)?%?/g, "#")
    .replace(/\b(?:a|k|q|j|sj|bj)\b/gi, "牌")
    .replace(/\s+/g, "")
    .replace(/[，、“”·｜：:；;（）()]/g, "");
}

function cardStructure(cards: Card[]): string {
  const counts = new Map<string, number>();
  for (const item of cards) {
    const key = `${item.rank}-${item.suit}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}:${count}`)
    .join("|");
}

export function trainingQuestionFingerprint(question: TrainingQuestion): string {
  return normalizeTrainingText(
    [
      question.topic,
      question.difficulty,
      question.prompt,
      ...question.facts,
      question.options[question.answer],
      cardStructure(question.cards),
    ].join("|")
  );
}

export function trainingScenarioFingerprint(question: TrainingQuestion): string {
  return [
    question.topic,
    ...question.facts,
    cardStructure(question.cards),
  ]
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，、“”·｜：:；;（）()]/g, "");
}

export const trainingBankStats = {
  total: trainingBank.length,
  byDifficulty: Object.fromEntries(
    difficulties.map((difficulty) => [
      difficulty,
      trainingBank.filter((question) => question.difficulty === difficulty)
        .length,
    ])
  ) as Record<TrainingDifficulty, number>,
  byTopic: Object.fromEntries(
    trainingTopics.map((topic) => [
      topic,
      trainingBank.filter((question) => question.topic === topic).length,
    ])
  ) as Record<TrainingTopic, number>,
  byDifficultyAndTopic: Object.fromEntries(
    difficulties.map((difficulty) => [
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
    ])
  ) as Record<TrainingDifficulty, Record<TrainingTopic, number>>,
  uniqueScenarioRate:
    new Set(trainingBank.map(trainingScenarioFingerprint)).size /
    trainingBank.length,
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
