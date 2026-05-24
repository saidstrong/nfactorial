import type { BossMode } from "@/lib/game/types";

export const ALLOWED_EVENT_MODIFIERS = [
  "POWER_SURGE",
  "DRONE_SWARM",
  "EMERGENCY_CACHE",
  "OVERCHARGED_WEAPONS",
  "SYSTEM_LAG",
  "LOW_VISIBILITY",
] as const;

export type AiEventModifier = (typeof ALLOWED_EVENT_MODIFIERS)[number];

export type MissionBriefing = {
  missionTitle: string;
  briefing: string;
  bossName: string;
  threatLine: string;
};

export type AiEventDirective = {
  eventTitle: string;
  eventText: string;
  modifier: AiEventModifier;
};

export type BossPhaseDirective = {
  phaseTitle: string;
  message: string;
  bossMode: BossMode;
};

export type DebriefDirective = {
  debrief: string;
};

export type AiEventRequest = {
  wave: number;
  playerHp: number;
  kills: number;
  damageTaken: number;
  selectedUpgrades: string[];
};

export type BossPhaseRequest = {
  bossHpPercent: number;
  playerHp: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  accuracyEstimate: number;
  fightDurationSeconds: number;
  currentMode: string;
};

export type RaidEndReport = {
  result: "victory" | "wipeout";
  score: number;
  kills: number;
  damageTaken: number;
  roomsCleared: number;
  finalWeapon: string;
  bossModeHistory: string[];
  upgrades: string[];
};

export type AiEventSelection = {
  directive: AiEventDirective;
  sequence: number;
};

export type BossPhaseSelection = {
  directive: BossPhaseDirective;
  phase: 2 | 3;
  sequence: number;
};

export const AI_MISSION_FALLBACK: MissionBriefing = {
  missionTitle: "Nightfall Relay",
  briefing:
    "A rogue signal has seized the city grid. Raid through corrupted chambers, clear hostile bots, and destroy the Blackout Core.",
  bossName: "The Blackout Core",
  threatLine: "The blackout spreads every second you hesitate.",
};

export const AI_EVENT_FALLBACK: AiEventDirective = {
  eventTitle: "Power Surge",
  eventText: "Voltage instability accelerates hostile bots in the chamber.",
  modifier: "POWER_SURGE",
};

export const AI_BOSS_PHASE_FALLBACK: BossPhaseDirective = {
  phaseTitle: "Adaptive Overload",
  message: "The Core detected your attack pattern and changed combat mode.",
  bossMode: "summoner",
};

export const AI_DEBRIEF_FALLBACK: DebriefDirective = {
  debrief:
    "Raid complete. Review your movement, damage taken, and upgrade choices to improve your next run.",
};
