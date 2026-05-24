import type { WeaponDefinition, WeaponId } from "./types";

export const RAID_WEAPONS: readonly WeaponDefinition[] = [
  {
    id: "pulse-rifle",
    name: "Pulse Rifle",
    description: "Balanced single-shot rifle for medium-range chamber control.",
    damage: 19,
    fireRateMs: 250,
    pelletCount: 1,
    pierce: 0,
    projectileRadius: 5,
    projectileShape: "orb",
    projectileSpeed: 620,
    spread: 0,
    tint: 0x73f7ff,
    trailLength: 16,
  },
  {
    id: "scatter-cannon",
    name: "Scatter Cannon",
    description: "Five-pulse spread with heavy close-range pressure.",
    damage: 10,
    fireRateMs: 430,
    pelletCount: 5,
    pierce: 0,
    projectileRadius: 4,
    projectileShape: "orb",
    projectileSpeed: 540,
    spread: 0.28,
    tint: 0xffb347,
    trailLength: 14,
  },
  {
    id: "rail-lance",
    name: "Rail Lance",
    description: "Slow, precise lance shot with high damage and built-in pierce.",
    damage: 38,
    fireRateMs: 540,
    pelletCount: 1,
    pierce: 2,
    projectileRadius: 3,
    projectileShape: "rail",
    projectileSpeed: 820,
    spread: 0,
    tint: 0xc6fcff,
    trailLength: 34,
  },
  {
    id: "arc-blaster",
    name: "Arc Blaster",
    description: "Rapid electric fire with lower damage but constant pressure.",
    damage: 9,
    fireRateMs: 135,
    pelletCount: 1,
    pierce: 0,
    projectileRadius: 4,
    projectileShape: "orb",
    projectileSpeed: 680,
    spread: 0.03,
    tint: 0x58f3ff,
    trailLength: 18,
  },
] as const;

export function getWeaponById(id: WeaponId): WeaponDefinition {
  const weapon = RAID_WEAPONS.find((option) => option.id === id);

  if (!weapon) {
    throw new Error(`Unknown weapon: ${id}`);
  }

  return weapon;
}
