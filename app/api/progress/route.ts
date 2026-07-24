import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CREATE_PROGRESS = `
  CREATE TABLE IF NOT EXISTS learner_progress (
    user_id TEXT PRIMARY KEY,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    decisions INTEGER NOT NULL DEFAULT 0,
    strong_decisions INTEGER NOT NULL DEFAULT 0,
    training_completed INTEGER NOT NULL DEFAULT 0,
    rating INTEGER NOT NULL DEFAULT 800,
    streak INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )
`;

const CREATE_EVENTS = `
  CREATE TABLE IF NOT EXISTS learning_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`;

const CREATE_EVENTS_INDEX =
  "CREATE INDEX IF NOT EXISTS learning_events_user_created_idx ON learning_events(user_id, created_at DESC)";

const CREATE_SKILL_PROGRESS = `
  CREATE TABLE IF NOT EXISTS training_skill_progress (
    user_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    attempted INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    due INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, skill)
  )
`;

const CREATE_REVIEW_QUEUE = `
  CREATE TABLE IF NOT EXISTS training_review_queue (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    misses INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, question_id)
  )
`;

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(CREATE_PROGRESS),
    env.DB.prepare(CREATE_EVENTS),
    env.DB.prepare(CREATE_EVENTS_INDEX),
    env.DB.prepare(CREATE_SKILL_PROGRESS),
    env.DB.prepare(CREATE_REVIEW_QUEUE),
  ]);
}

function userId(request: NextRequest): string | null {
  const sitesIdentity = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase()
    .slice(0, 254);
  if (sitesIdentity) return `sites:${sitesIdentity}`;
  const gatewayAuthenticated =
    request.headers.get("x-aialra-authenticated") === "1";
  const gatewaySubject = request.headers
    .get("x-aialra-sub")
    ?.trim()
    .slice(0, 254);
  if (
    gatewayAuthenticated &&
    gatewaySubject &&
    /^[a-zA-Z0-9:_-]+$/.test(gatewaySubject)
  ) {
    return `aialra:${gatewaySubject}`;
  }
  return process.env.NODE_ENV === "production" ? null : "local-preview";
}

const defaultProgress = {
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
  reviewQuestionIds: [] as string[],
  skills: [] as Array<{
    skill: string;
    attempted: number;
    correct: number;
    due: number;
  }>,
};

export async function GET(request: NextRequest) {
  const id = userId(request);
  if (!id) {
    return NextResponse.json(defaultProgress, {
      headers: { "x-progress-mode": "anonymous" },
    });
  }
  try {
    await ensureSchema();
    const [result, skillRows, reviewRows] = await Promise.all([
      env.DB.prepare(
        `SELECT games, wins, decisions, strong_decisions AS strongDecisions,
                training_completed AS trainingCompleted, rating, streak
         FROM learner_progress WHERE user_id = ?`
      )
        .bind(id)
        .first(),
      env.DB.prepare(
        `SELECT skill, attempted, correct, due
         FROM training_skill_progress
         WHERE user_id = ?
         ORDER BY due DESC, attempted DESC, skill ASC`
      )
        .bind(id)
        .all<{
          skill: string;
          attempted: number;
          correct: number;
          due: number;
        }>(),
      env.DB.prepare(
        `SELECT question_id AS questionId
         FROM training_review_queue
         WHERE user_id = ?
         ORDER BY misses DESC, updated_at ASC
         LIMIT 120`
      )
        .bind(id)
        .all<{ questionId: string }>(),
    ]);
    const skills = skillRows.results ?? [];
    const reviewQuestionIds = (reviewRows.results ?? []).map(
      (row) => row.questionId
    );
    const questionsAnswered = skills.reduce(
      (total, skill) => total + Number(skill.attempted || 0),
      0
    );
    const questionsCorrect = skills.reduce(
      (total, skill) => total + Number(skill.correct || 0),
      0
    );
    const reviewDue = skills.reduce(
      (total, skill) => total + Number(skill.due || 0),
      0
    );
    return NextResponse.json({
      ...defaultProgress,
      ...(result ?? {}),
      questionsAnswered,
      questionsCorrect,
      reviewDue,
      reviewQuestionIds,
      skills,
    });
  } catch {
    return NextResponse.json(defaultProgress, {
      headers: { "x-progress-mode": "preview" },
    });
  }
}

export async function POST(request: NextRequest) {
  const id = userId(request);
  if (!id) {
    return NextResponse.json(
      { error: "请先登录后保存训练进度" },
      { status: 401 }
    );
  }
  const origin = request.headers.get("origin");
  if (origin) {
    let source: URL;
    try {
      source = new URL(origin);
    } catch {
      return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
    }
    const requestHost = request.headers.get("host");
    if (
      !requestHost ||
      source.host !== requestHost ||
      (process.env.NODE_ENV === "production" && source.protocol !== "https:")
    ) {
      return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
    }
  }
  const body = (await request.json().catch(() => null)) as
    | {
        kind?: "game" | "training";
        won?: boolean;
        decisions?: number;
        strongDecisions?: number;
        module?: string;
        score?: number;
        questionId?: string;
        skill?: string;
        difficulty?: string;
        correct?: boolean;
      }
    | null;

  if (!body || (body.kind !== "game" && body.kind !== "training")) {
    return NextResponse.json({ error: "无效的学习记录" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const now = Date.now();
    const gameDelta = body.kind === "game" ? 1 : 0;
    const winDelta = body.kind === "game" && body.won ? 1 : 0;
    const decisionDelta = Math.max(0, Math.min(200, body.decisions ?? 0));
    const strongDelta = Math.max(
      0,
      Math.min(decisionDelta, body.strongDecisions ?? 0)
    );
    const trainingDelta = body.kind === "training" ? 1 : 0;
    const skill = String(body.skill || body.module || "综合训练")
      .trim()
      .slice(0, 32);
    const questionId = String(body.questionId || "")
      .trim()
      .slice(0, 80);
    const difficulty = String(body.difficulty || "foundation")
      .trim()
      .slice(0, 24);
    const trainingCorrect =
      body.kind === "training" &&
      (typeof body.correct === "boolean"
        ? body.correct
        : Number(body.score ?? 0) >= 80);
    if (
      body.kind === "training" &&
      (!/^[\p{L}\p{N}_ -]{1,32}$/u.test(skill) ||
        (questionId && !/^[a-zA-Z0-9:_-]{1,80}$/.test(questionId)) ||
        !/^[a-zA-Z0-9_-]{1,24}$/.test(difficulty))
    ) {
      return NextResponse.json({ error: "训练记录格式无效" }, { status: 400 });
    }
    const ratingDelta =
      body.kind === "game"
        ? body.won
          ? 18
          : -8
        : Math.max(2, Math.min(12, Math.round((body.score ?? 60) / 10)));
    const streakValue = body.kind === "training" ? 1 : 0;
    const eventPayload = JSON.stringify({
      kind: body.kind,
      won: Boolean(body.won),
      decisions: decisionDelta,
      strongDecisions: strongDelta,
      module: body.module?.slice(0, 80),
      score: Math.max(0, Math.min(100, body.score ?? 0)),
      questionId,
      skill,
      difficulty,
      correct: trainingCorrect,
    });

    const statements = [
      env.DB.prepare(
        `INSERT INTO learner_progress
          (user_id, games, wins, decisions, strong_decisions, training_completed, rating, streak, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           games = games + excluded.games,
           wins = wins + excluded.wins,
           decisions = decisions + excluded.decisions,
           strong_decisions = strong_decisions + excluded.strong_decisions,
           training_completed = training_completed + excluded.training_completed,
           rating = MAX(100, rating + ?),
           streak = CASE WHEN excluded.training_completed > 0 THEN streak + 1 ELSE streak END,
           updated_at = excluded.updated_at`
      ).bind(
        id,
        gameDelta,
        winDelta,
        decisionDelta,
        strongDelta,
        trainingDelta,
        800 + ratingDelta,
        streakValue,
        now,
        ratingDelta
      ),
      env.DB.prepare(
        "INSERT INTO learning_events (user_id, kind, payload, created_at) VALUES (?, ?, ?, ?)"
      ).bind(id, body.kind, eventPayload, now),
      env.DB.prepare(
        `DELETE FROM learning_events
         WHERE user_id = ? AND id NOT IN (
           SELECT id FROM learning_events
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT 1000
         )`
      ).bind(id, id),
    ];
    if (body.kind === "training") {
      statements.push(
        env.DB.prepare(
          `INSERT INTO training_skill_progress
            (user_id, skill, attempted, correct, due, updated_at)
           VALUES (?, ?, 1, ?, ?, ?)
           ON CONFLICT(user_id, skill) DO UPDATE SET
             attempted = attempted + 1,
             correct = correct + excluded.correct,
             due = MAX(0, due + ?),
             updated_at = excluded.updated_at`
        ).bind(
          id,
          skill,
          trainingCorrect ? 1 : 0,
          trainingCorrect ? 0 : 1,
          now,
          trainingCorrect ? -1 : 1
        )
      );
      if (questionId) {
        statements.push(
          trainingCorrect
            ? env.DB.prepare(
                `DELETE FROM training_review_queue
                 WHERE user_id = ? AND question_id = ?`
              ).bind(id, questionId)
            : env.DB.prepare(
                `INSERT INTO training_review_queue
                  (user_id, question_id, topic, difficulty, misses, updated_at)
                 VALUES (?, ?, ?, ?, 1, ?)
                 ON CONFLICT(user_id, question_id) DO UPDATE SET
                   topic = excluded.topic,
                   difficulty = excluded.difficulty,
                   misses = misses + 1,
                   updated_at = excluded.updated_at`
              ).bind(id, questionId, skill, difficulty, now)
        );
      }
    }
    await env.DB.batch(statements);

    return GET(request);
  } catch {
    return NextResponse.json(
      { ...defaultProgress, accepted: false },
      { headers: { "x-progress-mode": "preview" } }
    );
  }
}
