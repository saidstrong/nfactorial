import type { UpgradeId, UpgradeOption } from "./types";

export const RAID_UPGRADES: readonly UpgradeOption[] = [
  {
    id: "overclocked-barrel",
    name: "Overclocked Barrel",
    description: "Fire rate +20%.",
  },
  {
    id: "reinforced-armor",
    name: "Reinforced Armor",
    description: "Max HP +25 and heal +25.",
  },
  {
    id: "emergency-dash",
    name: "Emergency Dash",
    description: "Dash cooldown -20%.",
  },
  {
    id: "piercing-pulse",
    name: "Piercing Pulse",
    description: "Bullets pierce one enemy.",
  },
  {
    id: "stabilizer-core",
    name: "Stabilizer Core",
    description: "Heal 20 HP.",
  },
  {
    id: "critical-firmware",
    name: "Critical Firmware",
    description: "Small chance for double damage.",
  },
];

export function getUpgradeById(id: UpgradeId): UpgradeOption {
  const upgrade = RAID_UPGRADES.find((option) => option.id === id);

  if (!upgrade) {
    throw new Error(`Unknown upgrade: ${id}`);
  }

  return upgrade;
}

export function getUpgradeOffers(seed: number, count = 3): UpgradeOption[] {
  const options = [...RAID_UPGRADES];
  const random = createSeededRandom(seed);

  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }

  return options.slice(0, count);
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);

    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
