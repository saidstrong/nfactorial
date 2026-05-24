export type RaidStatus =
  | "running"
  | "upgrade"
  | "boss-entry"
  | "boss"
  | "victory"
  | "operator-down";

export type BossMode =
  | "hunter"
  | "sniper"
  | "summoner"
  | "bullet_hell"
  | "shield_core"
  | "berserker";

export type UpgradeId =
  | "overclocked-barrel"
  | "reinforced-armor"
  | "emergency-dash"
  | "piercing-pulse"
  | "stabilizer-core"
  | "critical-firmware";

export type UpgradeOption = {
  id: UpgradeId;
  name: string;
  description: string;
};

export type RaidHudState = {
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  damageTaken: number;
  enemiesAlive: number;
  wave: number;
  totalWaves: number;
  statusText: string;
  status: RaidStatus;
  dashReady: boolean;
  dashCooldownRemainingMs: number;
  selectedUpgrades: UpgradeOption[];
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number | null;
  bossMode: BossMode | null;
  bossModeHistory: BossMode[];
};

export type EnemyKind = "crawler" | "drone";

export type UpgradeSelection = {
  id: UpgradeId;
  sequence: number;
};
