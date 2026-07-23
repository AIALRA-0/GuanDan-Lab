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

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(CREATE_PROGRESS),
    env.DB.prepare(CREATE_EVENTS),
    env.DB.prepare(CREATE_EVENTS_INDEX),
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
    const result = await env.DB.prepare(
      `SELECT games, wins, decisions, strong_decisions AS strongDecisions,
              training_completed AS trainingCompleted, rating, streak
       FROM learner_progress WHERE user_id = ?`
    )
      .bind(id)
      .first();
    return NextResponse.json(result ?? defaultProgress);
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
    });

    await env.DB.batch([
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
    ]);

    return GET(request);
  } catch {
    return NextResponse.json(
      { ...defaultProgress, accepted: false },
      { headers: { "x-progress-mode": "preview" } }
    );
  }
}
