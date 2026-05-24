import type { BossMode, EnemyKind, RaidStatus, UpgradeOption, WeaponId } from "@/lib/game/types";

export type RaidRoomStatus = "waiting" | "active" | "finished";

export type RoomRecord = {
  code: string;
  created_at: string;
  finished_at: string | null;
  host_player_id: string | null;
  id: string;
  started_at: string | null;
  status: RaidRoomStatus;
};

export type RoomPlayerRecord = {
  id: string;
  is_host: boolean;
  joined_at: string;
  nickname: string;
  room_id: string;
};

export type CoopPlayerSession = {
  isHost: boolean;
  nickname: string;
  playerId: string;
  roomCode: string;
  roomId: string;
};

export type RealtimeEnvelope<T> = {
  sentAt: number;
  type: string;
  payload: T;
};

export type CoopPlayerState = {
  hp: number;
  nickname: string;
  playerId: string;
  roomNumber: number;
  rotation: number;
  sequence: number;
  status: RaidStatus;
  weaponId: WeaponId;
  x: number;
  y: number;
};

export type CoopPlayerShot = {
  angle: number;
  playerId: string;
  sequence: number;
  weaponId: WeaponId;
  x: number;
  y: number;
};

export type HostEnemySnapshot = {
  enemyId: number;
  hp: number;
  kind: EnemyKind;
  rotation: number;
  x: number;
  y: number;
};

export type HostBulletSnapshot = {
  angle: number;
  owner: "enemy" | "boss";
  radius: number;
  x: number;
  y: number;
};

export type HostBossSnapshot = {
  active: boolean;
  hp: number;
  maxHp: number;
  mode: BossMode | null;
  phase: number | null;
  shockwaveRadius: number | null;
  x: number;
  y: number;
};

export type HostPortalSnapshot = {
  active: boolean;
  kind: "normal" | "boss";
  x: number;
  y: number;
};

export type HostRaidSnapshot = {
  boss: HostBossSnapshot | null;
  bossModeHistory: BossMode[];
  currentWeaponId: WeaponId;
  currentWeaponName: string;
  damageTaken: number;
  enemies: HostEnemySnapshot[];
  enemiesAlive: number;
  enemyBullets: HostBulletSnapshot[];
  kills: number;
  maxHpByPlayerId: Record<string, number>;
  playerHpById: Record<string, number>;
  players: Array<{
    hp: number;
    nickname: string;
    playerId: string;
    rotation: number;
    weaponId: WeaponId;
    x: number;
    y: number;
  }>;
  portal: HostPortalSnapshot | null;
  roomName: string;
  roomNumber: number;
  roomsCleared: number;
  score: number;
  selectedUpgrades: UpgradeOption[];
  sequence: number;
  status: RaidStatus;
  statusText: string;
};

export type CoopRuntimeConfig = {
  incomingHostSnapshot: HostRaidSnapshot | null;
  incomingPlayerShot: CoopPlayerShot | null;
  incomingPlayerState: CoopPlayerState | null;
  isHost: boolean;
  localNickname: string;
  localPlayerId: string;
  onHostSnapshot?: (snapshot: HostRaidSnapshot) => void;
  onLocalPlayerShot?: (shot: CoopPlayerShot) => void;
  onLocalPlayerState?: (state: CoopPlayerState) => void;
  roomCode: string;
  teammateNickname?: string | null;
};
