export class PowerupSystem {
  shieldEnd = 0;
  end = 0;
  factor = 1;
  activate(_kind: "speed", now: number) {
    this.factor = 1.3;
    this.end = now + 6000;
  }
  activateShield(now: number) {
    this.shieldEnd = now + 10000;
  }
  shieldRemaining(now: number) {
    return Math.max(0, (this.shieldEnd - now) / 1000);
  }
  expireShield(now: number) {
    if (this.shieldEnd > 0 && now >= this.shieldEnd) {
      this.clearShield();
      return true;
    }
    return false;
  }
  clearShield() {
    this.shieldEnd = 0;
  }
  remaining(now: number) {
    return Math.max(0, (this.end - now) / 1000);
  }
  multiplier(now: number) {
    return now < this.end ? this.factor : 1;
  }
  expire(now: number) {
    if (now >= this.end && this.factor > 1) {
      this.factor = 1;
      return true;
    }
    return false;
  }
  reset() {
    this.clearShield();
    this.end = 0;
    this.factor = 1;
  }
}
