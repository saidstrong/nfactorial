import type { GameState, GameStatus } from "@/lib/game/types";

type MissionControlProps = {
  game: GameState;
  flagMode: boolean;
  onRestart: () => void;
  onToggleFlagMode: () => void;
};

const statusLabels: Record<GameStatus, string> = {
  active: "active",
  "grid-restored": "grid restored",
  blackout: "blackout",
};

export function MissionControl({
  game,
  flagMode,
  onRestart,
  onToggleFlagMode,
}: MissionControlProps) {
  const statusTone = getStatusTone(game.status);

  return (
    <aside className="scanline w-full max-w-[620px] border border-cyan-300/20 bg-[#071015]/90 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)] lg:max-w-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/60">
            Mission Control
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">
            NODE SWEEP
          </h2>
        </div>
        <span
          className={[
            "border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]",
            statusTone,
          ].join(" ")}
        >
          {statusLabels[game.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Flags Remaining" value={game.flagsRemaining} />
        <Metric
          label="Safe Revealed"
          value={`${game.safeRevealed}/${game.safeCellCount}`}
        />
        <Metric label="Board" value={`${game.config.rows}x${game.config.columns}`} />
        <Metric label="Corrupted" value={game.config.corruptedNodes} />
      </div>

      <div className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/60">
          <span>Restore Progress</span>
          <span>{Math.round((game.safeRevealed / game.safeCellCount) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden bg-[#0f2027]">
          <div
            className="h-full bg-cyan-300 transition-all"
            style={{
              width: `${(game.safeRevealed / game.safeCellCount) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          aria-pressed={flagMode}
          className={[
            "border px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition",
            flagMode
              ? "border-amber-300 bg-amber-300 text-[#120b03]"
              : "border-amber-300/50 bg-[#211406] text-amber-100 hover:border-amber-200",
          ].join(" ")}
          disabled={game.status !== "active"}
          onClick={onToggleFlagMode}
          type="button"
        >
          Flag Mode
        </button>
        <button
          className="border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
          onClick={onRestart}
          type="button"
        >
          Restart Mission
        </button>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-cyan-300/15 bg-[#081820] p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function getStatusTone(status: GameStatus): string {
  if (status === "grid-restored") {
    return "border-emerald-300/60 bg-emerald-300/12 text-emerald-200";
  }

  if (status === "blackout") {
    return "border-red-300/60 bg-red-400/12 text-red-200";
  }

  return "border-cyan-300/60 bg-cyan-300/10 text-cyan-200";
}
