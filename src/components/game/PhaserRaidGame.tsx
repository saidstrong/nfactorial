"use client";

import { useEffect, useRef } from "react";
import {
  RAID_ARENA_PADDING,
  RAID_BULLET,
  RAID_CRAWLER,
  RAID_GAME_HEIGHT,
  RAID_GAME_WIDTH,
  RAID_PLAYER,
} from "@/lib/game/constants";
import type { RaidHudState } from "@/lib/game/types";

type PhaserRuntime = typeof import("phaser");
type ArcadeBody = import("phaser").Physics.Arcade.Body;
type ArcadeGroup = import("phaser").Physics.Arcade.Group;
type GameObject = import("phaser").GameObjects.GameObject;
type Graphics = import("phaser").GameObjects.Graphics;
type KeyboardKey = import("phaser").Input.Keyboard.Key;
type PhysicsCircle = import("phaser").GameObjects.Arc & { body: ArcadeBody };

type BulletSprite = PhysicsCircle & {
  bornAt: number;
  damage: number;
};

type CrawlerSprite = PhysicsCircle & {
  hp: number;
  scoreValue: number;
};

type PhaserRaidGameProps = {
  onHudChange: (hud: RaidHudState) => void;
};

export function PhaserRaidGame({ onHudChange }: PhaserRaidGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

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
        private player!: PhysicsCircle;
        private bullets!: ArcadeGroup;
        private enemies!: ArcadeGroup;
        private aimLine!: Graphics;
        private keys!: Record<"W" | "A" | "S" | "D" | "SPACE" | "R", KeyboardKey>;
        private hp = RAID_PLAYER.maxHp;
        private score = 0;
        private kills = 0;
        private lastShotAt = 0;
        private lastDashAt = -RAID_PLAYER.dashCooldownMs;
        private dashUntil = 0;
        private nextSpawnAt = 0;
        private lastContactDamageAt = 0;
        private lastHudAt = 0;
        private isDefeated = false;

        constructor() {
          super("raid-arena");
        }

        create() {
          this.resetState();
          this.createArena();
          this.createPlayer();

          this.bullets = this.physics.add.group();
          this.enemies = this.physics.add.group();

          this.physics.add.overlap(
            this.bullets,
            this.enemies,
            this.handleBulletEnemyOverlap,
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

          for (let index = 0; index < 5; index += 1) {
            this.spawnCrawler();
          }

          this.emitHud(true);
        }

        update(time: number) {
          if (this.isDefeated) {
            if (PhaserLib.Input.Keyboard.JustDown(this.keys.R)) {
              this.scene.restart();
            }

            return;
          }

          this.updatePlayerMovement(time);
          this.updateAimLine();
          this.handleShooting(time);
          this.updateEnemies();
          this.updateBullets(time);
          this.spawnEnemies(time);
          this.emitHud();
        }

        private resetState() {
          this.hp = RAID_PLAYER.maxHp;
          this.score = 0;
          this.kills = 0;
          this.lastShotAt = 0;
          this.lastDashAt = -RAID_PLAYER.dashCooldownMs;
          this.dashUntil = 0;
          this.nextSpawnAt = 0;
          this.lastContactDamageAt = 0;
          this.lastHudAt = 0;
          this.isDefeated = false;
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
          ) as PhysicsCircle;
          this.player.setStrokeStyle(3, 0xdffcff, 0.9);

          this.physics.add.existing(this.player);
          this.player.body.setCircle(RAID_PLAYER.radius);
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setAllowGravity(false);
          this.player.body.setMaxVelocity(RAID_PLAYER.dashSpeed);
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
          if (time - this.lastDashAt < RAID_PLAYER.dashCooldownMs) {
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
            time - this.lastShotAt < RAID_PLAYER.fireRateMs
          ) {
            return;
          }

          const angle = PhaserLib.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY,
          );

          const bullet = this.add.circle(
            this.player.x + Math.cos(angle) * 22,
            this.player.y + Math.sin(angle) * 22,
            RAID_BULLET.radius,
            0x73f7ff,
            1,
          ) as BulletSprite;
          bullet.setStrokeStyle(2, 0xcfffff, 0.9);
          bullet.damage = RAID_PLAYER.bulletDamage;
          bullet.bornAt = time;

          this.physics.add.existing(bullet);
          bullet.body.setCircle(RAID_BULLET.radius);
          bullet.body.setAllowGravity(false);
          bullet.body.setVelocity(
            Math.cos(angle) * RAID_BULLET.speed,
            Math.sin(angle) * RAID_BULLET.speed,
          );

          this.bullets.add(bullet);
          this.lastShotAt = time;
        }

        private spawnEnemies(time: number) {
          if (
            time < this.nextSpawnAt ||
            this.enemies.countActive(true) >= RAID_CRAWLER.maxAlive
          ) {
            return;
          }

          this.spawnCrawler();
          this.nextSpawnAt = time + RAID_CRAWLER.spawnEveryMs;
        }

        private spawnCrawler() {
          const edge = PhaserLib.Math.Between(0, 3);
          const min = RAID_ARENA_PADDING + 16;
          const maxX = RAID_GAME_WIDTH - RAID_ARENA_PADDING - 16;
          const maxY = RAID_GAME_HEIGHT - RAID_ARENA_PADDING - 16;
          let x = PhaserLib.Math.Between(min, maxX);
          let y = PhaserLib.Math.Between(min, maxY);

          if (edge === 0) {
            y = min;
          } else if (edge === 1) {
            x = maxX;
          } else if (edge === 2) {
            y = maxY;
          } else {
            x = min;
          }

          const crawler = this.add.circle(
            x,
            y,
            RAID_CRAWLER.radius,
            0xff5a1f,
            1,
          ) as CrawlerSprite;
          crawler.setStrokeStyle(3, 0xffb347, 0.85);
          crawler.hp = RAID_CRAWLER.hp;
          crawler.scoreValue = RAID_CRAWLER.scoreValue;

          this.physics.add.existing(crawler);
          crawler.body.setCircle(RAID_CRAWLER.radius);
          crawler.body.setCollideWorldBounds(true);
          crawler.body.setAllowGravity(false);
          this.enemies.add(crawler);
        }

        private updateEnemies() {
          this.enemies.getChildren().forEach((enemyObject: GameObject) => {
            const enemy = enemyObject as CrawlerSprite;

            if (!enemy.active) {
              return;
            }

            this.physics.moveToObject(enemy, this.player, RAID_CRAWLER.speed);
          });
        }

        private updateBullets(time: number) {
          this.bullets.getChildren().forEach((bulletObject: GameObject) => {
            const bullet = bulletObject as BulletSprite;
            const expired = time - bullet.bornAt > RAID_BULLET.lifetimeMs;
            const outOfBounds =
              bullet.x < RAID_ARENA_PADDING ||
              bullet.x > RAID_GAME_WIDTH - RAID_ARENA_PADDING ||
              bullet.y < RAID_ARENA_PADDING ||
              bullet.y > RAID_GAME_HEIGHT - RAID_ARENA_PADDING;

            if (expired || outOfBounds) {
              bullet.destroy();
            }
          });
        }

        private handleBulletEnemyOverlap(
          bulletObject: unknown,
          enemyObject: unknown,
        ) {
          const bullet = bulletObject as BulletSprite;
          const enemy = enemyObject as CrawlerSprite;

          if (!bullet.active || !enemy.active) {
            return;
          }

          enemy.hp -= bullet.damage;
          bullet.destroy();

          if (enemy.hp <= 0) {
            enemy.destroy();
            this.kills += 1;
            this.score += enemy.scoreValue;
          }

          this.emitHud(true);
        }

        private handlePlayerEnemyOverlap() {
          const time = this.time.now;

          if (
            this.isDefeated ||
            time - this.lastContactDamageAt < RAID_CRAWLER.contactCooldownMs
          ) {
            return;
          }

          this.lastContactDamageAt = time;
          this.hp = Math.max(0, this.hp - RAID_CRAWLER.damage);
          this.cameras.main.flash(90, 255, 82, 48, false);

          if (this.hp <= 0) {
            this.endRaid();
          } else {
            this.emitHud(true);
          }
        }

        private endRaid() {
          this.isDefeated = true;
          this.player.body.setVelocity(0, 0);
          this.player.setFillStyle(0x3b0b0b, 1);
          this.player.setStrokeStyle(3, 0xff5a1f, 0.95);

          this.add.rectangle(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2,
            440,
            150,
            0x080c12,
            0.88,
          );
          this.add.text(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 - 24,
            "OPERATOR DOWN",
            {
              color: "#ffb347",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "32px",
              fontStyle: "bold",
            },
          ).setOrigin(0.5);
          this.add.text(
            RAID_GAME_WIDTH / 2,
            RAID_GAME_HEIGHT / 2 + 28,
            "Press R or use Restart Raid",
            {
              color: "#c8f7ff",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: "16px",
            },
          ).setOrigin(0.5);

          this.emitHud(true);
        }

        private emitHud(force = false) {
          const time = this.time.now;

          if (!force && time - this.lastHudAt < 120) {
            return;
          }

          this.lastHudAt = time;
          onHudChange({
            dashReady: time - this.lastDashAt >= RAID_PLAYER.dashCooldownMs,
            enemiesAlive: this.enemies?.countActive(true) ?? 0,
            hp: this.hp,
            kills: this.kills,
            maxHp: RAID_PLAYER.maxHp,
            score: this.score,
            status: this.isDefeated ? "operator-down" : "running",
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
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onHudChange]);

  return <div ref={mountRef} className="min-h-[360px] w-full bg-[#02060b]" />;
}
