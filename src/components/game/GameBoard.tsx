import type { Coordinate, GameBoard as GameBoardType, GameStatus } from "@/lib/game/types";
import { GameCell } from "./GameCell";

type GameBoardProps = {
  board: GameBoardType;
  status: GameStatus;
  flagMode: boolean;
  scanMode: boolean;
  detonatedCell: Coordinate | null;
  onReveal: (coordinate: Coordinate) => void;
  onScan: (coordinate: Coordinate) => void;
  onToggleFlag: (coordinate: Coordinate) => void;
};

export function GameBoard({
  board,
  status,
  flagMode,
  scanMode,
  detonatedCell,
  onReveal,
  onScan,
  onToggleFlag,
}: GameBoardProps) {
  const modeLabel = scanMode ? "scan" : flagMode ? "quarantine" : "reveal";

  return (
    <section
      aria-label="City power grid"
      className="w-full max-w-[min(92vw,620px)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
        <span>City Power Grid</span>
        <span
          className={
            scanMode ? "text-emerald-200" : flagMode ? "text-amber-200" : "text-cyan-200/70"
          }
        >
          Mode: {modeLabel}
        </span>
      </div>
      <div className="grid aspect-square grid-cols-10 gap-1 rounded border border-cyan-300/20 bg-[#020507] p-2 shadow-[0_0_42px_rgba(45,212,191,0.12)]">
        {board.flat().map((cell) => (
          <GameCell
            cell={cell}
            detonatedCell={detonatedCell}
            key={cell.id}
            onReveal={scanMode ? onScan : flagMode ? onToggleFlag : onReveal}
            onToggleFlag={onToggleFlag}
            status={status}
          />
        ))}
      </div>
    </section>
  );
}
