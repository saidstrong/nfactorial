"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  Crown,
  Crosshair,
  type LucideIcon,
  Radar,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TimerReset,
  Zap,
} from "lucide-react";
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
import type { CoopRuntimeConfig } from "@/lib/coop/types";
import { INITIAL_RAID_HUD } from "@/lib/game/constants";
import type {
  RaidHudState,
  RewardOption,
  RewardSelection,
} from "@/lib/game/types";
import { PhaserRaidGame } from "./PhaserRaidGame";

type FeedTone = "neutral" | "alert" | "critical";

type DirectorFeedEntry = {
  id: string;
  title: string;
  body: string;
  tone: FeedTone;
};

const INITIAL_FEED: DirectorFeedEntry[] = [
  {
    id: "boot-sequence",
    title: "AI Director online",
    body: "Mission uplink established. Awaiting live chamber telemetry.",
    tone: "neutral",
  },
];

type RaidShellProps = {
  multiplayer?: (CoopRuntimeConfig & { teammateLinked?: boolean }) | null;
  onRaidEndExternal?: ((report: RaidEndReport) => void) | undefined;
};

export function RaidShell({
  multiplayer = null,
  onRaidEndExternal,
}: RaidShellProps) {
  const [hud, setHud] = useState<RaidHudState>(INITIAL_RAID_HUD);
  const [restartKey, setRestartKey] = useState(0);
  const [mission, setMission] = useState<MissionBriefing>(AI_MISSION_FALLBACK);
  const [missionLoading, setMissionLoading] = useState(true);
  const [directorFeed, setDirectorFeed] =
    useState<DirectorFeedEntry[]>(INITIAL_FEED);
  const [rewardOffers, setRewardOffers] = useState<RewardOption[] | null>(null);
  const [rewardSelection, setRewardSelection] =
    useState<RewardSelection | null>(null);
  const [rewardSequence, setRewardSequence] = useState(0);
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
  const feedKeysRef = useRef<Set<string>>(
    new Set(INITIAL_FEED.map((entry) => entry.id)),
  );

  const pushFeed = useCallback((entry: DirectorFeedEntry) => {
    if (feedKeysRef.current.has(entry.id)) {
      return;
    }

    feedKeysRef.current.add(entry.id);
    setDirectorFeed((currentFeed) => [entry, ...currentFeed].slice(0, 6));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadMission() {
      const nextMission = await requestAiDirector<MissionBriefing>(
        "/api/ai/mission",
        {
          difficulty: "hard",
          mode: multiplayer ? "co-op" : "solo",
          playerName: multiplayer?.localNickname ?? "Operator",
        },
        AI_MISSION_FALLBACK,
        validateMissionOutput,
      );

      if (isCancelled) {
        return;
      }

      setMission(nextMission);
      setMissionLoading(false);
      pushFeed({
        id: `mission-${restartKey}`,
        title: nextMission.missionTitle,
        body: nextMission.threatLine,
        tone: "alert",
      });
    }

    void loadMission();

    return () => {
      isCancelled = true;
    };
  }, [multiplayer, pushFeed, restartKey]);

  function handleRestart() {
    feedKeysRef.current = new Set(INITIAL_FEED.map((entry) => entry.id));
    setHud(INITIAL_RAID_HUD);
    setMission(AI_MISSION_FALLBACK);
    setMissionLoading(true);
    setDirectorFeed(INITIAL_FEED);
    setDebrief(null);
    setAiEventNotice(null);
    setAiEventSelection(null);
    setAiEventSequence(0);
    setBossPhaseSelection(null);
    bossPhaseSequenceRef.current = 0;
    setRewardOffers(null);
    setRewardSelection(null);
    setRewardSequence(0);
    setRestartKey((currentKey) => currentKey + 1);
  }

  function handleSelectReward(reward: RewardOption) {
    const nextSequence = rewardSequence + 1;

    pushFeed({
      id: `reward-${restartKey}-${nextSequence}-${reward.id}`,
      title: buildRewardFeedTitle(reward),
      body: reward.description,
      tone: reward.type === "weapon" ? "alert" : "neutral",
    });
    setRewardSequence(nextSequence);
    setRewardSelection({
      reward,
      sequence: nextSequence,
    });
    setRewardOffers(null);
  }

  const handleAiEventRequest = useCallback(
    (request: AiEventRequest) => {
      pushFeed({
        id: `event-pending-${restartKey}-${request.wave}`,
        title: "Surge Chamber crisis scan",
        body: "AI Director is evaluating instability before the surge chamber opens.",
        tone: "neutral",
      });
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
        pushFeed({
          id: `event-${restartKey}-${directive.modifier}`,
          title: directive.eventTitle,
          body: directive.eventText,
          tone: "alert",
        });
      });
    },
    [pushFeed, restartKey],
  );

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
        pushFeed({
          id: `boss-phase-${restartKey}-${phase}-${directive.bossMode}`,
          title: directive.phaseTitle,
          body: directive.message,
          tone: "critical",
        });
      });
    },
    [pushFeed, restartKey],
  );

  const handleRaidEnd = useCallback(
    (report: RaidEndReport) => {
      onRaidEndExternal?.(report);
      setDebrief("AI Director compiling final mission report...");
      pushFeed({
        id: `result-${restartKey}-${report.result}`,
        title: report.result === "victory" ? "Core destroyed" : "Operator down",
        body:
          report.result === "victory"
            ? "Combat channel stabilized. Generating final debrief."
            : "Raid channel lost. Generating recovery report.",
        tone: report.result === "victory" ? "alert" : "critical",
      });

      void requestAiDirector<DebriefDirective>(
        "/api/ai/debrief",
        report,
        AI_DEBRIEF_FALLBACK,
        validateDebriefOutput,
      ).then((directive) => {
        setDebrief(directive.debrief);
        pushFeed({
          id: `debrief-${restartKey}-${report.result}`,
          title: `Mission report ready: ${report.finalWeapon}`,
          body: directive.debrief,
          tone: "neutral",
        });
      });
    },
    [onRaidEndExternal, pushFeed, restartKey],
  );

  const isCoop = Boolean(multiplayer);
  const safeMaxHp =
    Number.isFinite(hud.maxHp) && hud.maxHp > 0 ? hud.maxHp : INITIAL_RAID_HUD.maxHp;
  const safeHp = Number.isFinite(hud.hp)
    ? Math.min(Math.max(0, hud.hp), safeMaxHp)
    : 0;
  const hpPercent =
    safeMaxHp > 0 ? Math.max(0, Math.round((safeHp / safeMaxHp) * 100)) : 0;
  const safeBossMaxHp =
    Number.isFinite(hud.bossMaxHp) && hud.bossMaxHp > 0
      ? hud.bossMaxHp
      : INITIAL_RAID_HUD.bossMaxHp;
  const safeBossHp = Number.isFinite(hud.bossHp)
    ? Math.min(Math.max(0, hud.bossHp), safeBossMaxHp)
    : 0;
  const bossHpPercent =
    safeBossMaxHp > 0
      ? Math.max(0, Math.round((safeBossHp / safeBossMaxHp) * 100))
      : 0;
  const safeDashCooldownRemainingMs = Number.isFinite(hud.dashCooldownRemainingMs)
    ? Math.max(0, hud.dashCooldownRemainingMs)
    : 0;
  const dashLabel = hud.dashReady
    ? "Ready"
    : `${Math.ceil(safeDashCooldownRemainingMs / 100) / 10}s`;
  const isResultState = hud.status === "operator-down" || hud.status === "victory";
  const showBossHud = hud.status === "boss" || hud.status === "victory";
  const teammateStatus = multiplayer?.teammateNickname
    ? multiplayer.teammateLinked
      ? "Linked"
      : "Waiting"
    : "Pending";

  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="panel flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62 transition hover:text-cyan-100"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to briefing
            </Link>
            <h1 className="font-display mt-4 text-4xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl">
              BLACKOUT RAID
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-100/70 sm:text-base">
              Push through corrupted chambers, draft raid rewards, and break the
              Blackout Core before the uplink collapses.
            </p>
          </div>

          <div
            className={[
              "grid grid-cols-2 gap-3",
              isCoop ? "sm:grid-cols-5" : "sm:grid-cols-4",
            ].join(" ")}
          >
            <HeaderMetric label="Room" value={`${hud.roomNumber}/${hud.totalRooms}`} />
            <HeaderMetric label="Weapon" value={hud.currentWeaponName} />
            <HeaderMetric label="Kills" value={hud.kills} />
            <HeaderMetric label="Status" value={getStatusLabel(hud.status)} />
            {isCoop ? (
              <HeaderMetric
                label={multiplayer?.isHost ? "Role" : "Client"}
                value={multiplayer?.roomCode ?? "Co-op"}
              />
            ) : null}
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="panel-strong cyber-frame relative overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <CanvasChip
                  icon={Radar}
                  label={`Room ${hud.roomNumber}: ${hud.roomName}`}
                />
                <CanvasChip icon={Target} label={`${hud.enemiesAlive} hostiles`} />
                <CanvasChip icon={Shield} label={`Dash ${dashLabel}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <CanvasChip icon={Crosshair} label={hud.currentWeaponName} />
                {showBossHud ? (
                  <CanvasChip
                    icon={Crown}
                    label={`${hud.bossPhase ? `Phase ${hud.bossPhase}` : "Core"} / ${formatBossMode(hud.bossMode)}`}
                    tone="warm"
                  />
                ) : null}
              </div>
            </div>

            <PhaserRaidGame
              key={restartKey}
              aiEventSelection={aiEventSelection}
              bossPhaseSelection={bossPhaseSelection}
              multiplayer={multiplayer}
              onAiEventRequest={handleAiEventRequest}
              onBossPhaseRequest={handleBossPhaseRequest}
              onHudChange={setHud}
              onRaidEnd={handleRaidEnd}
              onRewardOffer={setRewardOffers}
              rewardSelection={rewardSelection}
            />

            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="panel max-w-xl px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/60">
                  Live status
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/78">
                  {hud.statusText}
                </p>
              </div>
              <div className="panel flex flex-wrap gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/72">
                <span>WASD move</span>
                <span>Mouse aim</span>
                <span>Left click fire</span>
                <span>Space dash</span>
              </div>
            </div>

            {rewardOffers ? (
              <RewardOverlay
                onSelectReward={handleSelectReward}
                rewards={rewardOffers}
                roomName={hud.roomName}
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

          <aside className="flex flex-col gap-4">
            <section className="panel-strong scanline px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/58">
                    Mission Control
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                    Raid Telemetry
                  </h2>
                </div>
                <div className="status-chip text-cyan-100/78">
                  {missionLoading ? "Syncing" : "Linked"}
                </div>
              </div>

              <div className="mt-5 rounded-none border border-cyan-300/14 bg-black/18 p-4">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
                      Operator HP
                    </p>
                    <p className="mt-1 text-4xl font-black text-white">
                      {safeHp}
                      <span className="ml-2 text-lg text-cyan-100/55">/ {safeMaxHp}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
                      Integrity
                    </p>
                    <p className="mt-1 text-lg font-black text-cyan-100">{hpPercent}%</p>
                  </div>
                </div>
                <div className="h-4 overflow-hidden bg-[#0e1b25]">
                  <div
                    className="h-full bg-[linear-gradient(90deg,#ff7547,#58f3ff)] transition-all"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricTile icon={Target} label="Hostiles" value={hud.enemiesAlive} />
                  <MetricTile icon={Zap} label="Weapon" value={hud.currentWeaponName} />
                  <MetricTile icon={Sparkles} label="Score" value={hud.score} />
                  <MetricTile icon={Shield} label="Dash" value={dashLabel} />
                </div>
              </div>
            </section>

            {isCoop ? (
              <section className="panel px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                      Co-op Link
                    </p>
                    <h3 className="font-display mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
                      Room {multiplayer?.roomCode}
                    </h3>
                  </div>
                  <div className="status-chip text-cyan-100/76">
                    {multiplayer?.isHost ? "Host" : "Client"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <MetricTile icon={Shield} label="Local Operator" value={multiplayer?.localNickname ?? "Operator"} />
                  <MetricTile
                    icon={Radar}
                    label="Wingmate"
                    value={multiplayer?.teammateNickname ?? "Awaiting join"}
                  />
                  <MetricTile
                    icon={BrainCircuit}
                    label="Link State"
                    value={teammateStatus}
                  />
                </div>
              </section>
            ) : null}

            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                    Chamber Route
                  </p>
                  <h3 className="font-display mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
                    {hud.roomName}
                  </h3>
                </div>
                <div className="status-chip text-cyan-100/76">
                  Room {hud.roomNumber}/{hud.totalRooms}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <MetricTile icon={Radar} label="Current Chamber" value={hud.roomName} />
                <MetricTile icon={BrainCircuit} label="Rooms Cleared" value={hud.roomsCleared} />
              </div>
            </section>

            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                    AI Director Briefing
                  </p>
                  <h3 className="font-display mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
                    {mission.missionTitle}
                  </h3>
                </div>
                <div className="status-chip border-orange-300/22 bg-orange-400/10 text-orange-100">
                  <Bot className="h-4 w-4" />
                  {missionLoading ? "Loading" : "Live"}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-cyan-100/72">
                {mission.briefing}
              </p>
              <div className="mt-4 grid gap-3">
                <div className="metric-tile px-4 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/56">
                    Blackout Core Target
                  </p>
                  <p className="mt-2 text-lg font-black text-white">{mission.bossName}</p>
                </div>
                <div className="metric-tile px-4 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/56">
                    Threat Line
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cyan-100/74">
                    {mission.threatLine}
                  </p>
                </div>
              </div>
            </section>

            {showBossHud ? (
              <section className="panel-warm px-5 py-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100/58">
                      Blackout Core
                    </p>
                    <h3 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                      Boss Channel
                    </h3>
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-100">
                    {bossHpPercent}%
                  </p>
                </div>

                <div className="mt-4 h-4 overflow-hidden bg-[#2b120c]">
                  <div
                    className="h-full bg-[linear-gradient(90deg,#ff9b45,#ff5b39)] transition-all"
                    style={{ width: `${bossHpPercent}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricTile
                    icon={Crown}
                    label="Boss HP"
                    tone="warm"
                    value={`${safeBossHp}/${safeBossMaxHp}`}
                  />
                  <MetricTile
                    icon={Radar}
                    label="Phase"
                    tone="warm"
                    value={hud.bossPhase ?? "-"}
                  />
                  <div className="col-span-2 metric-tile px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/56">
                      Current Mode
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {formatBossMode(hud.bossMode)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                    AI Director Feed
                  </p>
                  <h3 className="font-display mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
                    Mission Updates
                  </h3>
                </div>
                <div className="status-chip text-cyan-100/76">{directorFeed.length} logs</div>
              </div>

              <div className="mt-4 grid gap-3">
                {directorFeed.map((entry) => (
                  <DirectorFeedCard entry={entry} key={entry.id} />
                ))}
              </div>
            </section>

            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                    Installed Upgrades
                  </p>
                  <h3 className="font-display mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
                    Active Modules
                  </h3>
                </div>
                <div className="status-chip text-cyan-100/76">
                  {hud.selectedUpgrades.length} selected
                </div>
              </div>

              {hud.selectedUpgrades.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {hud.selectedUpgrades.map((upgrade) => (
                    <div className="metric-tile px-4 py-3" key={upgrade.id}>
                      <p className="font-display text-sm font-black uppercase tracking-[0.08em] text-white">
                        {upgrade.name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                        {upgrade.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-cyan-100/66">
                  Secure the early chambers to start building the run.
                </p>
              )}
            </section>

            <section className="panel px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/58">
                Controls
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <ControlRow icon={Radar} label="Move" value="WASD" />
                <ControlRow icon={Crosshair} label="Aim" value="Mouse" />
                <ControlRow icon={Target} label="Fire" value="Left click" />
                <ControlRow icon={ShieldAlert} label="Dash" value="Space" />
              </div>
            </section>

            {isResultState ? (
              <ResultPanel
                body={
                  hud.status === "victory"
                    ? "The Blackout Core is offline. The chamber route is stable enough to extract."
                    : "The operator fell before the core could be destroyed. The raid route remains compromised."
                }
                debrief={debrief}
                heading={hud.status === "victory" ? "Core Destroyed" : "Operator Down"}
                hud={hud}
                label={hud.status === "victory" ? "Victory" : "Wipeout"}
                onRestart={handleRestart}
                tone={hud.status === "victory" ? "success" : "danger"}
              />
            ) : (
              <button
                className="inline-flex items-center justify-center gap-2 border border-cyan-300/42 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
                onClick={handleRestart}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Raid
              </button>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function RewardOverlay({
  onSelectReward,
  rewards,
  roomName,
}: {
  onSelectReward: (reward: RewardOption) => void;
  rewards: RewardOption[];
  roomName: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(reward: RewardOption) {
    if (selectedId) {
      return;
    }

    setSelectedId(reward.id);
    window.setTimeout(() => onSelectReward(reward), 160);
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#02060b]/86 p-4 backdrop-blur-sm">
      <section className="panel-strong w-full max-w-4xl px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/62">
          {roomName} cleared
        </p>
        <h2 className="font-display mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">
          Choose Raid Reward
        </h2>
        <p className="mt-3 text-sm leading-7 text-cyan-100/68">
          Select one weapon, module, or support cache before taking the next
          portal.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {rewards.map((reward) => {
            const isSelected = selectedId === reward.id;

            return (
              <button
                className={[
                  "group min-h-48 border px-5 py-5 text-left transition",
                  isSelected
                    ? "border-cyan-200 bg-cyan-300/12 shadow-[0_0_32px_rgba(88,243,255,0.18)]"
                    : "border-cyan-300/18 bg-[#07131c] hover:border-cyan-200 hover:bg-[#0b1d29]",
                ].join(" ")}
                key={reward.id}
                onClick={() => handleSelect(reward)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="status-chip text-cyan-100/74">{reward.badge}</span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-100/42">
                    {isSelected ? "Applied" : "Choose"}
                  </span>
                </div>
                <h3 className="font-display mt-6 text-xl font-black uppercase tracking-[0.08em] text-white">
                  {reward.name}
                </h3>
                <p className="mt-4 text-sm leading-7 text-cyan-100/68">
                  {reward.description}
                </p>
                <div className="mt-6 h-px bg-cyan-300/10" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/55">
                  {isSelected ? "Portal unlocking" : "Apply immediately"}
                </p>
              </button>
            );
          })}
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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#02060b]/82 p-4 backdrop-blur-sm">
      <section className="panel-warm w-full max-w-2xl px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100/60">
              AI Director Crisis Event
            </p>
            <h2 className="font-display mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
              {isLoading ? "Analyzing Surge Chamber" : directive.eventTitle}
            </h2>
          </div>
          <div className="status-chip border-orange-300/25 bg-orange-400/10 text-orange-100">
            <Bot className="h-4 w-4" />
            {isLoading ? "Scanning" : "Directive"}
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-orange-100/78">
          {isLoading
            ? "The AI Director is evaluating chamber instability. If the uplink stalls, a local failsafe event will deploy automatically."
            : directive.eventText}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="metric-tile px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-100/56">
              Modifier
            </p>
            <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-white">
              {isLoading ? "Pending" : formatModifier(directive.modifier)}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 border border-orange-300 bg-orange-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#160704] transition hover:bg-orange-200 disabled:cursor-wait disabled:border-orange-300/28 disabled:bg-orange-300/20 disabled:text-orange-100/42"
            disabled={isLoading}
            onClick={onConfirm}
            type="button"
          >
            Enter Surge Chamber
          </button>
        </div>
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
  const themeClass =
    tone === "danger"
      ? "panel-warm"
      : "panel-strong border-emerald-300/22 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_40px_rgba(52,211,153,0.08)]";

  return (
    <section className={`${themeClass} px-5 py-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/58">
            Mission Report
          </p>
          <h3 className="font-display mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
            {label}
          </h3>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100/55">
            {heading}
          </p>
        </div>
        <div className="status-chip border-cyan-300/18 bg-white/5 text-cyan-100/74">
          Final
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-cyan-100/72">{body}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricTile icon={Sparkles} label="Score" value={hud.score} />
        <MetricTile icon={Crosshair} label="Kills" value={hud.kills} />
        <MetricTile icon={ShieldAlert} label="Damage Taken" value={hud.damageTaken} />
        <MetricTile icon={Radar} label="Rooms Cleared" value={hud.roomsCleared} />
      </div>

      <div className="mt-5 grid gap-3">
        <ReportBlock body={hud.currentWeaponName} title="Final Weapon" />
        <ReportBlock
          body={
            hud.selectedUpgrades.length > 0
              ? hud.selectedUpgrades.map((upgrade) => upgrade.name).join(", ")
              : "No upgrades selected."
          }
          title="Upgrades Selected"
        />
        <ReportBlock
          body={
            hud.bossModeHistory.length > 0
              ? hud.bossModeHistory.map(formatBossMode).join(", ")
              : "No boss modes recorded."
          }
          title="Boss Modes Faced"
        />
        <ReportBlock
          body={debrief ?? "AI Director compiling final mission report..."}
          title="AI Debrief"
        />
      </div>

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
        onClick={onRestart}
        type="button"
      >
        <TimerReset className="h-4 w-4" />
        Restart Raid
      </button>
    </section>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-tile px-4 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/54">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  tone = "cool",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "cool" | "warm";
  value: number | string;
}) {
  return (
    <div className="metric-tile px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon
          className={
            tone === "warm" ? "h-4 w-4 text-orange-200" : "h-4 w-4 text-cyan-200"
          }
        />
        <p
          className={
            tone === "warm"
              ? "text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-orange-100/54"
              : "text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/54"
          }
        >
          {label}
        </p>
      </div>
      <p className="mt-3 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function CanvasChip({
  icon: Icon,
  label,
  tone = "cool",
}: {
  icon: LucideIcon;
  label: string;
  tone?: "cool" | "warm";
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 border px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em]",
        tone === "warm"
          ? "border-orange-300/24 bg-[#26110b]/84 text-orange-100"
          : "border-cyan-300/18 bg-[#09131d]/84 text-cyan-100",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function ControlRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-tile flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-cyan-300/14 bg-cyan-300/8">
          <Icon className="h-4 w-4 text-cyan-200" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-100/68">
          {label}
        </p>
      </div>
      <p className="text-sm font-black uppercase tracking-[0.14em] text-white">{value}</p>
    </div>
  );
}

function DirectorFeedCard({ entry }: { entry: DirectorFeedEntry }) {
  const toneClasses =
    entry.tone === "critical"
      ? "border-red-300/16 bg-red-400/8"
      : entry.tone === "alert"
        ? "border-orange-300/16 bg-orange-400/8"
        : "border-cyan-300/14 bg-black/18";

  const badgeClasses =
    entry.tone === "critical"
      ? "text-red-100/74"
      : entry.tone === "alert"
        ? "text-orange-100/74"
        : "text-cyan-100/68";

  return (
    <article className={`border px-4 py-3 ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-sm font-black uppercase tracking-[0.08em] text-white">
          {entry.title}
        </p>
        <span
          className={`text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${badgeClasses}`}
        >
          {entry.tone === "critical"
            ? "Critical"
            : entry.tone === "alert"
              ? "Priority"
              : "Live"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-cyan-100/70">{entry.body}</p>
    </article>
  );
}

function ReportBlock({ body, title }: { body: string; title: string }) {
  return (
    <div className="metric-tile px-4 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/54">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-cyan-100/72">{body}</p>
    </div>
  );
}

function getStatusLabel(status: RaidHudState["status"]): string {
  if (status === "operator-down") {
    return "Wipeout";
  }

  if (status === "room-intro") {
    return "Room intro";
  }

  if (status === "portal") {
    return "Portal active";
  }

  if (status === "boss-entry") {
    return "Core inbound";
  }

  if (status === "boss") {
    return "Boss fight";
  }

  if (status === "victory") {
    return "Victory";
  }

  if (status === "reward") {
    return "Reward draft";
  }

  if (status === "ai-event") {
    return "AI event";
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

function buildRewardFeedTitle(reward: RewardOption): string {
  if (reward.type === "weapon") {
    return `Weapon acquired: ${reward.name}`;
  }

  if (reward.type === "upgrade") {
    return `Upgrade installed: ${reward.name}`;
  }

  if (reward.type === "repair") {
    return "Repair kit secured";
  }

  return "Score cache extracted";
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
