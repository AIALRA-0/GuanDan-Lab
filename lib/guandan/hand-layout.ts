import { CardRank } from "./types";

type HandCardLike = {
  rank: CardRank;
};

export type HandFanPlacement = {
  left: number;
  visibleStep: number;
  groupStart: boolean;
};

export type HandFanLayout = {
  cardWidth: number;
  cardHeight: number;
  fanWidth: number;
  height: number;
  placements: HandFanPlacement[];
};

function dimensionsFor(containerWidth: number) {
  if (containerWidth < 430) {
    return { cardWidth: 56, maxUnit: 18 };
  }
  if (containerWidth < 760) {
    return { cardWidth: 64, maxUnit: 25 };
  }
  return { cardWidth: 68, maxUnit: 30 };
}

export function buildHandFanLayout(
  cards: readonly HandCardLike[],
  measuredWidth: number
): HandFanLayout {
  const containerWidth = Math.max(240, Math.round(measuredWidth || 720));
  const { cardWidth, maxUnit } = dimensionsFor(containerWidth);
  const cardHeight = Math.round(cardWidth * 1.48);
  const height = cardHeight + 20;

  if (cards.length === 0) {
    return {
      cardWidth,
      cardHeight,
      fanWidth: 0,
      height,
      placements: [],
    };
  }

  if (cards.length === 1) {
    return {
      cardWidth,
      cardHeight,
      fanWidth: cardWidth,
      height,
      placements: [
        {
          left: Math.max(0, (containerWidth - cardWidth) / 2),
          visibleStep: cardWidth,
          groupStart: true,
        },
      ],
    };
  }

  const transitionWeights = cards.slice(1).map((card, index) =>
    card.rank === cards[index].rank ? 0.72 : 1.12
  );
  const totalWeight = transitionWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );
  const fanWidth = Math.min(
    containerWidth,
    cardWidth + totalWeight * maxUnit
  );
  const unit = (fanWidth - cardWidth) / totalWeight;
  const start = Math.max(0, (containerWidth - fanWidth) / 2);
  const lefts = [start];

  transitionWeights.forEach((weight) => {
    lefts.push(lefts.at(-1)! + weight * unit);
  });

  return {
    cardWidth,
    cardHeight,
    fanWidth,
    height,
    placements: lefts.map((left, index) => ({
      left,
      visibleStep:
        index === lefts.length - 1
          ? cardWidth
          : lefts[index + 1] - left,
      groupStart:
        index === 0 || cards[index - 1].rank !== cards[index].rank,
    })),
  };
}
