export type RaidStatus =
  | "running"
  | "upgrade"
  | "boss-signal"
  | "operator-down";

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
  enemiesAlive: number;
  wave: number;
  totalWaves: number;
  statusText: string;
  status: RaidStatus;
  dashReady: boolean;
  dashCooldownRemainingMs: number;
  selectedUpgrades: UpgradeOption[];
};

export type EnemyKind = "crawler" | "drone";

export type UpgradeSelection = {
  id: UpgradeId;
  sequence: number;
};
