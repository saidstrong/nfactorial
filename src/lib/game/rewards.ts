import { RAID_UPGRADES } from "./upgrades";
import { RAID_WEAPONS } from "./weapons";
import type { RewardOption, UpgradeOption, WeaponId } from "./types";

const REPAIR_REWARD: RewardOption = {
  id: "repair-kit",
  type: "repair",
  name: "Repair Kit",
  description: "Restore 35 HP before the next chamber.",
  badge: "Repair",
  healAmount: 35,
};

const SCORE_CACHE_REWARD: RewardOption = {
  id: "score-cache",
  type: "score",
  name: "Score Cache",
  description: "Secure an encrypted credit vault worth +500 score.",
  badge: "Cache",
  scoreAmount: 500,
};

export function getRewardOffers({
  currentWeaponId,
  roomNumber,
  selectedUpgrades,
}: {
  currentWeaponId: WeaponId;
  roomNumber: number;
  selectedUpgrades: UpgradeOption[];
}): RewardOption[] {
  const seed = roomNumber * 997 + selectedUpgrades.length * 41;
  const random = createSeededRandom(seed);

  const weaponPool = RAID_WEAPONS.filter((weapon) => weapon.id !== currentWeaponId).map(
    (weapon) => ({
      id: `weapon-${weapon.id}`,
      type: "weapon" as const,
      name: weapon.name,
      description: weapon.description,
      badge: "Weapon",
      weaponId: weapon.id,
    }),
  );
  const upgradePool = RAID_UPGRADES.filter(
    (upgrade) => !selectedUpgrades.some((selected) => selected.id === upgrade.id),
  ).map((upgrade) => ({
    id: `upgrade-${upgrade.id}`,
    type: "upgrade" as const,
    name: upgrade.name,
    description: upgrade.description,
    badge: "Upgrade",
    upgradeId: upgrade.id,
  }));
  const bonusPool: RewardOption[] = [REPAIR_REWARD, SCORE_CACHE_REWARD];

  const weaponChoice = takeRandom(weaponPool, random) ?? buildWeaponReward(currentWeaponId);
  const upgradeChoice = takeRandom(upgradePool, random) ?? {
    ...REPAIR_REWARD,
    id: `repair-${roomNumber}`,
  };

  const remainingPool = [
    ...weaponPool.filter((reward) => reward.id !== weaponChoice.id),
    ...upgradePool.filter((reward) => reward.id !== upgradeChoice.id),
    ...bonusPool.map((reward) => ({ ...reward, id: `${reward.id}-${roomNumber}` })),
  ];
  const thirdChoice =
    takeRandom(remainingPool, random) ??
    bonusPool[Math.floor(random() * bonusPool.length)];

  return [weaponChoice, upgradeChoice, thirdChoice];
}

function buildWeaponReward(weaponId: WeaponId): RewardOption {
  const fallbackWeapon = RAID_WEAPONS.find((weapon) => weapon.id !== weaponId) ?? RAID_WEAPONS[0];

  return {
    id: `weapon-${fallbackWeapon.id}`,
    type: "weapon",
    name: fallbackWeapon.name,
    description: fallbackWeapon.description,
    badge: "Weapon",
    weaponId: fallbackWeapon.id,
  };
}

function takeRandom<T>(items: readonly T[], random: () => number): T | null {
  if (items.length === 0) {
    return null;
  }

  const index = Math.floor(random() * items.length);

  return items[index] ?? null;
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
