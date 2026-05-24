"use client";

import { useEffect, useRef } from "react";
import {
  RAID_ARENA_PADDING,
  RAID_BOSS,
  RAID_BULLET,
  RAID_CRAWLER,
  RAID_DRONE,
  RAID_ELITE_DRONE,
  RAID_ENEMY_BULLET,
  RAID_GAME_HEIGHT,
  RAID_GAME_WIDTH,
  RAID_PLAYER,
} from "@/lib/game/constants";
import { getFallbackBossMode } from "@/lib/game/bossModes";
import type {
  AiEventDirective,
  AiEventModifier,
  AiEventRequest,
  AiEventSelection,
  BossPhaseRequest,
  BossPhaseSelection,
  RaidEndReport,
} from "@/lib/ai/fallbacks";
import type {
  CoopPlayerShot,
  CoopPlayerState,
  CoopRuntimeConfig,
  HostRaidSnapshot,
} from "@/lib/coop/types";
import { RAID_ROOMS } from "@/lib/game/rooms";
import { getRewardOffers } from "@/lib/game/rewards";
import type {
  BossMode,
  EnemyKind,
  RaidHudState,
  RaidRoomDefinition,
  RaidStatus,
  RewardSelection,
  UpgradeId,
  UpgradeOption,
  WeaponDefinition,
  WeaponId,
} from "@/lib/game/types";
import { getUpgradeById } from "@/lib/game/upgrades";
import { getWeaponById } from "@/lib/game/weapons";

type PhaserRuntime = typeof import("phaser");
type ArcadeBody = import("phaser").Physics.Arcade.Body;
type ArcadeGroup = import("phaser").Physics.Arcade.Group;
type GameObject = import("phaser").GameObjects.GameObject;
type Graphics = import("phaser").GameObjects.Graphics;
type KeyboardKey = import("phaser").Input.Keyboard.Key;
type ShadowEllipse = import("phaser").GameObjects.Ellipse;
type GameText = import("phaser").GameObjects.Text;
type PhysicsArc = import("phaser").GameObjects.Arc & { body: ArcadeBody };
type PhysicsRectangle = import("phaser").GameObjects.Rectangle & {
  body: ArcadeBody;
};
type PhysicsBodyShape = PhysicsArc | PhysicsRectangle;
type PhysicsEnemy = PhysicsBodyShape & { body: ArcadeBody };

type BulletOwner = "player" | "enemy" | "boss";
type PortalKind = "normal" | "boss";
type PlayerDamageSource =
  | "crawler_contact"
  | "enemy_projectile"
  | "drone_projectile"
  | "elite_drone_projectile"
  | "boss_projectile"
  | "boss_shockwave"
  | "boss_contact";
type DamageSource = PlayerDamageSource | "player_projectile";

type BulletSprite = PhysicsBodyShape & {
  bornAt: number;
  bulletShape: "orb" | "rail";
  damage: number;
  damageSource: DamageSource;
  hitEnemyIds: Set<number>;
  owner: BulletOwner;
  pierceRemaining: number;
  trailColor: number;
  trailLength: number;
};

type EnemySprite = PhysicsEnemy & {
  baseFillColor: number;
  baseStrokeColor: number;
  enemyId: number;
  hp: number;
  kind: EnemyKind;
  lastShotAt: number;
  scoreValue: number;
  shadow?: ShadowEllipse;
  speed: number;
};

type RemotePlayerSprite = PhysicsArc & {
  hp: number;
  isHost: boolean;
  lastContactDamageAt: number;
  lastSeenAt: number;
  nickname: string;
  nicknameLabel?: GameText;
  playerId: string;
  roomNumber: number;
  shadow?: ShadowEllipse;
  weaponId: WeaponId;
};

type BossSprite = PhysicsArc & {
  hp: number;
  maxHp: number;
  shadow?: ShadowEllipse;
};

type PortalSprite = PhysicsArc & {
  activatedAt: number;
  aura?: Graphics;
  kind: PortalKind;
  label?: GameText;
  shadow?: ShadowEllipse;
};

type ShockwaveState = {
  damagedPlayer: boolean;
  durationMs: number;
  maxRadius: number;
  ring: Graphics;
  startedAt: number;
};

type SceneControls = {
  applyAiEvent: (directive: AiEventDirective) => void;
  applyBossPhaseDirective: (selection: BossPhaseSelection) => void;
  applyHostSnapshot: (snapshot: HostRaidSnapshot) => void;
  applyRemotePlayerShot: (shot: CoopPlayerShot) => void;
  applyRemotePlayerState: (state: CoopPlayerState) => void;
  applyRewardSelection: (selection: RewardSelection) => void;
};

type PhaserRaidGameProps = {
  aiEventSelection: AiEventSelection | null;
  bossPhaseSelection: BossPhaseSelection | null;
  multiplayer?: CoopRuntimeConfig | null;
  onAiEventRequest: (request: AiEventRequest) => void;
  onBossPhaseRequest: (phase: 2 | 3, request: BossPhaseRequest) => void;
  onHudChange: (hud: RaidHudState) => void;
  onRaidEnd: (report: RaidEndReport) => void;
  onRewardOffer: (
    rewards: ReturnType<typeof getRewardOffers> | null,
  ) => void;
  rewardSelection: RewardSelection | null;
};

const ROOM_SPAWN_POINTS: Record<
  RaidRoomDefinition["id"],
  ReadonlyArray<{ x: number; y: number }>
> = {
  "entry-chamber": [
    { x: 118, y: 92 },
    { x: 286, y: 82 },
    { x: 478, y: 80 },
    { x: 670, y: 82 },
    { x: 842, y: 94 },
    { x: 876, y: 234 },
    { x: 864, y: 414 },
    { x: 96, y: 442 },
    { x: 142, y: 528 },
    { x: 786, y: 520 },
  ],
  "drone-chamber": [
    { x: 128, y: 90 },
    { x: 302, y: 88 },
    { x: 476, y: 86 },
    { x: 650, y: 88 },
    { x: 826, y: 90 },
    { x: 868, y: 210 },
    { x: 862, y: 334 },
    { x: 846, y: 470 },
    { x: 116, y: 490 },
    { x: 128, y: 188 },
    { x: 476, y: 534 },
    { x: 702, y: 526 },
  ],
  "surge-chamber": [
    { x: 110, y: 88 },
    { x: 242, y: 86 },
    { x: 376, y: 88 },
    { x: 510, y: 86 },
    { x: 646, y: 88 },
    { x: 780, y: 86 },
    { x: 878, y: 124 },
    { x: 886, y: 252 },
    { x: 886, y: 382 },
    { x: 846, y: 516 },
    { x: 682, y: 528 },
    { x: 506, y: 532 },
    { x: 332, y: 530 },
    { x: 168, y: 522 },
    { x: 86, y: 382 },
    { x: 82, y: 242 },
  ],
  "boss-chamber": [
    { x: 120, y: 98 },
    { x: 260, y: 86 },
    { x: 700, y: 86 },
    { x: 842, y: 98 },
    { x: 880, y: 216 },
    { x: 884, y: 406 },
    { x: 840, y: 526 },
    { x: 122, y: 528 },
    { x: 88, y: 398 },
    { x: 88, y: 214 },
  ],
};

const DEFAULT_PLAYER_DAMAGE_BY_SOURCE: Record<PlayerDamageSource, number> = {
  boss_contact: RAID_BOSS.contactDamage,
  boss_projectile: RAID_BOSS.aimedShotDamage,
  boss_shockwave: RAID_BOSS.shockwaveDamage,
  crawler_contact: RAID_CRAWLER.damage,
  drone_projectile: RAID_DRONE.damage,
  elite_drone_projectile: RAID_ELITE_DRONE.damage,
  enemy_projectile: RAID_ENEMY_BULLET.damage,
};

export function PhaserRaidGame({
  aiEventSelection,
  bossPhaseSelection,
  multiplayer = null,
  onAiEventRequest,
  onBossPhaseRequest,
  onHudChange,
  onRaidEnd,
  onRewardOffer,
  rewardSelection,
}: PhaserRaidGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const sceneControlsRef = useRef<SceneControls | null>(null);

  useEffect(() => {
    if (rewardSelection) {
      sceneControlsRef.current?.applyRewardSelection(rewardSelection);
    }
  }, [rewardSelection]);

  useEffect(() => {
    if (aiEventSelection) {
      sceneControlsRef.current?.applyAiEvent(aiEventSelection.directive);
    }
  }, [aiEventSelection]);

  useEffect(() => {
    if (bossPhaseSelection) {
      sceneControlsRef.current?.applyBossPhaseDirective(bossPhaseSelection);
    }
  }, [bossPhaseSelection]);

  useEffect(() => {
    if (multiplayer?.incomingPlayerState) {
      sceneControlsRef.current?.applyRemotePlayerState(multiplayer.incomingPlayerState);
    }
  }, [multiplayer?.incomingPlayerState]);

  useEffect(() => {
    if (multiplayer?.incomingPlayerShot) {
      sceneControlsRef.current?.applyRemotePlayerShot(multiplayer.incomingPlayerShot);
    }
  }, [multiplayer?.incomingPlayerShot]);

  useEffect(() => {
    if (multiplayer?.incomingHostSnapshot) {
      sceneControlsRef.current?.applyHostSnapshot(multiplayer.incomingHostSnapshot);
    }
  }, [multiplayer?.incomingHostSnapshot]);

  useEffect(() => {
    let isMounted = true;

    async function bootGame() {
      const phaserModule = await import("phaser");
      const phaserRecord = phaserModule as unknown as PhaserRuntime & {
        default?: PhaserRuntime;
      };
      const Phaser = phaserRecord.AUTO ? phaserRecord : phaserRecord.default;

      if (!isMounted || !mountRef.current || !Phaser) {
        return;
      }

      const PhaserLib = Phaser;

      class RaidScene extends PhaserLib.Scene {
        private player!: PhysicsArc;
        private playerShadow!: ShadowEllipse;
        private playerBullets!: ArcadeGroup;
        private enemyBullets!: ArcadeGroup;
        private enemies!: ArcadeGroup;
        private roomBackdrop!: Graphics;
        private roomGrid!: Graphics;
        private roomAccents!: Graphics;
        private roomPulse!: Graphics;
        private snapshotEntityLayer!: Graphics;
        private snapshotProjectileLayer!: Graphics;
        private boss?: BossSprite;
        private bossAura?: Graphics;
        private activePortal?: PortalSprite;
        private lowVisibilityOverlay?: Graphics;
        private pulseLayer?: Graphics;
        private trailLayer!: Graphics;
        private aimLine!: Graphics;
        private stateOverlayObjects: GameObject[] = [];
        private activeShockwave: ShockwaveState | null = null;
        private keys!: Record<"W" | "A" | "S" | "D" | "SPACE" | "R", KeyboardKey>;
        private overlaySequence = 0;
        private portalEnterLocked = false;
        private remotePlayers = new Map<string, RemotePlayerSprite>();
        private latestHostSnapshot: HostRaidSnapshot | null = null;
        private lastLocalStateBroadcastAt = 0;
        private lastHostSnapshotBroadcastAt = 0;
        private hostSnapshotSequence = 0;
        private hp = RAID_PLAYER.maxHp;
        private maxHp = RAID_PLAYER.maxHp;
        private score = 0;
        private kills = 0;
        private damageTaken = 0;
        private damageDealt = 0;
        private shotsFired = 0;
        private shotsHit = 0;
        private roomsCleared = 0;
        private currentWeapon: WeaponDefinition = getWeaponById("pulse-rifle");
        private fireRateMultiplier = 1;
        private dashCooldownMultiplier = 1;
        private bulletPierceBonus = 0;
        private critChance = 0;
        private roomEventModifier: AiEventModifier | null = null;
        private roomEnemySpeedMultiplier = 1;
        private roomBulletDamageMultiplier = 1;
        private roomDashCooldownMultiplier = 1;
        private lastShotAt = 0;
        private lastDashAt = -RAID_PLAYER.dashCooldownMs;
        private dashUntil = 0;
        private lastContactDamageAt = 0;
        private lastHudAt = 0;
        private raidStatus: RaidStatus = "room-intro";
        private statusText = "Entry Chamber breach active.";
        private currentRoomIndex = 0;
        private selectedUpgrades: UpgradeOption[] = [];
        private nextEnemyId = 1;
        private bossPhase: 1 | 2 | 3 | null = null;
        private bossMode: BossMode | null = null;
        private bossModeHistory: BossMode[] = [];
        private nextBossAttackAt = 0;
        private nextBossSummonAt = 0;
        private nextBossShockwaveAt = 0;
        private bossAttackCounter = 0;
        private bossFightStartedAt = 0;
        private lastBossContactDamageAt = 0;
        private raidEndReported = false;
        private surgeEventTriggered = false;
        private rewardPresentedForRoom = -1;

        constructor() {
          super("raid-arena");
        }

        create() {
          this.resetState();
          this.createArena();
          this.createPlayer();

          this.playerBullets = this.physics.add.group();
          this.enemyBullets = this.physics.add.group();
          this.enemies = this.physics.add.group();

          this.physics.add.overlap(
            this.playerBullets,
            this.enemies,
            this.handlePlayerBulletEnemyOverlap,
            undefined,
            this,
          );
          this.physics.add.overlap(
            this.enemyBullets,
            this.player,
            this.handleEnemyBulletPlayerOverlap,
            undefined,
            this,
          );
          this.physics.add.overlap(
            this.player,
            this.enemies,
            this.handlePlayerEnemyOverlap,
            undefined,
            this,
          );

          this.keys = this.input.keyboard?.addKeys(
            "W,A,S,D,SPACE,R",
          ) as Record<"W" | "A" | "S" | "D" | "SPACE" | "R", KeyboardKey>;
          this.input.mouse?.disableContextMenu();

          sceneControlsRef.current = {
            applyAiEvent: (directive) => this.applyAiEvent(directive),
            applyBossPhaseDirective: (selection) =>
              this.applyBossPhaseDirective(selection),
            applyHostSnapshot: (snapshot) => this.applyHostSnapshot(snapshot),
            applyRemotePlayerShot: (shot) => this.applyRemotePlayerShot(shot),
            applyRemotePlayerState: (state) => this.applyRemotePlayerState(state),
            applyRewardSelection: (selection) =>
              this.applyRewardSelection(selection),
          };

          if (this.isGuestClient()) {
            this.raidStatus = "room-intro";
            this.statusText = "Waiting for host snapshot.";
            this.positionPlayerForRoom();
            this.showStateText(
              "CO-OP LINK ESTABLISHED",
              "Waiting for the host to open the chamber route.",
            );
            this.emitHud(true);
          } else {
            this.enterRoomIntro(0);
          }
        }

        update(time: number) {
          this.sanitizeLocalVitals();

          if (this.raidStatus === "operator-down" || this.raidStatus === "victory") {
            if (PhaserLib.Input.Keyboard.JustDown(this.keys.R)) {
              this.scene.restart();
            }

            this.syncVisualEffects();
            this.renderProjectileTrails();
            this.renderRoomOverlay();
            this.renderHostSnapshot();
            this.renderPortalPulse(time);
            this.pruneRemotePlayers(time);
            this.broadcastLocalPlayerState(time);
            this.broadcastHostSnapshot(time);
            this.emitHud();
            return;
          }

          if (
            this.raidStatus === "room-intro" ||
            this.raidStatus === "reward" ||
            this.raidStatus === "ai-event" ||
            this.raidStatus === "boss-entry"
          ) {
            this.syncVisualEffects();
            this.renderRoomOverlay();
            this.renderHostSnapshot();
            this.renderPortalPulse(time);
            this.pruneRemotePlayers(time);
            this.broadcastLocalPlayerState(time);
            this.broadcastHostSnapshot(time);
            this.emitHud();
            return;
          }

          this.updatePlayerMovement(time);
          this.updateAimLine();
          this.handleShooting(time);

          if (!this.isGuestClient()) {
            this.updateEnemies(time);
            this.updateBoss(time);
            this.updateShockwave(time);
            this.updateEnemyBullets(time);
          }

          this.updatePlayerBullets(time);
          this.syncVisualEffects();
          this.renderProjectileTrails();
          this.renderRoomOverlay();
          this.renderHostSnapshot();
          this.renderPortalPulse(time);

          if (!this.isGuestClient() && this.raidStatus === "running") {
            this.checkRoomClear();
          }

          this.pruneRemotePlayers(time);
          this.broadcastLocalPlayerState(time);
          this.broadcastHostSnapshot(time);
          this.emitHud();
        }

        private resetState() {
          this.hp = RAID_PLAYER.maxHp;
          this.maxHp = RAID_PLAYER.maxHp;
          this.score = 0;
          this.kills = 0;
          this.damageTaken = 0;
          this.damageDealt = 0;
          this.shotsFired = 0;
          this.shotsHit = 0;
          this.roomsCleared = 0;
          this.currentWeapon = getWeaponById("pulse-rifle");
          this.fireRateMultiplier = 1;
          this.dashCooldownMultiplier = 1;
          this.bulletPierceBonus = 0;
          this.critChance = 0;
          this.roomEventModifier = null;
          this.roomEnemySpeedMultiplier = 1;
          this.roomBulletDamageMultiplier = 1;
          this.roomDashCooldownMultiplier = 1;
          this.lastShotAt = 0;
          this.lastDashAt = -RAID_PLAYER.dashCooldownMs;
          this.dashUntil = 0;
          this.lastContactDamageAt = 0;
          this.lastHudAt = 0;
          this.raidStatus = "room-intro";
          this.statusText = "Entry Chamber breach active.";
          this.currentRoomIndex = 0;
          this.selectedUpgrades = [];
          this.nextEnemyId = 1;
          this.boss = undefined;
          this.bossAura = undefined;
          this.activePortal = undefined;
          this.activeShockwave = null;
          this.bossPhase = null;
          this.bossMode = null;
          this.bossModeHistory = [];
          this.nextBossAttackAt = 0;
          this.nextBossSummonAt = 0;
          this.nextBossShockwaveAt = 0;
          this.bossAttackCounter = 0;
          this.bossFightStartedAt = 0;
          this.lastBossContactDamageAt = 0;
          this.raidEndReported = false;
          this.surgeEventTriggered = false;
          this.rewardPresentedForRoom = -1;
          this.portalEnterLocked = false;
          this.overlaySequence = 0;
          this.latestHostSnapshot = null;
          this.lastLocalStateBroadcastAt = 0;
          this.lastHostSnapshotBroadcastAt = 0;
          this.hostSnapshotSequence = 0;
          this.remotePlayers.forEach((player) => {
            player.nicknameLabel?.destroy();
            player.shadow?.destroy();
            player.destroy();
          });
          this.remotePlayers.clear();
          onRewardOffer(null);
        }

        private createArena() {
          this.cameras.main.setBackgroundColor("#02060b");
          this.roomBackdrop = this.add.graphics();
          this.roomGrid = this.add.graphics();
          this.roomAccents = this.add.graphics();
          this.roomPulse = this.add.graphics();
          this.snapshotEntityLayer = this.add.graphics();
          this.snapshotEntityLayer.setDepth(4);
          this.snapshotProjectileLayer = this.add.graphics();
          this.snapshotProjectileLayer.setDepth(6);
          this.trailLayer = this.add.graphics();
          this.trailLayer.setDepth(2);
          this.aimLine = this.add.graphics();
          this.aimLine.setDepth(7);
          this.pulseLayer = this.add.graphics();
          this.pulseLayer.setDepth(8);
          this.lowVisibilityOverlay = this.add.graphics();
          this.lowVisibilityOverlay.setDepth(20);

          this.drawRoomTheme(RAID_ROOMS[0]);
        }

        private createPlayer() {
          this.playerShadow = this.add.ellipse(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT - 106,
            36,
            16,
            0x000000,
            0.32,
          );
          this.playerShadow.setDepth(3);
          this.player = this.add.circle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT - 122,
            RAID_PLAYER.radius,
            0x2afcdb,
            1,
          ) as PhysicsArc;
          this.player.setStrokeStyle(3, 0xdffcff, 0.9);
          this.player.setDepth(5);

          this.physics.add.existing(this.player);
          this.ensurePlayerBody();
        }

        private ensurePlayerBody() {
          if (!this.player) {
            return undefined;
          }

          let body = this.player.body as ArcadeBody | undefined;

          if (!body) {
            this.physics.add.existing(this.player);
            body = this.player.body as ArcadeBody | undefined;
          }

          if (!body) {
            return undefined;
          }

          body.setCircle(RAID_PLAYER.radius);
          body.setCollideWorldBounds(true);
          body.setAllowGravity(false);
          body.setMaxVelocity(RAID_PLAYER.dashSpeed);

          return body;
        }

        private isMultiplayerEnabled() {
          return Boolean(multiplayer);
        }

        private isHostClient() {
          return Boolean(multiplayer?.isHost);
        }

        private isGuestClient() {
          return Boolean(multiplayer && !multiplayer.isHost);
        }

        private isRaidLive() {
          return this.raidStatus !== "operator-down" && this.raidStatus !== "victory";
        }

        private getSafeMaxHp(rawMaxHp: number | undefined = this.maxHp) {
          return Number.isFinite(rawMaxHp) && rawMaxHp > 0
            ? rawMaxHp
            : RAID_PLAYER.maxHp;
        }

        private getClampedHp(rawHp: number | undefined, fallbackHp: number) {
          const maxHp = this.getSafeMaxHp();

          if (!Number.isFinite(rawHp)) {
            return PhaserLib.Math.Clamp(fallbackHp, 0, maxHp);
          }

          return PhaserLib.Math.Clamp(rawHp as number, 0, maxHp);
        }

        private getDefaultDamageForSource(
          source: DamageSource,
          owner: BulletOwner = "enemy",
        ) {
          if (source === "player_projectile") {
            return RAID_PLAYER.bulletDamage;
          }

          if (source === "enemy_projectile") {
            return owner === "boss"
              ? RAID_BOSS.aimedShotDamage
              : RAID_ENEMY_BULLET.damage;
          }

          return DEFAULT_PLAYER_DAMAGE_BY_SOURCE[source];
        }

        private getSafeProjectileDamage(
          rawDamage: number | undefined,
          source: DamageSource,
          owner: BulletOwner,
        ) {
          const numericDamage = Number(rawDamage);

          return Number.isFinite(numericDamage)
            ? numericDamage
            : this.getDefaultDamageForSource(source, owner);
        }

        private getSafeIncomingDamage(
          rawDamage: number | undefined,
          source: PlayerDamageSource,
        ) {
          const numericDamage = Number(rawDamage);

          return Number.isFinite(numericDamage) && numericDamage > 0
            ? numericDamage
            : this.getDefaultDamageForSource(source);
        }

        private sanitizeLocalVitals() {
          this.maxHp = this.getSafeMaxHp(this.maxHp);
          const hpWasFinite = Number.isFinite(this.hp);
          this.hp = hpWasFinite ? this.getClampedHp(this.hp, 0) : 0;

          // Never allow undefined damage or bad snapshot data to poison HP.
          // NaN HP breaks `<= 0` checks and leaves the raid half-dead.
          if (!hpWasFinite && this.isRaidLive()) {
            this.statusText = "Integrity fault detected. Operator down.";
            this.endRaid();
            return;
          }

          if (this.hp <= 0 && this.isRaidLive()) {
            this.endRaid();
          }
        }

        private applyRemotePlayerState(state: CoopPlayerState) {
          if (
            !this.isMultiplayerEnabled() ||
            !multiplayer ||
            state.playerId === multiplayer.localPlayerId
          ) {
            return;
          }

          let remotePlayer = this.remotePlayers.get(state.playerId);
          const safeRemoteHp = this.getClampedHp(state.hp, this.getSafeMaxHp());

          if (!remotePlayer) {
            const shadow = this.add.ellipse(state.x, state.y + 15, 34, 16, 0x000000, 0.28);
            shadow.setDepth(3);
            remotePlayer = this.add.circle(
              state.x,
              state.y,
              RAID_PLAYER.radius,
              state.playerId === multiplayer.localPlayerId ? 0x58f3ff : 0x8d7cff,
              1,
            ) as RemotePlayerSprite;
            remotePlayer.setStrokeStyle(3, 0xf5f0ff, 0.82);
            remotePlayer.setDepth(5);
            remotePlayer.shadow = shadow;
            remotePlayer.nicknameLabel = this.add
              .text(state.x, state.y - 26, state.nickname, {
                color: "#d3cbff",
                fontFamily: "Segoe UI, Arial, sans-serif",
                fontSize: "12px",
                fontStyle: "bold",
              })
              .setOrigin(0.5)
              .setDepth(7);
            remotePlayer.playerId = state.playerId;
            remotePlayer.nickname = state.nickname;
            remotePlayer.isHost = state.playerId !== multiplayer.localPlayerId && !this.isHostClient();
            remotePlayer.lastContactDamageAt = 0;
            this.remotePlayers.set(state.playerId, remotePlayer);
          }

          remotePlayer.setPosition(state.x, state.y);
          remotePlayer.setRotation(state.rotation);
          remotePlayer.hp = safeRemoteHp;
          remotePlayer.roomNumber =
            Number.isFinite(state.roomNumber) && state.roomNumber > 0
              ? state.roomNumber
              : this.getCurrentRoom().number;
          remotePlayer.weaponId = state.weaponId;
          remotePlayer.lastSeenAt = this.time.now;
          remotePlayer.nickname = state.nickname;
          remotePlayer.nicknameLabel?.setText(state.nickname);
          remotePlayer.nicknameLabel?.setPosition(state.x, state.y - 26);
          remotePlayer.nicknameLabel?.setVisible(safeRemoteHp > 0);
          remotePlayer.shadow?.setPosition(state.x, state.y + 15);
          remotePlayer.setVisible(safeRemoteHp > 0);
          remotePlayer.shadow?.setVisible(safeRemoteHp > 0);
        }

        private applyRemotePlayerShot(shot: CoopPlayerShot) {
          if (
            !this.isMultiplayerEnabled() ||
            !multiplayer ||
            shot.playerId === multiplayer.localPlayerId
          ) {
            return;
          }

          const remotePlayer = this.remotePlayers.get(shot.playerId);
          const weapon = getWeaponById(shot.weaponId);
          const originX = remotePlayer?.x ?? shot.x;
          const originY = remotePlayer?.y ?? shot.y;
          const angles = this.getShotAngles(shot.angle, weapon);

          angles.forEach((angle) => {
            this.spawnBullet({
              angle,
              damage: this.isHostClient()
                ? Math.round(weapon.damage * this.roomBulletDamageMultiplier)
                : 0,
              damageSource: "player_projectile",
              owner: "player",
              pierceRemaining: weapon.pierce + this.bulletPierceBonus,
              projectileRadius: weapon.projectileRadius,
              projectileShape: weapon.projectileShape,
              speed: weapon.projectileSpeed,
              tint: weapon.tint,
              trailLength: weapon.trailLength,
              x: originX + Math.cos(angle) * 22,
              y: originY + Math.sin(angle) * 22,
            });
          });
        }

        private applyHostSnapshot(snapshot: HostRaidSnapshot) {
          if (!this.isGuestClient() || !multiplayer) {
            return;
          }

          this.latestHostSnapshot = snapshot;
          const nextRoomIndex = Math.max(0, Math.min(RAID_ROOMS.length - 1, snapshot.roomNumber - 1));

          if (nextRoomIndex !== this.currentRoomIndex) {
            this.currentRoomIndex = nextRoomIndex;
            this.drawRoomTheme(this.getCurrentRoom());
            this.clearStateOverlay();
          }

          this.raidStatus = snapshot.status;
          this.statusText = snapshot.statusText;
          this.roomsCleared = snapshot.roomsCleared;
          this.score = snapshot.score;
          this.kills = snapshot.kills;
          this.damageTaken = snapshot.damageTaken;
          this.selectedUpgrades = snapshot.selectedUpgrades;
          this.bossModeHistory = snapshot.bossModeHistory;
          this.currentWeapon = getWeaponById(snapshot.currentWeaponId);

          const snapshotMaxHp = snapshot.maxHpByPlayerId[multiplayer.localPlayerId];
          if (Number.isFinite(snapshotMaxHp) && snapshotMaxHp > 0) {
            this.maxHp = snapshotMaxHp;
          }

          const snapshotHp = snapshot.playerHpById[multiplayer.localPlayerId];
          if (Number.isFinite(snapshotHp)) {
            this.hp = this.getClampedHp(snapshotHp, 0);
          } else if (snapshot.status === "operator-down") {
            this.hp = 0;
          }

          this.sanitizeLocalVitals();

          if (
            !this.raidEndReported &&
            (snapshot.status === "victory" || snapshot.status === "operator-down")
          ) {
            this.reportRaidEnd(snapshot.status === "victory" ? "victory" : "wipeout");
          }
        }

        private pruneRemotePlayers(time: number) {
          this.remotePlayers.forEach((player, playerId) => {
            if (time - player.lastSeenAt <= 3500) {
              return;
            }

            player.nicknameLabel?.destroy();
            player.shadow?.destroy();
            player.destroy();
            this.remotePlayers.delete(playerId);
          });
        }

        private broadcastLocalPlayerState(time: number) {
          if (!this.isMultiplayerEnabled() || !multiplayer?.onLocalPlayerState) {
            return;
          }

          if (time - this.lastLocalStateBroadcastAt < 80) {
            return;
          }

          this.lastLocalStateBroadcastAt = time;
          const safeHp = this.getClampedHp(this.hp, 0);
          multiplayer.onLocalPlayerState({
            hp: safeHp,
            nickname: multiplayer.localNickname,
            playerId: multiplayer.localPlayerId,
            roomNumber: this.getCurrentRoom().number,
            rotation: this.player.rotation,
            sequence: Math.round(time),
            status: this.raidStatus,
            weaponId: this.currentWeapon.id,
            x: this.player.x,
            y: this.player.y,
          });
        }

        private broadcastHostSnapshot(time: number) {
          if (!this.isHostClient() || !multiplayer?.onHostSnapshot) {
            return;
          }

          if (time - this.lastHostSnapshotBroadcastAt < 110) {
            return;
          }

          this.lastHostSnapshotBroadcastAt = time;
          this.hostSnapshotSequence += 1;
          const room = this.getCurrentRoom();

          multiplayer.onHostSnapshot({
            boss: this.boss
              ? {
                  active: this.boss.active,
                  hp: this.boss.hp,
                  maxHp: this.boss.maxHp,
                  mode: this.bossMode,
                  phase: this.bossPhase,
                  shockwaveRadius: this.getActiveShockwaveRadius(),
                  x: this.boss.x,
                  y: this.boss.y,
                }
              : null,
            bossModeHistory: this.bossModeHistory,
            currentWeaponId: this.currentWeapon.id,
            currentWeaponName: this.currentWeapon.name,
            damageTaken: this.damageTaken,
            enemies: this.enemies.getChildren().map((enemyObject) => {
              const enemy = enemyObject as EnemySprite;

              return {
                enemyId: enemy.enemyId,
                hp: enemy.hp,
                kind: enemy.kind,
                rotation: enemy.rotation,
                x: enemy.x,
                y: enemy.y,
              };
            }),
            enemiesAlive: this.enemies.countActive(true),
            enemyBullets: this.enemyBullets.getChildren().map((bulletObject) => {
              const bullet = bulletObject as BulletSprite;
              return {
                angle: Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x),
                owner: bullet.owner === "boss" ? "boss" : "enemy",
                radius: bullet instanceof PhaserLib.GameObjects.Arc ? bullet.radius : 6,
                x: bullet.x,
                y: bullet.y,
              };
            }),
            kills: this.kills,
            maxHpByPlayerId: this.getMaxHpByPlayerId(),
            playerHpById: this.getPlayerHpById(),
            players: this.getSnapshotPlayers(),
            portal: this.activePortal
              ? {
                  active: this.activePortal.active,
                  kind: this.activePortal.kind,
                  x: this.activePortal.x,
                  y: this.activePortal.y,
                }
              : null,
            roomName: room.name,
            roomNumber: room.number,
            roomsCleared: this.roomsCleared,
            score: this.score,
            selectedUpgrades: this.selectedUpgrades,
            sequence: this.hostSnapshotSequence,
            status: this.raidStatus,
            statusText: this.statusText,
          });
        }

        private getSnapshotPlayers() {
          const safeLocalHp = this.getClampedHp(this.hp, 0);
          const players = [
            {
              hp: safeLocalHp,
              nickname: multiplayer?.localNickname ?? "Operator",
              playerId: multiplayer?.localPlayerId ?? "local",
              rotation: this.player.rotation,
              weaponId: this.currentWeapon.id,
              x: this.player.x,
              y: this.player.y,
            },
          ];

          this.remotePlayers.forEach((player) => {
            players.push({
              hp: this.getClampedHp(player.hp, this.getSafeMaxHp()),
              nickname: player.nickname,
              playerId: player.playerId,
              rotation: player.rotation,
              weaponId: player.weaponId,
              x: player.x,
              y: player.y,
            });
          });

          return players;
        }

        private getPlayerHpById() {
          const output: Record<string, number> = {};

          if (multiplayer) {
            output[multiplayer.localPlayerId] = this.getClampedHp(this.hp, 0);
          }

          this.remotePlayers.forEach((player) => {
            output[player.playerId] = this.getClampedHp(
              player.hp,
              this.getSafeMaxHp(),
            );
          });

          return output;
        }

        private getMaxHpByPlayerId() {
          const output: Record<string, number> = {};
          const safeMaxHp = this.getSafeMaxHp();

          if (multiplayer) {
            output[multiplayer.localPlayerId] = safeMaxHp;
          }

          this.remotePlayers.forEach((player) => {
            output[player.playerId] = safeMaxHp;
          });

          return output;
        }

        private getActiveShockwaveRadius() {
          if (!this.activeShockwave || !this.boss) {
            return null;
          }

          const progress = Math.min(
            1,
            (this.time.now - this.activeShockwave.startedAt) / this.activeShockwave.durationMs,
          );

          return RAID_BOSS.radius + progress * this.activeShockwave.maxRadius;
        }

        private getCurrentRoom() {
          return RAID_ROOMS[this.currentRoomIndex] ?? RAID_ROOMS[RAID_ROOMS.length - 1];
        }

        private positionPlayerForRoom() {
          const body = this.ensurePlayerBody();

          if (!body) {
            return;
          }

          body.stop();
          this.player.setPosition(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT - 122);
          body.reset(this.player.x, this.player.y);
        }

        private drawRoomTheme(room: RaidRoomDefinition) {
          const palette =
            room.theme === "entry"
              ? {
                  accent: 0x58f3ff,
                  background: 0x020710,
                  border: 0x2afcdb,
                  fill: 0x06111a,
                  grid: 0x143848,
                  hazard: 0x16384a,
                }
              : room.theme === "drone"
                ? {
                    accent: 0xffb347,
                    background: 0x09070a,
                    border: 0xff8d3a,
                    fill: 0x130d10,
                    grid: 0x4d2d1c,
                    hazard: 0x3c1d12,
                  }
                : room.theme === "surge"
                  ? {
                      accent: 0xff6238,
                      background: 0x0a0508,
                      border: 0xff6f4d,
                      fill: 0x180a10,
                      grid: 0x572131,
                      hazard: 0x5a1616,
                    }
                  : {
                      accent: 0xff7848,
                      background: 0x030203,
                      border: 0xff5a1f,
                      fill: 0x120708,
                      grid: 0x3b1518,
                      hazard: 0x2a0c0d,
                    };

          this.cameras.main.setBackgroundColor(palette.background);
          this.roomBackdrop.clear();
          this.roomGrid.clear();
          this.roomAccents.clear();
          this.roomPulse.clear();

          this.roomBackdrop.fillStyle(palette.fill, 0.92);
          this.roomBackdrop.fillRect(0, 0, RAID_GAME_WIDTH, RAID_GAME_HEIGHT);
          this.roomBackdrop.fillStyle(0x000000, room.theme === "boss" ? 0.18 : 0.12);
          this.roomBackdrop.fillRect(
            RAID_ARENA_PADDING,
            RAID_ARENA_PADDING,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 2,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 2,
          );

          this.roomGrid.lineStyle(1, palette.grid, 0.42);
          for (let x = RAID_ARENA_PADDING; x <= RAID_GAME_WIDTH; x += 48) {
            this.roomGrid.lineBetween(
              x,
              RAID_ARENA_PADDING,
              x,
              RAID_GAME_HEIGHT - RAID_ARENA_PADDING,
            );
          }

          for (let y = RAID_ARENA_PADDING; y <= RAID_GAME_HEIGHT; y += 48) {
            this.roomGrid.lineBetween(
              RAID_ARENA_PADDING,
              y,
              RAID_GAME_WIDTH - RAID_ARENA_PADDING,
              y,
            );
          }

          this.roomGrid.lineStyle(3, palette.border, 0.56);
          this.roomGrid.strokeRect(
            RAID_ARENA_PADDING,
            RAID_ARENA_PADDING,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 2,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 2,
          );

          this.roomAccents.lineStyle(2, palette.hazard, 0.3);
          this.roomAccents.strokeCircle(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 120);
          this.roomAccents.strokeCircle(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 220);
          this.roomAccents.lineBetween(156, 108, 286, 230);
          this.roomAccents.lineBetween(804, 108, 674, 230);
          this.roomAccents.lineBetween(156, 510, 286, 390);
          this.roomAccents.lineBetween(804, 510, 674, 390);

          if (room.theme === "drone") {
            this.roomAccents.fillStyle(0xffb347, 0.1);
            this.roomAccents.fillRect(120, 132, 720, 14);
            this.roomAccents.fillRect(138, 472, 684, 14);
          } else if (room.theme === "surge") {
            this.roomAccents.fillStyle(0xff6238, 0.12);
            this.roomAccents.fillRect(96, 92, 768, 10);
            this.roomAccents.fillRect(96, 518, 768, 10);
            this.roomAccents.lineStyle(3, 0xff7848, 0.18);
            this.roomAccents.strokeCircle(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 86);
          } else if (room.theme === "boss") {
            this.roomAccents.fillStyle(0x220607, 0.54);
            this.roomAccents.fillCircle(
              RAID_GAME_WIDTH / 2,
              RAID_GAME_HEIGHT / 2,
              132,
            );
            this.roomAccents.lineStyle(4, 0xff5a1f, 0.18);
            this.roomAccents.strokeCircle(
              RAID_GAME_WIDTH / 2,
              RAID_GAME_HEIGHT / 2,
              154,
            );
            this.roomAccents.lineStyle(2, 0xffb347, 0.16);
            this.roomAccents.strokeCircle(
              RAID_GAME_WIDTH / 2,
              RAID_GAME_HEIGHT / 2,
              210,
            );
          }

          const nodes =
            room.theme === "boss"
              ? [
                  [112, 108],
                  [848, 108],
                  [112, 512],
                  [848, 512],
                  [RAID_GAME_WIDTH / 2, 88],
                  [RAID_GAME_WIDTH / 2, 532],
                ]
              : [
                  [152, 104],
                  [808, 104],
                  [152, 516],
                  [808, 516],
                  [RAID_GAME_WIDTH / 2, 120],
                  [RAID_GAME_WIDTH / 2, 500],
                ];

          this.roomAccents.fillStyle(palette.accent, 0.18);
          nodes.forEach(([x, y]) => {
            this.roomAccents.fillCircle(x, y, 4);
            this.roomAccents.fillCircle(x, y, room.theme === "boss" ? 14 : 10);
          });
        }

        private renderHostSnapshot() {
          this.snapshotEntityLayer.clear();
          this.snapshotProjectileLayer.clear();

          if (!this.isGuestClient() || !this.latestHostSnapshot) {
            return;
          }

          const snapshot = this.latestHostSnapshot;

          snapshot.enemies.forEach((enemy) => {
            const fillColor =
              enemy.kind === "crawler"
                ? 0xff5a1f
                : enemy.kind === "elite-drone"
                  ? 0x7f1321
                  : 0xb52512;
            const strokeColor =
              enemy.kind === "crawler"
                ? 0xffb347
                : enemy.kind === "elite-drone"
                  ? 0xff7a6a
                  : 0xffb347;

            this.snapshotEntityLayer.fillStyle(0x000000, 0.28);
            this.snapshotEntityLayer.fillEllipse(enemy.x, enemy.y + 14, 30, 14);
            this.snapshotEntityLayer.lineStyle(3, strokeColor, 0.9);
            this.snapshotEntityLayer.fillStyle(fillColor, 1);

            if (enemy.kind === "crawler") {
              this.snapshotEntityLayer.fillCircle(enemy.x, enemy.y, RAID_CRAWLER.radius);
              this.snapshotEntityLayer.strokeCircle(enemy.x, enemy.y, RAID_CRAWLER.radius);
            } else {
              const size =
                enemy.kind === "elite-drone"
                  ? RAID_ELITE_DRONE.radius * 2
                  : RAID_DRONE.radius * 2;
              const half = size / 2;
              const corners = [
                rotatePoint(-half, -half, enemy.rotation),
                rotatePoint(half, -half, enemy.rotation),
                rotatePoint(half, half, enemy.rotation),
                rotatePoint(-half, half, enemy.rotation),
              ].map((point) => new PhaserLib.Math.Vector2(enemy.x + point.x, enemy.y + point.y));

              this.snapshotEntityLayer.fillPoints(corners, true, true);
              this.snapshotEntityLayer.strokePoints(corners, true, true);
            }
          });

          if (snapshot.portal?.active) {
            const portalColor = snapshot.portal.kind === "boss" ? 0xff6f3a : 0x58f3ff;
            const ringColor = snapshot.portal.kind === "boss" ? 0xffb347 : 0xdffcff;
            this.snapshotEntityLayer.fillStyle(0x000000, 0.3);
            this.snapshotEntityLayer.fillEllipse(
              snapshot.portal.x,
              snapshot.portal.y + 20,
              104,
              30,
            );
            this.snapshotEntityLayer.fillStyle(portalColor, 0.16);
            this.snapshotEntityLayer.fillCircle(
              snapshot.portal.x,
              snapshot.portal.y,
              snapshot.portal.kind === "boss" ? 36 : 34,
            );
            this.snapshotEntityLayer.lineStyle(4, ringColor, 0.92);
            this.snapshotEntityLayer.strokeCircle(
              snapshot.portal.x,
              snapshot.portal.y,
              snapshot.portal.kind === "boss" ? 36 : 34,
            );
          }

          if (snapshot.boss?.active) {
            this.snapshotEntityLayer.fillStyle(0x000000, 0.34);
            this.snapshotEntityLayer.fillEllipse(snapshot.boss.x, snapshot.boss.y + 22, 124, 46);
            this.snapshotEntityLayer.fillStyle(0x4a0808, 1);
            this.snapshotEntityLayer.lineStyle(5, 0xff5a1f, 0.95);
            this.snapshotEntityLayer.fillCircle(snapshot.boss.x, snapshot.boss.y, RAID_BOSS.radius);
            this.snapshotEntityLayer.strokeCircle(snapshot.boss.x, snapshot.boss.y, RAID_BOSS.radius);
            this.snapshotEntityLayer.lineStyle(3, 0xff5a1f, 0.24);
            this.snapshotEntityLayer.strokeCircle(snapshot.boss.x, snapshot.boss.y, RAID_BOSS.radius + 22);
            this.snapshotEntityLayer.lineStyle(2, 0xffb347, 0.18);
            this.snapshotEntityLayer.strokeCircle(snapshot.boss.x, snapshot.boss.y, RAID_BOSS.radius + 36);

            if (snapshot.boss.shockwaveRadius) {
              this.snapshotProjectileLayer.lineStyle(7, 0xffb347, 0.52);
              this.snapshotProjectileLayer.strokeCircle(
                snapshot.boss.x,
                snapshot.boss.y,
                snapshot.boss.shockwaveRadius,
              );
              this.snapshotProjectileLayer.lineStyle(2, 0xff2d1f, 0.4);
              this.snapshotProjectileLayer.strokeCircle(
                snapshot.boss.x,
                snapshot.boss.y,
                Math.max(0, snapshot.boss.shockwaveRadius - 26),
              );
            }
          }

          snapshot.enemyBullets.forEach((bullet) => {
            const color = bullet.owner === "boss" ? 0xff5b39 : 0xff8f47;
            this.snapshotProjectileLayer.fillStyle(color, 1);
            this.snapshotProjectileLayer.lineStyle(2, 0xffd1aa, 0.8);
            this.snapshotProjectileLayer.fillCircle(bullet.x, bullet.y, bullet.radius);
            this.snapshotProjectileLayer.strokeCircle(bullet.x, bullet.y, bullet.radius);
            this.snapshotProjectileLayer.lineStyle(3, color, 0.24);
            this.snapshotProjectileLayer.beginPath();
            this.snapshotProjectileLayer.moveTo(bullet.x, bullet.y);
            this.snapshotProjectileLayer.lineTo(
              bullet.x - Math.cos(bullet.angle) * 18,
              bullet.y - Math.sin(bullet.angle) * 18,
            );
            this.snapshotProjectileLayer.strokePath();
          });
        }

        private enterRoomIntro(roomIndex: number) {
          const room = RAID_ROOMS[roomIndex];
          const body = this.ensurePlayerBody();

          this.currentRoomIndex = roomIndex;
          this.raidStatus = "room-intro";
          this.statusText = `Entering ${room.name}.`;
          this.portalEnterLocked = false;
          this.clearRoomCombat();
          this.clearPortal();
          this.clearStateOverlay();
          this.clearRoomEventModifiers(room.id === "surge-chamber");
          this.drawRoomTheme(room);
          this.positionPlayerForRoom();
          if (body) {
            body.enable = true;
          }

          this.showStateText(room.introTitle, room.introText);
          this.cameras.main.flash(
            140,
            room.theme === "boss" ? 255 : 88,
            room.theme === "boss" ? 120 : 243,
            room.theme === "boss" ? 72 : 255,
            false,
          );
          this.emitHud(true);

          this.time.delayedCall(1200, () => {
            if (this.currentRoomIndex !== roomIndex || this.raidStatus !== "room-intro") {
              return;
            }

            if (room.id === "boss-chamber") {
              this.enterBossEntry();
              return;
            }

            if (room.id === "surge-chamber" && !this.surgeEventTriggered) {
              this.enterAiEventIntermission();
              return;
            }

            this.startCombatRoom(room);
          });
        }

        private startCombatRoom(room: RaidRoomDefinition) {
          const body = this.ensurePlayerBody();

          this.raidStatus = "running";
          this.statusText = `${room.name} breach active.`;
          this.clearStateOverlay();
          this.clearPortal();
          this.clearRoomCombat();
          if (body) {
            body.enable = true;
            body.stop();
          }

          const extraDrones =
            room.id === "surge-chamber" && this.roomEventModifier === "DRONE_SWARM" ? 2 : 0;

          for (let index = 0; index < room.crawlers; index += 1) {
            this.spawnCrawler(index, room);
          }

          for (let index = 0; index < room.drones + extraDrones; index += 1) {
            this.spawnDrone(index, room);
          }

          for (let index = 0; index < room.eliteDrones; index += 1) {
            this.spawnEliteDrone(index, room);
          }

          this.emitHud(true);
        }

        private enterRewardDraft() {
          const room = this.getCurrentRoom();
          const body = this.ensurePlayerBody();

          if (this.rewardPresentedForRoom === room.number) {
            return;
          }

          this.rewardPresentedForRoom = room.number;
          this.raidStatus = "reward";
          this.statusText = `${room.name} cleared. Choose a raid reward.`;
          body?.stop();
          this.clearProjectiles();
          this.showStateText("ROOM CLEARED", "Choose one raid reward to continue.");
          onRewardOffer(
            getRewardOffers({
              currentWeaponId: this.currentWeapon.id,
              roomNumber: room.number,
              selectedUpgrades: this.selectedUpgrades,
            }),
          );
          this.emitHud(true);
        }

        private applyRewardSelection(selection: RewardSelection) {
          if (this.raidStatus !== "reward") {
            return;
          }

          const { reward } = selection;

          if (reward.type === "weapon" && reward.weaponId) {
            this.currentWeapon = getWeaponById(reward.weaponId);
            this.statusText = `${this.currentWeapon.name} equipped for the next chamber.`;
          } else if (reward.type === "upgrade" && reward.upgradeId) {
            this.applyUpgradeEffect(reward.upgradeId);
            const upgrade = getUpgradeById(reward.upgradeId);
            this.statusText = `${upgrade.name} installed.`;
          } else if (reward.type === "repair") {
            this.hp = Math.min(this.maxHp, this.hp + (reward.healAmount ?? 0));
            this.statusText = "Repair kit applied. Integrity restored.";
          } else if (reward.type === "score") {
            this.score += reward.scoreAmount ?? 0;
            this.statusText = "Score cache secured.";
          }

          onRewardOffer(null);
          this.showTransientStateText(
            reward.name.toUpperCase(),
            reward.description,
            880,
            ["reward", "portal"],
          );
          this.spawnPortal("normal");
          this.emitHud(true);
        }

        private enterAiEventIntermission() {
          const body = this.ensurePlayerBody();

          this.raidStatus = "ai-event";
          this.surgeEventTriggered = true;
          this.statusText = "AI Director analyzing Surge Chamber instability.";
          body?.stop();
          this.clearProjectiles();
          this.showStateText(
            "AI DIRECTOR UPLINK",
            "Surge Chamber crisis event pending operator confirmation.",
          );
          onAiEventRequest({
            damageTaken: this.damageTaken,
            kills: this.kills,
            playerHp: this.hp,
            selectedUpgrades: this.selectedUpgrades.map((upgrade) => upgrade.name),
            wave: 3,
          });
          this.emitHud(true);
        }

        private applyAiEvent(directive: AiEventDirective) {
          if (this.raidStatus !== "ai-event") {
            return;
          }

          this.roomEventModifier = directive.modifier;
          this.roomEnemySpeedMultiplier = directive.modifier === "POWER_SURGE" ? 1.12 : 1;
          this.roomBulletDamageMultiplier =
            directive.modifier === "OVERCHARGED_WEAPONS" ? 1.2 : 1;
          this.roomDashCooldownMultiplier =
            directive.modifier === "SYSTEM_LAG" ? 1.25 : 1;

          if (directive.modifier === "EMERGENCY_CACHE") {
            this.hp = Math.min(this.maxHp, this.hp + 25);
          }

          this.statusText = `${directive.eventTitle}: ${directive.eventText}`;
          this.emitPhasePulse(0xff7d38, 0.22);
          this.showTransientStateText(
            directive.eventTitle.toUpperCase(),
            directive.eventText,
            980,
            ["ai-event"],
          );
          this.time.delayedCall(980, () => {
            if (this.raidStatus === "ai-event") {
              this.startCombatRoom(this.getCurrentRoom());
            }
          });
        }

        private spawnPortal(kind: PortalKind) {
          this.clearPortal();
          this.raidStatus = "portal";
          this.portalEnterLocked = false;
          this.clearProjectiles();

          const portalColor = kind === "boss" ? 0xff6f3a : 0x58f3ff;
          const strokeColor = kind === "boss" ? 0xffb347 : 0xdffcff;
          const labelText = kind === "boss" ? "Enter Boss Chamber" : "Enter Portal";

          const shadow = this.add.ellipse(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 + 22,
            104,
            30,
            0x000000,
            0.32,
          );
          shadow.setDepth(3);
          const portal = this.add.circle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            kind === "boss" ? 36 : 34,
            portalColor,
            kind === "boss" ? 0.18 : 0.14,
          ) as PortalSprite;
          portal.setStrokeStyle(4, strokeColor, 0.95);
          portal.setDepth(5);
          portal.kind = kind;
          portal.activatedAt = this.time.now;
          portal.shadow = shadow;

          portal.aura = this.add.graphics();
          portal.aura.setDepth(4);
          portal.label = this.add
            .text(
              RAID_GAME_WIDTH / 2,
              RAID_GAME_HEIGHT / 2 + 64,
              labelText,
              {
                color: kind === "boss" ? "#ffb692" : "#c8f7ff",
                fontFamily: "Segoe UI, Arial, sans-serif",
                fontSize: "13px",
                fontStyle: "bold",
              },
            )
            .setOrigin(0.5)
            .setDepth(6);

          this.physics.add.existing(portal);
          portal.body.setCircle(kind === "boss" ? 36 : 34);
          portal.body.setAllowGravity(false);
          portal.body.setImmovable(true);

          this.physics.add.overlap(
            this.player,
            portal,
            this.handlePortalOverlap,
            undefined,
            this,
          );

          this.activePortal = portal;
          this.statusText =
            kind === "boss"
              ? "BLACKOUT CORE SIGNAL LOCKED. Enter the corrupted gate."
              : "Portal online. Advance to the next chamber.";
          this.cameras.main.flash(
            120,
            kind === "boss" ? 255 : 88,
            kind === "boss" ? 110 : 243,
            kind === "boss" ? 72 : 255,
            false,
          );
          this.showTransientStateText(
            kind === "boss" ? "BLACKOUT CORE SIGNAL LOCKED" : "ROOM CLEARED",
            kind === "boss"
              ? "Corrupted boss portal stabilized. Enter the final chamber."
              : "Portal stabilized. Move through to continue.",
            1150,
            ["portal"],
          );
          this.emitHud(true);
        }

        private handlePortalOverlap(playerObject: unknown, portalObject: unknown) {
          if (
            !playerObject ||
            !portalObject ||
            !this.activePortal?.active ||
            this.raidStatus !== "portal" ||
            this.portalEnterLocked
          ) {
            return;
          }

          this.portalEnterLocked = true;
          this.enterPortal(this.activePortal.kind);
        }

        private enterPortal(kind: PortalKind) {
          const nextRoomIndex = Math.min(this.currentRoomIndex + 1, RAID_ROOMS.length - 1);
          const color = kind === "boss" ? 0xff7848 : 0x58f3ff;
          const body = this.ensurePlayerBody();

          this.clearRoomCombat();
          this.clearProjectiles();
          body?.stop();
          this.activePortal?.aura?.clear();
          this.emitBurst(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, color, 14);
          this.cameras.main.shake(kind === "boss" ? 180 : 120, kind === "boss" ? 0.006 : 0.004);
          this.cameras.main.flash(
            170,
            kind === "boss" ? 255 : 88,
            kind === "boss" ? 112 : 243,
            kind === "boss" ? 74 : 255,
            false,
          );
          this.clearPortal();
          this.showStateText(
            kind === "boss" ? "CORRUPTED TRANSIT" : "PORTAL TRANSIT",
            kind === "boss"
              ? "Boss chamber breach in progress."
              : "Routing operator into the next chamber.",
          );
          this.time.delayedCall(420, () => this.enterRoomIntro(nextRoomIndex));
        }

        private updatePlayerMovement(time: number) {
          const body = this.ensurePlayerBody();

          if (!this.player || !body) {
            return;
          }

          if (this.hp <= 0) {
            body.setVelocity(0, 0);
            return;
          }

          if (time < this.dashUntil) {
            return;
          }

          const move = new PhaserLib.Math.Vector2(
            Number(this.keys.D.isDown) - Number(this.keys.A.isDown),
            Number(this.keys.S.isDown) - Number(this.keys.W.isDown),
          );

          if (PhaserLib.Input.Keyboard.JustDown(this.keys.SPACE)) {
            this.tryDash(time, move);
          }

          if (time < this.dashUntil) {
            return;
          }

          if (move.lengthSq() > 0) {
            move.normalize().scale(RAID_PLAYER.speed);
            body.setVelocity(move.x, move.y);
          } else {
            body.setVelocity(0, 0);
          }
        }

        private tryDash(time: number, move: import("phaser").Math.Vector2) {
          const body = this.ensurePlayerBody();

          if (!this.player || !body) {
            return;
          }

          if (time - this.lastDashAt < this.getDashCooldownMs()) {
            return;
          }

          const pointer = this.input.activePointer;
          const aim = new PhaserLib.Math.Vector2(
            pointer.worldX - this.player.x,
            pointer.worldY - this.player.y,
          );
          const dashDirection = move.lengthSq() > 0 ? move.clone() : aim;

          if (dashDirection.lengthSq() === 0) {
            return;
          }

          dashDirection.normalize().scale(RAID_PLAYER.dashSpeed);
          body.setVelocity(dashDirection.x, dashDirection.y);
          this.lastDashAt = time;
          this.dashUntil = time + RAID_PLAYER.dashDurationMs;
        }

        private getDashCooldownMs() {
          return Math.round(
            RAID_PLAYER.dashCooldownMs *
              this.dashCooldownMultiplier *
              this.roomDashCooldownMultiplier,
          );
        }

        private getPlayerFireRateMs() {
          return Math.max(85, Math.round(this.currentWeapon.fireRateMs * this.fireRateMultiplier));
        }

        private getPlayerBulletDamage() {
          return Math.round(this.currentWeapon.damage * this.roomBulletDamageMultiplier);
        }

        private getPlayerPierce() {
          return this.currentWeapon.pierce + this.bulletPierceBonus;
        }

        private updateAimLine() {
          const pointer = this.input.activePointer;
          const angle = PhaserLib.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY,
          );

          this.player.setRotation(angle);
          this.aimLine.clear();
          this.aimLine.lineStyle(
            this.currentWeapon.id === "scatter-cannon" ? 2 : 3,
            this.currentWeapon.tint,
            0.84,
          );
          this.aimLine.beginPath();
          this.aimLine.moveTo(this.player.x, this.player.y);
          this.aimLine.lineTo(
            this.player.x + Math.cos(angle) * 42,
            this.player.y + Math.sin(angle) * 42,
          );
          this.aimLine.strokePath();
        }

        private handleShooting(time: number) {
          if (this.hp <= 0 || (this.raidStatus !== "running" && this.raidStatus !== "boss")) {
            return;
          }

          const pointer = this.input.activePointer;

          if (
            !pointer.isDown ||
            !pointer.leftButtonDown() ||
            time - this.lastShotAt < this.getPlayerFireRateMs()
          ) {
            return;
          }

          const baseAngle = PhaserLib.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY,
          );
          const angles = this.getShotAngles(baseAngle, this.currentWeapon);

          angles.forEach((angle) => {
            const isCritical = this.critChance > 0 && Math.random() < this.critChance;
            const shotDamage = this.getPlayerBulletDamage();

            this.spawnBullet({
              angle,
              damage: isCritical ? shotDamage * 2 : shotDamage,
              damageSource: "player_projectile",
              owner: "player",
              pierceRemaining: this.getPlayerPierce(),
              projectileRadius: this.currentWeapon.projectileRadius,
              projectileShape: this.currentWeapon.projectileShape,
              speed: this.currentWeapon.projectileSpeed,
              tint: this.currentWeapon.tint,
              trailLength: this.currentWeapon.trailLength,
              x: this.player.x + Math.cos(angle) * 22,
              y: this.player.y + Math.sin(angle) * 22,
            });
            this.shotsFired += 1;
          });

          this.lastShotAt = time;

          if (this.isMultiplayerEnabled() && multiplayer?.onLocalPlayerShot) {
            multiplayer.onLocalPlayerShot({
              angle: baseAngle,
              playerId: multiplayer.localPlayerId,
              sequence: Math.round(time),
              weaponId: this.currentWeapon.id,
              x: this.player.x,
              y: this.player.y,
            });
          }
        }

        private getShotAngles(baseAngle: number, weapon: WeaponDefinition) {
          if (weapon.pelletCount <= 1) {
            return [baseAngle];
          }

          const half = (weapon.pelletCount - 1) / 2;

          return Array.from({ length: weapon.pelletCount }, (_, index) => {
            const offsetIndex = index - half;
            return baseAngle + offsetIndex * (weapon.spread / Math.max(1, half));
          });
        }

        private spawnBullet({
          angle,
          damage,
          damageSource,
          owner,
          pierceRemaining,
          projectileRadius,
          projectileShape,
          speed,
          tint,
          trailLength,
          x,
          y,
        }: {
          angle: number;
          damage: number;
          damageSource?: DamageSource;
          owner: BulletOwner;
          pierceRemaining: number;
          projectileRadius: number;
          projectileShape: "orb" | "rail";
          speed: number;
          tint: number;
          trailLength: number;
          x: number;
          y: number;
        }) {
          const resolvedDamageSource =
            damageSource ??
            (owner === "player"
              ? "player_projectile"
              : owner === "boss"
                ? "boss_projectile"
                : "enemy_projectile");
          const resolvedDamage = this.getSafeProjectileDamage(
            damage,
            resolvedDamageSource,
            owner,
          );
          const fillColor =
            owner === "player" ? tint : owner === "boss" ? 0xff4a2e : 0xff7a3c;
          const strokeColor =
            owner === "player" ? 0xe0feff : owner === "boss" ? 0xffcf9f : 0xffb882;
          const bullet =
            projectileShape === "rail" && owner === "player"
              ? (this.add.rectangle(
                  x,
                  y,
                  22,
                  Math.max(4, projectileRadius * 2),
                  fillColor,
                  1,
                ) as BulletSprite)
              : (this.add.circle(
                  x,
                  y,
                  owner === "player" ? projectileRadius : RAID_ENEMY_BULLET.radius,
                  fillColor,
                  1,
                ) as BulletSprite);

          bullet.setStrokeStyle(2, strokeColor, 0.95);
          bullet.setRotation(angle);
          bullet.damage = resolvedDamage;
          bullet.damageSource = resolvedDamageSource;
          bullet.owner = owner;
          bullet.pierceRemaining = pierceRemaining;
          bullet.hitEnemyIds = new Set();
          bullet.bornAt = this.time.now;
          bullet.trailColor = fillColor;
          bullet.trailLength =
            owner === "player" ? trailLength : owner === "boss" ? 26 : 18;
          bullet.bulletShape = projectileShape;
          bullet.setDepth(owner === "player" ? 7 : 6);

          this.physics.add.existing(bullet);

          if (bullet instanceof PhaserLib.GameObjects.Arc) {
            bullet.body.setCircle(
              owner === "player" ? projectileRadius : RAID_ENEMY_BULLET.radius,
            );
          } else {
            bullet.body.setSize(22, Math.max(4, projectileRadius * 2));
          }

          bullet.body.setAllowGravity(false);
          bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

          if (owner === "player") {
            this.playerBullets.add(bullet);
          } else {
            this.enemyBullets.add(bullet);
          }
        }

        private spawnCrawler(index: number, room: RaidRoomDefinition) {
          const { x, y } = this.getRoomSpawnPoint(room, index, 0);
          const shadow = this.add.ellipse(x, y + 14, 28, 14, 0x000000, 0.28);
          shadow.setDepth(3);
          const crawler = this.add.circle(
            x,
            y,
            RAID_CRAWLER.radius,
            0xff5a1f,
            1,
          ) as EnemySprite;
          crawler.setStrokeStyle(3, 0xffb347, 0.85);
          crawler.setDepth(5);
          crawler.baseFillColor = 0xff5a1f;
          crawler.baseStrokeColor = 0xffb347;
          crawler.enemyId = this.nextEnemyId;
          crawler.hp = RAID_CRAWLER.hp;
          crawler.kind = "crawler";
          crawler.lastShotAt = 0;
          crawler.scoreValue = RAID_CRAWLER.scoreValue;
          crawler.shadow = shadow;
          crawler.speed = Math.round(RAID_CRAWLER.speed * this.getEnemySpeedMultiplier());
          this.nextEnemyId += 1;

          this.physics.add.existing(crawler);
          crawler.body.setCircle(RAID_CRAWLER.radius);
          crawler.body.setCollideWorldBounds(true);
          crawler.body.setAllowGravity(false);
          this.enemies.add(crawler);
        }

        private spawnDrone(index: number, room: RaidRoomDefinition) {
          this.spawnDroneVariant(index, room, "drone");
        }

        private spawnEliteDrone(index: number, room: RaidRoomDefinition) {
          this.spawnDroneVariant(index, room, "elite-drone");
        }

        private spawnDroneVariant(
          index: number,
          room: RaidRoomDefinition,
          kind: "drone" | "elite-drone",
        ) {
          const config = kind === "elite-drone" ? RAID_ELITE_DRONE : RAID_DRONE;
          const { x, y } = this.getRoomSpawnPoint(room, index, kind === "elite-drone" ? 17 : 11);
          const shadow = this.add.ellipse(
            x,
            y + 16,
            kind === "elite-drone" ? 38 : 32,
            16,
            0x000000,
            0.28,
          );
          shadow.setDepth(3);
          const fillColor = kind === "elite-drone" ? 0x7f1321 : 0xb52512;
          const strokeColor = kind === "elite-drone" ? 0xff7a6a : 0xffb347;
          const size = config.radius * 2;
          const drone = this.add.rectangle(x, y, size, size, fillColor, 1) as EnemySprite;
          drone.setStrokeStyle(3, strokeColor, 0.95);
          drone.setDepth(5);
          drone.rotation = kind === "elite-drone" ? Math.PI / 4 : 0;
          drone.baseFillColor = fillColor;
          drone.baseStrokeColor = strokeColor;
          drone.enemyId = this.nextEnemyId;
          drone.hp = config.hp;
          drone.kind = kind;
          drone.lastShotAt = this.time.now + index * (kind === "elite-drone" ? 120 : 180);
          drone.scoreValue = config.scoreValue;
          drone.shadow = shadow;
          drone.speed = Math.round(config.speed * this.getEnemySpeedMultiplier());
          this.nextEnemyId += 1;

          this.physics.add.existing(drone);
          drone.body.setSize(size, size);
          drone.body.setCollideWorldBounds(true);
          drone.body.setAllowGravity(false);
          this.enemies.add(drone);
        }

        private getEnemySpeedMultiplier() {
          if (this.getCurrentRoom().id === "surge-chamber" && this.raidStatus === "running") {
            return this.roomEnemySpeedMultiplier;
          }

          return 1;
        }

        private getRoomSpawnPoint(
          room: RaidRoomDefinition,
          index: number,
          offset: number,
        ) {
          const pattern = ROOM_SPAWN_POINTS[room.id];
          return pattern[(index + offset) % pattern.length] ?? pattern[0];
        }

        private getCombatTargets() {
          const targets: Array<{
            hp: number;
            playerId: string;
            sprite: PhysicsArc | RemotePlayerSprite;
            x: number;
            y: number;
          }> = [];

          if (this.hp > 0) {
            targets.push({
              hp: this.hp,
              playerId: multiplayer?.localPlayerId ?? "local",
              sprite: this.player,
              x: this.player.x,
              y: this.player.y,
            });
          }

          this.remotePlayers.forEach((player) => {
            if (
              player.hp <= 0 ||
              player.roomNumber !== this.getCurrentRoom().number ||
              this.time.now - player.lastSeenAt > 2500
            ) {
              return;
            }

            targets.push({
              hp: player.hp,
              playerId: player.playerId,
              sprite: player,
              x: player.x,
              y: player.y,
            });
          });

          return targets;
        }

        private getClosestCombatTarget(x: number, y: number) {
          const targets = this.getCombatTargets();

          if (targets.length === 0) {
            return null;
          }

          let bestTarget = targets[0];
          let bestDistance = PhaserLib.Math.Distance.Between(x, y, bestTarget.x, bestTarget.y);

          for (let index = 1; index < targets.length; index += 1) {
            const target = targets[index];
            const distance = PhaserLib.Math.Distance.Between(x, y, target.x, target.y);

            if (distance < bestDistance) {
              bestTarget = target;
              bestDistance = distance;
            }
          }

          return bestTarget;
        }

        private applyRemotePlayerDamage(
          playerId: string,
          rawDamage: number | undefined,
          source: PlayerDamageSource,
        ) {
          const remotePlayer = this.remotePlayers.get(playerId);

          if (!remotePlayer || remotePlayer.hp <= 0) {
            return;
          }

          const damage = this.getSafeIncomingDamage(rawDamage, source);
          const currentHp = this.getClampedHp(remotePlayer.hp, this.getSafeMaxHp());
          remotePlayer.hp = Math.max(0, currentHp - Math.min(currentHp, damage));
          remotePlayer.setFillStyle(0xff8f6b, 1);
          remotePlayer.shadow?.setFillStyle(0x2b0805, 0.42);
          remotePlayer.setVisible(remotePlayer.hp > 0);
          remotePlayer.shadow?.setVisible(remotePlayer.hp > 0);
          remotePlayer.nicknameLabel?.setVisible(remotePlayer.hp > 0);
          this.time.delayedCall(90, () => {
            if (remotePlayer.active) {
              remotePlayer.setFillStyle(0x8d7cff, 1);
              remotePlayer.shadow?.setFillStyle(0x000000, 0.3);
            }
          });
        }

        private updateEnemies(time: number) {
          this.enemies.getChildren().forEach((enemyObject: GameObject) => {
            const enemy = enemyObject as EnemySprite;
            const target = this.getClosestCombatTarget(enemy.x, enemy.y);

            if (!enemy.active || !target) {
              return;
            }

            if (enemy.kind === "crawler") {
              this.physics.moveTo(enemy, target.x, target.y, enemy.speed);
              return;
            }

            this.updateDrone(enemy, time, target.x, target.y);
          });

          if (this.isHostClient()) {
            this.updateRemotePlayerContactDamage(time);
          }
        }

        private updateDrone(drone: EnemySprite, time: number, targetX: number, targetY: number) {
          const config = drone.kind === "elite-drone" ? RAID_ELITE_DRONE : RAID_DRONE;
          const distance = PhaserLib.Math.Distance.Between(
            drone.x,
            drone.y,
            targetX,
            targetY,
          );
          const toPlayer = new PhaserLib.Math.Vector2(
            targetX - drone.x,
            targetY - drone.y,
          );

          if (distance < config.retreatDistance && toPlayer.lengthSq() > 0) {
            toPlayer.normalize().scale(-drone.speed);
            drone.body.setVelocity(toPlayer.x, toPlayer.y);
          } else if (distance > config.preferredDistance && toPlayer.lengthSq() > 0) {
            toPlayer.normalize().scale(drone.speed);
            drone.body.setVelocity(toPlayer.x, toPlayer.y);
          } else {
            drone.body.setVelocity(0, 0);
          }

          drone.rotation += drone.kind === "elite-drone" ? 0.034 : 0.024;

          if (time - drone.lastShotAt >= config.fireRateMs) {
            this.fireDroneShot(drone, targetX, targetY);
            drone.lastShotAt = time;
          }
        }

        private fireDroneShot(drone: EnemySprite, targetX: number, targetY: number) {
          const isElite = drone.kind === "elite-drone";
          const angle = PhaserLib.Math.Angle.Between(
            drone.x,
            drone.y,
            targetX,
            targetY,
          );

          this.spawnBullet({
            angle,
            damage: isElite ? RAID_ELITE_DRONE.damage : RAID_DRONE.damage,
            damageSource: isElite ? "elite_drone_projectile" : "drone_projectile",
            owner: "enemy",
            pierceRemaining: 0,
            projectileRadius: RAID_ENEMY_BULLET.radius,
            projectileShape: "orb",
            speed: isElite ? RAID_ENEMY_BULLET.speed + 34 : RAID_ENEMY_BULLET.speed,
            tint: isElite ? 0xff5b54 : 0xff8f47,
            trailLength: isElite ? 22 : 18,
            x: drone.x + Math.cos(angle) * 20,
            y: drone.y + Math.sin(angle) * 20,
          });
        }

        private updateRemotePlayerContactDamage(time: number) {
          this.remotePlayers.forEach((player) => {
            if (
              player.hp <= 0 ||
              player.roomNumber !== this.getCurrentRoom().number ||
              time - player.lastSeenAt > 2500
            ) {
              return;
            }

            this.enemies.getChildren().forEach((enemyObject: GameObject) => {
              const enemy = enemyObject as EnemySprite;

              if (enemy.kind !== "crawler") {
                return;
              }

              const distance = PhaserLib.Math.Distance.Between(
                enemy.x,
                enemy.y,
                player.x,
                player.y,
              );

              if (
                distance <= RAID_CRAWLER.radius + RAID_PLAYER.radius &&
                time - player.lastContactDamageAt >= RAID_CRAWLER.contactCooldownMs
              ) {
                player.lastContactDamageAt = time;
                this.applyRemotePlayerDamage(
                  player.playerId,
                  RAID_CRAWLER.damage,
                  "crawler_contact",
                );
              }
            });
          });
        }

        private updatePlayerBullets(time: number) {
          this.playerBullets.getChildren().forEach((bulletObject: GameObject) => {
            this.destroyExpiredBullet(bulletObject as BulletSprite, time, RAID_BULLET.lifetimeMs);
          });
        }

        private updateEnemyBullets(time: number) {
          this.enemyBullets.getChildren().forEach((bulletObject: GameObject) => {
            const bullet = bulletObject as BulletSprite;

            if (!bullet.active) {
              return;
            }

            if (this.isHostClient()) {
              let hitRemote = false;

              this.remotePlayers.forEach((player) => {
                if (
                  hitRemote ||
                  player.hp <= 0 ||
                  player.roomNumber !== this.getCurrentRoom().number ||
                  time - player.lastSeenAt > 2500
                ) {
                  return;
                }

                const distance = PhaserLib.Math.Distance.Between(
                  bullet.x,
                  bullet.y,
                  player.x,
                  player.y,
                );

                if (distance <= RAID_PLAYER.radius + RAID_ENEMY_BULLET.radius) {
                  hitRemote = true;
                  bullet.destroy();
                  this.applyRemotePlayerDamage(
                    player.playerId,
                    bullet.damage,
                    bullet.damageSource === "elite_drone_projectile"
                      ? "elite_drone_projectile"
                      : bullet.damageSource === "drone_projectile"
                        ? "drone_projectile"
                        : bullet.damageSource === "boss_projectile"
                          ? "boss_projectile"
                          : "enemy_projectile",
                  );
                }
              });

              if (hitRemote) {
                return;
              }
            }

            this.destroyExpiredBullet(bullet, time, RAID_ENEMY_BULLET.lifetimeMs);
          });
        }

        private destroyExpiredBullet(
          bullet: BulletSprite,
          time: number,
          lifetimeMs: number,
        ) {
          const expired = time - bullet.bornAt > lifetimeMs;
          const outOfBounds =
            bullet.x < RAID_ARENA_PADDING ||
            bullet.x > RAID_GAME_WIDTH - RAID_ARENA_PADDING ||
            bullet.y < RAID_ARENA_PADDING ||
            bullet.y > RAID_GAME_HEIGHT - RAID_ARENA_PADDING;

          if (expired || outOfBounds) {
            bullet.destroy();
          }
        }

        private flashEnemy(enemy: EnemySprite) {
          enemy.setFillStyle(0xfbf6ee, 1);
          enemy.setStrokeStyle(3, 0xffffff, 1);
          this.time.delayedCall(55, () => {
            if (!enemy.active) {
              return;
            }

            enemy.setFillStyle(enemy.baseFillColor, 1);
            enemy.setStrokeStyle(
              3,
              enemy.baseStrokeColor,
              enemy.kind === "crawler" ? 0.85 : 0.95,
            );
          });
        }

        private emitBurst(x: number, y: number, color: number, count = 8) {
          for (let index = 0; index < count; index += 1) {
            const particle = this.add.circle(x, y, 2 + (index % 2), color, 0.9);
            const angle = (Math.PI * 2 * index) / count;
            const distance = 18 + Math.random() * 26;

            particle.setDepth(9);
            this.tweens.add({
              alpha: 0,
              duration: 260 + Math.random() * 120,
              scale: 0.2,
              targets: particle,
              x: x + Math.cos(angle) * distance,
              y: y + Math.sin(angle) * distance,
              onComplete: () => particle.destroy(),
            });
          }
        }

        private handlePlayerBulletEnemyOverlap(
          bulletObject: unknown,
          enemyObject: unknown,
        ) {
          const bullet = bulletObject as BulletSprite;
          const enemy = enemyObject as EnemySprite;

          if (!bullet.active || !enemy.active || bullet.hitEnemyIds.has(enemy.enemyId)) {
            return;
          }

          bullet.hitEnemyIds.add(enemy.enemyId);
          const damageDealt = Math.min(enemy.hp, bullet.damage);
          enemy.hp -= bullet.damage;
          this.damageDealt += damageDealt;
          this.shotsHit += 1;
          this.flashEnemy(enemy);

          if (enemy.hp <= 0) {
            this.emitBurst(
              enemy.x,
              enemy.y,
              enemy.baseFillColor,
              enemy.kind === "crawler" ? 8 : enemy.kind === "elite-drone" ? 12 : 10,
            );
            enemy.shadow?.destroy();
            enemy.destroy();
            this.kills += 1;
            this.score += enemy.scoreValue;
          }

          if (bullet.pierceRemaining > 0) {
            bullet.pierceRemaining -= 1;
          } else {
            bullet.destroy();
          }

          this.emitHud(true);
        }

        private handleEnemyBulletPlayerOverlap(
          bulletObject: unknown,
          playerObject: unknown,
        ) {
          const bullet = bulletObject as BulletSprite;

          if (!bullet.active || !playerObject) {
            return;
          }

          bullet.destroy();
          this.applyPlayerDamage(
            bullet.damage,
            bullet.damageSource === "elite_drone_projectile"
              ? "elite_drone_projectile"
              : bullet.damageSource === "drone_projectile"
                ? "drone_projectile"
                : bullet.damageSource === "boss_projectile"
                  ? "boss_projectile"
                  : "enemy_projectile",
          );
        }

        private handlePlayerEnemyOverlap(
          playerObject: unknown,
          enemyObject: unknown,
        ) {
          const enemy = enemyObject as EnemySprite;
          const time = this.time.now;

          if (
            !playerObject ||
            this.raidStatus !== "running" ||
            enemy.kind !== "crawler" ||
            time - this.lastContactDamageAt < RAID_CRAWLER.contactCooldownMs
          ) {
            return;
          }

          this.lastContactDamageAt = time;
          this.applyPlayerDamage(RAID_CRAWLER.damage, "crawler_contact");
        }

        private applyPlayerDamage(
          rawDamage: number | undefined,
          source: PlayerDamageSource,
        ) {
          if (!this.isRaidLive()) {
            return;
          }

          // Undefined projectile damage must never turn HP into NaN.
          const damage = this.getSafeIncomingDamage(rawDamage, source);
          const currentHp = Number.isFinite(this.hp)
            ? this.getClampedHp(this.hp, 0)
            : this.getSafeMaxHp();
          const actualDamage = Math.min(currentHp, damage);

          this.damageTaken += actualDamage;
          this.hp = Math.max(0, currentHp - actualDamage);
          this.cameras.main.flash(90, 255, 82, 48, false);
          this.cameras.main.shake(85, 0.003);
          this.player.setFillStyle(0xff8f6b, 1);
          this.playerShadow.setFillStyle(0x2b0805, 0.42);
          this.emitBurst(this.player.x, this.player.y, 0xff8f6b, 6);
          this.time.delayedCall(90, () => {
            if (this.player.active) {
              this.player.setFillStyle(0x2afcdb, 1);
              this.playerShadow.setFillStyle(0x000000, 0.3);
            }
          });

          if (this.hp <= 0) {
            this.endRaid();
          } else {
            this.emitHud(true);
          }
        }

        private checkRoomClear() {
          if (this.raidStatus !== "running" || this.enemies.countActive(true) > 0) {
            return;
          }

          const room = this.getCurrentRoom();
          this.ensurePlayerBody()?.setVelocity(0, 0);
          this.clearProjectiles();
          this.roomsCleared = Math.max(this.roomsCleared, room.number);

          if (room.hasReward) {
            this.enterRewardDraft();
            return;
          }

          if (room.id === "surge-chamber") {
            this.spawnPortal("boss");
          }
        }

        private applyUpgradeEffect(upgradeId: UpgradeId) {
          const upgrade = getUpgradeById(upgradeId);

          if (upgradeId === "overclocked-barrel") {
            this.fireRateMultiplier = Math.max(0.4, this.fireRateMultiplier * 0.8);
          } else if (upgradeId === "reinforced-armor") {
            this.maxHp += 25;
            this.hp = Math.min(this.maxHp, this.hp + 25);
          } else if (upgradeId === "emergency-dash") {
            this.dashCooldownMultiplier = Math.max(0.42, this.dashCooldownMultiplier * 0.8);
          } else if (upgradeId === "piercing-pulse") {
            this.bulletPierceBonus = Math.max(this.bulletPierceBonus, 1);
          } else if (upgradeId === "stabilizer-core") {
            this.hp = Math.min(this.maxHp, this.hp + 20);
          } else if (upgradeId === "critical-firmware") {
            this.critChance = Math.min(0.35, this.critChance + 0.15);
          }

          if (!this.selectedUpgrades.some((entry) => entry.id === upgrade.id)) {
            this.selectedUpgrades = [...this.selectedUpgrades, upgrade];
          }
        }

        private enterBossEntry() {
          this.clearPortal();
          this.raidStatus = "boss-entry";
          this.statusText = "BLACKOUT CORE DETECTED. Final threat inbound.";
          this.clearRoomEventModifiers(false);
          this.showStateText(
            "BLACKOUT CORE DETECTED",
            "Final threat inbound. Corrupted chamber is destabilizing.",
          );
          this.cameras.main.shake(260, 0.008);
          onRewardOffer(null);
          this.emitHud(true);
          this.time.delayedCall(1700, () => {
            if (this.raidStatus === "boss-entry") {
              this.startBossFight();
            }
          });
        }

        private startBossFight() {
          this.clearStateOverlay();
          this.clearProjectiles();
          this.raidStatus = "boss";
          this.statusText = "The Blackout Core is online. Phase 1: Detection.";
          this.bossPhase = 1;
          this.bossMode = "sniper";
          this.bossModeHistory = ["sniper"];
          this.nextBossAttackAt = this.time.now + 750;
          this.nextBossSummonAt = this.time.now + RAID_BOSS.summonCooldownMs;
          this.nextBossShockwaveAt = this.time.now + RAID_BOSS.shockwaveCooldownMs;
          this.bossAttackCounter = 0;
          this.bossFightStartedAt = this.time.now;

          this.bossAura = this.add.graphics();
          const bossShadow = this.add.ellipse(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 + 22,
            124,
            46,
            0x000000,
            0.36,
          );
          bossShadow.setDepth(3);
          this.boss = this.add.circle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            RAID_BOSS.radius,
            0x4a0808,
            1,
          ) as BossSprite;
          this.boss.setStrokeStyle(5, 0xff5a1f, 0.95);
          this.boss.setDepth(5);
          this.boss.hp = RAID_BOSS.maxHp;
          this.boss.maxHp = RAID_BOSS.maxHp;
          this.boss.shadow = bossShadow;

          this.physics.add.existing(this.boss);
          this.boss.body.setCircle(RAID_BOSS.radius);
          this.boss.body.setAllowGravity(false);
          this.boss.body.setImmovable(true);
          this.boss.body.setCollideWorldBounds(true);

          this.physics.add.overlap(
            this.playerBullets,
            this.boss,
            this.handlePlayerBulletBossOverlap,
            undefined,
            this,
          );

          this.emitBurst(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 0xff7a44, 14);
          this.cameras.main.flash(180, 255, 120, 72, false);
          this.showTransientStateText(
            "PHASE 1: DETECTION",
            "The Core is reading your movement.",
            1350,
            ["boss"],
          );
          this.emitPhasePulse(0xff7d38, 0.24);
          this.emitHud(true);
        }

        private clearRoomEventModifiers(keepSurgeEffects: boolean) {
          if (keepSurgeEffects) {
            return;
          }

          this.roomEventModifier = null;
          this.roomEnemySpeedMultiplier = 1;
          this.roomBulletDamageMultiplier = 1;
          this.roomDashCooldownMultiplier = 1;
          this.lowVisibilityOverlay?.clear();
        }

        private updateBoss(time: number) {
          if (this.raidStatus !== "boss" || !this.boss?.active) {
            return;
          }

          this.updateBossVisuals(time);
          this.updateBossPhase();
          this.updateBossContact(time);

          if (time >= this.nextBossAttackAt) {
            this.executeBossAttack(time);
          }

          if (time >= this.nextBossSummonAt) {
            this.bossSummonMinions();
            this.nextBossSummonAt =
              time + (this.bossPhase === 3 ? 3900 : RAID_BOSS.summonCooldownMs);
          }

          if (this.bossPhase === 3 && time >= this.nextBossShockwaveAt) {
            this.startShockwave();
            this.nextBossShockwaveAt = time + RAID_BOSS.shockwaveCooldownMs;
          }
        }

        private updateBossVisuals(time: number) {
          if (!this.boss || !this.bossAura) {
            return;
          }

          const pulse = 1 + Math.sin(time / 145) * 0.055;
          this.boss.setScale(pulse);
          this.boss.rotation += 0.012;
          this.boss.shadow?.setScale(1 + Math.sin(time / 220) * 0.04, 1);
          this.bossAura.clear();
          this.bossAura.lineStyle(3, 0xff5a1f, 0.24);
          this.bossAura.strokeCircle(
            this.boss.x,
            this.boss.y,
            RAID_BOSS.radius + 18 + Math.sin(time / 180) * 6,
          );
          this.bossAura.lineStyle(2, 0xffb347, 0.18);
          this.bossAura.strokeCircle(
            this.boss.x,
            this.boss.y,
            RAID_BOSS.radius + 34 + Math.cos(time / 220) * 8,
          );
        }

        private updateBossPhase() {
          if (!this.boss || !this.bossPhase) {
            return;
          }

          const hpRatio = this.boss.hp / this.boss.maxHp;

          if (this.bossPhase === 1 && hpRatio <= 0.7) {
            this.transitionBossPhase(2, getFallbackBossMode(2));
          } else if (this.bossPhase === 2 && hpRatio <= 0.35) {
            this.transitionBossPhase(3, getFallbackBossMode(3));
          }
        }

        private transitionBossPhase(phase: 2 | 3, mode: BossMode) {
          this.bossPhase = phase;
          this.bossMode = mode;
          this.recordBossMode(mode);
          this.cameras.main.shake(320, 0.01);
          this.emitPhasePulse(0xff7d38, phase === 3 ? 0.3 : 0.22);

          if (phase === 2) {
            this.statusText = "The Core is adapting to your attack pattern.";
            this.showTransientStateText(
              "PHASE 2: ADAPTATION",
              "The Core is adapting to your attack pattern.",
              1700,
              ["boss"],
            );
            this.nextBossSummonAt = this.time.now + 1200;
          } else {
            this.statusText = "BLACKOUT CORE entered overload. Survive the final surge.";
            this.showTransientStateText(
              "PHASE 3: OVERLOAD",
              "BLACKOUT CORE entered overload. Survive the final surge.",
              1750,
              ["boss"],
            );
            this.startShockwave();
            this.nextBossSummonAt = this.time.now + 850;
          }

          onBossPhaseRequest(phase, this.buildBossPhaseRequest(mode));
          this.emitHud(true);
        }

        private applyBossPhaseDirective(selection: BossPhaseSelection) {
          if (
            this.raidStatus !== "boss" ||
            this.bossPhase !== selection.phase ||
            !this.boss?.active
          ) {
            return;
          }

          this.bossMode = selection.directive.bossMode;
          this.recordBossMode(selection.directive.bossMode);
          this.statusText = selection.directive.message;
          this.emitPhasePulse(0xffb347, 0.18);
          this.showTransientStateText(
            selection.directive.phaseTitle.toUpperCase(),
            selection.directive.message,
            1750,
            ["boss"],
          );
          this.cameras.main.shake(180, 0.006);
          this.emitHud(true);
        }

        private buildBossPhaseRequest(currentMode: BossMode): BossPhaseRequest {
          const bossHpPercent = this.boss
            ? Math.round((this.boss.hp / this.boss.maxHp) * 100)
            : 0;
          const accuracyEstimate =
            this.shotsFired > 0 ? Math.min(1, this.shotsHit / this.shotsFired) : 0;

          return {
            accuracyEstimate: Math.round(accuracyEstimate * 100) / 100,
            bossHpPercent,
            currentMode,
            damageDealt: Math.round(this.damageDealt),
            damageTaken: this.damageTaken,
            fightDurationSeconds: Math.max(
              0,
              Math.round((this.time.now - this.bossFightStartedAt) / 1000),
            ),
            kills: this.kills,
            playerHp: this.getClampedHp(this.hp, 0),
          };
        }

        private recordBossMode(mode: BossMode) {
          const lastMode = this.bossModeHistory[this.bossModeHistory.length - 1];

          if (lastMode !== mode) {
            this.bossModeHistory = [...this.bossModeHistory, mode];
          }
        }

        private emitPhasePulse(color: number, alpha: number) {
          if (!this.pulseLayer) {
            return;
          }

          const originX = this.boss?.x ?? RAID_GAME_WIDTH / 2;
          const originY = this.boss?.y ?? RAID_GAME_HEIGHT / 2;
          const pulse = { radius: (this.boss ? RAID_BOSS.radius : 80) + 12, alpha };

          this.tweens.add({
            alpha: 0,
            duration: 420,
            radius: 260,
            targets: pulse,
            onUpdate: () => {
              if (!this.pulseLayer) {
                return;
              }

              this.pulseLayer.clear();
              this.pulseLayer.lineStyle(4, color, pulse.alpha);
              this.pulseLayer.strokeCircle(originX, originY, pulse.radius);
              this.pulseLayer.lineStyle(1, 0xffffff, pulse.alpha * 0.5);
              this.pulseLayer.strokeCircle(originX, originY, pulse.radius - 16);
            },
            onComplete: () => this.pulseLayer?.clear(),
          });
        }

        private executeBossAttack(time: number) {
          this.bossAttackCounter += 1;

          if (this.bossPhase === 1) {
            this.bossAimedShot();

            if (this.bossAttackCounter % 5 === 0) {
              this.bossSummonMinions(1, 0, 0);
            }
          } else if (this.bossPhase === 2) {
            this.executeModeAttack(2);
          } else {
            this.executeModeAttack(3);
          }

          this.nextBossAttackAt = time + this.getBossAttackCadence();
        }

        private executeModeAttack(phase: 2 | 3) {
          const isOverload = phase === 3;

          if (this.bossMode === "summoner") {
            if (this.bossAttackCounter % (isOverload ? 2 : 3) === 0) {
              this.bossSummonMinions(2, 1, isOverload ? 1 : 0);
            } else {
              this.bossAimedShot(isOverload ? 3 : 2);
            }
            return;
          }

          if (this.bossMode === "bullet_hell") {
            if (this.bossAttackCounter % 2 === 0) {
              this.bossRadialBurst(
                isOverload ? 20 : 14,
                RAID_BOSS.radialShotSpeed + 35,
              );
            } else {
              this.bossAimedShot(isOverload ? 3 : 2);
            }
            return;
          }

          if (this.bossMode === "sniper") {
            this.bossAimedShot(isOverload ? 4 : 3);
            return;
          }

          if (this.bossMode === "hunter" || this.bossMode === "berserker") {
            if (this.bossAttackCounter % (this.bossMode === "berserker" ? 3 : 5) === 0) {
              this.startShockwave();
            }

            this.bossAimedShot(isOverload ? 3 : 2);
            return;
          }

          if (this.bossMode === "shield_core") {
            if (this.bossAttackCounter % 4 === 0) {
              this.bossSummonMinions(1, isOverload ? 2 : 1, 0);
            } else {
              this.bossRadialBurst(isOverload ? 16 : 10, RAID_BOSS.radialShotSpeed);
            }
            return;
          }

          this.bossAimedShot(isOverload ? 3 : 2);
        }

        private getBossAttackCadence() {
          const modeAdjustment =
            this.bossMode === "berserker" || this.bossMode === "bullet_hell"
              ? -90
              : this.bossMode === "sniper"
                ? 110
                : 0;

          if (this.bossPhase === 3) {
            return Math.max(420, RAID_BOSS.phaseThreeAttackMs + modeAdjustment);
          }

          if (this.bossPhase === 2) {
            return Math.max(560, RAID_BOSS.phaseTwoAttackMs + modeAdjustment);
          }

          return RAID_BOSS.phaseOneAttackMs;
        }

        private bossAimedShot(count = 1) {
          if (!this.boss) {
            return;
          }

          const target = this.getClosestCombatTarget(this.boss.x, this.boss.y);

          if (!target) {
            return;
          }

          const baseAngle = PhaserLib.Math.Angle.Between(
            this.boss.x,
            this.boss.y,
            target.x,
            target.y,
          );
          const spread =
            count === 1
              ? [0]
              : count === 2
                ? [-0.12, 0.12]
                : count === 3
                  ? [-0.18, 0, 0.18]
                  : [-0.24, -0.08, 0.08, 0.24];

          spread.forEach((offset) => {
            const angle = baseAngle + offset;
            this.spawnBullet({
              angle,
              damage: RAID_BOSS.aimedShotDamage,
              damageSource: "boss_projectile",
              owner: "boss",
              pierceRemaining: 0,
              projectileRadius: RAID_ENEMY_BULLET.radius,
              projectileShape: "orb",
              speed: RAID_BOSS.aimedShotSpeed,
              tint: 0xff5b39,
              trailLength: 24,
              x: this.boss!.x + Math.cos(angle) * (RAID_BOSS.radius + 12),
              y: this.boss!.y + Math.sin(angle) * (RAID_BOSS.radius + 12),
            });
          });
        }

        private bossRadialBurst(count = 14, speed = RAID_BOSS.radialShotSpeed) {
          if (!this.boss) {
            return;
          }

          this.cameras.main.shake(100, 0.004);

          for (let index = 0; index < count; index += 1) {
            const angle = (Math.PI * 2 * index) / count + this.bossAttackCounter * 0.08;

            this.spawnBullet({
              angle,
              damage: RAID_BOSS.radialShotDamage,
              damageSource: "boss_projectile",
              owner: "boss",
              pierceRemaining: 0,
              projectileRadius: RAID_ENEMY_BULLET.radius,
              projectileShape: "orb",
              speed,
              tint: 0xff6a3d,
              trailLength: 22,
              x: this.boss.x + Math.cos(angle) * (RAID_BOSS.radius + 8),
              y: this.boss.y + Math.sin(angle) * (RAID_BOSS.radius + 8),
            });
          }
        }

        private bossSummonMinions(crawlers = 2, drones = 0, eliteDrones = 0) {
          const room = RAID_ROOMS[3];

          for (let index = 0; index < crawlers; index += 1) {
            this.spawnCrawler(this.nextEnemyId + index, room);
          }

          for (let index = 0; index < drones; index += 1) {
            this.spawnDrone(this.nextEnemyId + index + 19, room);
          }

          for (let index = 0; index < eliteDrones; index += 1) {
            this.spawnEliteDrone(this.nextEnemyId + index + 33, room);
          }

          this.statusText =
            this.bossPhase === 3
              ? "Overload surge: more hostiles entering the chamber."
              : "The Core is summoning corrupted defenders.";
          this.emitHud(true);
        }

        private startShockwave() {
          if (!this.boss) {
            return;
          }

          const ring = this.add.graphics();
          this.activeShockwave = {
            damagedPlayer: false,
            durationMs: 1320,
            maxRadius: 310,
            ring,
            startedAt: this.time.now,
          };
          this.statusText = "Shockwave warning: move away from the Core.";
          this.cameras.main.shake(100, 0.003);
        }

        private updateShockwave(time: number) {
          if (!this.activeShockwave || !this.boss?.active) {
            return;
          }

          const progress = Math.min(
            1,
            (time - this.activeShockwave.startedAt) / this.activeShockwave.durationMs,
          );
          const radius = RAID_BOSS.radius + progress * this.activeShockwave.maxRadius;
          const shockwaveDurationMs = this.activeShockwave.durationMs;

          this.activeShockwave.ring.clear();
          this.activeShockwave.ring.lineStyle(7, 0xffb347, 0.82 - progress * 0.42);
          this.activeShockwave.ring.strokeCircle(this.boss.x, this.boss.y, radius);
          this.activeShockwave.ring.lineStyle(2, 0xff2d1f, 0.64);
          this.activeShockwave.ring.strokeCircle(
            this.boss.x,
            this.boss.y,
            Math.max(0, radius - 26),
          );

          if (progress < 0.2) {
            this.activeShockwave.ring.lineStyle(3, 0xffffff, 0.24);
            this.activeShockwave.ring.strokeCircle(
              this.boss.x,
              this.boss.y,
              RAID_BOSS.radius + 16,
            );
          }

          const playerDistance = PhaserLib.Math.Distance.Between(
            this.boss.x,
            this.boss.y,
            this.player.x,
            this.player.y,
          );

          if (
            !this.activeShockwave.damagedPlayer &&
            playerDistance <= radius &&
            playerDistance >= radius - 38
          ) {
            this.activeShockwave.damagedPlayer = true;
            this.applyPlayerDamage(RAID_BOSS.shockwaveDamage, "boss_shockwave");
          }

          if (this.isHostClient()) {
            this.remotePlayers.forEach((player) => {
              if (
                player.hp <= 0 ||
                player.roomNumber !== this.getCurrentRoom().number ||
                time - player.lastSeenAt > 2500
              ) {
                return;
              }

              const distance = PhaserLib.Math.Distance.Between(
                this.boss!.x,
                this.boss!.y,
                player.x,
                player.y,
              );

              if (
                distance <= radius &&
                distance >= radius - 38 &&
                time - player.lastContactDamageAt >= shockwaveDurationMs
              ) {
                player.lastContactDamageAt = time;
                this.applyRemotePlayerDamage(
                  player.playerId,
                  RAID_BOSS.shockwaveDamage,
                  "boss_shockwave",
                );
              }
            });
          }

          if (progress >= 1) {
            this.activeShockwave.ring.destroy();
            this.activeShockwave = null;
          }
        }

        private updateBossContact(time: number) {
          if (!this.boss?.active) {
            return;
          }

          const distance = PhaserLib.Math.Distance.Between(
            this.boss.x,
            this.boss.y,
            this.player.x,
            this.player.y,
          );

          if (
            distance <= RAID_BOSS.radius + RAID_PLAYER.radius &&
            time - this.lastBossContactDamageAt >= RAID_BOSS.contactCooldownMs
          ) {
            this.lastBossContactDamageAt = time;
            this.applyPlayerDamage(RAID_BOSS.contactDamage, "boss_contact");
          }

          if (this.isHostClient()) {
            this.remotePlayers.forEach((player) => {
              if (
                player.hp <= 0 ||
                player.roomNumber !== this.getCurrentRoom().number ||
                time - player.lastSeenAt > 2500
              ) {
                return;
              }

              const remoteDistance = PhaserLib.Math.Distance.Between(
                this.boss!.x,
                this.boss!.y,
                player.x,
                player.y,
              );

              if (
                remoteDistance <= RAID_BOSS.radius + RAID_PLAYER.radius &&
                time - player.lastContactDamageAt >= RAID_BOSS.contactCooldownMs
              ) {
                player.lastContactDamageAt = time;
                this.applyRemotePlayerDamage(
                  player.playerId,
                  RAID_BOSS.contactDamage,
                  "boss_contact",
                );
              }
            });
          }
        }

        private handlePlayerBulletBossOverlap(
          bulletObject: unknown,
          bossObject: unknown,
        ) {
          const bullet = bulletObject as BulletSprite;
          const boss = bossObject as BossSprite;

          if (!bullet.active || !boss.active || this.raidStatus !== "boss") {
            return;
          }

          const damageDealt = Math.min(boss.hp, bullet.damage);
          boss.hp = Math.max(0, boss.hp - bullet.damage);
          this.damageDealt += damageDealt;
          this.shotsHit += 1;
          boss.setFillStyle(0x8a1d12, 1);
          this.time.delayedCall(60, () => {
            if (boss.active) {
              boss.setFillStyle(0x4a0808, 1);
            }
          });
          bullet.destroy();

          if (boss.hp <= 0) {
            this.defeatBoss();
          } else {
            this.emitHud(true);
          }
        }

        private defeatBoss() {
          if (!this.boss) {
            return;
          }

          const bossX = this.boss.x;
          const bossY = this.boss.y;
          const bossShadow = this.boss.shadow;
          this.raidStatus = "victory";
          this.statusText = "Core destroyed. Raid complete.";
          this.roomsCleared = RAID_ROOMS.length;
          this.score += 2500;
          this.emitBurst(bossX, bossY, 0xffb347, 20);
          this.boss.destroy();
          bossShadow?.destroy();
          this.boss = undefined;
          this.bossAura?.destroy();
          this.bossAura = undefined;
          this.clearEnemyShadows();
          this.enemies.clear(true, true);
          this.clearProjectiles();
          this.activeShockwave?.ring.destroy();
          this.activeShockwave = null;
          this.cameras.main.shake(420, 0.012);
          this.cameras.main.flash(170, 255, 190, 120, false);
          this.showStateText("CORE DESTROYED", "Victory. Press R or use Restart Raid.");
          this.emitHud(true);
          this.reportRaidEnd("victory");
        }

        private endRaid() {
          if (this.raidStatus === "operator-down" || this.raidStatus === "victory") {
            return;
          }

          this.raidStatus = "operator-down";
          this.statusText = "Operator down. Raid failed.";
          this.hp = 0;
          this.dashUntil = 0;
          this.ensurePlayerBody()?.setVelocity(0, 0);
          this.player.setFillStyle(0x3b0b0b, 1);
          this.player.setStrokeStyle(3, 0xff5a1f, 0.95);
          this.bossAura?.clear();
          this.boss?.shadow?.setFillStyle(0x000000, 0.2);
          this.clearProjectiles();
          this.activeShockwave?.ring.destroy();
          this.activeShockwave = null;
          this.showStateText("OPERATOR DOWN", "Press R or use Restart Raid.");
          onRewardOffer(null);
          this.emitHud(true);
          this.reportRaidEnd("wipeout");
        }

        private reportRaidEnd(result: RaidEndReport["result"]) {
          if (this.raidEndReported) {
            return;
          }

          this.raidEndReported = true;
          onRaidEnd({
            bossModeHistory: this.bossModeHistory,
            damageTaken: this.damageTaken,
            finalWeapon: this.currentWeapon.name,
            kills: this.kills,
            result,
            roomsCleared: this.roomsCleared,
            score: this.score,
            upgrades: this.selectedUpgrades.map((upgrade) => upgrade.name),
          });
        }

        private clearEnemyProjectiles() {
          this.enemyBullets?.clear(true, true);
        }

        private clearProjectiles() {
          this.playerBullets?.clear(true, true);
          this.clearEnemyProjectiles();
          this.trailLayer?.clear();
          this.pulseLayer?.clear();
        }

        private clearEnemyShadows() {
          this.enemies?.getChildren().forEach((enemyObject: GameObject) => {
            const enemy = enemyObject as EnemySprite;
            enemy.shadow?.destroy();
          });
        }

        private clearRoomCombat() {
          this.clearProjectiles();
          this.clearEnemyShadows();
          this.enemies?.clear(true, true);
        }

        private clearPortal() {
          if (!this.activePortal) {
            return;
          }

          this.activePortal.shadow?.destroy();
          this.activePortal.aura?.destroy();
          this.activePortal.label?.destroy();
          this.activePortal.destroy();
          this.activePortal = undefined;
          this.portalEnterLocked = false;
        }

        private renderPortalPulse(time: number) {
          if (!this.activePortal?.active || !this.activePortal.aura) {
            return;
          }

          const portal = this.activePortal;
          const aura = portal.aura;

          if (!aura) {
            return;
          }

          const pulse = 1 + Math.sin(time / 160) * 0.08;
          const alpha = portal.kind === "boss" ? 0.26 : 0.22;
          const baseColor = portal.kind === "boss" ? 0xff6f3a : 0x58f3ff;

          portal.setScale(pulse);
          portal.shadow?.setScale(1 + Math.sin(time / 220) * 0.04, 1);
          aura.clear();
          aura.lineStyle(4, baseColor, alpha);
          aura.strokeCircle(portal.x, portal.y, 54 + Math.sin(time / 180) * 5);
          aura.lineStyle(2, 0xffffff, alpha * 0.5);
          aura.strokeCircle(portal.x, portal.y, 36 + Math.cos(time / 210) * 4);
        }

        private showStateText(title: string, subtitle: string) {
          this.clearStateOverlay();
          this.overlaySequence += 1;
          const panel = this.add.rectangle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            520,
            164,
            0x080c12,
            0.9,
          );
          const titleText = this.add
            .text(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2 - 28, title, {
              color: "#ffb347",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "30px",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          const subtitleText = this.add
            .text(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2 + 28, subtitle, {
              align: "center",
              color: "#c8f7ff",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "16px",
              wordWrap: { width: 440 },
            })
            .setOrigin(0.5);
          panel.setDepth(19);
          titleText.setDepth(20);
          subtitleText.setDepth(20);
          this.stateOverlayObjects = [panel, titleText, subtitleText];
        }

        private showTransientStateText(
          title: string,
          subtitle: string,
          durationMs: number,
          allowedStatuses: RaidStatus[],
        ) {
          this.showStateText(title, subtitle);
          const overlayId = this.overlaySequence;

          this.time.delayedCall(durationMs, () => {
            if (
              this.overlaySequence === overlayId &&
              allowedStatuses.includes(this.raidStatus)
            ) {
              this.clearStateOverlay();
            }
          });
        }

        private clearStateOverlay() {
          this.stateOverlayObjects.forEach((gameObject) => gameObject.destroy());
          this.stateOverlayObjects = [];
        }

        private syncVisualEffects() {
          this.playerShadow.setPosition(this.player.x, this.player.y + 15);
          this.playerShadow.setScale(this.time.now < this.dashUntil ? 0.78 : 1);

          this.enemies.getChildren().forEach((enemyObject: GameObject) => {
            const enemy = enemyObject as EnemySprite;

            if (!enemy.active || !enemy.shadow) {
              return;
            }

            enemy.shadow.setPosition(enemy.x, enemy.y + 14);
          });

          this.remotePlayers.forEach((player) => {
            if (!player.active) {
              return;
            }

            player.shadow?.setPosition(player.x, player.y + 15);
            player.nicknameLabel?.setPosition(player.x, player.y - 26);
          });

          if (this.boss?.active && this.boss.shadow) {
            this.boss.shadow.setPosition(this.boss.x, this.boss.y + 22);
          }
        }

        private renderProjectileTrails() {
          this.trailLayer.clear();

          const drawTrail = (bullet: BulletSprite) => {
            if (!bullet.active) {
              return;
            }

            const velocity = bullet.body.velocity;
            const magnitude = Math.hypot(velocity.x, velocity.y);

            if (magnitude < 1) {
              return;
            }

            const alpha = bullet.owner === "player" ? 0.34 : 0.28;
            const directionX = velocity.x / magnitude;
            const directionY = velocity.y / magnitude;

            this.trailLayer.lineStyle(
              bullet.bulletShape === "rail" ? 4 : 3,
              bullet.trailColor,
              alpha,
            );
            this.trailLayer.beginPath();
            this.trailLayer.moveTo(bullet.x, bullet.y);
            this.trailLayer.lineTo(
              bullet.x - directionX * bullet.trailLength,
              bullet.y - directionY * bullet.trailLength,
            );
            this.trailLayer.strokePath();
          };

          this.playerBullets.getChildren().forEach((bulletObject: GameObject) => {
            drawTrail(bulletObject as BulletSprite);
          });
          this.enemyBullets.getChildren().forEach((bulletObject: GameObject) => {
            drawTrail(bulletObject as BulletSprite);
          });
        }

        private renderRoomOverlay() {
          if (!this.lowVisibilityOverlay) {
            return;
          }

          this.lowVisibilityOverlay.clear();

          if (
            this.roomEventModifier !== "LOW_VISIBILITY" ||
            this.getCurrentRoom().id !== "surge-chamber" ||
            (this.raidStatus !== "running" && this.raidStatus !== "portal")
          ) {
            return;
          }

          this.lowVisibilityOverlay.fillStyle(0x010206, 0.18);
          this.lowVisibilityOverlay.fillRect(0, 0, RAID_GAME_WIDTH, RAID_GAME_HEIGHT);
          this.lowVisibilityOverlay.fillStyle(0x010206, 0.2);
          this.lowVisibilityOverlay.fillCircle(0, 0, 240);
          this.lowVisibilityOverlay.fillCircle(RAID_GAME_WIDTH, 0, 240);
          this.lowVisibilityOverlay.fillCircle(0, RAID_GAME_HEIGHT, 240);
          this.lowVisibilityOverlay.fillCircle(
            RAID_GAME_WIDTH,
            RAID_GAME_HEIGHT,
            240,
          );
          this.lowVisibilityOverlay.lineStyle(2, 0xff8b5a, 0.08);
          this.lowVisibilityOverlay.strokeRect(
            RAID_ARENA_PADDING,
            RAID_ARENA_PADDING,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 2,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 2,
          );
        }

        private emitHud(force = false) {
          const time = this.time.now;

          if (!force && time - this.lastHudAt < 120) {
            return;
          }

          this.sanitizeLocalVitals();
          this.lastHudAt = time;
          const room = this.getCurrentRoom();
          const snapshotBoss = this.latestHostSnapshot?.boss;
          const safeMaxHp = this.getSafeMaxHp();
          const safeHp = this.getClampedHp(this.hp, 0);
          const bossHpRaw = this.isGuestClient()
            ? (snapshotBoss?.hp ?? 0)
            : (this.boss?.hp ?? 0);
          const bossHp = Number.isFinite(bossHpRaw) ? Math.max(0, bossHpRaw) : 0;
          const bossPhase = this.isGuestClient()
            ? (snapshotBoss?.phase ?? null)
            : this.bossPhase;
          const bossMode = this.isGuestClient()
            ? (snapshotBoss?.mode ?? null)
            : this.bossMode;
          const enemiesAlive = this.isGuestClient()
            ? (this.latestHostSnapshot?.enemiesAlive ?? 0)
            : (this.enemies?.countActive(true) ?? 0);

          onHudChange({
            bossHp,
            bossMaxHp: RAID_BOSS.maxHp,
            bossMode,
            bossModeHistory: this.bossModeHistory,
            bossPhase,
            currentWeaponId: this.currentWeapon.id,
            currentWeaponName: this.currentWeapon.name,
            damageTaken: this.damageTaken,
            dashCooldownRemainingMs: Math.max(
              0,
              this.getDashCooldownMs() - (time - this.lastDashAt),
            ),
            dashReady: time - this.lastDashAt >= this.getDashCooldownMs(),
            enemiesAlive,
            hp: safeHp,
            kills: this.kills,
            maxHp: safeMaxHp,
            roomName: room.name,
            roomNumber: room.number,
            roomsCleared: this.roomsCleared,
            score: this.score,
            selectedUpgrades: this.selectedUpgrades,
            status: this.raidStatus,
            statusText: this.statusText,
            totalRooms: RAID_ROOMS.length,
            totalWaves: RAID_ROOMS.length,
            wave: room.number,
          });
        }
      }

      const config: import("phaser").Types.Core.GameConfig = {
        type: PhaserLib.AUTO,
        width: RAID_GAME_WIDTH,
        height: RAID_GAME_HEIGHT,
        parent: mountRef.current,
        backgroundColor: "#02060b",
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
            gravity: { x: 0, y: 0 },
          },
        },
        scale: {
          mode: PhaserLib.Scale.FIT,
          autoCenter: PhaserLib.Scale.CENTER_BOTH,
        },
        scene: [RaidScene],
      };

      gameRef.current = new PhaserLib.Game(config);
    }

    void bootGame();

    return () => {
      isMounted = false;
      sceneControlsRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [
    multiplayer,
    onAiEventRequest,
    onBossPhaseRequest,
    onHudChange,
    onRaidEnd,
    onRewardOffer,
  ]);

  return <div className="aspect-[960/620] w-full overflow-hidden" ref={mountRef} />;
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}
