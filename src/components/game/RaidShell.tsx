"use client";

import { useState } from "react";
import { INITIAL_RAID_HUD } from "@/lib/game/constants";
import type { RaidHudState, UpgradeOption, UpgradeSelection } from "@/lib/game/types";
import { PhaserRaidGame } from "./PhaserRaidGame";

export function RaidShell() {
  const [hud, setHud] = useState<RaidHudState>(INITIAL_RAID_HUD);
  const [restartKey, setRestartKey] = useState(0);
  const [upgradeOffers, setUpgradeOffers] = useState<UpgradeOption[] | null>(null);
  const [upgradeSelection, setUpgradeSelection] =
    useState<UpgradeSelection | null>(null);
  const [upgradeSequence, setUpgradeSequence] = useState(0);

  function handleRestart() {
    setHud(INITIAL_RAID_HUD);
    setUpgradeOffers(null);
    setUpgradeSelection(null);
    setRestartKey((currentKey) => currentKey + 1);
  }

  function handleSelectUpgrade(upgrade: UpgradeOption) {
    const nextSequence = upgradeSequence + 1;

    setUpgradeSequence(nextSequence);
    setUpgradeSelection({
      id: upgrade.id,
      sequence: nextSequence,
    });
    setUpgradeOffers(null);
  }

  const hpPercent = Math.max(0, Math.round((hud.hp / hud.maxHp) * 100));
  const isDefeated = hud.status === "operator-down";
  const isBossSignal = hud.status === "boss-signal";
  const dashLabel = hud.dashReady
    ? "Ready"
    : `${Math.ceil(hud.dashCooldownRemainingMs / 100) / 10}s`;

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
            <HudMetric label="Wave" value={`${hud.wave}/${hud.totalWaves}`} />
            <HudMetric label="Score" value={hud.score} />
            <HudMetric label="Kills" value={hud.kills} />
            <HudMetric label="Status" value={getStatusLabel(hud.status)} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative overflow-hidden border border-cyan-300/20 bg-[#020609] shadow-[0_0_44px_rgba(45,212,191,0.12)]">
            <PhaserRaidGame
              key={restartKey}
              onHudChange={setHud}
              onUpgradeOffer={setUpgradeOffers}
              upgradeSelection={upgradeSelection}
            />
            {upgradeOffers ? (
              <UpgradeOverlay
                onSelectUpgrade={handleSelectUpgrade}
                upgrades={upgradeOffers}
                wave={hud.wave}
              />
            ) : null}
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
              <HudMetric label="Enemies" value={hud.enemiesAlive} />
              <HudMetric label="Dash" value={dashLabel} />
            </div>

            <section className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Mission Status
              </h3>
              <p className="mt-3 text-sm leading-6 text-cyan-100/70">
                {hud.statusText}
              </p>
            </section>

            <section className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Upgrades
              </h3>
              {hud.selectedUpgrades.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm leading-5 text-cyan-100/70">
                  {hud.selectedUpgrades.map((upgrade) => (
                    <li className="border-l border-cyan-300/30 pl-3" key={upgrade.id}>
                      <span className="font-bold text-cyan-100">{upgrade.name}</span>
                      <span className="block text-cyan-100/55">
                        {upgrade.description}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-cyan-100/55">
                  Clear Wave 1 to unlock the first upgrade choice.
                </p>
              )}
            </section>

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
              <ResultPanel
                body={`Final score ${hud.score}. Hostiles neutralized ${hud.kills}.`}
                heading="Operator Down"
                label="Raid Failed"
                onRestart={handleRestart}
                tone="danger"
              />
            ) : isBossSignal ? (
              <ResultPanel
                body="Boss signal detected - next phase coming."
                heading="Phase 3 Complete"
                label="Raid Placeholder"
                onRestart={handleRestart}
                tone="success"
              />
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

function UpgradeOverlay({
  onSelectUpgrade,
  upgrades,
  wave,
}: {
  onSelectUpgrade: (upgrade: UpgradeOption) => void;
  upgrades: UpgradeOption[];
  wave: number;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#02060b]/88 p-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl border border-cyan-300/30 bg-[#071015]/95 p-5 shadow-[0_0_44px_rgba(45,212,191,0.2)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/60">
          Wave {wave} Cleared
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
          Choose Upgrade
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {upgrades.map((upgrade) => (
            <button
              className="min-h-40 border border-cyan-300/20 bg-[#081820] p-4 text-left transition hover:border-cyan-200 hover:bg-[#0d2430]"
              key={upgrade.id}
              onClick={() => onSelectUpgrade(upgrade)}
              type="button"
            >
              <span className="block text-base font-black uppercase tracking-[0.1em] text-cyan-100">
                {upgrade.name}
              </span>
              <span className="mt-3 block text-sm leading-6 text-cyan-100/65">
                {upgrade.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultPanel({
  body,
  heading,
  label,
  onRestart,
  tone,
}: {
  body: string;
  heading: string;
  label: string;
  onRestart: () => void;
  tone: "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-300/45 bg-red-400/10 text-red-100/75"
      : "border-emerald-300/45 bg-emerald-300/10 text-emerald-100/75";

  return (
    <section className={["mt-5 border p-4", toneClass].join(" ")}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
        {heading}
      </h3>
      <p className="mt-3 text-sm leading-6 text-cyan-100/70">{body}</p>
      <button
        className="mt-4 w-full border border-cyan-300 bg-cyan-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
        onClick={onRestart}
        type="button"
      >
        Restart Raid
      </button>
    </section>
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

function getStatusLabel(status: RaidHudState["status"]): string {
  if (status === "operator-down") {
    return "Down";
  }

  if (status === "upgrade") {
    return "Upgrade";
  }

  if (status === "boss-signal") {
    return "Signal";
  }

  return "Live";
}
