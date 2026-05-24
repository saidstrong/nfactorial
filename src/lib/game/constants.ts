export const RAID_GAME_WIDTH = 960;
export const RAID_GAME_HEIGHT = 620;
export const RAID_ARENA_PADDING = 28;

export const RAID_PLAYER = {
  maxHp: 110,
  radius: 15,
  speed: 245,
  dashSpeed: 620,
  dashDurationMs: 145,
  dashCooldownMs: 1425,
  bulletDamage: 19,
  fireRateMs: 250,
};

export const RAID_BULLET = {
  radius: 5,
  speed: 620,
  lifetimeMs: 900,
};

export const RAID_ENEMY_BULLET = {
  radius: 6,
  speed: 220,
  damage: 10,
  lifetimeMs: 1650,
};

export const RAID_CRAWLER = {
  radius: 14,
  hp: 36,
  speed: 98,
  damage: 9,
  contactCooldownMs: 700,
  scoreValue: 120,
};

export const RAID_DRONE = {
  radius: 16,
  hp: 54,
  speed: 76,
  damage: RAID_ENEMY_BULLET.damage,
  preferredDistance: 240,
  retreatDistance: 160,
  fireRateMs: 1550,
  scoreValue: 190,
};

export const RAID_BOSS = {
  name: "The Blackout Core",
  radius: 46,
  maxHp: 1425,
  contactDamage: 16,
  contactCooldownMs: 980,
  aimedShotDamage: 12,
  radialShotDamage: 10,
  shockwaveDamage: 16,
  aimedShotSpeed: 238,
  radialShotSpeed: 205,
  phaseOneAttackMs: 1140,
  phaseTwoAttackMs: 910,
  phaseThreeAttackMs: 690,
  summonCooldownMs: 5600,
  shockwaveCooldownMs: 7600,
};

export const RAID_WAVES = [
  { wave: 1, crawlers: 8, drones: 0 },
  { wave: 2, crawlers: 8, drones: 4 },
  { wave: 3, crawlers: 10, drones: 6 },
] as const;

export const INITIAL_RAID_HUD = {
  hp: RAID_PLAYER.maxHp,
  maxHp: RAID_PLAYER.maxHp,
  score: 0,
  kills: 0,
  damageTaken: 0,
  enemiesAlive: 0,
  wave: 1,
  totalWaves: RAID_WAVES.length,
  statusText: "Wave 1 breach active.",
  status: "running" as const,
  dashReady: true,
  dashCooldownRemainingMs: 0,
  selectedUpgrades: [],
  bossHp: 0,
  bossMaxHp: RAID_BOSS.maxHp,
  bossPhase: null,
  bossMode: null,
  bossModeHistory: [],
};
