"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AI_BOSS_PHASE_FALLBACK,
  AI_DEBRIEF_FALLBACK,
  AI_EVENT_FALLBACK,
  AI_MISSION_FALLBACK,
  type AiEventDirective,
  type AiEventRequest,
  type AiEventSelection,
  type BossPhaseDirective,
  type BossPhaseRequest,
  type BossPhaseSelection,
  type DebriefDirective,
  type MissionBriefing,
  type RaidEndReport,
} from "@/lib/ai/fallbacks";
import {
  validateAiEventOutput,
  validateBossPhaseOutput,
  validateDebriefOutput,
  validateMissionOutput,
} from "@/lib/ai/validation";
import { INITIAL_RAID_HUD } from "@/lib/game/constants";
import type { RaidHudState, UpgradeOption, UpgradeSelection } from "@/lib/game/types";
import { PhaserRaidGame } from "./PhaserRaidGame";

export function RaidShell() {
  const [hud, setHud] = useState<RaidHudState>(INITIAL_RAID_HUD);
  const [restartKey, setRestartKey] = useState(0);
  const [mission, setMission] = useState<MissionBriefing>(AI_MISSION_FALLBACK);
  const [upgradeOffers, setUpgradeOffers] = useState<UpgradeOption[] | null>(null);
  const [upgradeSelection, setUpgradeSelection] =
    useState<UpgradeSelection | null>(null);
  const [upgradeSequence, setUpgradeSequence] = useState(0);
  const [aiEventNotice, setAiEventNotice] = useState<{
    directive: AiEventDirective;
    isLoading: boolean;
  } | null>(null);
  const [aiEventSelection, setAiEventSelection] =
    useState<AiEventSelection | null>(null);
  const [aiEventSequence, setAiEventSequence] = useState(0);
  const [bossPhaseSelection, setBossPhaseSelection] =
    useState<BossPhaseSelection | null>(null);
  const [debrief, setDebrief] = useState<string | null>(null);
  const bossPhaseSequenceRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadMission() {
      const nextMission = await requestAiDirector<MissionBriefing>(
        "/api/ai/mission",
        { difficulty: "hard", mode: "solo", playerName: "Operator" },
        AI_MISSION_FALLBACK,
        validateMissionOutput,
      );

      if (!isCancelled) {
        setMission(nextMission);
      }
    }

    void loadMission();

    return () => {
      isCancelled = true;
    };
  }, [restartKey]);

  function handleRestart() {
    setHud(INITIAL_RAID_HUD);
    setMission(AI_MISSION_FALLBACK);
    setDebrief(null);
    setAiEventNotice(null);
    setAiEventSelection(null);
    setAiEventSequence(0);
    setBossPhaseSelection(null);
    bossPhaseSequenceRef.current = 0;
    setUpgradeOffers(null);
    setUpgradeSelection(null);
    setUpgradeSequence(0);
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

  const handleAiEventRequest = useCallback((request: AiEventRequest) => {
    setAiEventNotice({
      directive: AI_EVENT_FALLBACK,
      isLoading: true,
    });

    void requestAiDirector<AiEventDirective>(
      "/api/ai/event",
      request,
      AI_EVENT_FALLBACK,
      validateAiEventOutput,
    ).then((directive) => {
      setAiEventNotice({
        directive,
        isLoading: false,
      });
    });
  }, []);

  const handleConfirmAiEvent = useCallback(() => {
    if (!aiEventNotice || aiEventNotice.isLoading) {
      return;
    }

    const nextSequence = aiEventSequence + 1;

    setAiEventSequence(nextSequence);
    setAiEventSelection({
      directive: aiEventNotice.directive,
      sequence: nextSequence,
    });
    setAiEventNotice(null);
  }, [aiEventNotice, aiEventSequence]);

  const handleBossPhaseRequest = useCallback(
    (phase: 2 | 3, request: BossPhaseRequest) => {
      void requestAiDirector<BossPhaseDirective>(
        "/api/ai/boss-phase",
        request,
        AI_BOSS_PHASE_FALLBACK,
        validateBossPhaseOutput,
      ).then((directive) => {
        bossPhaseSequenceRef.current += 1;
        setBossPhaseSelection({
          directive,
          phase,
          sequence: bossPhaseSequenceRef.current,
        });
      });
    },
    [],
  );

  const handleRaidEnd = useCallback((report: RaidEndReport) => {
    setDebrief("AI Director compiling final debrief...");

    void requestAiDirector<DebriefDirective>(
      "/api/ai/debrief",
      report,
      AI_DEBRIEF_FALLBACK,
      validateDebriefOutput,
    ).then((directive) => {
      setDebrief(directive.debrief);
    });
  }, []);

  const hpPercent = Math.max(0, Math.round((hud.hp / hud.maxHp) * 100));
  const isDefeated = hud.status === "operator-down";
  const isVictory = hud.status === "victory";
  const showBossHud = hud.status === "boss" || hud.status === "victory";
  const bossHpPercent =
    hud.bossMaxHp > 0 ? Math.max(0, Math.round((hud.bossHp / hud.bossMaxHp) * 100)) : 0;
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
              aiEventSelection={aiEventSelection}
              bossPhaseSelection={bossPhaseSelection}
              onAiEventRequest={handleAiEventRequest}
              onBossPhaseRequest={handleBossPhaseRequest}
              onHudChange={setHud}
              onRaidEnd={handleRaidEnd}
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
            {aiEventNotice ? (
              <AiEventOverlay
                directive={aiEventNotice.directive}
                isLoading={aiEventNotice.isLoading}
                onConfirm={handleConfirmAiEvent}
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

            <section className="mt-5 border border-cyan-300/15 bg-black/20 p-4">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                AI Director Briefing
              </h3>
              <p className="mt-3 text-lg font-black uppercase tracking-[0.08em] text-white">
                {mission.missionTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-cyan-100/70">
                {mission.briefing}
              </p>
              <div className="mt-4 border-l border-orange-300/40 pl-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/60">
                  Target: {mission.bossName}
                </p>
                <p className="mt-2 text-sm leading-5 text-orange-100/75">
                  {mission.threatLine}
                </p>
              </div>
            </section>

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

            {showBossHud ? (
              <section className="mt-5 border border-orange-300/25 bg-[#220b05]/40 p-4">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/60">
                      The Blackout Core
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {hud.bossHp}/{hud.bossMaxHp}
                    </p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-100/75">
                    {bossHpPercent}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden bg-[#2a1009]">
                  <div
                    className="h-full bg-orange-400 transition-all"
                    style={{ width: `${bossHpPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <HudMetric label="Phase" value={hud.bossPhase ?? "-"} />
                  <HudMetric label="Mode" value={formatBossMode(hud.bossMode)} />
                </div>
              </section>
            ) : null}

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
                body="The raid collapsed before the Core was destroyed."
                debrief={debrief}
                heading="Operator Down"
                hud={hud}
                label="Wipeout"
                onRestart={handleRestart}
                tone="danger"
              />
            ) : isVictory ? (
              <ResultPanel
                body="The Blackout Core is offline. Raid complete."
                debrief={debrief}
                heading="Core Destroyed"
                hud={hud}
                label="Victory"
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

function AiEventOverlay({
  directive,
  isLoading,
  onConfirm,
}: {
  directive: AiEventDirective;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#02060b]/86 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl border border-orange-300/35 bg-[#120905]/95 p-5 shadow-[0_0_46px_rgba(255,90,31,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100/60">
          AI Director Crisis Event
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
          {isLoading ? "Analyzing Wave 3" : directive.eventTitle}
        </h2>
        <p className="mt-4 text-sm leading-6 text-orange-100/76">
          {isLoading
            ? "The Director is evaluating your raid state. A safe local fallback will engage if the uplink stalls."
            : directive.eventText}
        </p>
        <div className="mt-5 border border-orange-300/20 bg-black/25 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/55">
            Modifier
          </p>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-orange-100">
            {isLoading ? "Pending" : formatModifier(directive.modifier)}
          </p>
        </div>
        <button
          className="mt-5 w-full border border-orange-300 bg-orange-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#160704] transition hover:bg-orange-200 disabled:cursor-wait disabled:border-orange-300/30 disabled:bg-orange-300/20 disabled:text-orange-100/45"
          disabled={isLoading}
          onClick={onConfirm}
          type="button"
        >
          Enter Wave 3
        </button>
      </section>
    </div>
  );
}

function ResultPanel({
  body,
  debrief,
  heading,
  hud,
  label,
  onRestart,
  tone,
}: {
  body: string;
  debrief: string | null;
  heading: string;
  hud: RaidHudState;
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
      <div className="mt-4 grid grid-cols-2 gap-3">
        <HudMetric label="Score" value={hud.score} />
        <HudMetric label="Kills" value={hud.kills} />
        <HudMetric label="Damage Taken" value={hud.damageTaken} />
        <HudMetric label="Modes Faced" value={hud.bossModeHistory.length || "-"} />
      </div>
      {hud.selectedUpgrades.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
            Upgrades Selected
          </p>
          <p className="mt-2 text-sm leading-6 text-cyan-100/70">
            {hud.selectedUpgrades.map((upgrade) => upgrade.name).join(", ")}
          </p>
        </div>
      ) : null}
      {hud.bossModeHistory.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
            Boss Modes Faced
          </p>
          <p className="mt-2 text-sm leading-6 text-cyan-100/70">
            {hud.bossModeHistory.map(formatBossMode).join(", ")}
          </p>
        </div>
      ) : null}
      <div className="mt-4 border border-cyan-300/15 bg-black/20 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
          AI Debrief
        </p>
        <p className="mt-2 text-sm leading-6 text-cyan-100/70">
          {debrief ?? "AI Director compiling final debrief..."}
        </p>
      </div>
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

  if (status === "boss-entry") {
    return "Core";
  }

  if (status === "boss") {
    return "Boss";
  }

  if (status === "victory") {
    return "Victory";
  }

  if (status === "upgrade") {
    return "Upgrade";
  }

  if (status === "ai-event") {
    return "AI Event";
  }

  return "Live";
}

function formatBossMode(mode: RaidHudState["bossMode"]): string {
  if (!mode) {
    return "-";
  }

  return mode
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatModifier(modifier: AiEventDirective["modifier"]): string {
  return modifier
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

async function requestAiDirector<T>(
  path: string,
  payload: unknown,
  fallback: T,
  validate: (value: unknown) => T,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(path, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallback;
    }

    return validate(await response.json());
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timeout);
  }
}
