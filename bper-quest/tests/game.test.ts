import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GameState,
  enemyCount,
  iso,
  uniso,
  timeString,
} from "../src/game/model.ts";
import { levels, pathfind, canOccupy, walkable } from "../src/game/levels.ts";
test("isometric projection round-trips and preserves four distinct directions", () => {
  for (const p of [
    { x: 0, y: 0 },
    { x: 7.25, y: 12.8 },
    { x: 15, y: 15 },
  ]) {
    const s = iso(p.x, p.y),
      r = uniso(s.x, s.y);
    assert.ok(Math.abs(r.x - p.x) < 1e-8);
    assert.ok(Math.abs(r.y - p.y) < 1e-8);
  }
});
test("all objective, power-up and enemy points are reachable through cardinal routes", () => {
  for (const level of levels) {
    assert.ok(canOccupy(level, level.start));
    for (const p of [
      ...level.objectives,
      ...level.powerups.map((b) => b.pos),
      ...level.spawns,
    ]) {
      assert.ok(walkable(level, p));
      const route = pathfind(level, level.start, p);
      assert.ok(
        route.length || (p.x === level.start.x && p.y === level.start.y),
        JSON.stringify(p),
      );
      let previous = level.start;
      for (const step of route) {
        assert.equal(
          Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y),
          1,
        );
        previous = step;
      }
    }
  }
});
test("maps differ and walls reject player occupancy", () => {
  assert.equal(new Set(levels.map((l) => JSON.stringify(l.grid))).size, 3);
  for (const l of levels) {
    assert.equal(canOccupy(l, { x: 0, y: 0 }), false);
    for (const p of l.props)
      assert.equal(canOccupy(l, { x: p.x, y: p.y }), false);
  }
});
test("exact enemy progression", () =>
  assert.deepEqual(
    Array.from({ length: 10 }, (_, i) => enemyCount(i)),
    [1, 1, 2, 3, 4, 5, 4, 5, 6, 7],
  ));
test("three levels preserve lives and active time and end at ten objects", () => {
  const s = new GameState();
  assert.equal(s.value.phase, "intro");
  s.reset();
  s.tick(62450);
  s.damage(false);
  for (let i = 0; i < 3; i++) s.collect();
  assert.equal(s.value.phase, "transition");
  s.tick(3000);
  assert.equal(s.value.elapsed, 62450);
  s.advance();
  assert.equal(s.value.collected, 3);
  assert.equal(s.value.lives, 2);
  for (let i = 0; i < 3; i++) s.collect();
  assert.equal(s.value.collected, 6);
  assert.equal(s.value.phase, "transition");
  s.advance();
  for (let i = 0; i < 4; i++) s.collect();
  assert.equal(s.value.phase, "victory");
  assert.equal(s.value.collected, 10);
  s.tick(1000);
  assert.equal(s.value.elapsed, 62450);
});
test("shield absorbs one hit, game over stops time, restart clears all progress", () => {
  const s = new GameState();
  s.reset();
  s.patch({ shield: true });
  s.damage(true);
  assert.equal(s.value.lives, 3);
  assert.equal(s.value.shield, false);
  s.damage(false);
  s.damage(false);
  s.damage(false);
  assert.equal(s.value.phase, "over");
  s.tick(100);
  assert.equal(s.value.elapsed, 0);
  s.reset();
  assert.equal(s.value.lives, 3);
  assert.equal(s.value.level, 0);
  assert.equal(s.value.collected, 0);
  assert.equal(s.value.speed, 0);
  assert.equal(s.value.elapsed, 0);
});
test("timer formats elapsed wall time", () => {
  assert.equal(timeString(64999), "01:04");
  assert.equal(timeString(0), "00:00");
});
import { PowerupSystem } from "../src/game/powerups.ts";
import { DamageSystem } from "../src/game/damage.ts";
import { ActiveTimer } from "../src/game/timer.ts";
import {
  moveCardinal,
  resolveDirection,
  PLAYER_SPEED,
} from "../src/game/movement.ts";
import { EnemyMotion, updateEnemy, ENEMY_SPEED } from "../src/game/enemies.ts";
import { distance } from "../src/game/model.ts";
test("bonuses replace each other, never multiply or accumulate duration", () => {
  const p = new PowerupSystem();
  p.activate("speed", 0);
  assert.equal(p.multiplier(5999), 1.3);
  assert.equal(p.multiplier(6000), 1);
  p.activate("speed", 10000);
  p.activate("speed", 11000);
  assert.equal(p.factor, 1.3);
  assert.equal(p.end, 17000);
  assert.equal(p.expire(17000), true);
  assert.equal(p.remaining(18000), 0);
  p.reset();
  assert.equal(p.factor, 1);
});
test("damage system enforces two seconds of immunity including shield hits", () => {
  const s = new GameState(),
    d = new DamageSystem();
  s.reset();
  d.hit(s, 100);
  assert.equal(s.value.lives, 2);
  assert.equal(d.hit(s, 2099), null);
  d.hit(s, 2100);
  assert.equal(s.value.lives, 1);
});
test("elapsed timer excludes every non-playing phase", () => {
  const t = new ActiveTimer();
  t.tick(137, "playing");
  for (const phase of [
    "intro",
    "paused",
    "transition",
    "victory",
    "over",
  ] as const)
    t.tick(1000, phase);
  assert.equal(t.elapsed, 137);
  t.reset();
  assert.equal(t.elapsed, 0);
});
test("movement resolves competing keys and rejects diagonal vectors", () => {
  assert.equal(
    resolveDirection(
      new Map([
        ["w", true],
        ["d", true],
      ]),
      ["w", "d"],
      null,
    ),
    "right",
  );
  const l = levels[0],
    p = moveCardinal(l, l.start, { x: 1, y: 1 }, 0.1);
  assert.equal(p.y, l.start.y);
});
test("nine independent enemies remain in free cells and separated in all three maps for one minute", () => {
  assert.ok(ENEMY_SPEED < PLAYER_SPEED);
  for (const map of levels) {
    const actors: EnemyMotion[] = [];
    for (const p of map.spawns) {
      if (actors.every((e) => distance(e.pos, p) > 2))
        actors.push({
          pos: { ...p },
          id: actors.length,
          target: null,
          path: [],
          wait: 0,
          steps: 0,
          mode: actors.length % 3,
        });
      if (actors.length === 9) break;
    }
    const starts = actors.map((e) => ({ ...e.pos }));
    for (let frame = 0; frame < 3600; frame++) {
      for (const actor of actors)
        updateEnemy(actor, actors, map, map.start, (frame * 1000) / 60, 1 / 60);
      if (frame % 60 === 0)
        for (let i = 0; i < actors.length; i++) {
          assert.ok(
            canOccupy(map, actors[i].pos),
            `Obstacolo: ${JSON.stringify(actors[i])}`,
          );
          for (let j = i + 1; j < actors.length; j++)
            assert.ok(
              distance(actors[i].pos, actors[j].pos) > 0.7,
              `Sovrapposizione: ${distance(actors[i].pos, actors[j].pos)}`,
            );
        }
    }
    assert.ok(
      actors.filter((a, i) => distance(a.pos, starts[i]) > 1).length >= 5,
    );
    assert.ok(new Set(actors.map((a) => JSON.stringify(a.target))).size >= 4);
  }
});
test("homes remain behind the entire navigable district without transparency", () => {
  for (const map of levels)
    for (const prop of map.props.filter((p) => p.kind === "house")) {
      const center = iso(prop.x + (prop.w - 1) / 2, prop.y + (prop.h - 1) / 2);
      const baseY = center.y + 22,
        front = iso(prop.x + prop.w - 0.5, prop.y + prop.h - 0.5).y;
      for (let y = 0; y < map.grid.length; y++)
        for (let x = 0; x < map.grid[y].length; x++)
          if (map.grid[y][x]) {
            const player = iso(x, y);
            const overlap =
              player.x + 22 > center.x - 44 &&
              player.x - 22 < center.x + 44 &&
              player.y > baseY - 96 &&
              player.y - 64 < baseY;
            assert.ok(
              !(front > player.y + 0.1 && overlap),
              `Casa davanti alla strada ${x},${y}`,
            );
          }
    }
});
test("town, park and final tower have distinct terrain and landmarks", () => {
  assert.deepEqual(
    levels.map((l) => l.theme),
    ["town", "park", "tower"],
  );
  assert.equal(new Set(levels.map((l) => JSON.stringify(l.terrain))).size, 3);
  assert.ok(levels[0].props.some((p) => p.kind === "house"));
  assert.ok(levels[1].props.some((p) => p.kind === "pond"));
  assert.ok(levels[1].props.every((p) => p.kind !== "house"));
  assert.ok(levels[2].props.some((p) => p.kind === "hauntedtower"));
  for (const l of levels)
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        if (l.terrain[y][x] === "water") assert.equal(l.grid[y][x], false);
});
test("trees and the final tower never occlude navigable cells", () => {
  const dimensions: Record<string, { width: number; height: number }> = {
    autumntree: { width: 88, height: 136 },
    hauntedtower: { width: 132, height: 189 },
    ruinwall: { width: 88, height: 62 },
  };
  for (const map of levels)
    for (const prop of map.props) {
      const size = dimensions[prop.kind];
      if (!size) continue;
      const center = iso(prop.x + (prop.w - 1) / 2, prop.y + (prop.h - 1) / 2);
      const bottom = center.y + (prop.w + prop.h) * 5.5;
      const depth = iso(prop.x + prop.w - 0.5, prop.y + prop.h - 0.5).y;
      assert.ok(
        bottom - size.height >= 0,
        "Landmark entirely in the fixed viewport",
      );
      for (let y = 0; y < 20; y++)
        for (let x = 0; x < 20; x++)
          if (map.grid[y][x]) {
            const player = iso(x, y);
            const overlap =
              player.x + 22 > center.x - size.width / 2 &&
              player.x - 22 < center.x + size.width / 2 &&
              player.y > bottom - size.height &&
              player.y - 64 < bottom;
            assert.ok(
              !(depth > player.y + 0.1 && overlap),
              `${prop.kind} obscures ${x},${y}`,
            );
          }
    }
});
test("every playable cell and adjacent passage supports the player's collision body", () => {
  for (const map of levels) {
    for (let y = 0; y < map.grid.length; y++) {
      for (let x = 0; x < map.grid[y].length; x++) {
        if (!map.grid[y][x]) continue;
        const cell = { x, y };
        assert.ok(canOccupy(map, cell));
        assert.ok(
          pathfind(map, map.start, cell).length ||
            distance(map.start, cell) === 0,
          `Unreachable ${map.theme}: ${x},${y}`,
        );
        for (const direction of [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ]) {
          const end = { x: x + direction.x, y: y + direction.y };
          if (!walkable(map, end)) continue;
          let pos = cell;
          for (let i = 0; i < 20 && distance(pos, end) > 0.00001; i++) {
            pos = moveCardinal(
              map,
              pos,
              direction,
              Math.min(PLAYER_SPEED * 1.4 * 0.045, distance(pos, end)),
            );
            assert.ok(canOccupy(map, pos));
          }
          assert.ok(
            distance(pos, end) < 0.00001,
            `Blocked passage ${map.theme}: ${x},${y}`,
          );
        }
      }
    }
  }
});
test("corner assistance recenters without diagonal motion or passing through walls", () => {
  const map = levels[0];
  let pos = { x: 7.7, y: 7.3 };
  for (let i = 0; i < 10; i++) {
    const next = moveCardinal(map, pos, { x: 1, y: 0 }, 0.1);
    assert.ok(next.x === pos.x || next.y === pos.y);
    assert.ok(canOccupy(map, next));
    pos = next;
  }
  assert.ok(pos.x > 8, "The open street above the well remains accessible");
  const blocked = { x: 7.2, y: 8 };
  assert.deepEqual(moveCardinal(map, blocked, { x: 1, y: 0 }, 0.1), blocked);
});
test("returning to the menu clears progress and keeps the timer stopped", () => {
  const s = new GameState();
  s.reset();
  s.patch({
    level: 2,
    collected: 8,
    local: 2,
    lives: 1,
    elapsed: 55000,
    shield: true,
    speed: 4,
  });
  s.reset("intro");
  s.tick(3000);
  assert.equal(s.value.phase, "intro");
  for (const key of [
    "level",
    "collected",
    "local",
    "elapsed",
    "speed",
  ] as const)
    assert.equal(s.value[key], 0);
  assert.equal(s.value.lives, 3);
  assert.equal(s.value.shield, false);
});

test("final level has three distinct reachable shields and no acceleration pads", () => {
  for (const map of levels)
    assert.ok(
      map.powerups.every((b) => b.kind === "speed" || b.kind === "shield"),
    );
  const shields = levels[2].powerups.filter((b) => b.kind === "shield");
  assert.equal(shields.length, 3);
  assert.equal(new Set(shields.map((b) => `${b.pos.x},${b.pos.y}`)).size, 3);
});
test("the fountain's entire stone base rejects players and enemies from every side", () => {
  const map = levels[1],
    fountain = map.props.find((p) => p.kind === "pond")!;
  for (let y = fountain.y; y < fountain.y + fountain.h; y++)
    for (let x = fountain.x; x < fountain.x + fountain.w; x++)
      assert.equal(canOccupy(map, { x, y }), false);
  const approaches = [
    { pos: { x: fountain.x - 1, y: 10 }, dir: { x: 1, y: 0 } },
    { pos: { x: fountain.x + fountain.w, y: 10 }, dir: { x: -1, y: 0 } },
    { pos: { x: 10, y: fountain.y - 1 }, dir: { x: 0, y: 1 } },
    { pos: { x: 10, y: fountain.y + fountain.h }, dir: { x: 0, y: -1 } },
  ];
  for (const { pos, dir } of approaches) {
    let player = { ...pos };
    const enemy: EnemyMotion = {
      pos: { ...pos },
      id: 0,
      target: null,
      path: [{ x: pos.x + dir.x, y: pos.y + dir.y }],
      wait: 0,
      steps: 0,
      mode: 0,
    };
    for (let frame = 0; frame < 120; frame++) {
      player = moveCardinal(map, player, dir, (PLAYER_SPEED * 1.3) / 60);
      updateEnemy(enemy, [enemy], map, pos, (frame * 1000) / 60, 1 / 60);
      assert.ok(canOccupy(map, player));
      assert.ok(canOccupy(map, enemy.pos));
    }
    assert.ok(
      Math.abs((player.x - pos.x) * dir.x + (player.y - pos.y) * dir.y) <= 0.28,
    );
  }
  const route = pathfind(map, { x: 7, y: 10 }, { x: 13, y: 10 });
  assert.ok(
    route.length > 6,
    "Routes must go around the fountain rather than underneath",
  );
});

test("shield lasts ten seconds, clears on absorption, and resets with the game", () => {
  const bonus = new PowerupSystem(),
    game = new GameState(),
    damage = new DamageSystem();
  bonus.activateShield(2500);
  assert.equal(bonus.shieldRemaining(2500), 10);
  assert.equal(bonus.expireShield(12499), false);
  assert.ok(bonus.shieldRemaining(12499) > 0);
  assert.equal(bonus.expireShield(12500), true);
  assert.equal(bonus.shieldRemaining(12500), 0);
  assert.equal(bonus.expireShield(13000), false);
  game.reset();
  game.patch({ shield: true, shieldSeconds: 10 });
  bonus.activateShield(13000);
  assert.equal(damage.hit(game, 13000)?.absorbed, true);
  bonus.clearShield();
  assert.equal(game.value.shieldSeconds, 0);
  assert.equal(game.value.lives, 3);
  assert.equal(bonus.expireShield(24000), false);
  bonus.activateShield(25000);
  bonus.reset();
  assert.equal(bonus.shieldEnd, 0);
  game.patch({ shield: true, shieldSeconds: 8 });
  game.reset("intro");
  assert.equal(game.value.shieldSeconds, 0);
  assert.equal(game.value.shield, false);
});
