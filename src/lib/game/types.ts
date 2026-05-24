export type GameStatus = "active" | "grid-restored" | "blackout";

export type CellVisibility = "hidden" | "revealed" | "flagged" | "contained";

export type RevealOutcome =
  | "ignored"
  | "safe-revealed"
  | "shield-absorbed"
  | "grid-restored"
  | "blackout";

export type ScanRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ShieldStatus = "available" | "armed" | "consumed";

export type Coordinate = {
  row: number;
  column: number;
};

export type GameConfig = {
  rows: number;
  columns: number;
  corruptedNodes: number;
};

export type GameCell = Coordinate & {
  id: string;
  isCorrupted: boolean;
  adjacentCorruptions: number;
  visibility: CellVisibility;
};

export type GameBoard = GameCell[][];

export type GameState = {
  board: GameBoard;
  config: GameConfig;
  status: GameStatus;
  flagsRemaining: number;
  safeRevealed: number;
  safeCellCount: number;
  seed: number;
  detonatedCell: Coordinate | null;
};

export type RevealResult = {
  state: GameState;
  outcome: RevealOutcome;
  coordinate: Coordinate | null;
};
