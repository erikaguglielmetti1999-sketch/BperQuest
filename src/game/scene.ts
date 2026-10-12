import Phaser from "phaser";
import {
  state,
  Direction,
  Point,
  vectors,
  iso,
  distance,
  enemyCount,
  OBJECTS,
} from "./model";
import { levels, Level, MAP_SIZE } from "./levels";
import { makeArt, textureURL } from "./art";
import { RetroAudio } from "./audio";
import { moveCardinal, resolveDirection, PLAYER_SPEED } from "./movement";
import { PowerupSystem } from "./powerups";
import { DamageSystem } from "./damage";
import { ActiveTimer } from "./timer";
import { objectiveSpawn } from "./collectibles";
import { updateEnemy } from "./enemies";
type Actor = {
  pos: Point;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
};
type Enemy = Actor & {
  id: number;
  target: Point | null;
  path: Point[];
  wait: number;
  steps: number;
  mode: number;
};
type Bonus = {
  pos: Point;
  kind: "speed" | "shield";
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Graphics;
  used: boolean;
  cooldown: number;
};
export class QuestScene extends Phaser.Scene {
  audio = new RetroAudio();
  world: Phaser.GameObjects.GameObject[] = [];
  buildings: Phaser.GameObjects.Image[] = [];
  map: Level = levels[0];
  backdrop!: Phaser.GameObjects.Image;
  player!: Actor;
  enemies: Enemy[] = [];
  bonuses: Bonus[] = [];
  objective: Phaser.GameObjects.Image | null = null;
  objectiveGlow: Phaser.GameObjects.Graphics | null = null;
  objectiveMarker: Phaser.GameObjects.Image | null = null;
  objectivePos: Point | null = null;
  objectiveSparkles: Phaser.GameObjects.Graphics | null = null;
  keys = new Map<string, boolean>();
  keyOrder: string[] = [];
  touch: Direction | null = null;
  power = new PowerupSystem();
  damage = new DamageSystem();
  timer = new ActiveTimer();
  simTime = 0;
  notifyEnd = 0;
  uiTime = 0;
  timerTransition = 0;
  facing: Direction = "right";
  pickupEnd = 0;
  get invincible() {
    return this.damage.protectedUntil;
  }
  set invincible(value: number) {
    this.damage.protectedUntil = value;
  }
  get speedEnd() {
    return this.power.end;
  }
  set speedEnd(value: number) {
    this.power.end = value;
  }
  get speedFactor() {
    return this.power.factor;
  }
  set speedFactor(value: number) {
    this.power.factor = value;
  }
  get active() {
    return this.timer.elapsed;
  }
  set active(value: number) {
    this.timer.elapsed = value;
  }
  constructor() {
    super("Quest");
  }
  create() {
    makeArt(this);
    this.backdrop = this.add
      .image(500, 350, "backdrop0")
      .setScale(2)
      .setDepth(-2000);
    this.loadLevel();
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      const key = e.key.toLowerCase();
      if (!this.keys.get(key)) this.keyOrder.push(key);
      this.keys.set(key, true);
      if ((key === "escape" || key === "p") && !e.repeat) this.pause();
    });
    this.input.keyboard?.on("keyup", (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
      this.keyOrder = this.keyOrder.filter((k) => k !== e.key.toLowerCase());
    });
    const blur = () => {
      this.clearInput();
      if (state.value.phase === "playing") this.pause();
    };
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("visibilitychange", visibility);
    this.events.once("shutdown", () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      this.audio.destroy();
    });
    window.dispatchEvent(
      new CustomEvent("quest-ready", {
        detail: {
          scene: this,
          art: Object.fromEntries(
            [
              "heart",
              "player0",
              ...Array.from({ length: 10 }, (_, i) => `object${i}`),
              "enemy0-0",
              "speed",
              "shield",
              "pad",
              "trophy",
            ].map((k) => [k, textureURL(this, k)]),
          ),
        },
      }),
    );
  }
  track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.world.push(obj);
    return obj;
  }
  image(pos: Point, key: string, scale = 2) {
    const p = iso(pos.x, pos.y);
    return this.track(
      this.add
        .image(p.x, p.y, key)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(p.y),
    );
  }
  actor(pos: Point, key: string): Actor {
    return {
      pos: { ...pos },
      sprite: this.image(pos, key),
      shadow: this.image(pos, key.startsWith("enemy") ? "danger" : "shadow")
        .setOrigin(0.5, 0.5)
        .setAlpha(0.7)
        .setDepth(iso(pos.x, pos.y).y - 0.3),
    };
  }
  halo(pos: Point, color: number, size = 1) {
    const p = iso(pos.x, pos.y);
    const g = this.track(this.add.graphics().setDepth(p.y - 1));
    for (let r = 4; r > 0; r--)
      g.fillStyle(color, 0.018 * r).fillEllipse(
        p.x,
        p.y - 3,
        15 * r * size,
        8 * r * size,
      );
    return g;
  }
  loadLevel() {
    this.tweens.killAll();
    this.children.getByName("player-effect")?.destroy();
    this.world.forEach((o) => o.destroy());
    this.world = [];
    this.buildings = [];
    this.map = levels[state.value.level];
    this.backdrop.setTexture(`backdrop${state.value.level}`);
    this.enemies = [];
    this.bonuses = [];
    this.objective = null;
    this.objectiveGlow = null;
    this.objectiveMarker = null;
    this.objectivePos = null;
    this.objectiveSparkles = null;
    this.invincible = 0;
    this.pickupEnd = 0;
    this.power.reset();
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++) {
        const p = iso(x, y),
          ground = this.map.terrain[y][x];
        this.track(
          this.add
            .image(
              p.x,
              p.y,
              ground === "stone"
                ? `tile${(x * 7 + y * 3) % 5}`
                : ground === "earth"
                  ? `grass${(x + y) % 3}`
                  : `${ground}${(x + y) % 3}`,
            )
            .setOrigin(0.5, 5.5 / 15)
            .setScale(2)
            .setDepth(-1000 + x + y),
        );
      }
    if (this.map.theme === "town") {
      // Oval paving evokes the Anfiteatro without closing any escape route.
      const paving = this.track(this.add.graphics().setDepth(-900));
      for (let y = 290; y <= 496; y += 2) {
        const span = 252 * Math.sqrt(Math.max(0, 1 - ((y - 393) / 103) ** 2));
        paving
          .fillStyle(0xc8ab84, 0.12)
          .fillRect(Math.round(500 - span), y, Math.round(span * 2), 2);
      }
      for (let ring = 0; ring < 3; ring++) {
        for (let step = 0; step < 220; step++) {
          const angle = (step / 220) * Math.PI * 2;
          const x = Math.round(500 + Math.cos(angle) * (252 - ring * 5));
          const y = Math.round(393 + Math.sin(angle) * (103 - ring * 3));
          paving
            .fillStyle(ring === 1 ? 0xcbb69a : 0x9d9082, 0.9)
            .fillRect(x, y, 4, 2);
        }
      }
    }
    for (const prop of this.map.props) {
      const pos = {
        x: prop.x + (prop.w - 1) / 2,
        y: prop.y + (prop.h - 1) / 2,
      };
      const key = prop.kind === "house" ? `house${prop.variant}` : prop.kind;
      const image = this.image(
        pos,
        key,
        prop.kind === "hauntedtower" ? 1.5 : 2,
      ).setY(iso(pos.x, pos.y).y + (prop.w + prop.h) * 5.5);
      if (prop.kind === "pond") image.setOrigin(0.5, 55 / 59);
      if (prop.kind === "hauntedtower") image.setOrigin(0.5, 121 / 126);
      image.setDepth(iso(prop.x + prop.w - 0.5, prop.y + prop.h - 0.5).y);
      if (prop.kind === "pond") {
        // A flat five-tile basin must never sort as one tall foreground prop.
        // Its full footprint remains solid for both actors and enemy routes.
        image.setName("fountain-base").setDepth(-700);
        this.image(pos, "fountainSpout").setName("fountain-spout");
      }
      if (prop.kind === "house") {
        // Curve the distant facades backward, away from every playable street.
        const across = (image.x - 500) / 380;
        const arc = 345 - 150 * Math.sqrt(Math.max(0, 1 - across * across));
        const oldBase = image.y;
        const facadeBase = Math.round(Math.min(oldBase, arc));
        const foundation = this.track(this.add.graphics().setDepth(-950));
        foundation
          .fillStyle([0x8f755e, 0x926b50, 0x855e50, 0x9c8061][prop.variant], 1)
          .fillPoints(
            [
              new Phaser.Geom.Point(image.x - 44, facadeBase - 22),
              new Phaser.Geom.Point(image.x, facadeBase - 44),
              new Phaser.Geom.Point(image.x + 44, facadeBase - 22),
              new Phaser.Geom.Point(image.x + 44, oldBase - 22),
              new Phaser.Geom.Point(image.x, oldBase),
              new Phaser.Geom.Point(image.x - 44, oldBase - 22),
            ],
            true,
          );
        for (let row = facadeBase + 2; row < oldBase - 16; row += 18) {
          for (const dx of [-24, -8, 8, 24]) {
            foundation
              .fillStyle(0x473b38, 1)
              .fillRect(image.x + dx - 4, row - 8, 8, 10);
            foundation
              .fillStyle(0xd5a56f, 1)
              .fillRect(image.x + dx - 2, row - 6, 4, 6);
            foundation
              .fillStyle(0x695b47, 1)
              .fillRect(image.x + dx - 5, row - 8, 1, 10);
          }
        }
        image.setY(facadeBase).setDepth(Math.min(image.depth, arc));
        this.buildings.push(image);
      }
      if (prop.kind === "autumntree" && this.map.theme === "park") {
        this.image(pos, "rampart")
          .setY(iso(pos.x, pos.y).y + 22)
          .setDepth(image.depth - 0.1);
      }
    }
    // Decorations stay outside navigable cells, never in an escape lane.
    for (const pos of [
      { x: 0, y: 4 },
      { x: 0, y: 12 },
      { x: 4, y: 0 },
      { x: 12, y: 0 },
      { x: 19, y: 5 },
      { x: 19, y: 13 },
      { x: 6, y: 19 },
      { x: 14, y: 19 },
    ]) {
      this.image(pos, "shrub");
    }
    for (const pos of [
      { x: 3, y: 5 },
      { x: 3, y: 11 },
      { x: 3, y: 17 },
      { x: 5, y: 3 },
      { x: 11, y: 3 },
      { x: 17, y: 3 },
      { x: 19, y: 9 },
      { x: 9, y: 19 },
    ]) {
      this.image(pos, "lamp");
      this.halo(pos, 0xffa34e, 0.95);
    }
    for (const pos of [
      { x: 3, y: 7 },
      { x: 3, y: 15 },
      { x: 7, y: 3 },
      { x: 15, y: 3 },
      { x: 19, y: 16 },
      { x: 16, y: 19 },
    ])
      this.image(pos, "pumpkin", 2);
    const leaves = this.track(this.add.graphics().setDepth(-800));
    for (let i = 0; i < 48; i++) {
      const pos = this.map.spawns[(i * 17) % this.map.spawns.length],
        p = iso(pos.x, pos.y);
      leaves
        .fillStyle(i % 2 ? 0xd68a42 : 0xa96545, 0.6)
        .fillRect(p.x + ((i * 13) % 22) - 11, p.y + ((i * 7) % 10) - 5, 3, 2);
    }
    for (const b of this.map.powerups)
      this.bonuses.push({
        ...b,
        sprite: this.image(b.pos, b.kind),
        glow: this.halo(b.pos, b.kind === "shield" ? 0x77caff : 0xb6ee62, 0.7),
        used: false,
        cooldown: 0,
      });
    this.player = this.actor(this.map.start, "player0");
    this.syncEnemies();
    this.spawnObjective();
    this.clearInput();
  }
  clearInput() {
    this.keys.clear();
    this.keyOrder = [];
    this.touch = null;
  }
  start() {
    this.clearInput();
    state.reset();
    this.simTime = 0;
    this.active = 0;
    this.uiTime = 0;
    this.timerTransition = 0;
    this.loadLevel();
    this.audio.start();
    this.notifyEnd = 2400;
  }
  toMenu() {
    this.clearInput();
    state.reset("intro");
    this.simTime = 0;
    this.active = 0;
    this.uiTime = 0;
    this.timerTransition = 0;
    this.notifyEnd = 0;
    this.loadLevel();
    this.audio.suspend();
  }
  pause() {
    const phase = state.value.phase;
    if (phase === "playing") {
      state.patch({ phase: "paused" });
      this.clearInput();
      this.audio.suspend();
    } else if (phase === "paused") {
      state.patch({ phase: "playing" });
      this.audio.resume();
    }
  }
  mute() {
    const muted = !state.value.muted;
    state.patch({ muted });
    this.audio.muted = muted;
  }
  direction(): Direction | null {
    return resolveDirection(this.keys, this.keyOrder, this.touch);
  }
  syncEnemies() {
    const count = enemyCount(state.value.collected);
    while (this.enemies.length < count) {
      const id = this.enemies.length;
      const choices = this.map.spawns.filter(
        (p) =>
          distance(p, this.player.pos) > 5 &&
          this.enemies.every((e) => distance(e.pos, p) > 1.5) &&
          (!this.objectivePos || distance(p, this.objectivePos) > 2),
      );
      const pos = choices[(id * 23 + state.value.level * 7) % choices.length];
      if (!pos) break;
      this.enemies.push({
        ...this.actor(pos, `enemy${id % 4}-0`),
        id,
        target: null,
        path: [],
        wait: id * 0.3,
        steps: 0,
        mode: id % 3,
      });
    }
  }
  spawnObjective() {
    this.objective?.destroy();
    this.objectiveGlow?.destroy();
    this.objectiveMarker?.destroy();
    this.objectiveSparkles?.destroy();
    const pos = objectiveSpawn(
      this.map,
      state.value.local,
      this.player.pos,
      this.enemies.map((e) => e.pos),
    );
    if (!pos) return;
    this.objectivePos = pos;
    this.objective = this.image(pos, `object${state.value.collected}`);
    this.objectiveGlow = this.halo(pos, 0xffd777, 1.1);
    this.objectiveMarker = this.image(pos, "treasurebase")
      .setOrigin(0.5, 0.5)
      .setDepth(iso(pos.x, pos.y).y - 0.5);
    this.objectiveSparkles = this.track(
      this.add.graphics().setDepth(iso(pos.x, pos.y).y + 1),
    );
  }
  move(actor: Actor, dir: Point, amount: number) {
    actor.pos = moveCardinal(this.map, actor.pos, dir, amount);
  }

  renderActor(actor: Actor) {
    const p = iso(actor.pos.x, actor.pos.y);
    actor.sprite.setPosition(p.x, p.y).setDepth(p.y + 0.1);
    actor.shadow.setPosition(p.x, p.y - 2).setDepth(p.y - 0.2);
  }
  notice(message: string) {
    state.patch({ notice: message });
    this.notifyEnd = this.simTime + 2400;
  }
  pickup() {
    if (
      !this.objectivePos ||
      distance(this.player.pos, this.objectivePos) > 0.53
    )
      return;
    const p = iso(this.objectivePos.x, this.objectivePos.y);
    for (let i = 0; i < 7; i++) {
      const spark = this.track(
        this.add.rectangle(p.x, p.y - 20, 3, 3, 0xffe4a6).setDepth(2000),
      );
      this.tweens.add({
        targets: spark,
        x: p.x + Math.cos(i) * 28,
        y: p.y - 35 + Math.sin(i) * 23,
        alpha: 0,
        duration: 500,
        onComplete: () => spark.destroy(),
      });
    }
    this.objective?.destroy();
    this.objectiveGlow?.destroy();
    this.objectiveMarker?.destroy();
    this.objective = null;
    this.objectiveSparkles?.destroy();
    this.objectiveSparkles = null;
    this.objectivePos = null;
    this.audio.effect("pickup");
    this.pickupEnd = this.simTime + 320;
    state.collect();
    this.notifyEnd = this.simTime + 2400;
    if (state.value.phase === "playing") {
      this.syncEnemies();
      this.spawnObjective();
    } else {
      this.clearInput();
      if (state.value.phase === "transition") {
        this.timerTransition = 0;
        this.audio.effect("level");
      } else {
        this.audio.effect("victory");
        this.player.sprite.setTexture("player1");
        this.tweens.add({
          targets: this.player.sprite,
          y: p.y - 12,
          yoyo: true,
          repeat: 3,
          duration: 160,
        });
        setTimeout(() => {
          if (state.value.phase === "victory") this.audio.suspend();
        }, 700);
      }
    }
  }
  updateEnemies(dt: number) {
    for (const e of this.enemies) {
      updateEnemy(e, this.enemies, this.map, this.player.pos, this.simTime, dt);
      this.renderActor(e);
      e.sprite.setTexture(
        `enemy${e.id % 4}-${Math.floor(this.simTime / 170 + e.id) % 2}`,
      );
      if (
        distance(e.pos, this.player.pos) < 0.64 &&
        this.damage.canHit(this.simTime)
      ) {
        const shield = this.damage.hit(state, this.simTime)!.absorbed;
        if (shield) this.power.clearShield();
        this.audio.effect(shield ? "power" : "damage");
        this.notifyEnd = this.simTime + 2400;
        const dx = this.player.pos.x - e.pos.x,
          dy = this.player.pos.y - e.pos.y;
        this.move(
          this.player,
          Math.abs(dx) > Math.abs(dy)
            ? { x: Math.sign(dx) || 1, y: 0 }
            : { x: 0, y: Math.sign(dy) || 1 },
          0.38,
        );
        if (state.value.phase === "over") {
          this.audio.effect("over");
          setTimeout(() => {
            if (state.value.phase === "over") this.audio.suspend();
          }, 650);
          break;
        }
      }
    }
  }
  update(_time: number, rawDelta: number) {
    const phase = state.value.phase;
    if (phase === "transition") {
      this.timerTransition += rawDelta;
      if (this.timerTransition >= 2500) {
        state.advance();
        this.loadLevel();
        this.audio.resume();
        this.notifyEnd = this.simTime + 2400;
      }
      return;
    }
    if (phase !== "playing") return;
    const dt = Math.min(rawDelta / 1000, 0.045);
    this.simTime += dt * 1000;
    if (this.power.expireShield(this.simTime) && state.value.shield) {
      state.patch({ shield: false, shieldSeconds: 0 });
      this.notice("SCUDO TERMINATO");
    }
    this.timer.tick(rawDelta, phase);
    this.uiTime += rawDelta;
    if (this.uiTime >= 100) {
      state.patch({
        elapsed: this.active,
        speed: this.power.remaining(this.simTime),
        shieldSeconds: state.value.shield
          ? this.power.shieldRemaining(this.simTime)
          : 0,
      });
      this.uiTime = 0;
    }
    const dir = this.direction();
    if (dir) {
      this.facing = dir;
      this.move(
        this.player,
        vectors[dir],
        PLAYER_SPEED * this.power.multiplier(this.simTime) * dt,
      );
    }
    this.player.sprite
      .setTexture(`player${dir ? 1 + (Math.floor(this.simTime / 100) % 3) : 0}`)
      .setFlipX(this.facing === "left" || this.facing === "down")
      .setAlpha(
        this.simTime < this.invincible &&
          Math.floor(this.simTime / 90) % 2 === 0
          ? 0.4
          : 1,
      );
    this.renderActor(this.player);
    this.player.sprite.setTint(
      this.simTime < this.pickupEnd
        ? 0xffe1a0
        : this.simTime < this.invincible
          ? 0xffb7b5
          : 0xffffff,
    );
    if (!dir && this.simTime >= this.invincible)
      this.player.sprite.y -= Math.sin(this.simTime / 350) * 0.7;
    if (this.power.expire(this.simTime)) {
      this.notice("POTENZIAMENTO TERMINATO");
    }
    // A shield ring and trail are drawn in world coordinates; both are disposable.
    const old = this.children.getByName("player-effect");
    old?.destroy();
    if (state.value.shield || this.simTime < this.speedEnd) {
      const p = iso(this.player.pos.x, this.player.pos.y);
      const g = this.add
        .graphics()
        .setName("player-effect")
        .setDepth(p.y + 0.2);
      if (state.value.shield)
        g.lineStyle(2, 0x77caff, 0.85).strokeEllipse(p.x, p.y - 21, 40, 52);
      if (this.simTime < this.speedEnd && dir) {
        const v = iso(
          this.player.pos.x + vectors[dir].x,
          this.player.pos.y + vectors[dir].y,
        );
        for (let i = 1; i <= 3; i++)
          g.fillStyle(0xb6ee62, 0.65 - i * 0.14).fillRect(
            Math.round(p.x - (v.x - p.x) * i * 0.3) - 2,
            Math.round(p.y - (v.y - p.y) * i * 0.3) - 5,
            4,
            3,
          );
      }
    }
    this.bonuses.forEach((b) => {
      if (
        !b.used &&
        !(b.kind === "shield" && state.value.shield) &&
        this.simTime > b.cooldown &&
        distance(this.player.pos, b.pos) < 0.55
      ) {
        this.audio.effect("power");
        if (b.kind === "shield") {
          this.power.activateShield(this.simTime);
          state.patch({ shield: true, shieldSeconds: 10 });
          this.notice("SCUDO ATTIVO!");
        } else {
          this.power.activate(b.kind, this.simTime);
          this.notice("VELOCITÀ +30% · 6 SECONDI");
        }
        b.used = true;
        b.sprite.setVisible(false);
        b.glow.setVisible(false);
      }
    });
    if (this.objective && this.objectivePos) {
      const p = iso(this.objectivePos.x, this.objectivePos.y);
      this.objective.setY(p.y - 8 - Math.sin(this.simTime / 300) * 3);
      this.objectiveSparkles
        ?.clear()
        .fillStyle(0xffe4a4, 0.7)
        .fillRect(p.x - 20, p.y - 24 + Math.sin(this.simTime / 280) * 5, 3, 3)
        .fillRect(p.x + 18, p.y - 43 + Math.cos(this.simTime / 310) * 5, 2, 2);
    }
    this.updateEnemies(dt);
    if (state.value.phase === "playing") this.pickup();
    if (
      state.value.notice &&
      this.simTime > this.notifyEnd &&
      this.notifyEnd > 0
    )
      state.patch({ notice: "" });
    if (state.value.phase === "victory" || state.value.phase === "over")
      state.patch({ elapsed: this.active });
  }
  // Used by integration tests only when running the development build.
  inspect() {
    return {
      map: state.value.level,
      player: { ...this.player.pos },
      objective: this.objectivePos,
      enemies: this.enemies.map((e) => ({ ...e.pos, id: e.id })),
      bonuses: this.bonuses.map((b) => ({
        pos: b.pos,
        kind: b.kind,
        used: b.used,
      })),
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
      objectName: OBJECTS[state.value.collected],
    };
  }
}
