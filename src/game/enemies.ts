import { Point, distance } from "./model";
import { Level, pathfind, canOccupy } from "./levels";
export type EnemyMotion = {
  pos: Point;
  id: number;
  target: Point | null;
  path: Point[];
  wait: number;
  steps: number;
  mode: number;
  chasing?: boolean;
  repathAt?: number;
};
export const ENEMY_SPEED = 1.75;
export function updateEnemy(
  e: EnemyMotion,
  all: EnemyMotion[],
  map: Level,
  player: Point,
  now: number,
  dt: number,
) {
  e.wait -= dt;
  const wantsChase =
    e.mode === 2 &&
    distance(e.pos, player) < 4.5 &&
    Math.floor(now / 4500) % 2 === e.id % 2;
  const centered =
    distance(e.pos, { x: Math.round(e.pos.x), y: Math.round(e.pos.y) }) < 0.03;
  if (
    centered &&
    ((wantsChase && (!e.chasing || now > (e.repathAt ?? 0))) ||
      (!wantsChase && e.chasing))
  ) {
    e.path = [];
    e.wait = 0;
    e.chasing = wantsChase;
    e.repathAt = now + 900;
  }
  if (!e.path.length && e.wait <= 0) {
    const chase =
      e.mode === 2 &&
      distance(e.pos, player) < 4.5 &&
      Math.floor(now / 4500) % 2 === e.id % 2;
    let target: Point;
    if (chase) target = { x: Math.round(player.x), y: Math.round(player.y) };
    else if (e.mode === 1)
      target = map.objectives[(e.steps + e.id) % map.objectives.length];
    else {
      const nearby = map.spawns.filter(
        (p) => distance(p, e.pos) > 2 && distance(p, e.pos) < 7,
      );
      target = nearby[(e.id * 19 + e.steps * 13) % nearby.length] ?? map.start;
    }
    e.target = target;
    e.path = pathfind(
      map,
      e.pos,
      target,
      all.filter((o) => o !== e).map((o) => o.path[0] ?? o.pos),
    );
    e.steps++;
    e.wait = chase ? 0.35 : 0.5;
  }
  const next = e.path[0];
  if (!next) return;
  const dx = next.x - e.pos.x,
    dy = next.y - e.pos.y,
    amount = Math.min(ENEMY_SPEED * dt, Math.max(Math.abs(dx), Math.abs(dy)));
  const p = {
    x: e.pos.x + (Math.abs(dx) > 0.01 ? Math.sign(dx) * amount : 0),
    y: e.pos.y + (Math.abs(dx) <= 0.01 ? Math.sign(dy) * amount : 0),
  };
  if (
    all.every((other) => other === e || distance(p, other.pos) > 0.72) &&
    canOccupy(map, p)
  ) {
    e.pos = p;
    if (
      distance(e.pos, next) < 0.03 &&
      all.every((other) => other === e || distance(next, other.pos) > 0.72)
    ) {
      e.pos = { ...next };
      e.path.shift();
    }
  } else {
    e.wait += dt * 2;
    if (e.wait > 1.2) {
      e.path = [];
      e.wait = 0.1;
    }
  }
}
