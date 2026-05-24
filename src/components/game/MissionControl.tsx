import type { GameState, GameStatus, ShieldStatus } from "@/lib/game/types";
import { EndMissionPanel } from "./EndMissionPanel";
import { StabilityMeter } from "./StabilityMeter";

type MissionControlProps = {
  game: GameState;
  flagMode: boolean;
  scanMode: boolean;
  elapsedSeconds: number;
  stability: number;
  score: number;
  rankLabel: string;
  correctFlags: number;
  wrongFlags: number;
  aiToolsUsed: number;
  shieldStatus: ShieldStatus;
  missionLog: string[];
  onRestart: () => void;
  onToggleFlagMode: () => void;
  onToggleScanMode: () => void;
  onActivateShield: () => void;
};

const statusLabels: Record<GameStatus, string> = {
  active: "active",
  "grid-restored": "grid restored",
  blackout: "blackout",
};

export function MissionControl({
  game,
  flagMode,
  scanMode,
  elapsedSeconds,
  stability,
  score,
  rankLabel,
  correctFlags,
  wrongFlags,
  aiToolsUsed,
  shieldStatus,
  missionLog,
  onRestart,
  onToggleFlagMode,
  onToggleScanMode,
  onActivateShield,
}: MissionControlProps) {
  const statusTone = getStatusTone(game.status);
  const scanDisabled =
    game.status !== "active" || (!scanMode && stability < 5);
  const shieldDisabled =
    game.status !== "active" || shieldStatus !== "available";

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

      <StabilityMeter stability={stability} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="Elapsed" value={`${elapsedSeconds}s`} />
        <Metric label="Score" value={score} />
        <Metric label="Flags Remaining" value={game.flagsRemaining} />
        <Metric
          label="Safe Revealed"
          value={`${game.safeRevealed}/${game.safeCellCount}`}
        />
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
        <div className="grid gap-2 border border-cyan-300/15 bg-[#081820] p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
            AI Tools
          </p>
          <button
            className="border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100/40"
            disabled
            type="button"
          >
            AI Counsel - Phase 3
          </button>
          <button
            aria-pressed={scanMode}
            className={[
              "border px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45",
              scanMode
                ? "border-emerald-300 bg-emerald-300 text-[#04130d]"
                : "border-emerald-300/55 bg-[#081b14] text-emerald-100 hover:border-emerald-200",
            ].join(" ")}
            disabled={scanDisabled}
            onClick={onToggleScanMode}
            type="button"
          >
            {scanMode ? "Cancel Scan Mode" : "Scan Node -5"}
          </button>
          <button
            className={[
              "border px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-55",
              shieldStatus === "armed"
                ? "border-cyan-300 bg-cyan-300 text-[#021012]"
                : shieldStatus === "consumed"
                  ? "border-red-300/45 bg-red-400/10 text-red-100"
                  : "border-cyan-300/55 bg-[#071a20] text-cyan-100 hover:border-cyan-200",
            ].join(" ")}
            disabled={shieldDisabled}
            onClick={onActivateShield}
            type="button"
          >
            {getShieldButtonLabel(shieldStatus)}
          </button>
        </div>

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

      <section className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            Mission Log
          </h3>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cyan-200/45">
            Latest {missionLog.length}
          </span>
        </div>
        <ol className="grid gap-2 text-sm leading-5 text-cyan-100/70">
          {missionLog.map((entry, index) => (
            <li className="border-l border-cyan-300/30 pl-3" key={`${entry}-${index}`}>
              {entry}
            </li>
          ))}
        </ol>
      </section>

      {game.status !== "active" ? (
        <EndMissionPanel
          aiToolsUsed={aiToolsUsed}
          correctFlags={correctFlags}
          elapsedSeconds={elapsedSeconds}
          onRestart={onRestart}
          rankLabel={rankLabel}
          safeCellCount={game.safeCellCount}
          safeRevealed={game.safeRevealed}
          score={score}
          stability={stability}
          status={game.status}
          wrongFlags={wrongFlags}
        />
      ) : null}
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

function getShieldButtonLabel(status: ShieldStatus): string {
  if (status === "armed") {
    return "Shield Pulse Armed";
  }

  if (status === "consumed") {
    return "Shield Consumed";
  }

  return "Arm Shield Pulse";
}
