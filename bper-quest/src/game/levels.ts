import { Point, distance } from "./model";
export type Prop = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
  variant: number;
};
export type Terrain = "stone" | "lawn" | "path" | "water" | "court" | "earth";
export type Level = {
  theme: "town" | "park" | "tower";
  terrain: Terrain[][];
  grid: boolean[][];
  props: Prop[];
  start: Point;
  objectives: Point[];
  powerups: { pos: Point; kind: "speed" | "shield" }[];
  spawns: Point[];
};
export const MAP_SIZE = 20;
export const levels: Level[] = [0, 1, 2].map((i) => {
  // All homes sit behind the playable district. No transparency is needed.
  const grid = Array.from({ length: MAP_SIZE }, (_, y) =>
    Array.from(
      { length: MAP_SIZE },
      (_, x) => x >= 4 && y >= 4 && x < 19 && y < 19,
    ),
  );
  const props: Prop[] = [];
  const add = (
    x: number,
    y: number,
    w: number,
    h: number,
    kind: string,
    variant = 0,
  ) => {
    props.push({ x, y, w, h, kind, variant });
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) grid[yy][xx] = false;
  };
  if (i === 0) {
    for (let j = 0; j < 5; j++) {
      add(1 + j * 4, 1, 2, 2, "house", j % 4);
      if (j > 0) add(1, 1 + j * 4, 2, 2, "house", (j + 1) % 4);
    }
    add(8, 8, 1, 1, "well");
    add(13, 10, 1, 1, "bench");
    add(6, 13, 1, 1, "planter");
    add(15, 6, 1, 1, "crate");
  } else if (i === 1) {
    for (let j = 0; j < 5; j++) {
      add(1 + j * 4, 1, 2, 2, "autumntree", j % 3);
      if (j > 0) add(1, 1 + j * 4, 2, 2, "autumntree", (j + 1) % 3);
    }
    // Include the stone apron in the solid footprint, not just the water.
    add(8, 8, 5, 5, "pond");
    add(6, 10, 1, 1, "bench");
    add(16, 10, 1, 1, "bench");
    [
      [5, 7],
      [11, 5],
      [17, 7],
      [5, 13],
      [13, 16],
      [17, 15],
    ].forEach(([x, y], j) => add(x, y, 1, 1, j % 2 ? "log" : "rock"));
    add(6, 16, 1, 1, "planter");
  } else {
    // The landmark sits outside the playable court, keeping every route visible.
    add(1, 1, 3, 3, "hauntedtower");
    for (let j = 0; j < 4; j++) {
      add(1, 5 + j * 4, 2, 2, "ruinwall");
      add(5 + j * 4, 1, 2, 2, "ruinwall");
    }
    [
      [6, 12],
      [10, 10],
      [14, 7],
      [17, 10],
      [8, 16],
      [13, 14],
      [16, 16],
    ].forEach(([x, y], j) => add(x, y, 1, 1, j % 2 ? "gravestone" : "pillar"));
    add(11, 15, 1, 1, "crate");
  }
  const theme = i === 0 ? "town" : i === 1 ? "park" : "tower";
  const terrain: Terrain[][] = grid.map((row, y) =>
    row.map((free, x) => {
      if (i === 0) return free ? "stone" : "earth";
      if (i === 1) {
        if (x >= 9 && x <= 11 && y >= 9 && y <= 11) return "water";
        return free &&
          (x === 7 ||
            x === 8 ||
            x === 14 ||
            x === 15 ||
            y === 7 ||
            y === 8 ||
            y === 14 ||
            y === 15)
          ? "path"
          : "lawn";
      }
      return free ? "court" : "earth";
    }),
  );
  const candidates: Point[] = [];
  for (let y = 5; y < 18; y++)
    for (let x = 5; x < 18; x++)
      if (
        grid[y][x] &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].filter(([dx, dy]) => grid[y + dy]?.[x + dx]).length >= 3
      )
        candidates.push({ x, y });
  const nearest = (p: Point) =>
    [...candidates].sort((a, b) => distance(a, p) - distance(b, p))[0];
  const desired =
    i === 0
      ? [
          { x: 15, y: 5 },
          { x: 5, y: 11 },
          { x: 16, y: 16 },
        ]
      : i === 1
        ? [
            { x: 6, y: 5 },
            { x: 16, y: 13 },
            { x: 5, y: 17 },
          ]
        : [
            { x: 16, y: 5 },
            { x: 5, y: 8 },
            { x: 17, y: 17 },
            { x: 9, y: 16 },
          ];
  return {
    theme,
    terrain,
    grid,
    props,
    start: nearest({ x: 10, y: 17 }),
    objectives: desired.map(nearest),
    powerups: [
      { pos: nearest({ x: 17, y: 11 }), kind: "speed" },
      { pos: nearest({ x: 5, y: 15 }), kind: "shield" },
      ...(i === 2
        ? [
            { pos: nearest({ x: 7, y: 6 }), kind: "shield" as const },
            { pos: nearest({ x: 15, y: 15 }), kind: "shield" as const },
          ]
        : []),
    ],
    spawns: candidates,
  };
});
export const walkable = (l: Level, p: Point) =>
  !!l.grid[Math.round(p.y)]?.[Math.round(p.x)];
export function pathfind(
  l: Level,
  from: Point,
  to: Point,
  blocked: Point[] = [],
): Point[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y) },
    end = { x: Math.round(to.x), y: Math.round(to.y) };
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [start],
    prev = new Map<string, Point | null>([[key(start), null]]),
    closed = new Set(blocked.map(key));
  for (let n = 0; n < queue.length; n++) {
    const p = queue[n];
    if (key(p) === key(end)) {
      const result: Point[] = [];
      let q: Point | null = p;
      while (q && key(q) !== key(start)) {
        result.unshift(q);
        q = prev.get(key(q)) ?? null;
      }
      return result;
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (walkable(l, q) && !prev.has(key(q)) && !closed.has(key(q))) {
        prev.set(key(q), p);
        queue.push(q);
      }
    }
  }
  return [];
}
export function canOccupy(l: Level, p: Point, r = 0.22) {
  return [
    { x: p.x - r, y: p.y - r },
    { x: p.x + r, y: p.y - r },
    { x: p.x - r, y: p.y + r },
    { x: p.x + r, y: p.y + r },
  ].every((q) => walkable(l, q));
}
