import { deal, nextSeat, partnerOf, seatTeam, sortHand } from "./cards";
import { canBeat, findSelectedPattern, legalPatterns } from "./patterns";
import { explainMove } from "./strategy";
import { Card, GameState, Pattern, Rank, Seat, TurnRecord } from "./types";

function activeSeats(state: GameState): Seat[] {
  return ([0, 1, 2, 3] as Seat[]).filter((seat) => !state.finished.includes(seat));
}

function nextActive(state: GameState, from: Seat): Seat {
  let candidate = nextSeat(from);
  while (state.finished.includes(candidate)) candidate = nextSeat(candidate);
  return candidate;
}

function trickLeaderAfterFinish(state: GameState, previousLeader: Seat): Seat {
  if (!state.finished.includes(previousLeader)) return previousLeader;
  const partner = partnerOf(previousLeader);
  if (!state.finished.includes(partner)) return partner;
  return nextActive(state, previousLeader);
}

function finishGameIfNeeded(state: GameState): GameState {
  const first = state.finished[0];
  const second = state.finished[1];
  if (first !== undefined && second !== undefined && seatTeam(first) === seatTeam(second)) {
    const remaining = ([0, 1, 2, 3] as Seat[]).filter(
      (seat) => !state.finished.includes(seat)
    );
    const finished = [...state.finished, ...remaining];
    return {
      ...state,
      finished,
      winnerTeam: seatTeam(first),
      levelGain: 3,
    };
  }
  if (state.finished.length >= 3) {
    if (first === undefined) return state;
    const last = ([0, 1, 2, 3] as Seat[]).find(
      (seat) => !state.finished.includes(seat)
    );
    const finished = last === undefined ? state.finished : [...state.finished, last];
    const partnerPosition = finished.indexOf(partnerOf(first));
    return {
      ...state,
      finished,
      winnerTeam: seatTeam(first),
      levelGain: partnerPosition === 2 ? 2 : 1,
    };
  }
  return state;
}

export function createGame(
  seed = Math.floor(Date.now() % 2147483647),
  level: Rank = "2"
): GameState {
  const hands = deal(seed).map((hand) => sortHand(hand, level)) as [
    Card[],
    Card[],
    Card[],
    Card[],
  ];
  return {
    seed,
    level,
    hands,
    currentSeat: 0,
    passCount: 0,
    finished: [],
    records: [],
    turn: 0,
  };
}

export function getLegalPatterns(state: GameState, seat = state.currentSeat): Pattern[] {
  return legalPatterns(state.hands[seat], state.target, state.level);
}

export function selectedPattern(
  state: GameState,
  selectedIds: string[]
): Pattern | undefined {
  return findSelectedPattern(
    state.hands[state.currentSeat],
    selectedIds,
    state.level
  );
}

function appendRecord(
  state: GameState,
  record: Omit<TurnRecord, "id" | "at">
): TurnRecord[] {
  return [
    ...state.records,
    {
      ...record,
      id: state.records.length + 1,
      at: Date.now(),
    },
  ];
}

export function play(state: GameState, seat: Seat, pattern: Pattern): GameState {
  if (state.winnerTeam !== undefined) throw new Error("本局已经结束");
  if (seat !== state.currentSeat) throw new Error("尚未轮到该座位");
  if (!canBeat(pattern, state.target)) throw new Error("所选牌型无法压过当前牌");

  const handIds = new Set(state.hands[seat].map((card) => card.id));
  if (pattern.cards.some((card) => !handIds.has(card.id))) {
    throw new Error("所选牌不在当前手牌中");
  }

  const explanation = explainMove(state, seat, pattern);
  const playedIds = new Set(pattern.cards.map((card) => card.id));
  const nextHand = state.hands[seat].filter((card) => !playedIds.has(card.id));
  const hands = state.hands.map((hand, index) =>
    index === seat ? nextHand : hand
  ) as GameState["hands"];
  const finished =
    nextHand.length === 0 && !state.finished.includes(seat)
      ? [...state.finished, seat]
      : state.finished;

  let nextState: GameState = {
    ...state,
    hands,
    target: pattern,
    targetSeat: seat,
    passCount: 0,
    finished,
    records: appendRecord(state, {
      seat,
      action: "play",
      pattern,
      explanation,
    }),
    turn: state.turn + 1,
  };
  nextState = finishGameIfNeeded(nextState);
  if (nextState.winnerTeam !== undefined) return nextState;
  nextState.currentSeat = nextActive(nextState, seat);
  return nextState;
}

export function pass(state: GameState, seat: Seat): GameState {
  if (state.winnerTeam !== undefined) throw new Error("本局已经结束");
  if (seat !== state.currentSeat) throw new Error("尚未轮到该座位");
  if (!state.target || state.targetSeat === undefined) throw new Error("本轮先手不能过牌");

  const explanation = explainMove(state, seat, undefined);
  const passCount = state.passCount + 1;
  const active = activeSeats(state);
  const targetStillActive = active.includes(state.targetSeat);
  const threshold = Math.max(1, active.length - (targetStillActive ? 1 : 0));
  const records = appendRecord(state, {
    seat,
    action: "pass",
    explanation,
  });

  if (passCount >= threshold) {
    const leader = trickLeaderAfterFinish(state, state.targetSeat);
    return {
      ...state,
      currentSeat: leader,
      target: undefined,
      targetSeat: undefined,
      passCount: 0,
      records,
      turn: state.turn + 1,
    };
  }

  return {
    ...state,
    currentSeat: nextActive(state, seat),
    passCount,
    records,
    turn: state.turn + 1,
  };
}

export function applySelectedCards(
  state: GameState,
  selectedIds: string[]
): GameState {
  const pattern = selectedPattern(state, selectedIds);
  if (!pattern) throw new Error("这些牌暂时不能组成合法牌型");
  return play(state, state.currentSeat, pattern);
}

export function getGameResultLabel(state: GameState): string {
  if (state.winnerTeam === undefined) return "对局进行中";
  const userWon = state.winnerTeam === 0;
  const finish = state.levelGain === 3 ? "双下" : state.levelGain === 2 ? "头三" : "头末";
  return `${userWon ? "你方获胜" : "对方获胜"} · ${finish} · 升 ${state.levelGain} 级`;
}
