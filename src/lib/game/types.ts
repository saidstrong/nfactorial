export type RaidStatus = "running" | "operator-down";

export type RaidHudState = {
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  enemiesAlive: number;
  status: RaidStatus;
  dashReady: boolean;
};

export type EnemyKind = "crawler";
