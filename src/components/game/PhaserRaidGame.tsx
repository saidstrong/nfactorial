"use client";

import { useEffect, useRef } from "react";
import {
  RAID_ARENA_PADDING,
  RAID_BULLET,
  RAID_CRAWLER,
  RAID_DRONE,
  RAID_ENEMY_BULLET,
  RAID_GAME_HEIGHT,
  RAID_GAME_WIDTH,
  RAID_PLAYER,
  RAID_WAVES,
} from "@/lib/game/constants";
import type {
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
type PhysicsArc = import("phaser").GameObjects.Arc & { body: ArcadeBody };
type PhysicsRectangle = import("phaser").GameObjects.Rectangle & {
  body: ArcadeBody;
};
type PhysicsEnemy = (PhysicsArc | PhysicsRectangle) & { body: ArcadeBody };

type BulletOwner = "player" | "enemy";

type BulletSprite = PhysicsArc & {
  bornAt: number;
  damage: number;
  owner: BulletOwner;
  pierceRemaining: number;
  hitEnemyIds: Set<number>;
};

type EnemySprite = PhysicsEnemy & {
  enemyId: number;
  hp: number;
  kind: EnemyKind;
  lastShotAt: number;
  scoreValue: number;
  speed: number;
};

type SceneControls = {
  applyUpgrade: (upgradeId: UpgradeId) => void;
};

type PhaserRaidGameProps = {
  onHudChange: (hud: RaidHudState) => void;
  onUpgradeOffer: (upgrades: UpgradeOption[] | null) => void;
  upgradeSelection: UpgradeSelection | null;
};

export function PhaserRaidGame({
  onHudChange,
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
        private playerBullets!: ArcadeGroup;
        private enemyBullets!: ArcadeGroup;
        private enemies!: ArcadeGroup;
        private aimLine!: Graphics;
        private stateOverlayObjects: GameObject[] = [];
        private keys!: Record<"W" | "A" | "S" | "D" | "SPACE" | "R", KeyboardKey>;
        private hp = RAID_PLAYER.maxHp;
        private maxHp = RAID_PLAYER.maxHp;
        private score = 0;
        private kills = 0;
        private fireRateMs = RAID_PLAYER.fireRateMs;
        private dashCooldownMs = RAID_PLAYER.dashCooldownMs;
        private bulletDamage = RAID_PLAYER.bulletDamage;
        private bulletPierce = 0;
        private critChance = 0;
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
            applyUpgrade: (upgradeId) => this.applyUpgrade(upgradeId),
          };

          this.startWave(0);
        }

        update(time: number) {
          if (this.raidStatus === "operator-down") {
            if (PhaserLib.Input.Keyboard.JustDown(this.keys.R)) {
              this.scene.restart();
            }

            return;
          }

          if (this.raidStatus !== "running") {
            this.emitHud();
            return;
          }

          this.updatePlayerMovement(time);
          this.updateAimLine();
          this.handleShooting(time);
          this.updateEnemies(time);
          this.updatePlayerBullets(time);
          this.updateEnemyBullets(time);
          this.checkWaveClear();
          this.emitHud();
        }

        private resetState() {
          this.hp = RAID_PLAYER.maxHp;
          this.maxHp = RAID_PLAYER.maxHp;
          this.score = 0;
          this.kills = 0;
          this.fireRateMs = RAID_PLAYER.fireRateMs;
          this.dashCooldownMs = RAID_PLAYER.dashCooldownMs;
          this.bulletDamage = RAID_PLAYER.bulletDamage;
          this.bulletPierce = 0;
          this.critChance = 0;
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

          this.aimLine = this.add.graphics();
        }

        private createPlayer() {
          this.player = this.add.circle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            RAID_PLAYER.radius,
            0x2afcdb,
            1,
          ) as PhysicsArc;
          this.player.setStrokeStyle(3, 0xdffcff, 0.9);

          this.physics.add.existing(this.player);
          this.player.body.setCircle(RAID_PLAYER.radius);
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setAllowGravity(false);
          this.player.body.setMaxVelocity(RAID_PLAYER.dashSpeed);
        }

        private startWave(waveIndex: number) {
          this.currentWaveIndex = waveIndex;
          this.raidStatus = "running";
          this.statusText = `Wave ${RAID_WAVES[waveIndex].wave} breach active.`;
          this.clearStateOverlay();
          this.player.body.enable = true;
          this.clearEnemyProjectiles();

          const wave = RAID_WAVES[waveIndex];

          for (let index = 0; index < wave.crawlers; index += 1) {
            this.spawnCrawler(index);
          }

          for (let index = 0; index < wave.drones; index += 1) {
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
          if (time - this.lastDashAt < this.dashCooldownMs) {
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

          this.spawnBullet({
            angle,
            damage: isCritical ? this.bulletDamage * 2 : this.bulletDamage,
            owner: "player",
            pierceRemaining: this.bulletPierce,
            speed: RAID_BULLET.speed,
            x: this.player.x + Math.cos(angle) * 22,
            y: this.player.y + Math.sin(angle) * 22,
          });
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
          const bullet = this.add.circle(
            x,
            y,
            owner === "player" ? RAID_BULLET.radius : RAID_ENEMY_BULLET.radius,
            owner === "player" ? 0x73f7ff : 0xff5a1f,
            1,
          ) as BulletSprite;
          bullet.setStrokeStyle(2, owner === "player" ? 0xcfffff : 0xffc08a, 0.9);
          bullet.damage = damage;
          bullet.owner = owner;
          bullet.pierceRemaining = pierceRemaining;
          bullet.hitEnemyIds = new Set();
          bullet.bornAt = this.time.now;

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
          const crawler = this.add.circle(
            x,
            y,
            RAID_CRAWLER.radius,
            0xff5a1f,
            1,
          ) as EnemySprite;
          crawler.setStrokeStyle(3, 0xffb347, 0.85);
          crawler.enemyId = this.nextEnemyId;
          crawler.hp = RAID_CRAWLER.hp;
          crawler.kind = "crawler";
          crawler.lastShotAt = 0;
          crawler.scoreValue = RAID_CRAWLER.scoreValue;
          crawler.speed = RAID_CRAWLER.speed;
          this.nextEnemyId += 1;

          this.physics.add.existing(crawler);
          crawler.body.setCircle(RAID_CRAWLER.radius);
          crawler.body.setCollideWorldBounds(true);
          crawler.body.setAllowGravity(false);
          this.enemies.add(crawler);
        }

        private spawnDrone(index: number) {
          const { x, y } = this.getEdgeSpawnPoint(index + 11);
          const drone = this.add.rectangle(
            x,
            y,
            RAID_DRONE.radius * 2,
            RAID_DRONE.radius * 2,
            0xb52512,
            1,
          ) as EnemySprite;
          drone.setStrokeStyle(3, 0xffb347, 0.95);
          drone.enemyId = this.nextEnemyId;
          drone.hp = RAID_DRONE.hp;
          drone.kind = "drone";
          drone.lastShotAt = this.time.now + index * 180;
          drone.scoreValue = RAID_DRONE.scoreValue;
          drone.speed = RAID_DRONE.speed;
          this.nextEnemyId += 1;

          this.physics.add.existing(drone);
          drone.body.setSize(RAID_DRONE.radius * 2, RAID_DRONE.radius * 2);
          drone.body.setCollideWorldBounds(true);
          drone.body.setAllowGravity(false);
          this.enemies.add(drone);
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
          enemy.hp -= bullet.damage;

          if (enemy.hp <= 0) {
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
          if (this.raidStatus !== "running") {
            return;
          }

          this.hp = Math.max(0, this.hp - damage);
          this.cameras.main.flash(90, 255, 82, 48, false);

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

          if (this.currentWaveIndex >= RAID_WAVES.length - 1) {
            this.enterBossSignal();
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
          this.startWave(this.currentWaveIndex + 1);
        }

        private enterBossSignal() {
          this.raidStatus = "boss-signal";
          this.statusText = "Boss signal detected - next phase coming.";
          this.showStateText(
            "BOSS SIGNAL DETECTED",
            "The Blackout Core is waking. Next phase coming.",
          );
          onUpgradeOffer(null);
          this.emitHud(true);
        }

        private endRaid() {
          this.raidStatus = "operator-down";
          this.statusText = "Operator down. Raid failed.";
          this.player.body.setVelocity(0, 0);
          this.player.setFillStyle(0x3b0b0b, 1);
          this.player.setStrokeStyle(3, 0xff5a1f, 0.95);
          this.clearProjectiles();
          this.showStateText("OPERATOR DOWN", "Press R or use Restart Raid.");
          onUpgradeOffer(null);
          this.emitHud(true);
        }

        private clearEnemyProjectiles() {
          this.enemyBullets?.clear(true, true);
        }

        private clearProjectiles() {
          this.playerBullets?.clear(true, true);
          this.clearEnemyProjectiles();
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
              color: "#c8f7ff",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "16px",
            },
          ).setOrigin(0.5);
          this.stateOverlayObjects = [panel, titleText, subtitleText];
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
              this.dashCooldownMs - (time - this.lastDashAt),
            ),
            dashReady: time - this.lastDashAt >= this.dashCooldownMs,
            enemiesAlive: this.enemies?.countActive(true) ?? 0,
            hp: this.hp,
            kills: this.kills,
            maxHp: this.maxHp,
            score: this.score,
            selectedUpgrades: this.selectedUpgrades,
            status: this.raidStatus,
            statusText: this.statusText,
            totalWaves: RAID_WAVES.length,
            wave: RAID_WAVES[this.currentWaveIndex]?.wave ?? RAID_WAVES.length,
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
  }, [onHudChange, onUpgradeOffer]);

  return <div ref={mountRef} className="min-h-[360px] w-full bg-[#02060b]" />;
}
