import { ALLOWED_BOSS_MODES } from "@/lib/game/bossModes";
import type { BossMode } from "@/lib/game/types";
import {
  AI_BOSS_PHASE_FALLBACK,
  AI_DEBRIEF_FALLBACK,
  AI_EVENT_FALLBACK,
  AI_MISSION_FALLBACK,
  ALLOWED_EVENT_MODIFIERS,
  type AiEventDirective,
  type AiEventModifier,
  type BossPhaseDirective,
  type DebriefDirective,
  type MissionBriefing,
} from "./fallbacks";

type RecordLike = Record<string, unknown>;

export function parseJsonOutput(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function validateMissionOutput(value: unknown): MissionBriefing {
  const record = asRecord(value);

  return {
    missionTitle: shortText(record?.missionTitle, AI_MISSION_FALLBACK.missionTitle, 72),
    briefing: shortText(record?.briefing, AI_MISSION_FALLBACK.briefing, 240),
    bossName: shortText(record?.bossName, AI_MISSION_FALLBACK.bossName, 72),
    threatLine: shortText(record?.threatLine, AI_MISSION_FALLBACK.threatLine, 140),
  };
}

export function validateAiEventOutput(value: unknown): AiEventDirective {
  const record = asRecord(value);

  return {
    eventTitle: shortText(record?.eventTitle, AI_EVENT_FALLBACK.eventTitle, 72),
    eventText: shortText(record?.eventText, AI_EVENT_FALLBACK.eventText, 180),
    modifier: validateEventModifier(record?.modifier),
  };
}

export function validateBossPhaseOutput(value: unknown): BossPhaseDirective {
  const record = asRecord(value);

  return {
    phaseTitle: shortText(record?.phaseTitle, AI_BOSS_PHASE_FALLBACK.phaseTitle, 72),
    message: shortText(record?.message, AI_BOSS_PHASE_FALLBACK.message, 180),
    bossMode: validateBossMode(record?.bossMode),
  };
}

export function validateDebriefOutput(value: unknown): DebriefDirective {
  const record = asRecord(value);

  return {
    debrief: shortText(record?.debrief, AI_DEBRIEF_FALLBACK.debrief, 260),
  };
}

export function validateEventModifier(value: unknown): AiEventModifier {
  if (
    typeof value === "string" &&
    ALLOWED_EVENT_MODIFIERS.includes(value as AiEventModifier)
  ) {
    return value as AiEventModifier;
  }

  return AI_EVENT_FALLBACK.modifier;
}

export function validateBossMode(value: unknown): BossMode {
  if (typeof value === "string" && ALLOWED_BOSS_MODES.includes(value as BossMode)) {
    return value as BossMode;
  }

  return AI_BOSS_PHASE_FALLBACK.bossMode;
}

function asRecord(value: unknown): RecordLike | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as RecordLike;
}

function shortText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}
