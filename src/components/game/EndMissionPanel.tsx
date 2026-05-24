import type { GameStatus } from "@/lib/game/types";

type EndMissionPanelProps = {
  status: Exclude<GameStatus, "active">;
  score: number;
  rankLabel: string;
  elapsedSeconds: number;
  stability: number;
  safeRevealed: number;
  safeCellCount: number;
  correctFlags: number;
  wrongFlags: number;
  aiToolsUsed: number;
  onRestart: () => void;
};

export function EndMissionPanel({
  status,
  score,
  rankLabel,
  elapsedSeconds,
  stability,
  safeRevealed,
  safeCellCount,
  correctFlags,
  wrongFlags,
  aiToolsUsed,
  onRestart,
}: EndMissionPanelProps) {
  const result = status === "grid-restored" ? "Grid Restored" : "Blackout";
  const tone =
    status === "grid-restored"
      ? "border-emerald-300/45 bg-emerald-300/10"
      : "border-red-300/45 bg-red-400/10";

  return (
    <section className={["mt-5 border p-4", tone].join(" ")}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/60">
        Mission Result
      </p>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
        {result}
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <EndMetric label="Final Score" value={score} />
        <EndMetric label="Rank" value={rankLabel} />
        <EndMetric label="Time" value={`${elapsedSeconds}s`} />
        <EndMetric label="Stability" value={`${stability}%`} />
        <EndMetric label="Safe Nodes" value={`${safeRevealed}/${safeCellCount}`} />
        <EndMetric label="Correct Flags" value={correctFlags} />
        <EndMetric label="Wrong Flags" value={wrongFlags} />
        <EndMetric label="AI Tools Used" value={aiToolsUsed} />
      </div>
      <button
        className="mt-4 w-full border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
        onClick={onRestart}
        type="button"
      >
        Restart Mission
      </button>
    </section>
  );
}

function EndMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/50">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}
