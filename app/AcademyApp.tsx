"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Gauge,
  Hand,
  Lightbulb,
  Medal,
  Pause,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
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
  Rank,
  Seat,
} from "@/lib/guandan/types";
import { seatTeam } from "@/lib/guandan/cards";

type View = "table" | "training" | "insights" | "rules";

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
};

const difficultyMeta: Record<
  Difficulty,
  { name: string; description: string; speed: number }
> = {
  beginner: { name: "入门陪练", description: "保留随机性，适合熟悉牌型", speed: 760 },
  advanced: { name: "进阶牌手", description: "关注牌效、牌权和基本配合", speed: 580 },
  master: { name: "大师推演", description: "优先团队收益和残局控制", speed: 420 },
};

const demoCards = (
  specs: Array<[Card["suit"], Card["rank"]]>
): Card[] =>
  specs.map(([suit, rank], index) => ({
    id: `demo-${index}-${suit}-${rank}`,
    suit,
    rank,
    deck: (index % 2) as 0 | 1,
  }));

const quizzes = [
  {
    title: "逢人配识别",
    prompt: "本局打 7，这组牌最准确的牌型是什么",
    level: "7" as Rank,
    cards: demoCards([
      ["spades", "9"],
      ["diamonds", "9"],
      ["clubs", "9"],
      ["hearts", "7"],
    ]),
    options: ["四张 9 炸弹", "三张 9", "三带一", "四张散牌"],
    answer: 0,
    explanation:
      "红桃级牌可以替代一张 9，三张自然 9 加一张逢人配组成四张炸弹",
    principle: "先识别万能牌的最高价值用途，再比较是否值得现在暴露炸弹",
  },
  {
    title: "搭档牌权",
    prompt: "搭档刚用 K 对取得牌权，下家还剩 8 张，你手里有 A 对，通常应当怎么做",
    level: "6" as Rank,
    cards: demoCards([
      ["spades", "A"],
      ["hearts", "A"],
      ["clubs", "4"],
      ["diamonds", "5"],
    ]),
    options: ["用 A 对盖住搭档", "过牌让搭档继续", "直接拆 A 出单张", "立即使用炸弹"],
    answer: 1,
    explanation:
      "下家尚未进入紧急张数，搭档已经控制本轮，主动盖牌通常只会浪费己方控制牌",
    principle: "掼蛋不是四个独立玩家，牌权属于团队而不是某一只手",
  },
  {
    title: "残局拦截",
    prompt: "下家只剩 2 张且刚出一对 Q，你能用级牌对压住，此时优先级是什么",
    level: "8" as Rank,
    cards: demoCards([
      ["spades", "8"],
      ["diamonds", "8"],
      ["spades", "4"],
      ["clubs", "4"],
    ]),
    options: ["保留级牌永远更重要", "立即拦截，避免对手走完", "过牌等待搭档", "拆成四张单牌"],
    answer: 1,
    explanation:
      "对手已经进入一手走完区间，阻断终局的价值高于常规的控制牌保留",
    principle: "同一张牌的价值随剩余张数剧烈变化，残局必须重估",
  },
] as const;

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default function AcademyApp() {
  const [view, setView] = useState<View>("table");
  const [state, setState] = useState<GameState>(() => createGame());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("advanced");
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [coach, setCoach] = useState<DecisionExplanation | null>(null);
  const [notice, setNotice] = useState("请选择牌后出牌，或先查看推荐");
  const [progress, setProgress] = useState<ProgressSummary>(emptyProgress);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const recordedSeed = useRef<number | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(
    () => selectedPattern(state, selectedIds),
    [selectedIds, state]
  );
  const latestRecord = state.records.at(-1);
  const activeCoach = coachEnabled
    ? coach ?? latestRecord?.explanation ?? null
    : null;
  const humanRecords = state.records.filter((record) => record.seat === 0);
  const strongHumanDecisions = humanRecords.filter(
    (record) =>
      record.explanation?.quality === "精确" ||
      record.explanation?.quality === "稳健"
  ).length;

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
    setNotice("新的一局已经发牌，本局从打 2 开始");
  };

  const toggleCard = (id: string) => {
    if (state.currentSeat !== 0 || state.winnerTeam !== undefined) return;
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
    setNotice(`建议 ${best.pattern?.label ?? "过牌"}，已在右侧解释原因`);
  };

  const submitQuiz = (answer: number) => {
    if (quizAnswer !== null) return;
    setQuizAnswer(answer);
    const correct = answer === quizzes[quizIndex].answer;
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "training",
        module: quizzes[quizIndex].title,
        score: correct ? 100 : 45,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => value && setProgress({ ...emptyProgress, ...value }))
      .catch(() => null);
  };

  const nextQuiz = () => {
    setQuizIndex((index) => (index + 1) % quizzes.length);
    setQuizAnswer(null);
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
                <button className="icon-action" type="button" onClick={startNewGame}>
                  <RefreshCw size={16} />
                  新局
                </button>
              </div>

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

              <div className="situation-card">
                <div className="section-label">
                  <Activity size={15} />
                  局面摘要
                </div>
                <p>{publicSituation(state, 0)}</p>
              </div>

              {activeCoach ? (
                <div className="coach-explanation">
                  <div className="quality-row">
                    <span className={`quality quality-${activeCoach.quality}`}>
                      {activeCoach.quality}
                    </span>
                    <span>判断信心 {activeCoach.confidence}%</span>
                  </div>
                  <h2>{activeCoach.headline}</h2>
                  <ExplainBlock label="为什么" text={activeCoach.reason} />
                  <ExplainBlock label="接下来" text={activeCoach.consequence} />
                  <ExplainBlock label="搭档视角" text={activeCoach.partnerRead} />

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

                  {activeCoach.alternative && (
                    <div className="alternative-card">
                      <span>反事实比较</span>
                      <strong>{activeCoach.alternative.label}</strong>
                      <p>{activeCoach.alternative.reason}</p>
                      <small>与首选相差 {activeCoach.alternative.delta} 分</small>
                    </div>
                  )}
                </div>
              ) : (
                <div className="coach-empty">
                  <Sparkles size={28} />
                  <strong>先做一次选择</strong>
                  <p>教练会解释这手牌的收益、代价、搭档影响和替代方案</p>
                </div>
              )}

              <div className="coach-footer">
                <ShieldCheck size={15} />
                解释只基于规则、公开信息和可验证评分
              </div>
            </aside>
          </section>
        </>
      )}

      {view === "training" && (
        <section className="content-page">
          <PageIntro
            eyebrow="专项训练"
            title="把薄弱点拆成可以重复练习的动作"
            description="牌型、搭档、记牌、残局和手数规划分别训练，不靠机械刷局"
          />
          <div className="training-layout">
            <div className="quiz-card">
              <div className="quiz-head">
                <div>
                  <span>
                    第 {quizIndex + 1} 题 / {quizzes.length}
                  </span>
                  <h2>{quizzes[quizIndex].title}</h2>
                </div>
                <span className="level-badge">
                  打 {quizzes[quizIndex].level}
                </span>
              </div>
              <p className="quiz-prompt">{quizzes[quizIndex].prompt}</p>
              <div className="quiz-cards">
                {quizzes[quizIndex].cards.map((card) => (
                  <CardFace
                    key={card.id}
                    card={card}
                    level={quizzes[quizIndex].level}
                    disabled
                  />
                ))}
              </div>
              <div className="quiz-options">
                {quizzes[quizIndex].options.map((option, index) => {
                  const correct = index === quizzes[quizIndex].answer;
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
                    {quizAnswer === quizzes[quizIndex].answer ? (
                      <Check size={18} />
                    ) : (
                      <CircleHelp size={18} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {quizAnswer === quizzes[quizIndex].answer
                        ? "判断正确"
                        : "这一步值得重新理解"}
                    </strong>
                    <p>{quizzes[quizIndex].explanation}</p>
                    <small>{quizzes[quizIndex].principle}</small>
                  </div>
                  <button type="button" onClick={nextQuiz}>
                    下一题
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
            </div>

            <div className="module-stack">
              <TrainingModule
                icon={<Target size={20} />}
                title="最少手数"
                stat="拆牌规划"
                text="比较多种组合方式，学习如何减少剩余手数而不破坏炸弹"
                active
              />
              <TrainingModule
                icon={<Users size={20} />}
                title="搭档推理"
                stat="合作判断"
                text="根据伙伴出牌、剩余张数和牌权推断最合理的让牌时机"
              />
              <TrainingModule
                icon={<BrainCircuit size={20} />}
                title="记牌扫描"
                stat="信息更新"
                text="训练级牌、王、炸弹资源和关键牌张的动态记忆"
              />
              <TrainingModule
                icon={<Zap size={20} />}
                title="残局拦截"
                stat="终局控制"
                text="专练对手一手走完、接风和炸弹交换后的选择"
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
              label="训练连续"
              value={progress.streak}
              detail="完成专项训练次数"
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
              <SkillBar label="牌型效率" value={76} />
              <SkillBar label="牌权控制" value={62} />
              <SkillBar label="搭档协同" value={68} />
              <SkillBar label="残局处理" value={54} />
              <SkillBar label="信息记忆" value={59} />
              <p className="analytics-note">
                当前优先训练残局处理，尤其是对手剩 1 至 3 张时的拦截阈值
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
                <TaskItem number="01" title="残局拦截 6 题" meta="约 4 分钟" />
                <TaskItem number="02" title="搭档牌权 4 题" meta="约 3 分钟" />
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

function ExplainBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="explain-block">
      <span>{label}</span>
      <p>{text}</p>
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
}: {
  icon: React.ReactNode;
  title: string;
  stat: string;
  text: string;
  active?: boolean;
}) {
  return (
    <article className={`training-module${active ? " active" : ""}`}>
      <span>{icon}</span>
      <div>
        <small>{stat}</small>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ChevronRight size={19} />
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
