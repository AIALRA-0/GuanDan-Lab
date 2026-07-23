"use client";

import { Card, Rank } from "@/lib/guandan/types";
import { cardLabel, isWild } from "@/lib/guandan/cards";

const suitSymbol = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
  joker: "✦",
} as const;

export function CardFace({
  card,
  level,
  selected = false,
  compact = false,
  disabled = false,
  onClick,
}: {
  card: Card;
  level: Rank;
  selected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const wild = isWild(card, level);
  return (
    <button
      type="button"
      className={`card-face${selected ? " is-selected" : ""}${
        compact ? " is-compact" : ""
      }${red ? " is-red" : ""}${wild ? " is-wild" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${cardLabel(card)}${wild ? " 逢人配" : ""}`}
    >
      <span className="card-rank">{cardLabel(card)}</span>
      <span className="card-suit">{suitSymbol[card.suit]}</span>
      {wild && <span className="wild-mark">配</span>}
    </button>
  );
}

export function CardBack({ index = 0 }: { index?: number }) {
  return (
    <span
      className="card-back"
      style={{ transform: `translateX(${Math.min(index, 9) * -2}px)` }}
      aria-hidden="true"
    >
      <span>贯</span>
    </span>
  );
}

