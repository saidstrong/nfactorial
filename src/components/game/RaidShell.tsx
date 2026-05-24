"use client";

import { useState } from "react";
import { INITIAL_RAID_HUD } from "@/lib/game/constants";
import type { RaidHudState } from "@/lib/game/types";
import { PhaserRaidGame } from "./PhaserRaidGame";

export function RaidShell() {
  const [hud, setHud] = useState<RaidHudState>(INITIAL_RAID_HUD);
  const [restartKey, setRestartKey] = useState(0);

  function handleRestart() {
    setHud(INITIAL_RAID_HUD);
    setRestartKey((currentKey) => currentKey + 1);
  }

  const hpPercent = Math.max(0, Math.round((hud.hp / hud.maxHp) * 100));
  const isDefeated = hud.status === "operator-down";

  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 border-b border-cyan-300/20 pb-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-[0.08em] text-white sm:text-5xl">
              BLACKOUT RAID
            </h1>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/65">
              Survive the AI-directed dungeon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
            <HudMetric label="Score" value={hud.score} />
            <HudMetric label="Kills" value={hud.kills} />
            <HudMetric label="Threats" value={hud.enemiesAlive} />
            <HudMetric label="Status" value={isDefeated ? "Down" : "Live"} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative overflow-hidden border border-cyan-300/20 bg-[#020609] shadow-[0_0_44px_rgba(45,212,191,0.12)]">
            <PhaserRaidGame
              key={restartKey}
              onHudChange={setHud}
            />
          </div>

          <aside className="scanline border border-cyan-300/20 bg-[#071015]/90 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/60">
                Operator HUD
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[0.08em] text-white">
                RAID CONTROL
              </h2>
            </div>

            <div className="mt-5 border border-cyan-300/15 bg-black/25 p-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
                    Operator HP
                  </p>
                  <p className="mt-1 text-4xl font-black text-white">
                    {hud.hp}/{hud.maxHp}
                  </p>
                </div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">
                  {hpPercent}%
                </span>
              </div>
              <div className="h-3 overflow-hidden bg-[#0f2027]">
                <div
                  className={[
                    "h-full transition-all",
                    hpPercent <= 30 ? "bg-red-400" : "bg-cyan-300",
                  ].join(" ")}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <HudMetric label="Dash" value={hud.dashReady ? "Ready" : "Cooling"} />
              <HudMetric label="Mode" value={isDefeated ? "Wipeout" : "Raid"} />
            </div>

            <section className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Controls
              </h3>
              <ul className="mt-3 grid gap-2 text-sm leading-5 text-cyan-100/70">
                <li>WASD: move</li>
                <li>Mouse: aim</li>
                <li>Left click: shoot</li>
                <li>Space: dash</li>
              </ul>
            </section>

            {isDefeated ? (
              <section className="mt-5 border border-red-300/45 bg-red-400/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-100/75">
                  Raid Failed
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                  Operator Down
                </h3>
                <p className="mt-3 text-sm leading-6 text-cyan-100/70">
                  Final score {hud.score}. Hostiles neutralized {hud.kills}.
                </p>
                <button
                  className="mt-4 w-full border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
                  onClick={handleRestart}
                  type="button"
                >
                  Restart Raid
                </button>
              </section>
            ) : (
              <button
                className="mt-5 w-full border border-cyan-300/55 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
                onClick={handleRestart}
                type="button"
              >
                Restart Raid
              </button>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function HudMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-cyan-300/15 bg-[#081820] p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
