export type Phase =
  | "intro"
  | "playing"
  | "paused"
  | "transition"
  | "victory"
  | "over";
export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const OBJECTS = [
  "Fumetto raro",
  "Pozione magica",
  "Spada fantasy",
  "Dado D20",
  "Bacchetta magica",
  "Action figure",
  "Carta da collezione",
  "Cristallo magico",
  "Maschera cosplay",
  "Corona dorata",
];
export const LEVEL_NAMES = [
  "Piazza dell’Anfiteatro",
  "Passeggiata sulle Mura",
  "Torre Guinigi",
];
export type Snapshot = {
  phase: Phase;
  level: number;
  lives: number;
  collected: number;
  local: number;
  elapsed: number;
  speed: number;
  shield: boolean;
  shieldSeconds: number;
  muted: boolean;
  notice: string;
  revision: number;
};
export class GameState {
  value: Snapshot = {
    phase: "intro",
    level: 0,
    lives: 3,
    collected: 0,
    local: 0,
    elapsed: 0,
    speed: 0,
    shield: false,
    shieldSeconds: 0,
    muted: false,
    notice: "",
    revision: 0,
  };
  listeners = new Set<() => void>();
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  snapshot = () => this.value;
  patch(p: Partial<Snapshot>) {
    this.value = { ...this.value, ...p, revision: this.value.revision + 1 };
    this.listeners.forEach((f) => f());
  }
  reset(phase: "intro" | "playing" = "playing") {
    this.patch({
      phase,
      level: 0,
      lives: 3,
      collected: 0,
      local: 0,
      elapsed: 0,
      speed: 0,
      shield: false,
      shieldSeconds: 0,
      notice: phase === "playing" ? "La tua avventura comincia!" : "",
    });
  }
  collect() {
    if (this.value.phase !== "playing") return;
    const collected = this.value.collected + 1,
      local = this.value.local + 1;
    this.patch({
      collected,
      local,
      notice: "OGGETTO RACCOLTO!",
      phase:
        collected === 10
          ? "victory"
          : local === 3 && this.value.level < 2
            ? "transition"
            : "playing",
    });
  }
  damage(shield: boolean) {
    if (this.value.phase !== "playing") return;
    if (shield) {
      this.patch({
        shield: false,
        shieldSeconds: 0,
        notice: "SCUDO ASSORBITO!",
      });
      return;
    }
    const lives = Math.max(0, this.value.lives - 1);
    this.patch({
      lives,
      phase: lives === 0 ? "over" : "playing",
      notice: "Attenzione ai mostriciattoli!",
    });
  }
  advance() {
    if (this.value.phase === "transition")
      this.patch({
        level: this.value.level + 1,
        local: 0,
        phase: "playing",
        speed: 0,
        shield: false,
        shieldSeconds: 0,
        notice: "Una nuova tappa ti aspetta!",
      });
  }
  tick(dt: number) {
    if (this.value.phase === "playing")
      this.patch({ elapsed: this.value.elapsed + dt });
  }
}
export const state = new GameState();
export const timeString = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
};
export const enemyCount = (n: number) => (n < 2 ? 1 : n >= 6 ? n - 2 : n);
export { iso, uniso } from "./isometric";
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
