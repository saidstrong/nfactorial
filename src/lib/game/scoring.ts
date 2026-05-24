import type { GameBoard } from "./types";

export type FlagSummary = {
  correctFlags: number;
  wrongFlags: number;
};

export type ScoreInput = FlagSummary & {
  safeRevealed: number;
  stability: number;
  elapsedSeconds: number;
  aiToolsUsed: number;
};

export type RankLabel =
  | "Grid Commander"
  | "Senior Operator"
  | "Field Analyst"
  | "Trainee Operator";

export function getFlagSummary(board: GameBoard): FlagSummary {
  return board.flat().reduce<FlagSummary>(
    (summary, cell) => {
      if (cell.visibility !== "flagged") {
        return summary;
      }

      if (cell.isCorrupted) {
        return {
          ...summary,
          correctFlags: summary.correctFlags + 1,
        };
      }

      return {
        ...summary,
        wrongFlags: summary.wrongFlags + 1,
      };
    },
    { correctFlags: 0, wrongFlags: 0 },
  );
}

export function calculateScore(input: ScoreInput): number {
  const score =
    input.safeRevealed * 20 +
    input.correctFlags * 50 +
    input.stability * 10 -
    input.elapsedSeconds * 3 -
    input.aiToolsUsed * 100 -
    input.wrongFlags * 150;

  return Math.max(0, score);
}

export function getRankLabel(score: number): RankLabel {
  if (score >= 2500) {
    return "Grid Commander";
  }

  if (score >= 1800) {
    return "Senior Operator";
  }

  if (score >= 1000) {
    return "Field Analyst";
  }

  return "Trainee Operator";
}
