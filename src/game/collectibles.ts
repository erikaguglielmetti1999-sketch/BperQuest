import { Point, distance } from "./model";
import { Level } from "./levels";
export function objectiveSpawn(
  map: Level,
  index: number,
  player: Point,
  enemies: Point[],
): Point | null {
  const desired = map.objectives[index];
  if (!desired) return null;
  const safe = (p: Point) =>
    enemies.every((e) => distance(p, e) > 1.5) && distance(p, player) > 1.3;
  const pos = safe(desired)
    ? desired
    : [...map.spawns]
        .filter(safe)
        .sort((a, b) => distance(a, desired) - distance(b, desired))[0];
  return pos ? { ...pos } : null;
}
