// Everything is synthesized locally. No files, requests or autoplay.
export class RetroAudio {
  context: AudioContext | null = null;
  muted = false;
  musicTimer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  start() {
    if (!this.context) this.context = new AudioContext();
    void this.context.resume();
    if (!this.musicTimer)
      this.musicTimer = setInterval(() => {
        const notes = [
          220, 0, 329.63, 261.63, 0, 293.66, 196, 0, 220, 329.63, 392, 0,
          349.23, 293.66, 261.63, 196,
        ];
        this.tone(notes[this.step++ % notes.length], 0.16, 0.025, "triangle");
      }, 260);
  }
  tone(
    freq: number,
    duration = 0.1,
    volume = 0.07,
    type: OscillatorType = "square",
  ) {
    if (
      this.muted ||
      !freq ||
      !this.context ||
      this.context.state !== "running"
    )
      return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  effect(kind: string) {
    const notes =
      kind === "damage"
        ? [160, 110]
        : kind === "over"
          ? [260, 220, 170, 100]
          : kind === "victory"
            ? [330, 440, 550, 660, 880]
            : kind === "level"
              ? [330, 440, 660]
              : kind === "power"
                ? [440, 660, 880]
                : [660, 880];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.15, 0.06), i * 90));
  }
  suspend() {
    if (this.context) void this.context.suspend();
  }
  resume() {
    if (this.context) void this.context.resume();
  }
  destroy() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.context) void this.context.close();
  }
}
