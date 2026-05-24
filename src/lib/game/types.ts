export type RaidStatus =
  | "running"
  | "reward"
  | "room-intro"
  | "ai-event"
  | "portal"
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

export type WeaponId =
  | "pulse-rifle"
  | "scatter-cannon"
  | "rail-lance"
  | "arc-blaster";

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  description: string;
  damage: number;
  fireRateMs: number;
  pelletCount: number;
  pierce: number;
  projectileRadius: number;
  projectileShape: "orb" | "rail";
  projectileSpeed: number;
  spread: number;
  tint: number;
  trailLength: number;
};

export type RewardType = "weapon" | "upgrade" | "repair" | "score";

export type RewardOption = {
  id: string;
  type: RewardType;
  name: string;
  description: string;
  badge: string;
  weaponId?: WeaponId;
  upgradeId?: UpgradeId;
  healAmount?: number;
  scoreAmount?: number;
};

export type RaidRoomId =
  | "entry-chamber"
  | "drone-chamber"
  | "surge-chamber"
  | "boss-chamber";

export type RaidRoomTheme = "entry" | "drone" | "surge" | "boss";

export type RaidRoomDefinition = {
  id: RaidRoomId;
  number: number;
  name: string;
  theme: RaidRoomTheme;
  introTitle: string;
  introText: string;
  crawlers: number;
  drones: number;
  eliteDrones: number;
  hasReward: boolean;
};

export type RaidHudState = {
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  damageTaken: number;
  roomsCleared: number;
  enemiesAlive: number;
  roomName: string;
  roomNumber: number;
  totalRooms: number;
  wave: number;
  totalWaves: number;
  statusText: string;
  status: RaidStatus;
  dashReady: boolean;
  dashCooldownRemainingMs: number;
  currentWeaponId: WeaponId;
  currentWeaponName: string;
  selectedUpgrades: UpgradeOption[];
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number | null;
  bossMode: BossMode | null;
  bossModeHistory: BossMode[];
};

export type EnemyKind = "crawler" | "drone" | "elite-drone";

export type UpgradeSelection = {
  id: UpgradeId;
  sequence: number;
};

export type RewardSelection = {
  reward: RewardOption;
  sequence: number;
};
