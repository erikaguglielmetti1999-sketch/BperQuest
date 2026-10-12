import { GameState } from "./model";
export class DamageSystem {
  protectedUntil = 0;
  canHit(now: number) {
    return now >= this.protectedUntil;
  }
  hit(state: GameState, now: number) {
    if (!this.canHit(now) || state.value.phase !== "playing") return null;
    const absorbed = state.value.shield;
    state.damage(absorbed);
    this.protectedUntil = now + 2000;
    return { absorbed };
  }
  reset() {
    this.protectedUntil = 0;
  }
}
