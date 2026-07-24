"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Hand,
  History,
  Layers3,
  Lightbulb,
  MessageCircleQuestion,
  Medal,
  Pause,
  RefreshCw,
  Route,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardBack, CardFace } from "./components/CardFace";
import {
  applySelectedCards,
  createGame,
  getGameResultLabel,
  pass,
  play,
  selectedPattern,
} from "@/lib/guandan/game";
import { chooseAiMove, explainMove, publicSituation, scoreLegalMoves } from "@/lib/guandan/strategy";
import {
  Card,
  DecisionExplanation,
  Difficulty,
  GameState,
  ProgressSummary,
  ScoredMove,
  Seat,
} from "@/lib/guandan/types";
import { cardLabel, isWild, seatTeam } from "@/lib/guandan/cards";
import {
  questionForSession,
  trainingBank,
  trainingBankStats,
  trainingDifficultyMeta,
  trainingTopics,
  trainingTopicTips,
  TrainingDifficulty,
  TrainingTopic,
} from "@/lib/guandan/training";

type View = "table" | "training" | "insights" | "rules";
type CoachQuestion = "evidence" | "risk" | "partner" | "compare";
type CoachPanelView = "coach" | "history";
type HistoryFilter = "all" | "team" | "opponents";
type HistoryRow = {
  record: GameState["records"][number];
  remainingAfter: number;
};

const seatNames: Record<Seat, string> = {
  0: "你",
  1: "北家",
  2: "搭档",
  3: "南家",
};

const seatPositions: Record<Seat, string> = {
  0: "本家",
  1: "下家",
  2: "对家",
  3: "上家",
};

const emptyProgress: ProgressSummary = {
  games: 0,
  wins: 0,
  decisions: 0,
  strongDecisions: 0,
  trainingCompleted: 0,
  rating: 800,
  streak: 0,
  questionsAnswered: 0,
  questionsCorrect: 0,
  reviewDue: 0,
  reviewQuestionIds: [],
  skills: [],
};

const difficultyMeta: Record<
  Difficulty,
  { name: string; description: string; speed: number }
> = {
  beginner: { name: "入门陪练", description: "保留随机性，适合熟悉牌型", speed: 760 },
  advanced: { name: "进阶牌手", description: "关注牌效、牌权和基本配合", speed: 580 },
  master: { name: "大师推演", description: "优先团队收益和残局控制", speed: 420 },
};

const topicDescriptions: Record<TrainingTopic, string> = {
  牌型识别: "先把合法性判断练成直觉",
  逢人配: "衡量万能牌的结构机会成本",
  牌权控制: "夺权前先写清下一手出口",
  搭档协同: "从出牌和张数读取伙伴意图",
  记牌推理: "只追踪会改变决策的关键信息",
  炸弹管理: "把炸弹当作终局控制资源",
  残局处理: "识别一手走完与接风窗口",
  进贡还贡: "用最低结构损失完成交换",
  组牌规划: "比较整手牌的出完路径",
  风险判断: "同时计算收益和失败代价",
};

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function skillPercent(
  progress: ProgressSummary,
  topic: TrainingTopic,
  fallback: number
) {
  const skill = progress.skills.find((item) => item.skill === topic);
  return skill?.attempted ? percent(skill.correct, skill.attempted) : fallback;
}

type AcademyAppProps = {
  initialSeed: number;
};

export default function AcademyApp({ initialSeed }: AcademyAppProps) {
  const [view, setView] = useState<View>("table");
  const [state, setState] = useState<GameState>(() => createGame(initialSeed));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("advanced");
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [coach, setCoach] = useState<DecisionExplanation | null>(null);
  const [coachQuestion, setCoachQuestion] =
    useState<CoachQuestion>("evidence");
  const [coachPanelView, setCoachPanelView] =
    useState<CoachPanelView>("coach");
  const [trainingVision, setTrainingVision] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [reviewRecordId, setReviewRecordId] = useState<number | null>(null);
  const [notice, setNotice] = useState("请选择牌后出牌，或先查看推荐");
  const [progress, setProgress] = useState<ProgressSummary>(emptyProgress);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [trainingDifficulty, setTrainingDifficulty] =
    useState<TrainingDifficulty>("foundation");
  const [trainingTopic, setTrainingTopic] = useState<TrainingTopic | "all">(
    "all"
  );
  const [trainingMode, setTrainingMode] = useState<"adaptive" | "review">(
    "adaptive"
  );
  const [quizSeed, setQuizSeed] = useState(initialSeed);
  const [hintVisible, setHintVisible] = useState(false);
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const recordedSeed = useRef<number | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(
    () => selectedPattern(state, selectedIds),
    [selectedIds, state]
  );
  const latestRecord = state.records.at(-1);
  const reviewedRecord =
    reviewRecordId === null
      ? undefined
      : state.records.find((record) => record.id === reviewRecordId);
  const selectedCoach = useMemo(
    () => (selected ? explainMove(state, 0, selected) : null),
    [selected, state]
  );
  const activeCoach = coachEnabled
    ? reviewedRecord?.explanation ??
      selectedCoach ??
      coach ??
      latestRecord?.explanation ??
      null
    : null;
  const activeCoachSource = reviewedRecord
    ? `复盘第 ${reviewedRecord.id} 手 · ${seatNames[reviewedRecord.seat]}`
    : selectedCoach
      ? "正在分析你的试选"
      : coach
        ? "推荐路线"
        : latestRecord
          ? `刚刚 · ${seatNames[latestRecord.seat]}`
          : "等待你的选择";
  const coachCandidates = useMemo(
    () => {
      if (state.currentSeat !== 0 || state.winnerTeam !== undefined) return [];
      const seen = new Set<string>();
      return scoreLegalMoves(state, 0, "master")
        .filter((candidate) => {
          const key = candidate.pattern
            ? `${candidate.pattern.type}:${[
                ...candidate.pattern.resolvedRanks,
              ]
                .sort()
                .join(",")}:${candidate.pattern.size}`
            : "pass";
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 3);
    },
    [state]
  );
  const historyRows = useMemo(() => {
    const remaining = state.hands.map(
      (hand, seat) =>
        hand.length +
        state.records
          .filter((record) => record.seat === seat && record.pattern)
          .reduce(
            (sum, record) => sum + (record.pattern?.cards.length ?? 0),
            0
          )
    );
    return state.records.map((record) => {
      if (record.pattern) {
        remaining[record.seat] -= record.pattern.cards.length;
      }
      return {
        record,
        remainingAfter: remaining[record.seat],
      };
    });
  }, [state.hands, state.records]);
  const visibleHistoryRows = historyRows
    .filter(({ record }) => {
      if (historyFilter === "all") return true;
      const sameTeam = seatTeam(record.seat) === 0;
      return historyFilter === "team" ? sameTeam : !sameTeam;
    });
  visibleHistoryRows.reverse();
  const humanRecords = state.records.filter((record) => record.seat === 0);
  const strongHumanDecisions = humanRecords.filter(
    (record) =>
      record.explanation?.quality === "精确" ||
      record.explanation?.quality === "稳健"
  ).length;
  const difficultyQuestions = useMemo(
    () =>
      trainingBank.filter(
        (question) => question.difficulty === trainingDifficulty
      ),
    [trainingDifficulty]
  );
  const filteredQuestions = useMemo(
    () =>
      difficultyQuestions.filter(
        (question) =>
          (trainingTopic === "all" || question.topic === trainingTopic)
      ),
    [difficultyQuestions, trainingTopic]
  );
  const adaptiveQuestions =
    filteredQuestions.length > 0 ? filteredQuestions : difficultyQuestions;
  const reviewQuestions = useMemo(() => {
    const ids = new Set(progress.reviewQuestionIds);
    return trainingBank.filter(
      (question) =>
        ids.has(question.id) &&
        question.difficulty === trainingDifficulty &&
        (trainingTopic === "all" || question.topic === trainingTopic)
    );
  }, [progress.reviewQuestionIds, trainingDifficulty, trainingTopic]);
  const reviewEmpty = trainingMode === "review" && reviewQuestions.length === 0;
  const questionPool =
    trainingMode === "review" && !reviewEmpty
      ? reviewQuestions
      : adaptiveQuestions;
  const currentQuiz = questionForSession(questionPool, quizIndex, quizSeed);
  const currentTip = trainingTopicTips[currentQuiz.topic];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/progress")
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (!cancelled && value) {
          setProgress({ ...emptyProgress, ...(value as ProgressSummary) });
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      state.winnerTeam === undefined ||
      recordedSeed.current === state.seed
    ) {
      return;
    }
    recordedSeed.current = state.seed;
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "game",
        won: state.winnerTeam === 0,
        decisions: humanRecords.length,
        strongDecisions: strongHumanDecisions,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => value && setProgress({ ...emptyProgress, ...value }))
      .catch(() => null);
  }, [
    humanRecords.length,
    state.seed,
    state.winnerTeam,
    strongHumanDecisions,
  ]);

  useEffect(() => {
    if (state.currentSeat === 0 || state.winnerTeam !== undefined) return;
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      setState((current) => {
        if (current.currentSeat === 0 || current.winnerTeam !== undefined) {
          return current;
        }
        const seat = current.currentSeat;
        const choice = chooseAiMove(current, seat, difficulty);
        try {
          return choice.pattern
            ? play(current, seat, choice.pattern)
            : pass(current, seat);
        } catch {
          const fallback = scoreLegalMoves(current, seat, "master").find(
            (candidate) => candidate.pattern
          );
          return fallback?.pattern
            ? play(current, seat, fallback.pattern)
            : current.target
              ? pass(current, seat)
              : current;
        }
      });
    }, difficultyMeta[difficulty].speed);
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, [difficulty, state.currentSeat, state.turn, state.winnerTeam]);

  const startNewGame = () => {
    setState(createGame());
    setSelectedIds([]);
    setCoach(null);
    setReviewRecordId(null);
    setCoachQuestion("evidence");
    setCoachPanelView("coach");
    setNotice("新的一局已经发牌，本局从打 2 开始");
  };

  const toggleCard = (id: string) => {
    if (state.currentSeat !== 0 || state.winnerTeam !== undefined) return;
    setCoach(null);
    setReviewRecordId(null);
    setCoachQuestion("evidence");
    setCoachPanelView("coach");
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id]
    );
  };

  const handlePlay = () => {
    try {
      const next = applySelectedCards(state, selectedIds);
      setState(next);
      setSelectedIds([]);
      setCoach(null);
      setReviewRecordId(null);
      setNotice(selected ? `已出 ${selected.label}` : "已出牌");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法完成出牌");
    }
  };

  const handlePass = () => {
    try {
      setState(pass(state, 0));
      setSelectedIds([]);
      setCoach(null);
      setReviewRecordId(null);
      setNotice("已过牌，继续观察其余玩家的选择");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "当前不能过牌");
    }
  };

  const showHint = () => {
    const best = scoreLegalMoves(state, 0, "master")[0];
    if (!best) {
      setNotice("当前没有可用动作");
      return;
    }
    setCoach(explainMove(state, 0, best.pattern));
    setSelectedIds(best.pattern?.cards.map((card) => card.id) ?? []);
    setReviewRecordId(null);
    setCoachQuestion("evidence");
    setCoachPanelView("coach");
    setNotice(`建议 ${best.pattern?.label ?? "过牌"}，已在右侧解释原因`);
  };

  const tryCoachCandidate = (candidate: ScoredMove) => {
    if (state.currentSeat !== 0 || state.winnerTeam !== undefined) return;
    setReviewRecordId(null);
    setCoachPanelView("coach");
    setCoachQuestion("evidence");
    setSelectedIds(candidate.pattern?.cards.map((card) => card.id) ?? []);
    setCoach(explainMove(state, 0, candidate.pattern));
    setNotice(
      candidate.pattern
        ? `已试选 ${candidate.pattern.label}，确认后再出牌`
        : "正在比较过牌路线，确认后可点击过牌"
    );
  };

  const reviewTurn = (recordId: number) => {
    setReviewRecordId(recordId);
    setCoachPanelView("coach");
    setCoachQuestion("evidence");
    setSelectedIds([]);
    setCoach(null);
  };

  const submitQuiz = (answer: number) => {
    if (quizAnswer !== null) return;
    setQuizAnswer(answer);
    const correct = answer === currentQuiz.answer;
    setSessionAttempted((value) => value + 1);
    setSessionCorrect((value) => value + (correct ? 1 : 0));
    setSessionStreak((value) => (correct ? value + 1 : 0));
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "training",
        module: currentQuiz.title,
        score: correct ? 100 : 45,
        questionId: currentQuiz.id,
        skill: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        correct,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => value && setProgress({ ...emptyProgress, ...value }))
      .catch(() => null);
  };

  const nextQuiz = () => {
    setQuizIndex((index) => index + 1);
    setQuizAnswer(null);
    setHintVisible(false);
  };

  const resetTrainingQuestion = () => {
    setQuizIndex(0);
    setQuizSeed((seed) => seed + 41);
    setQuizAnswer(null);
    setHintVisible(false);
  };

  const selectDifficulty = (next: TrainingDifficulty) => {
    setTrainingDifficulty(next);
    if (
      trainingTopic !== "all" &&
      trainingBankStats.byDifficultyAndTopic[next][trainingTopic] === 0
    ) {
      setTrainingTopic("all");
    }
    resetTrainingQuestion();
  };

  const selectTopic = (next: TrainingTopic | "all") => {
    if (
      next !== "all" &&
      trainingBankStats.byDifficultyAndTopic[trainingDifficulty][next] === 0
    ) {
      const compatibleDifficulty = (
        Object.keys(trainingDifficultyMeta) as TrainingDifficulty[]
      ).find(
        (difficulty) =>
          trainingBankStats.byDifficultyAndTopic[difficulty][next] > 0
      );
      if (compatibleDifficulty) {
        setTrainingDifficulty(compatibleDifficulty);
      }
    }
    setTrainingTopic(next);
    resetTrainingQuestion();
  };

  const selectTrainingMode = (next: "adaptive" | "review") => {
    setTrainingMode(next);
    resetTrainingQuestion();
  };

  return (
    <main className="academy-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => setView("table")}>
          <span className="brand-seal">贯</span>
          <span>
            <strong>贯策</strong>
            <small>GUANDAN LAB</small>
          </span>
        </button>
        <nav className="main-nav" aria-label="主要导航">
          <NavButton active={view === "table"} onClick={() => setView("table")}>
            训练桌
          </NavButton>
          <NavButton
            active={view === "training"}
            onClick={() => setView("training")}
          >
            专项训练
          </NavButton>
          <NavButton
            active={view === "insights"}
            onClick={() => setView("insights")}
          >
            学习洞察
          </NavButton>
          <NavButton active={view === "rules"} onClick={() => setView("rules")}>
            规则实验室
          </NavButton>
        </nav>
        <div className="header-rating">
          <span>训练分</span>
          <strong>{progress.rating}</strong>
        </div>
      </header>

      {view === "table" && (
        <>
          <section className="hero-strip">
            <div>
              <p className="eyebrow">科学掼蛋训练系统</p>
              <h1>每一手都讲清楚为什么</h1>
              <p>
                对局、解释、反事实比较和专项训练在同一张牌桌完成
              </p>
            </div>
            <div className="hero-metrics">
              <Metric label="当前级牌" value={state.level} accent />
              <Metric label="合法候选" value={scoreLegalMoves(state, 0).length} />
              <Metric
                label="本局精确率"
                value={`${percent(strongHumanDecisions, humanRecords.length)}%`}
              />
            </div>
          </section>

          <section className="workspace-grid">
            <div className="table-panel">
              <div className="table-toolbar">
                <div className="segmented-control" aria-label="对手难度">
                  {(Object.keys(difficultyMeta) as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={difficulty === level ? "active" : ""}
                      onClick={() => setDifficulty(level)}
                    >
                      {difficultyMeta[level].name}
                    </button>
                  ))}
                </div>
                <div className="table-tools">
                  <button
                    className={`icon-action vision-action${
                      trainingVision ? " active" : ""
                    }`}
                    type="button"
                    onClick={() => setTrainingVision((visible) => !visible)}
                    aria-pressed={trainingVision}
                  >
                    {trainingVision ? <EyeOff size={16} /> : <Eye size={16} />}
                    {trainingVision ? "隐藏透视" : "训练透视"}
                  </button>
                  <button
                    className="icon-action"
                    type="button"
                    onClick={startNewGame}
                  >
                    <RefreshCw size={16} />
                    新局
                  </button>
                </div>
              </div>

              {trainingVision && (
                <TrainingVision state={state} />
              )}

              <div className="game-table">
                <PlayerSeat
                  seat={2}
                  state={state}
                  className="seat-top"
                  current={state.currentSeat === 2}
                />
                <PlayerSeat
                  seat={3}
                  state={state}
                  className="seat-left"
                  current={state.currentSeat === 3}
                />
                <PlayerSeat
                  seat={1}
                  state={state}
                  className="seat-right"
                  current={state.currentSeat === 1}
                />

                <div className="table-center">
                  <div className="round-status">
                    <span className="live-dot" />
                    第 {state.turn + 1} 手
                    <span>·</span>
                    {state.targetSeat === undefined
                      ? `${seatNames[state.currentSeat]}先手`
                      : `${seatNames[state.targetSeat]}持有牌权`}
                  </div>
                  <div className="played-pattern">
                    {state.target ? (
                      <>
                        <div className="played-cards">
                          {state.target.cards.map((card) => (
                            <CardFace
                              key={card.id}
                              card={card}
                              level={state.level}
                              compact
                              disabled
                            />
                          ))}
                        </div>
                        <strong>{state.target.label}</strong>
                      </>
                    ) : (
                      <div className="empty-trick">
                        <Hand size={26} />
                        <span>新一轮牌权</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="player-zone">
                  <div className="hand-meta">
                    <div>
                      <strong>你的手牌</strong>
                      <span>{state.hands[0].length} 张</span>
                    </div>
                    <span
                      className={`turn-pill ${
                        state.currentSeat === 0 ? "is-turn" : ""
                      }`}
                    >
                      {state.currentSeat === 0 ? "轮到你" : "等待对手"}
                    </span>
                  </div>
                  <div className="hand-cards" aria-label="你的手牌">
                    {state.hands[0].map((card) => (
                      <CardFace
                        key={card.id}
                        card={card}
                        level={state.level}
                        selected={selectedIds.includes(card.id)}
                        disabled={
                          state.currentSeat !== 0 || state.winnerTeam !== undefined
                        }
                        onClick={() => toggleCard(card.id)}
                      />
                    ))}
                  </div>
                  <div className="action-row">
                    <div className="selection-readout">
                      {selectedIds.length === 0
                        ? notice
                        : selected
                          ? `${selected.label}，可以出牌`
                          : `已选 ${selectedIds.length} 张，暂未形成合法牌型`}
                    </div>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={
                        state.currentSeat !== 0 ||
                        !state.target ||
                        state.winnerTeam !== undefined
                      }
                      onClick={handlePass}
                    >
                      <Pause size={17} />
                      过牌
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      disabled={
                        state.currentSeat !== 0 || state.winnerTeam !== undefined
                      }
                      onClick={showHint}
                    >
                      <Lightbulb size={17} />
                      推荐
                    </button>
                    <button
                      className="button primary"
                      type="button"
                      disabled={
                        state.currentSeat !== 0 ||
                        !selected ||
                        state.winnerTeam !== undefined
                      }
                      onClick={handlePlay}
                    >
                      出牌
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>

                {state.winnerTeam !== undefined && (
                  <div className="result-overlay">
                    <div className="result-card">
                      <Trophy size={32} />
                      <p>本局完成</p>
                      <h2>{getGameResultLabel(state)}</h2>
                      <span>
                        你完成了 {humanRecords.length} 次决策，其中{" "}
                        {strongHumanDecisions} 次达到稳健以上
                      </span>
                      <button
                        className="button primary"
                        type="button"
                        onClick={startNewGame}
                      >
                        再练一局
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="coach-panel">
              <div className="coach-header">
                <div>
                  <span className="coach-icon">
                    <BrainCircuit size={19} />
                  </span>
                  <div>
                    <strong>贯策教练</strong>
                    <small>实时解释模式</small>
                  </div>
                </div>
                <button
                  type="button"
                  className={`toggle ${coachEnabled ? "on" : ""}`}
                  onClick={() => setCoachEnabled((enabled) => !enabled)}
                  aria-pressed={coachEnabled}
                >
                  <span />
                </button>
              </div>

              <div className="coach-view-tabs" aria-label="分析面板">
                <button
                  type="button"
                  className={coachPanelView === "coach" ? "active" : ""}
                  onClick={() => setCoachPanelView("coach")}
                >
                  <MessageCircleQuestion size={15} />
                  交互教练
                </button>
                <button
                  type="button"
                  className={coachPanelView === "history" ? "active" : ""}
                  onClick={() => setCoachPanelView("history")}
                >
                  <History size={15} />
                  对局历史
                  <span>{state.records.length}</span>
                </button>
              </div>

              {coachPanelView === "coach" ? (
                <>
                  <div className="situation-card">
                    <div className="section-label">
                      <Activity size={15} />
                      {activeCoachSource}
                    </div>
                    <p>{publicSituation(state, 0)}</p>
                  </div>

                  {activeCoach ? (
                    <div className="coach-explanation">
                      {reviewedRecord && (
                        <div className="review-banner">
                          <span>正在复盘第 {reviewedRecord.id} 手</span>
                          <button
                            type="button"
                            onClick={() => setReviewRecordId(null)}
                          >
                            回到实时
                          </button>
                        </div>
                      )}
                      <div className="quality-row">
                        <span
                          className={`quality quality-${activeCoach.quality}`}
                        >
                          {activeCoach.quality}
                        </span>
                        <span>判断信心 {activeCoach.confidence}%</span>
                      </div>
                      <h2>{activeCoach.headline}</h2>
                      <p className="coach-summary">{activeCoach.reason}</p>

                      <div
                        className="coach-question-tabs"
                        aria-label="向教练追问"
                      >
                        <CoachQuestionButton
                          active={coachQuestion === "evidence"}
                          icon={<Search size={14} />}
                          label="凭什么"
                          onClick={() => setCoachQuestion("evidence")}
                        />
                        <CoachQuestionButton
                          active={coachQuestion === "risk"}
                          icon={<TriangleAlert size={14} />}
                          label="风险呢"
                          onClick={() => setCoachQuestion("risk")}
                        />
                        <CoachQuestionButton
                          active={coachQuestion === "partner"}
                          icon={<Users size={14} />}
                          label="搭档呢"
                          onClick={() => setCoachQuestion("partner")}
                        />
                        <CoachQuestionButton
                          active={coachQuestion === "compare"}
                          icon={<Route size={14} />}
                          label="还有呢"
                          onClick={() => setCoachQuestion("compare")}
                        />
                      </div>

                      {coachQuestion === "evidence" && (
                        <CoachAnswer
                          title="判断链，不只给结论"
                          intro={activeCoach.consequence}
                          items={activeCoach.evidence}
                        />
                      )}
                      {coachQuestion === "risk" && (
                        <CoachAnswer
                          title="最坏情况与代价"
                          intro="先看失败会失去什么，再决定是否值得冒险"
                          items={activeCoach.risks}
                          tone="warning"
                        />
                      )}
                      {coachQuestion === "partner" && (
                        <CoachAnswer
                          title="把搭档放进同一条路线"
                          intro={activeCoach.partnerRead}
                          items={activeCoach.nextSteps}
                        />
                      )}
                      {coachQuestion === "compare" && (
                        <CandidateComparison
                          candidates={coachCandidates}
                          recordedAlternative={activeCoach.alternative}
                          disabled={
                            state.currentSeat !== 0 ||
                            state.winnerTeam !== undefined ||
                            Boolean(reviewedRecord)
                          }
                          onTry={tryCoachCandidate}
                        />
                      )}

                      <div className="factor-list">
                        {activeCoach.factors.map((factor) => (
                          <div className="factor" key={factor.label}>
                            <span>{factor.label}</span>
                            <div className="factor-track">
                              <i
                                className={factor.tone}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(12, 50 + factor.value * 5)
                                  )}%`,
                                }}
                              />
                            </div>
                            <strong>
                              {factor.value > 0 ? "+" : ""}
                              {factor.value}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedIds.length > 0 ? (
                    <div className="coach-empty compact">
                      <TriangleAlert size={28} />
                      <strong>当前选牌还不是合法牌型</strong>
                      <p>继续补牌或取消部分牌，形成合法牌型后会立即开始解释</p>
                    </div>
                  ) : (
                    <div className="coach-empty">
                      <Sparkles size={28} />
                      <strong>选一张牌就开始分析</strong>
                      <p>不必先出牌，教练会实时拆解依据、风险、搭档影响和替代路线</p>
                    </div>
                  )}
                </>
              ) : (
                <TurnHistory
                  rows={visibleHistoryRows}
                  level={state.level}
                  filter={historyFilter}
                  onFilter={setHistoryFilter}
                  onReview={reviewTurn}
                />
              )}

              <div className="coach-footer">
                <ShieldCheck size={15} />
                {trainingVision
                  ? "训练透视已开启，解释会明确区分公开信息与完整牌面"
                  : "实战模式只使用公开信息，训练透视可单独开启"}
              </div>
            </aside>
          </section>
        </>
      )}

      {view === "training" && (
        <section className="content-page">
          <PageIntro
            eyebrow="专项训练"
            title="从会打到会判断，每一步都有训练路径"
            description={`${trainingBankStats.total.toLocaleString("zh-CN")} 道分层题覆盖规则、组牌、协同、记牌与残局，答错自动进入回炉`}
          />
          <div className="training-dashboard">
            <TrainingStat
              icon={<BookMarked size={18} />}
              label="科学题库"
              value={trainingBankStats.total.toLocaleString("zh-CN")}
              detail="规则引擎可验证"
            />
            <TrainingStat
              icon={<Target size={18} />}
              label="累计正确率"
              value={`${percent(
                progress.questionsCorrect,
                progress.questionsAnswered
              )}%`}
              detail={`${progress.questionsAnswered} 次作答`}
            />
            <TrainingStat
              icon={<Flame size={18} />}
              label="本轮连对"
              value={sessionStreak}
              detail={`${sessionCorrect} / ${sessionAttempted} 正确`}
            />
            <TrainingStat
              icon={<RotateCcw size={18} />}
              label="待回炉"
              value={progress.reviewDue}
              detail="答对后自动移出"
            />
          </div>

          <div className="training-controls">
            <div className="control-group">
              <span>
                <Layers3 size={15} />
                难度
              </span>
              <div className="difficulty-tabs">
                {(Object.keys(
                  trainingDifficultyMeta
                ) as TrainingDifficulty[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={trainingDifficulty === item ? "active" : ""}
                    onClick={() => selectDifficulty(item)}
                  >
                    <strong>{trainingDifficultyMeta[item].name}</strong>
                    <small>{trainingDifficultyMeta[item].description}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group compact">
              <span>
                <SlidersHorizontal size={15} />
                训练范围
              </span>
              <select
                aria-label="训练主题"
                value={trainingTopic}
                onChange={(event) =>
                  selectTopic(event.target.value as TrainingTopic | "all")
                }
              >
                <option value="all">智能混合主题</option>
                {trainingTopics.map((topic) => {
                  const count =
                    trainingBankStats.byDifficultyAndTopic[trainingDifficulty][
                      topic
                    ];
                  return (
                    <option value={topic} key={topic} disabled={count === 0}>
                      {topic} · {count > 0 ? `${count} 题` : "当前难度未开放"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="control-group compact">
              <span>
                <RotateCcw size={15} />
                训练模式
              </span>
              <div className="mode-tabs">
                <button
                  type="button"
                  className={trainingMode === "adaptive" ? "active" : ""}
                  onClick={() => selectTrainingMode("adaptive")}
                >
                  智能训练
                </button>
                <button
                  type="button"
                  className={trainingMode === "review" ? "active" : ""}
                  onClick={() => selectTrainingMode("review")}
                >
                  错题回炉 {progress.reviewDue || ""}
                </button>
              </div>
            </div>
          </div>

          {reviewEmpty && (
            <div className="review-empty" role="status">
              <Check size={18} />
              当前范围没有待回炉题，已临时展示同级智能训练
            </div>
          )}

          <div className="training-layout">
            <div className="quiz-card">
              <div className="session-progress">
                <div>
                  <span>今日一组 12 题</span>
                  <strong>{Math.min(sessionAttempted, 12)} / 12</strong>
                </div>
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, (sessionAttempted / 12) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="quiz-head">
                <div>
                  <span>
                    第 {(quizIndex % Math.max(1, questionPool.length)) + 1} 题
                    {" · "}
                    当前范围 {questionPool.length} 题
                  </span>
                  <h2>{currentQuiz.title}</h2>
                </div>
                <div className="quiz-badges">
                  <span className="topic-badge">{currentQuiz.topic}</span>
                  <span className="level-badge">
                    {trainingDifficultyMeta[currentQuiz.difficulty].name}
                  </span>
                </div>
              </div>
              <p className="quiz-context">{currentQuiz.context}</p>
              <p className="quiz-prompt">{currentQuiz.prompt}</p>
              {currentQuiz.cards.length > 0 ? (
                <div className="quiz-cards">
                  {currentQuiz.cards.map((card) => (
                    <CardFace
                      key={card.id}
                      card={card}
                      level={currentQuiz.level}
                      disabled
                    />
                  ))}
                </div>
              ) : (
                <div className="scenario-board">
                  <span>
                    <BrainCircuit size={23} />
                  </span>
                  <div>
                    <strong>局面推演题</strong>
                    <p>先比较牌权、双方张数与下一手出口，再做选择</p>
                  </div>
                  <Clock3 size={18} />
                  <small>建议 {currentQuiz.estimatedSeconds} 秒</small>
                </div>
              )}
              <button
                type="button"
                className={`hint-button${hintVisible ? " active" : ""}`}
                aria-expanded={hintVisible}
                onClick={() => setHintVisible((visible) => !visible)}
              >
                <Lightbulb size={16} />
                {hintVisible ? currentQuiz.hint : "需要一点提示"}
              </button>
              <div className="quiz-options">
                {currentQuiz.options.map((option, index) => {
                  const correct = index === currentQuiz.answer;
                  const chosen = quizAnswer === index;
                  return (
                    <button
                      type="button"
                      key={option}
                      disabled={quizAnswer !== null}
                      className={`${chosen ? "chosen" : ""}${
                        quizAnswer !== null && correct ? " correct" : ""
                      }${chosen && !correct ? " wrong" : ""}`}
                      onClick={() => submitQuiz(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option}
                      {quizAnswer !== null && correct && <Check size={17} />}
                      {chosen && !correct && <X size={17} />}
                    </button>
                  );
                })}
              </div>
              {quizAnswer !== null && (
                <div className="quiz-feedback">
                  <span>
                    {quizAnswer === currentQuiz.answer ? (
                      <Check size={18} />
                    ) : (
                      <CircleHelp size={18} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {quizAnswer === currentQuiz.answer
                        ? "判断正确"
                        : "这一步值得重新理解"}
                    </strong>
                    <p>{currentQuiz.explanation}</p>
                    <small>可迁移原则 · {currentQuiz.principle}</small>
                  </div>
                  <button type="button" onClick={nextQuiz}>
                    下一题
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
            </div>

            <div className="module-stack">
              <article className="topic-tip">
                <span>
                  <Lightbulb size={18} />
                </span>
                <div>
                  <small>{currentQuiz.topic} · 三步法</small>
                  <h3>{currentTip.cue}</h3>
                  <ol>
                    {currentTip.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </article>
              <TrainingModule
                icon={<Target size={20} />}
                title="组牌规划"
                stat={`${trainingBankStats.byTopic["组牌规划"]} 题`}
                text={topicDescriptions["组牌规划"]}
                active={trainingTopic === "组牌规划"}
                onClick={() => selectTopic("组牌规划")}
              />
              <TrainingModule
                icon={<Users size={20} />}
                title="搭档协同"
                stat={`${trainingBankStats.byTopic["搭档协同"]} 题`}
                text={topicDescriptions["搭档协同"]}
                active={trainingTopic === "搭档协同"}
                onClick={() => selectTopic("搭档协同")}
              />
              <TrainingModule
                icon={<BrainCircuit size={20} />}
                title="记牌推理"
                stat={`${trainingBankStats.byTopic["记牌推理"]} 题`}
                text={topicDescriptions["记牌推理"]}
                active={trainingTopic === "记牌推理"}
                onClick={() => selectTopic("记牌推理")}
              />
              <TrainingModule
                icon={<Zap size={20} />}
                title="炸弹管理"
                stat={`${trainingBankStats.byTopic["炸弹管理"]} 题`}
                text={topicDescriptions["炸弹管理"]}
                active={trainingTopic === "炸弹管理"}
                onClick={() => selectTopic("炸弹管理")}
              />
              <TrainingModule
                icon={<ShieldCheck size={20} />}
                title="残局处理"
                stat={`${trainingBankStats.byTopic["残局处理"]} 题`}
                text={topicDescriptions["残局处理"]}
                active={trainingTopic === "残局处理"}
                onClick={() => selectTopic("残局处理")}
              />
              <TrainingModule
                icon={<Gauge size={20} />}
                title="风险判断"
                stat={`${trainingBankStats.byTopic["风险判断"]} 题`}
                text={topicDescriptions["风险判断"]}
                active={trainingTopic === "风险判断"}
                onClick={() => selectTopic("风险判断")}
              />
            </div>
          </div>
        </section>
      )}

      {view === "insights" && (
        <section className="content-page">
          <PageIntro
            eyebrow="学习洞察"
            title="进步必须能够被看见"
            description="系统分别追踪胜负、决策质量、训练完成度和长期稳定性"
          />
          <div className="insight-metrics">
            <InsightMetric
              icon={<Trophy size={21} />}
              label="累计对局"
              value={progress.games}
              detail={`胜率 ${percent(progress.wins, progress.games)}%`}
            />
            <InsightMetric
              icon={<Gauge size={21} />}
              label="训练分"
              value={progress.rating}
              detail="综合对局与专项训练"
            />
            <InsightMetric
              icon={<Medal size={21} />}
              label="稳健决策"
              value={`${percent(progress.strongDecisions, progress.decisions)}%`}
              detail={`${progress.strongDecisions} / ${progress.decisions} 手`}
            />
            <InsightMetric
              icon={<Activity size={21} />}
              label="专项正确率"
              value={`${percent(
                progress.questionsCorrect,
                progress.questionsAnswered
              )}%`}
              detail={`${progress.reviewDue} 题等待回炉`}
            />
          </div>

          <div className="insight-grid">
            <article className="analytics-card">
              <div className="card-heading">
                <div>
                  <span>能力画像</span>
                  <h2>五维决策表现</h2>
                </div>
                <BarChart3 size={20} />
              </div>
              <SkillBar
                label="牌型识别"
                value={skillPercent(progress, "牌型识别", 76)}
              />
              <SkillBar
                label="牌权控制"
                value={skillPercent(progress, "牌权控制", 62)}
              />
              <SkillBar
                label="搭档协同"
                value={skillPercent(progress, "搭档协同", 68)}
              />
              <SkillBar
                label="残局处理"
                value={skillPercent(progress, "残局处理", 54)}
              />
              <SkillBar
                label="记牌推理"
                value={skillPercent(progress, "记牌推理", 59)}
              />
              <p className="analytics-note">
                系统会优先安排错误较多的主题，答对后再逐步提升难度
              </p>
            </article>

            <article className="analytics-card">
              <div className="card-heading">
                <div>
                  <span>训练建议</span>
                  <h2>下一组任务</h2>
                </div>
                <BrainCircuit size={20} />
              </div>
              <div className="task-list">
                <TaskItem
                  number="01"
                  title={`错题回炉 ${Math.min(progress.reviewDue, 6)} 题`}
                  meta={progress.reviewDue ? "优先修正误区" : "当前没有积压"}
                />
                <TaskItem number="02" title="分层专项 12 题" meta="约 8 分钟" />
                <TaskItem number="03" title="完整对局 1 盘" meta="开启逐手解释" />
              </div>
              <button
                type="button"
                className="button primary wide"
                onClick={() => setView("training")}
              >
                开始今日训练
                <ArrowRight size={17} />
              </button>
            </article>
          </div>
        </section>
      )}

      {view === "rules" && (
        <section className="content-page">
          <PageIntro
            eyebrow="规则实验室"
            title="规则不是背诵内容，是决策模型"
            description="采用竞技掼蛋通用口径，所有牌型比较都由同一规则内核执行"
          />
          <div className="rules-grid">
            <RuleCard
              number="01"
              title="基础结构"
              text="两副牌共 108 张，四人固定搭档，每人 27 张，面对面玩家为同队"
              tags={["固定搭档", "团队升级", "无底牌"]}
            />
            <RuleCard
              number="02"
              title="级牌与逢人配"
              text="当前级牌高于普通 A，红桃级牌可替代大小王之外的牌来完成合法组合"
              tags={["级牌", "红桃级牌", "万能牌"]}
            />
            <RuleCard
              number="03"
              title="普通牌型"
              text="单张、对子、三张、三带二、五张顺子、三连对和两组三张的钢板"
              tags={["固定长度", "同型比较", "顺序结构"]}
            />
            <RuleCard
              number="04"
              title="炸弹体系"
              text="四王炸最高，六张以上炸弹高于同花顺，同花顺高于五张与四张炸弹"
              tags={["四王炸", "同花顺", "四至十张"]}
            />
            <RuleCard
              number="05"
              title="接风"
              text="一名玩家出完后取得牌权，如果其余玩家均不压制，由仍在场的搭档接风先出"
              tags={["搭档协作", "牌权转移", "残局"]}
            />
            <RuleCard
              number="06"
              title="升级"
              text="同队取得前两名升三级，第一与第三名同队升两级，第一与第四名同队升一级"
              tags={["双下", "头三", "头末"]}
            />
          </div>

          <div className="science-banner">
            <div>
              <span className="section-label">
                <BookOpen size={16} />
                算法方法
              </span>
              <h2>从规则引擎到大师模型</h2>
              <p>
                当前版本使用合法着生成、团队启发式评分和反事实解释，模型接口预留给信息集蒙特卡洛与深度蒙特卡洛自对弈
              </p>
            </div>
            <div className="method-flow">
              <MethodStep number="1" label="生成合法着" />
              <MethodStep number="2" label="评估团队收益" />
              <MethodStep number="3" label="比较反事实" />
              <MethodStep number="4" label="转成训练题" />
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div>
          <span className="brand-seal small">贯</span>
          <span>贯策 · 科学掼蛋训练系统</span>
        </div>
        <p>拒绝赌博化设计，只研究规则、合作、记忆与决策</p>
      </footer>
    </main>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric${accent ? " accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlayerSeat({
  seat,
  state,
  className,
  current,
}: {
  seat: Seat;
  state: GameState;
  className: string;
  current: boolean;
}) {
  const finishedPlace = state.finished.indexOf(seat);
  return (
    <div className={`player-seat ${className}${current ? " current" : ""}`}>
      <div className="avatar">
        {seat === 2 ? <Users size={18} /> : <Bot size={18} />}
        {finishedPlace >= 0 && <i>{finishedPlace + 1}</i>}
      </div>
      <div>
        <strong>{seatNames[seat]}</strong>
        <span>
          {seatPositions[seat]} · {seatTeam(seat) === 0 ? "我方" : "对方"}
        </span>
      </div>
      <div className="opponent-cards">
        {[0, 1, 2].map((index) => (
          <CardBack key={index} index={index} />
        ))}
      </div>
      <em>{state.hands[seat].length}</em>
    </div>
  );
}

const compactSuitSymbol = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
  joker: "✦",
} as const;

function TrainingVision({ state }: { state: GameState }) {
  return (
    <section className="vision-drawer" aria-label="训练透视">
      <div className="vision-intro">
        <span>
          <Eye size={16} />
        </span>
        <div>
          <strong>三家完整牌面</strong>
          <p>训练模式用于验证推理，关闭后恢复只看公开信息的实战视角</p>
        </div>
      </div>
      <div className="vision-hands">
        {([1, 2, 3] as Seat[]).map((seat) => (
          <article className="vision-hand" key={seat}>
            <header>
              <strong>{seatNames[seat]}</strong>
              <span>
                {seatTeam(seat) === 0 ? "我方" : "对方"} ·{" "}
                {state.hands[seat].length} 张
              </span>
            </header>
            <div className="vision-cards" aria-label={`${seatNames[seat]}手牌`}>
              {state.hands[seat].map((card) => (
                <CompactCard key={card.id} card={card} level={state.level} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompactCard({
  card,
  level,
}: {
  card: Card;
  level: GameState["level"];
}) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <span
      className={`vision-card${red ? " red" : ""}${
        isWild(card, level) ? " wild" : ""
      }`}
      title={`${cardLabel(card)} ${compactSuitSymbol[card.suit]}${
        isWild(card, level) ? " 逢人配" : ""
      }`}
    >
      <strong>{cardLabel(card)}</strong>
      <small>{compactSuitSymbol[card.suit]}</small>
    </span>
  );
}

function CoachQuestionButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function CoachAnswer({
  title,
  intro,
  items,
  tone = "default",
}: {
  title: string;
  intro: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  return (
    <div className={`coach-answer ${tone}`}>
      <strong>{title}</strong>
      <p>{intro}</p>
      <ol>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CandidateComparison({
  candidates,
  recordedAlternative,
  disabled,
  onTry,
}: {
  candidates: ScoredMove[];
  recordedAlternative?: DecisionExplanation["alternative"];
  disabled: boolean;
  onTry: (candidate: ScoredMove) => void;
}) {
  if (disabled || candidates.length === 0) {
    return (
      <div className="coach-answer">
        <strong>当时的替代路线</strong>
        {recordedAlternative ? (
          <>
            <p>
              {recordedAlternative.label}，{recordedAlternative.reason}
            </p>
            <small>与首选相差 {recordedAlternative.delta} 分</small>
          </>
        ) : (
          <p>当前处于历史复盘或等待阶段，回到实时轮次后可以直接试选候选路线</p>
        )}
      </div>
    );
  }

  return (
    <div className="candidate-list">
      <div>
        <strong>三条可比较路线</strong>
        <span>点击后只试选，不会自动出牌</span>
      </div>
      {candidates.map((candidate, index) => (
        <button
          type="button"
          key={candidate.pattern?.id ?? `pass-${index}`}
          onClick={() => onTry(candidate)}
          aria-label={`试选路线 ${index + 1} ${
            candidate.pattern?.label ?? "过牌"
          }`}
        >
          <span>{index + 1}</span>
          <div>
            <strong>{candidate.pattern?.label ?? "过牌"}</strong>
            <p>{candidate.summary}</p>
          </div>
          <em>{Math.round(candidate.score * 10) / 10}</em>
        </button>
      ))}
    </div>
  );
}

function TurnHistory({
  rows,
  level,
  filter,
  onFilter,
  onReview,
}: {
  rows: HistoryRow[];
  level: GameState["level"];
  filter: HistoryFilter;
  onFilter: (filter: HistoryFilter) => void;
  onReview: (recordId: number) => void;
}) {
  return (
    <div className="turn-history">
      <div className="history-filter" aria-label="历史筛选">
        {(
          [
            ["all", "全部"],
            ["team", "我方"],
            ["opponents", "对方"],
          ] as Array<[HistoryFilter, string]>
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => onFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length > 0 ? (
        <div className="history-list">
          {rows.map(({ record, remainingAfter }) => (
            <button
              type="button"
              className="history-item"
              key={record.id}
              onClick={() => onReview(record.id)}
            >
              <span className="history-index">#{record.id}</span>
              <div>
                <header>
                  <strong>{seatNames[record.seat]}</strong>
                  <span>
                    {record.action === "pass"
                      ? "过牌"
                      : record.pattern?.label ?? "出牌"}
                  </span>
                </header>
                {record.pattern ? (
                  <div className="history-cards">
                    {record.pattern.cards.map((card) => (
                      <CompactCard
                        key={card.id}
                        card={card}
                        level={level}
                      />
                    ))}
                  </div>
                ) : (
                  <p>保留手牌，放弃本次压制</p>
                )}
              </div>
              <em>{remainingAfter} 张</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="history-empty">
          <History size={28} />
          <strong>还没有出牌记录</strong>
          <p>第一手完成后，这里会记录每一家出牌、过牌和剩余张数</p>
        </div>
      )}
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function TrainingModule({
  icon,
  title,
  stat,
  text,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  stat: string;
  text: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`training-module${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <div>
        <small>{stat}</small>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ChevronRight size={19} />
    </button>
  );
}

function TrainingStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function InsightMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="skill-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function TaskItem({
  number,
  title,
  meta,
}: {
  number: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="task-item">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}

function RuleCard({
  number,
  title,
  text,
  tags,
}: {
  number: string;
  title: string;
  text: string;
  tags: string[];
}) {
  return (
    <article className="rule-card">
      <span>{number}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div>
        {tags.map((tag) => (
          <small key={tag}>{tag}</small>
        ))}
      </div>
    </article>
  );
}

function MethodStep({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <span>{number}</span>
      <strong>{label}</strong>
    </div>
  );
}
