// Fixed 2:1 projection for the expanded, single-screen district.
export const TILE_WIDTH = 44;
export const TILE_HEIGHT = 22;
export const iso = (x: number, y: number) => ({
  x: 500 + (x - y) * 22,
  y: 140 + (x + y) * 11,
});
export const uniso = (x: number, y: number) => ({
  x: ((x - 500) / 22 + (y - 140) / 11) / 2,
  y: ((y - 140) / 11 - (x - 500) / 22) / 2,
});
