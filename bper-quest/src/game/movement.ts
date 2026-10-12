import { Direction, Point } from "./model";
import { Level, canOccupy, walkable } from "./levels";
export const PLAYER_SPEED = 3.8;
export function moveCardinal(
  map: Level,
  pos: Point,
  direction: Point,
  amount: number,
): Point {
  // Never allow a diagonal vector, even if an input source supplies one.
  const dx = direction.x !== 0 ? Math.sign(direction.x) : 0,
    dy = dx === 0 ? Math.sign(direction.y) : 0;
  const candidate = { x: pos.x + dx * amount, y: pos.y + dy * amount };
  if (canOccupy(map, candidate)) return candidate;
  // Recenter gently at a corner only when the next cell is genuinely open.
  // Each step still moves along a single axis; walls never trigger assistance.
  const center = { x: Math.round(pos.x), y: Math.round(pos.y) };
  if (!walkable(map, { x: center.x + dx, y: center.y + dy })) return pos;
  const offset = dx ? center.y - pos.y : center.x - pos.x;
  if (Math.abs(offset) > 0.35 || Math.abs(offset) < 0.00001) return pos;
  const nudge = Math.sign(offset) * Math.min(amount, Math.abs(offset));
  const aligned = dx
    ? { x: pos.x, y: pos.y + nudge }
    : { x: pos.x + nudge, y: pos.y };
  return canOccupy(map, aligned) ? aligned : pos;
}
const mapping: Record<string, Direction> = {
  w: "up",
  arrowup: "up",
  s: "down",
  arrowdown: "down",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
};
export function resolveDirection(
  held: Map<string, boolean>,
  order: string[],
  touch: Direction | null,
) {
  if (touch) return touch;
  for (let i = order.length - 1; i >= 0; i--) {
    const dir = mapping[order[i]];
    if (dir && held.get(order[i])) return dir;
  }
  return null;
}
