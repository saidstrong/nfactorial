import type { Coordinate, GameCell as GameCellType, GameStatus } from "@/lib/game/types";

type GameCellProps = {
  cell: GameCellType;
  status: GameStatus;
  detonatedCell: Coordinate | null;
  onReveal: (coordinate: Coordinate) => void;
  onToggleFlag: (coordinate: Coordinate) => void;
};

const numberClasses: Record<number, string> = {
  1: "text-cyan-200",
  2: "text-emerald-300",
  3: "text-amber-300",
  4: "text-orange-300",
  5: "text-red-300",
  6: "text-red-400",
  7: "text-rose-300",
  8: "text-white",
};

export function GameCell({
  cell,
  status,
  detonatedCell,
  onReveal,
  onToggleFlag,
}: GameCellProps) {
  const isDetonated =
    detonatedCell?.row === cell.row && detonatedCell.column === cell.column;
  const revealCorruption = status === "blackout" && cell.isCorrupted;
  const isRevealed = cell.visibility === "revealed" || revealCorruption;
  const isFlagged = cell.visibility === "flagged" && !revealCorruption;
  const coordinate = { row: cell.row, column: cell.column };

  const content = getCellContent(cell, isFlagged, revealCorruption);
  const title = getCellTitle(cell, isFlagged, revealCorruption);

  return (
    <button
      aria-label={title}
      className={[
        "aspect-square min-h-0 w-full select-none border text-center text-sm font-black transition",
        "focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#05070a]",
        "sm:text-base",
        getCellClasses(cell, isRevealed, isFlagged, revealCorruption, isDetonated),
      ].join(" ")}
      disabled={status !== "active"}
      onClick={() => onReveal(coordinate)}
      onContextMenu={(event) => {
        event.preventDefault();
        onToggleFlag(coordinate);
      }}
      type="button"
    >
      {content}
    </button>
  );
}

function getCellContent(
  cell: GameCellType,
  isFlagged: boolean,
  revealCorruption: boolean,
): string {
  if (isFlagged) {
    return "Q";
  }

  if (revealCorruption || (cell.visibility === "revealed" && cell.isCorrupted)) {
    return "X";
  }

  if (cell.visibility === "revealed" && cell.adjacentCorruptions > 0) {
    return String(cell.adjacentCorruptions);
  }

  return "";
}

function getCellTitle(
  cell: GameCellType,
  isFlagged: boolean,
  revealCorruption: boolean,
): string {
  if (isFlagged) {
    return `Quarantined node row ${cell.row + 1}, column ${cell.column + 1}`;
  }

  if (revealCorruption || (cell.visibility === "revealed" && cell.isCorrupted)) {
    return `Corrupted node row ${cell.row + 1}, column ${cell.column + 1}`;
  }

  if (cell.visibility === "revealed") {
    return `Safe node row ${cell.row + 1}, column ${cell.column + 1}`;
  }

  return `Hidden node row ${cell.row + 1}, column ${cell.column + 1}`;
}

function getCellClasses(
  cell: GameCellType,
  isRevealed: boolean,
  isFlagged: boolean,
  revealCorruption: boolean,
  isDetonated: boolean,
): string {
  if (revealCorruption || (cell.visibility === "revealed" && cell.isCorrupted)) {
    return [
      "border-red-400 bg-[#2a0808] text-red-100",
      isDetonated ? "shadow-[0_0_26px_rgba(248,113,113,0.55)]" : "",
    ].join(" ");
  }

  if (isFlagged) {
    return "border-amber-400 bg-[#201307] text-amber-200 shadow-[inset_0_0_18px_rgba(251,191,36,0.16)]";
  }

  if (isRevealed) {
    return [
      "border-[#24434b] bg-[#101b21]",
      cell.adjacentCorruptions > 0
        ? numberClasses[cell.adjacentCorruptions]
        : "text-[#58717a]",
    ].join(" ");
  }

  return "border-[#15343b] bg-[#071117] text-cyan-100 shadow-[inset_0_0_12px_rgba(45,212,191,0.08)] hover:border-cyan-300 hover:bg-[#0b1b22]";
}
