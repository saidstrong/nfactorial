"use client";

import { useEffect, useRef } from "react";
import {
  RAID_ARENA_PADDING,
  RAID_BOSS,
  RAID_BULLET,
  RAID_CRAWLER,
  RAID_DRONE,
  RAID_ENEMY_BULLET,
  RAID_GAME_HEIGHT,
  RAID_GAME_WIDTH,
  RAID_PLAYER,
  RAID_WAVES,
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
  BossMode,
  EnemyKind,
  RaidHudState,
  RaidStatus,
  UpgradeId,
  UpgradeOption,
  UpgradeSelection,
} from "@/lib/game/types";
import { getUpgradeById, getUpgradeOffers } from "@/lib/game/upgrades";

type PhaserRuntime = typeof import("phaser");
type ArcadeBody = import("phaser").Physics.Arcade.Body;
type ArcadeGroup = import("phaser").Physics.Arcade.Group;
type GameObject = import("phaser").GameObjects.GameObject;
type Graphics = import("phaser").GameObjects.Graphics;
type KeyboardKey = import("phaser").Input.Keyboard.Key;
type ShadowEllipse = import("phaser").GameObjects.Ellipse;
type PhysicsArc = import("phaser").GameObjects.Arc & { body: ArcadeBody };
type PhysicsRectangle = import("phaser").GameObjects.Rectangle & {
  body: ArcadeBody;
};
type PhysicsEnemy = (PhysicsArc | PhysicsRectangle) & { body: ArcadeBody };

type BulletOwner = "player" | "enemy" | "boss";

type BulletSprite = PhysicsArc & {
  bornAt: number;
  damage: number;
  owner: BulletOwner;
  pierceRemaining: number;
  hitEnemyIds: Set<number>;
  trailColor: number;
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

type BossSprite = PhysicsArc & {
  hp: number;
  maxHp: number;
  shadow?: ShadowEllipse;
};

type ShockwaveState = {
  damagedPlayer: boolean;
  maxRadius: number;
  ring: Graphics;
  startedAt: number;
  durationMs: number;
};

type SceneControls = {
  applyAiEvent: (directive: AiEventDirective) => void;
  applyBossPhaseDirective: (selection: BossPhaseSelection) => void;
  applyUpgrade: (upgradeId: UpgradeId) => void;
};

type PhaserRaidGameProps = {
  aiEventSelection: AiEventSelection | null;
  bossPhaseSelection: BossPhaseSelection | null;
  onAiEventRequest: (request: AiEventRequest) => void;
  onBossPhaseRequest: (phase: 2 | 3, request: BossPhaseRequest) => void;
  onHudChange: (hud: RaidHudState) => void;
  onRaidEnd: (report: RaidEndReport) => void;
  onUpgradeOffer: (upgrades: UpgradeOption[] | null) => void;
  upgradeSelection: UpgradeSelection | null;
};

export function PhaserRaidGame({
  aiEventSelection,
  bossPhaseSelection,
  onAiEventRequest,
  onBossPhaseRequest,
  onHudChange,
  onRaidEnd,
  onUpgradeOffer,
  upgradeSelection,
}: PhaserRaidGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const sceneControlsRef = useRef<SceneControls | null>(null);

  useEffect(() => {
    if (upgradeSelection) {
      sceneControlsRef.current?.applyUpgrade(upgradeSelection.id);
    }
  }, [upgradeSelection]);

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
        private boss?: BossSprite;
        private bossAura?: Graphics;
        private lowVisibilityOverlay?: Graphics;
        private pulseLayer?: Graphics;
        private trailLayer!: Graphics;
        private aimLine!: Graphics;
        private stateOverlayObjects: GameObject[] = [];
        private activeShockwave: ShockwaveState | null = null;
        private keys!: Record<"W" | "A" | "S" | "D" | "SPACE" | "R", KeyboardKey>;
        private hp = RAID_PLAYER.maxHp;
        private maxHp = RAID_PLAYER.maxHp;
        private score = 0;
        private kills = 0;
        private damageTaken = 0;
        private damageDealt = 0;
        private shotsFired = 0;
        private shotsHit = 0;
        private roomsCleared = 0;
        private fireRateMs = RAID_PLAYER.fireRateMs;
        private dashCooldownMs = RAID_PLAYER.dashCooldownMs;
        private bulletDamage = RAID_PLAYER.bulletDamage;
        private bulletPierce = 0;
        private critChance = 0;
        private waveEventModifier: AiEventModifier | null = null;
        private waveEnemySpeedMultiplier = 1;
        private waveBulletDamageMultiplier = 1;
        private waveDashCooldownMultiplier = 1;
        private lastShotAt = 0;
        private lastDashAt = -RAID_PLAYER.dashCooldownMs;
        private dashUntil = 0;
        private lastContactDamageAt = 0;
        private lastHudAt = 0;
        private raidStatus: RaidStatus = "running";
        private statusText = "Wave 1 breach active.";
        private currentWaveIndex = 0;
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
            applyUpgrade: (upgradeId) => this.applyUpgrade(upgradeId),
          };

          this.startWave(0);
        }

        update(time: number) {
          if (this.raidStatus === "operator-down" || this.raidStatus === "victory") {
            if (PhaserLib.Input.Keyboard.JustDown(this.keys.R)) {
              this.scene.restart();
            }

            return;
          }

          if (
            this.raidStatus === "boss-entry" ||
            this.raidStatus === "upgrade" ||
            this.raidStatus === "ai-event"
          ) {
            this.emitHud();
            return;
          }

          this.updatePlayerMovement(time);
          this.updateAimLine();
          this.handleShooting(time);
          this.updateEnemies(time);
          this.updateBoss(time);
          this.updateShockwave(time);
          this.updatePlayerBullets(time);
          this.updateEnemyBullets(time);
          this.syncVisualEffects();
          this.renderProjectileTrails();
          this.renderWaveOverlay();

          if (this.raidStatus === "running") {
            this.checkWaveClear();
          }

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
          this.fireRateMs = RAID_PLAYER.fireRateMs;
          this.dashCooldownMs = RAID_PLAYER.dashCooldownMs;
          this.bulletDamage = RAID_PLAYER.bulletDamage;
          this.bulletPierce = 0;
          this.critChance = 0;
          this.waveEventModifier = null;
          this.waveEnemySpeedMultiplier = 1;
          this.waveBulletDamageMultiplier = 1;
          this.waveDashCooldownMultiplier = 1;
          this.lastShotAt = 0;
          this.lastDashAt = -RAID_PLAYER.dashCooldownMs;
          this.dashUntil = 0;
          this.lastContactDamageAt = 0;
          this.lastHudAt = 0;
          this.raidStatus = "running";
          this.statusText = "Wave 1 breach active.";
          this.currentWaveIndex = 0;
          this.selectedUpgrades = [];
          this.nextEnemyId = 1;
          this.boss = undefined;
          this.bossAura = undefined;
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
          onUpgradeOffer(null);
        }

        private createArena() {
          this.cameras.main.setBackgroundColor("#02060b");

          const grid = this.add.graphics();
          grid.lineStyle(1, 0x123743, 0.38);

          for (let x = RAID_ARENA_PADDING; x <= RAID_GAME_WIDTH; x += 48) {
            grid.lineBetween(x, RAID_ARENA_PADDING, x, RAID_GAME_HEIGHT - RAID_ARENA_PADDING);
          }

          for (let y = RAID_ARENA_PADDING; y <= RAID_GAME_HEIGHT; y += 48) {
            grid.lineBetween(RAID_ARENA_PADDING, y, RAID_GAME_WIDTH - RAID_ARENA_PADDING, y);
          }

          grid.lineStyle(3, 0x2afcdb, 0.55);
          grid.strokeRect(
            RAID_ARENA_PADDING,
            RAID_ARENA_PADDING,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 2,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 2,
          );

          this.add.rectangle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 4,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 4,
            0x06111a,
            0.28,
          );

          const accents = this.add.graphics();
          accents.lineStyle(2, 0x1d5567, 0.2);
          accents.strokeCircle(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 118);
          accents.strokeCircle(RAID_GAME_WIDTH / 2, RAID_GAME_HEIGHT / 2, 220);
          accents.lineBetween(180, 120, 300, 240);
          accents.lineBetween(780, 120, 660, 240);
          accents.lineBetween(180, 500, 300, 380);
          accents.lineBetween(780, 500, 660, 380);
          accents.fillStyle(0x58f3ff, 0.18);
          [
            [162, 104],
            [798, 104],
            [162, 516],
            [798, 516],
            [RAID_GAME_WIDTH / 2, 120],
            [RAID_GAME_WIDTH / 2, 500],
          ].forEach(([x, y]) => {
            accents.fillCircle(x, y, 4);
            accents.fillCircle(x, y, 10);
          });

          this.trailLayer = this.add.graphics();
          this.trailLayer.setDepth(2);
          this.aimLine = this.add.graphics();
          this.aimLine.setDepth(6);
          this.pulseLayer = this.add.graphics();
          this.pulseLayer.setDepth(8);
          this.lowVisibilityOverlay = this.add.graphics();
          this.lowVisibilityOverlay.setDepth(20);
        }

        private createPlayer() {
          this.playerShadow = this.add.ellipse(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 + 15,
            34,
            16,
            0x000000,
            0.3,
          );
          this.playerShadow.setDepth(3);
          this.player = this.add.circle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            RAID_PLAYER.radius,
            0x2afcdb,
            1,
          ) as PhysicsArc;
          this.player.setStrokeStyle(3, 0xdffcff, 0.9);
          this.player.setDepth(5);

          this.physics.add.existing(this.player);
          this.player.body.setCircle(RAID_PLAYER.radius);
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setAllowGravity(false);
          this.player.body.setMaxVelocity(RAID_PLAYER.dashSpeed);
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

            const trailLength = bullet.owner === "boss" ? 22 : 16;
            const alpha = bullet.owner === "player" ? 0.34 : 0.28;
            const directionX = velocity.x / magnitude;
            const directionY = velocity.y / magnitude;

            this.trailLayer.lineStyle(3, bullet.trailColor, alpha);
            this.trailLayer.beginPath();
            this.trailLayer.moveTo(bullet.x, bullet.y);
            this.trailLayer.lineTo(
              bullet.x - directionX * trailLength,
              bullet.y - directionY * trailLength,
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

        private renderWaveOverlay() {
          if (!this.lowVisibilityOverlay) {
            return;
          }

          this.lowVisibilityOverlay.clear();

          if (
            this.waveEventModifier !== "LOW_VISIBILITY" ||
            this.currentWaveIndex !== 2 ||
            this.raidStatus !== "running"
          ) {
            return;
          }

          this.lowVisibilityOverlay.fillStyle(0x010206, 0.15);
          this.lowVisibilityOverlay.fillRect(0, 0, RAID_GAME_WIDTH, RAID_GAME_HEIGHT);
          this.lowVisibilityOverlay.fillStyle(0x010206, 0.18);
          this.lowVisibilityOverlay.fillCircle(0, 0, 220);
          this.lowVisibilityOverlay.fillCircle(RAID_GAME_WIDTH, 0, 220);
          this.lowVisibilityOverlay.fillCircle(0, RAID_GAME_HEIGHT, 220);
          this.lowVisibilityOverlay.fillCircle(
            RAID_GAME_WIDTH,
            RAID_GAME_HEIGHT,
            220,
          );
          this.lowVisibilityOverlay.lineStyle(2, 0x58f3ff, 0.08);
          this.lowVisibilityOverlay.strokeRect(
            RAID_ARENA_PADDING,
            RAID_ARENA_PADDING,
            RAID_GAME_WIDTH - RAID_ARENA_PADDING * 2,
            RAID_GAME_HEIGHT - RAID_ARENA_PADDING * 2,
          );
        }

        private startWave(waveIndex: number) {
          this.currentWaveIndex = waveIndex;
          this.raidStatus = "running";
          this.statusText = `Wave ${RAID_WAVES[waveIndex].wave} breach active.`;
          this.clearStateOverlay();
          this.player.body.enable = true;
          this.clearEnemyProjectiles();

          const wave = RAID_WAVES[waveIndex];
          const extraDrones =
            waveIndex === 2 && this.waveEventModifier === "DRONE_SWARM" ? 2 : 0;

          for (let index = 0; index < wave.crawlers; index += 1) {
            this.spawnCrawler(index);
          }

          for (let index = 0; index < wave.drones + extraDrones; index += 1) {
            this.spawnDrone(index);
          }

          this.emitHud(true);
        }

        private updatePlayerMovement(time: number) {
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
            this.player.body.setVelocity(move.x, move.y);
          } else {
            this.player.body.setVelocity(0, 0);
          }
        }

        private tryDash(time: number, move: import("phaser").Math.Vector2) {
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
          this.player.body.setVelocity(dashDirection.x, dashDirection.y);
          this.lastDashAt = time;
          this.dashUntil = time + RAID_PLAYER.dashDurationMs;
        }

        private getDashCooldownMs(): number {
          return Math.round(this.dashCooldownMs * this.waveDashCooldownMultiplier);
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
          this.aimLine.lineStyle(3, 0x2afcdb, 0.82);
          this.aimLine.beginPath();
          this.aimLine.moveTo(this.player.x, this.player.y);
          this.aimLine.lineTo(
            this.player.x + Math.cos(angle) * 42,
            this.player.y + Math.sin(angle) * 42,
          );
          this.aimLine.strokePath();
        }

        private handleShooting(time: number) {
          const pointer = this.input.activePointer;

          if (
            !pointer.isDown ||
            !pointer.leftButtonDown() ||
            time - this.lastShotAt < this.fireRateMs
          ) {
            return;
          }

          const angle = PhaserLib.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY,
          );
          const isCritical = this.critChance > 0 && Math.random() < this.critChance;
          const shotDamage = Math.round(this.bulletDamage * this.waveBulletDamageMultiplier);

          this.spawnBullet({
            angle,
            damage: isCritical ? shotDamage * 2 : shotDamage,
            owner: "player",
            pierceRemaining: this.bulletPierce,
            speed: RAID_BULLET.speed,
            x: this.player.x + Math.cos(angle) * 22,
            y: this.player.y + Math.sin(angle) * 22,
          });
          this.shotsFired += 1;
          this.lastShotAt = time;
        }

        private spawnBullet({
          angle,
          damage,
          owner,
          pierceRemaining,
          speed,
          x,
          y,
        }: {
          angle: number;
          damage: number;
          owner: BulletOwner;
          pierceRemaining: number;
          speed: number;
          x: number;
          y: number;
        }) {
          const fillColor =
            owner === "player" ? 0x73f7ff : owner === "boss" ? 0xff3f25 : 0xff6f2d;
          const strokeColor = owner === "player" ? 0xcfffff : 0xffc08a;
          const bullet = this.add.circle(
            x,
            y,
            owner === "player" ? RAID_BULLET.radius : RAID_ENEMY_BULLET.radius,
            fillColor,
            1,
          ) as BulletSprite;
          bullet.setStrokeStyle(2, strokeColor, 0.9);
          bullet.damage = damage;
          bullet.owner = owner;
          bullet.pierceRemaining = pierceRemaining;
          bullet.hitEnemyIds = new Set();
          bullet.bornAt = this.time.now;
          bullet.trailColor = fillColor;
          bullet.setDepth(owner === "player" ? 7 : 6);

          this.physics.add.existing(bullet);
          bullet.body.setCircle(owner === "player" ? RAID_BULLET.radius : RAID_ENEMY_BULLET.radius);
          bullet.body.setAllowGravity(false);
          bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

          if (owner === "player") {
            this.playerBullets.add(bullet);
          } else {
            this.enemyBullets.add(bullet);
          }
        }

        private spawnCrawler(index: number) {
          const { x, y } = this.getEdgeSpawnPoint(index);
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

        private spawnDrone(index: number) {
          const { x, y } = this.getEdgeSpawnPoint(index + 11);
          const shadow = this.add.ellipse(x, y + 16, 32, 16, 0x000000, 0.28);
          shadow.setDepth(3);
          const drone = this.add.rectangle(
            x,
            y,
            RAID_DRONE.radius * 2,
            RAID_DRONE.radius * 2,
            0xb52512,
            1,
          ) as EnemySprite;
          drone.setStrokeStyle(3, 0xffb347, 0.95);
          drone.setDepth(5);
          drone.baseFillColor = 0xb52512;
          drone.baseStrokeColor = 0xffb347;
          drone.enemyId = this.nextEnemyId;
          drone.hp = RAID_DRONE.hp;
          drone.kind = "drone";
          drone.lastShotAt = this.time.now + index * 180;
          drone.scoreValue = RAID_DRONE.scoreValue;
          drone.shadow = shadow;
          drone.speed = Math.round(RAID_DRONE.speed * this.getEnemySpeedMultiplier());
          this.nextEnemyId += 1;

          this.physics.add.existing(drone);
          drone.body.setSize(RAID_DRONE.radius * 2, RAID_DRONE.radius * 2);
          drone.body.setCollideWorldBounds(true);
          drone.body.setAllowGravity(false);
          this.enemies.add(drone);
        }

        private getEnemySpeedMultiplier(): number {
          if (this.raidStatus === "running" && this.currentWaveIndex === 2) {
            return this.waveEnemySpeedMultiplier;
          }

          return 1;
        }

        private getEdgeSpawnPoint(index: number): { x: number; y: number } {
          const edge = index % 4;
          const min = RAID_ARENA_PADDING + 24;
          const maxX = RAID_GAME_WIDTH - RAID_ARENA_PADDING - 24;
          const maxY = RAID_GAME_HEIGHT - RAID_ARENA_PADDING - 24;
          const offset = ((index * 137) % 100) / 100;
          let x = PhaserLib.Math.Linear(min, maxX, offset);
          let y = PhaserLib.Math.Linear(min, maxY, 1 - offset);

          if (edge === 0) {
            y = min;
          } else if (edge === 1) {
            x = maxX;
          } else if (edge === 2) {
            y = maxY;
          } else {
            x = min;
          }

          return { x, y };
        }

        private updateEnemies(time: number) {
          this.enemies.getChildren().forEach((enemyObject: GameObject) => {
            const enemy = enemyObject as EnemySprite;

            if (!enemy.active) {
              return;
            }

            if (enemy.kind === "crawler") {
              this.physics.moveToObject(enemy, this.player, enemy.speed);
              return;
            }

            this.updateDrone(enemy, time);
          });
        }

        private updateDrone(drone: EnemySprite, time: number) {
          const distance = PhaserLib.Math.Distance.Between(
            drone.x,
            drone.y,
            this.player.x,
            this.player.y,
          );
          const toPlayer = new PhaserLib.Math.Vector2(
            this.player.x - drone.x,
            this.player.y - drone.y,
          );

          if (distance < RAID_DRONE.retreatDistance && toPlayer.lengthSq() > 0) {
            toPlayer.normalize().scale(-drone.speed);
            drone.body.setVelocity(toPlayer.x, toPlayer.y);
          } else if (distance > RAID_DRONE.preferredDistance && toPlayer.lengthSq() > 0) {
            toPlayer.normalize().scale(drone.speed);
            drone.body.setVelocity(toPlayer.x, toPlayer.y);
          } else {
            drone.body.setVelocity(0, 0);
          }

          drone.rotation += 0.025;

          if (time - drone.lastShotAt >= RAID_DRONE.fireRateMs) {
            this.fireDroneShot(drone);
            drone.lastShotAt = time;
          }
        }

        private fireDroneShot(drone: EnemySprite) {
          const angle = PhaserLib.Math.Angle.Between(
            drone.x,
            drone.y,
            this.player.x,
            this.player.y,
          );

          this.spawnBullet({
            angle,
            damage: RAID_ENEMY_BULLET.damage,
            owner: "enemy",
            pierceRemaining: 0,
            speed: RAID_ENEMY_BULLET.speed,
            x: drone.x + Math.cos(angle) * 20,
            y: drone.y + Math.sin(angle) * 20,
          });
        }

        private updatePlayerBullets(time: number) {
          this.playerBullets.getChildren().forEach((bulletObject: GameObject) => {
            this.destroyExpiredBullet(bulletObject as BulletSprite, time, RAID_BULLET.lifetimeMs);
          });
        }

        private updateEnemyBullets(time: number) {
          this.enemyBullets.getChildren().forEach((bulletObject: GameObject) => {
            this.destroyExpiredBullet(
              bulletObject as BulletSprite,
              time,
              RAID_ENEMY_BULLET.lifetimeMs,
            );
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
            enemy.setStrokeStyle(3, enemy.baseStrokeColor, enemy.kind === "drone" ? 0.95 : 0.85);
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

          if (
            !bullet.active ||
            !enemy.active ||
            bullet.hitEnemyIds.has(enemy.enemyId)
          ) {
            return;
          }

          bullet.hitEnemyIds.add(enemy.enemyId);
          const damageDealt = Math.min(enemy.hp, bullet.damage);
          enemy.hp -= bullet.damage;
          this.damageDealt += damageDealt;
          this.shotsHit += 1;
          this.flashEnemy(enemy);

          if (enemy.hp <= 0) {
            this.emitBurst(enemy.x, enemy.y, enemy.baseFillColor, enemy.kind === "crawler" ? 8 : 10);
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
          this.damagePlayer(bullet.damage);
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
          this.damagePlayer(RAID_CRAWLER.damage);
        }

        private damagePlayer(damage: number) {
          if (this.raidStatus !== "running" && this.raidStatus !== "boss") {
            return;
          }

          const actualDamage = Math.min(this.hp, damage);

          this.damageTaken += actualDamage;
          this.hp = Math.max(0, this.hp - actualDamage);
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

        private checkWaveClear() {
          if (this.raidStatus !== "running" || this.enemies.countActive(true) > 0) {
            return;
          }

          this.player.body.setVelocity(0, 0);
          this.clearProjectiles();
          this.roomsCleared = Math.max(this.roomsCleared, this.currentWaveIndex + 1);

          if (this.currentWaveIndex >= RAID_WAVES.length - 1) {
            this.enterBossEntry();
            return;
          }

          this.enterUpgradeIntermission();
        }

        private enterUpgradeIntermission() {
          this.raidStatus = "upgrade";
          this.statusText = `Wave ${RAID_WAVES[this.currentWaveIndex].wave} cleared. Select an upgrade.`;
          this.showStateText("WAVE CLEARED", "Select one upgrade to continue.");
          const offers = getUpgradeOffers(this.score + this.kills + this.currentWaveIndex * 97);
          onUpgradeOffer(offers);
          this.emitHud(true);
        }

        private applyUpgrade(upgradeId: UpgradeId) {
          if (this.raidStatus !== "upgrade") {
            return;
          }

          const upgrade = getUpgradeById(upgradeId);

          if (upgrade.id === "overclocked-barrel") {
            this.fireRateMs = Math.max(90, Math.round(this.fireRateMs * 0.8));
          } else if (upgrade.id === "reinforced-armor") {
            this.maxHp += 25;
            this.hp = Math.min(this.maxHp, this.hp + 25);
          } else if (upgrade.id === "emergency-dash") {
            this.dashCooldownMs = Math.max(500, Math.round(this.dashCooldownMs * 0.8));
          } else if (upgrade.id === "piercing-pulse") {
            this.bulletPierce = Math.max(this.bulletPierce, 1);
          } else if (upgrade.id === "stabilizer-core") {
            this.hp = Math.min(this.maxHp, this.hp + 20);
          } else if (upgrade.id === "critical-firmware") {
            this.critChance = Math.min(0.35, this.critChance + 0.15);
          }

          this.selectedUpgrades = [...this.selectedUpgrades, upgrade];
          onUpgradeOffer(null);

          const nextWaveIndex = this.currentWaveIndex + 1;

          if (nextWaveIndex === 2) {
            this.enterAiEventIntermission();
          } else {
            this.startWave(nextWaveIndex);
          }
        }

        private enterAiEventIntermission() {
          this.raidStatus = "ai-event";
          this.statusText = "AI Director analyzing Wave 3 breach conditions.";
          this.player.body.setVelocity(0, 0);
          this.clearProjectiles();
          this.showStateText(
            "AI DIRECTOR UPLINK",
            "Wave 3 crisis event pending operator confirmation.",
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

          this.waveEventModifier = directive.modifier;
          this.waveEnemySpeedMultiplier = directive.modifier === "POWER_SURGE" ? 1.12 : 1;
          this.waveBulletDamageMultiplier =
            directive.modifier === "OVERCHARGED_WEAPONS" ? 1.15 : 1;
          this.waveDashCooldownMultiplier =
            directive.modifier === "SYSTEM_LAG" ? 1.18 : 1;

          if (directive.modifier === "EMERGENCY_CACHE") {
            this.hp = Math.min(this.maxHp, this.hp + 25);
          }

          this.statusText = `${directive.eventTitle}: ${directive.eventText}`;
          this.emitPhasePulse(0xff7d38, 0.22);
          this.showStateText(directive.eventTitle.toUpperCase(), directive.eventText);
          this.time.delayedCall(950, () => {
            if (this.raidStatus === "ai-event") {
              this.startWave(2);
            }
          });
        }

        private enterBossEntry() {
          this.clearWaveEventModifiers();
          this.raidStatus = "boss-entry";
          this.statusText = "BLACKOUT CORE DETECTED. Final threat inbound.";
          this.showStateText(
            "BLACKOUT CORE DETECTED",
            "Final boss entering the arena.",
          );
          this.cameras.main.shake(260, 0.008);
          onUpgradeOffer(null);
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
            120,
            44,
            0x000000,
            0.34,
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

          this.showTransientStateText(
            "PHASE 1: DETECTION",
            "The Core is reading your movement.",
            1350,
          );
          this.emitPhasePulse(0xff7d38, 0.24);
          this.emitHud(true);
        }

        private clearWaveEventModifiers() {
          this.waveEventModifier = null;
          this.waveEnemySpeedMultiplier = 1;
          this.waveBulletDamageMultiplier = 1;
          this.waveDashCooldownMultiplier = 1;
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
          this.bossAura.lineStyle(3, 0xff5a1f, 0.22);
          this.bossAura.strokeCircle(this.boss.x, this.boss.y, RAID_BOSS.radius + 18 + Math.sin(time / 180) * 6);
          this.bossAura.lineStyle(2, 0xffb347, 0.18);
          this.bossAura.strokeCircle(this.boss.x, this.boss.y, RAID_BOSS.radius + 34 + Math.cos(time / 220) * 8);
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
              "The Core is adapting to your attack pattern. Summoner mode activated.",
              1700,
            );
            this.nextBossSummonAt = this.time.now + 1200;
          } else {
            this.statusText = "BLACKOUT CORE entered overload. Survive the final surge.";
            this.showTransientStateText(
              "PHASE 3: OVERLOAD",
              "BLACKOUT CORE entered overload. Survive the final surge.",
              1750,
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
            playerHp: this.hp,
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
              this.bossSummonMinions(1, 0);
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
              this.bossSummonMinions(2, 1);
            } else {
              this.bossAimedShot(isOverload ? 3 : 2);
            }
            return;
          }

          if (this.bossMode === "bullet_hell") {
            if (this.bossAttackCounter % 2 === 0) {
              this.bossRadialBurst(isOverload ? 20 : 14, RAID_BOSS.radialShotSpeed + 35);
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
              this.bossSummonMinions(1, isOverload ? 2 : 1);
            } else {
              this.bossRadialBurst(isOverload ? 16 : 10, RAID_BOSS.radialShotSpeed);
            }
            return;
          }

          this.bossAimedShot(isOverload ? 3 : 2);
        }

        private getBossAttackCadence(): number {
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

          const baseAngle = PhaserLib.Math.Angle.Between(
            this.boss.x,
            this.boss.y,
            this.player.x,
            this.player.y,
          );
          const spread = count === 1 ? [0] : count === 2 ? [-0.12, 0.12] : [-0.18, 0, 0.18];

          spread.forEach((offset) => {
            this.spawnBullet({
              angle: baseAngle + offset,
              damage: RAID_BOSS.aimedShotDamage,
              owner: "boss",
              pierceRemaining: 0,
              speed: RAID_BOSS.aimedShotSpeed,
              x: this.boss!.x + Math.cos(baseAngle + offset) * (RAID_BOSS.radius + 12),
              y: this.boss!.y + Math.sin(baseAngle + offset) * (RAID_BOSS.radius + 12),
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
              owner: "boss",
              pierceRemaining: 0,
              speed,
              x: this.boss.x + Math.cos(angle) * (RAID_BOSS.radius + 8),
              y: this.boss.y + Math.sin(angle) * (RAID_BOSS.radius + 8),
            });
          }
        }

        private bossSummonMinions(crawlers = 2, drones = 0) {
          for (let index = 0; index < crawlers; index += 1) {
            this.spawnCrawler(this.nextEnemyId + index);
          }

          for (let index = 0; index < drones; index += 1) {
            this.spawnDrone(this.nextEnemyId + index + 19);
          }

          this.statusText =
            this.bossPhase === 3
              ? "Overload surge: more hostiles entering the arena."
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

          this.activeShockwave.ring.clear();
          this.activeShockwave.ring.lineStyle(7, 0xffb347, 0.82 - progress * 0.42);
          this.activeShockwave.ring.strokeCircle(this.boss.x, this.boss.y, radius);
          this.activeShockwave.ring.lineStyle(2, 0xff2d1f, 0.64);
          this.activeShockwave.ring.strokeCircle(this.boss.x, this.boss.y, Math.max(0, radius - 26));
          if (progress < 0.2) {
            this.activeShockwave.ring.lineStyle(3, 0xffffff, 0.24);
            this.activeShockwave.ring.strokeCircle(this.boss.x, this.boss.y, RAID_BOSS.radius + 16);
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
            this.damagePlayer(RAID_BOSS.shockwaveDamage);
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
            this.damagePlayer(RAID_BOSS.contactDamage);
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
          this.score += 2500;
          this.emitBurst(bossX, bossY, 0xffb347, 18);
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
          this.cameras.main.flash(150, 255, 190, 120, false);
          this.showStateText("CORE DESTROYED", "Victory. Press R or use Restart Raid.");
          this.emitHud(true);
          this.reportRaidEnd("victory");
        }

        private endRaid() {
          this.raidStatus = "operator-down";
          this.statusText = "Operator down. Raid failed.";
          this.player.body.setVelocity(0, 0);
          this.player.setFillStyle(0x3b0b0b, 1);
          this.player.setStrokeStyle(3, 0xff5a1f, 0.95);
          this.bossAura?.clear();
          this.boss?.shadow?.setFillStyle(0x000000, 0.2);
          this.clearProjectiles();
          this.activeShockwave?.ring.destroy();
          this.activeShockwave = null;
          this.showStateText("OPERATOR DOWN", "Press R or use Restart Raid.");
          onUpgradeOffer(null);
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

        private showStateText(title: string, subtitle: string) {
          this.clearStateOverlay();
          const panel = this.add.rectangle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            500,
            158,
            0x080c12,
            0.9,
          );
          const titleText = this.add.text(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 - 28,
            title,
            {
              color: "#ffb347",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "30px",
              fontStyle: "bold",
            },
          ).setOrigin(0.5);
          const subtitleText = this.add.text(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 + 28,
            subtitle,
            {
              align: "center",
              color: "#c8f7ff",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "16px",
              wordWrap: { width: 430 },
            },
          ).setOrigin(0.5);
          this.stateOverlayObjects = [panel, titleText, subtitleText];
        }

        private showTransientStateText(
          title: string,
          subtitle: string,
          durationMs: number,
        ) {
          this.showStateText(title, subtitle);
          this.time.delayedCall(durationMs, () => {
            if (this.raidStatus === "boss") {
              this.clearStateOverlay();
            }
          });
        }

        private clearStateOverlay() {
          this.stateOverlayObjects.forEach((gameObject) => gameObject.destroy());
          this.stateOverlayObjects = [];
        }

        private emitHud(force = false) {
          const time = this.time.now;

          if (!force && time - this.lastHudAt < 120) {
            return;
          }

          this.lastHudAt = time;
          onHudChange({
            dashCooldownRemainingMs: Math.max(
              0,
              this.getDashCooldownMs() - (time - this.lastDashAt),
            ),
            dashReady: time - this.lastDashAt >= this.getDashCooldownMs(),
            enemiesAlive: this.enemies?.countActive(true) ?? 0,
            damageTaken: this.damageTaken,
            hp: this.hp,
            kills: this.kills,
            maxHp: this.maxHp,
            score: this.score,
            selectedUpgrades: this.selectedUpgrades,
            status: this.raidStatus,
            statusText: this.statusText,
            totalWaves: RAID_WAVES.length,
            wave: RAID_WAVES[this.currentWaveIndex]?.wave ?? RAID_WAVES.length,
            bossHp: this.boss?.hp ?? 0,
            bossMaxHp: RAID_BOSS.maxHp,
            bossPhase: this.bossPhase,
            bossMode: this.bossMode,
            bossModeHistory: this.bossModeHistory,
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
        scene: RaidScene,
      };

      gameRef.current = new PhaserLib.Game(config);
    }

    bootGame();

    return () => {
      isMounted = false;
      sceneControlsRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [
    onAiEventRequest,
    onBossPhaseRequest,
    onHudChange,
    onRaidEnd,
    onUpgradeOffer,
  ]);

  return <div ref={mountRef} className="min-h-[360px] w-full bg-[#02060b]" />;
}
