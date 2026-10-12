import { Phase } from "./model";
export class ActiveTimer {
  elapsed = 0;
  tick(delta: number, phase: Phase) {
    if (phase === "playing") this.elapsed += Math.max(0, delta);
    return this.elapsed;
  }
  reset() {
    this.elapsed = 0;
  }
}
