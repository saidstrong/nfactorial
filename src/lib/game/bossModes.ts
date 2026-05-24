import type { BossMode } from "./types";

export const ALLOWED_BOSS_MODES: readonly BossMode[] = [
  "hunter",
  "sniper",
  "summoner",
  "bullet_hell",
  "shield_core",
  "berserker",
];

export function getFallbackBossMode(phase: 2 | 3): BossMode {
  if (phase === 2) {
    return "summoner";
  }

  return "bullet_hell";
}
