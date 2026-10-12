import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import { QuestScene } from "./game/scene";
import { state, Direction, LEVEL_NAMES, timeString } from "./game/model";
import { saveScreenshot, SUBMISSION, DEADLINE } from "./game/screenshot";
import "./style.css";
const icons: Record<string, string> = {};
function Pixel({
  name,
  size = 32,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`pixel ${className}`}
      src={icons[name]}
      alt=""
      width={size}
      height={size}
    />
  );
}
function App() {
  const s = useSyncExternalStore(state.subscribe, state.snapshot),
    mount = useRef<HTMLDivElement>(null),
    scene = useRef<QuestScene | null>(null),
    primary = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");
  useEffect(() => {
    const onReady = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      scene.current = detail.scene;
      Object.assign(icons, detail.art);
      setReady(true);
      if (import.meta.env.DEV) {
        (window as unknown as { __QUEST__: unknown }).__QUEST__ = {
          scene: detail.scene,
          state,
        };
        if (new URLSearchParams(location.search).has("qa"))
          void import("./game/browserQA").then((m) =>
            m.installQA(detail.scene),
          );
      }
    };
    window.addEventListener("quest-ready", onReady);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mount.current!,
      width: 1000,
      height: 700,
      backgroundColor: "#1c142d",
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      scene: QuestScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { preserveDrawingBuffer: true },
      input: { keyboard: { capture: [37, 38, 39, 40, 32] } },
    });
    return () => {
      window.removeEventListener("quest-ready", onReady);
      game.destroy(true);
    };
  }, []);
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [s.phase, ready]);
  const start = () => scene.current?.start();
  const touch = (direction: Direction | null) => {
    if (scene.current) scene.current.touch = direction;
  };
  const exportPNG = async () => {
    setExporting(true);
    setExportError("");
    try {
      await saveScreenshot(s.elapsed, icons.trophy);
    } catch {
      setExportError("Salvataggio non riuscito. Riprova.");
    } finally {
      setExporting(false);
    }
  };
  const audioButton = (
    <button
      className="icon-button"
      onClick={() => scene.current?.mute()}
      aria-label={s.muted ? "Attiva audio" : "Disattiva audio"}
      title={s.muted ? "Attiva audio" : "Disattiva audio"}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 9h4l5-4v14l-5-4H3z" />
        {s.muted ? (
          <path d="m16 8 6 8m0-8-6 8" />
        ) : (
          <path d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" />
        )}
      </svg>
    </button>
  );
  return (
    <main className={`app phase-${s.phase}`}>
      {s.phase !== "intro" && (
        <div className="hud" aria-label="Stato della partita">
          <div className="hearts" aria-label={`${s.lives} vite rimaste`}>
            {[0, 1, 2].map((i) => (
              <Pixel
                key={i}
                name="heart"
                size={26}
                className={i >= s.lives ? "lost" : ""}
              />
            ))}
          </div>
          <div className="level">
            <strong>LIVELLO {s.level + 1}/3</strong>
            <span>{LEVEL_NAMES[s.level]}</span>
          </div>
          <div className="objects">
            <Pixel name="object9" size={25} />
            <span aria-label={`${s.collected} oggetti raccolti su 10`}>
              {s.collected}
              <small>/10</small>
            </span>
          </div>
          <div className="timer" aria-label={`Tempo ${timeString(s.elapsed)}`}>
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="13" r="8" />
              <path d="M9 2h6m-3 6v5l3 2" />
            </svg>
            {timeString(s.elapsed)}
          </div>
          <div className="hud-actions">
            <button
              className="icon-button"
              onClick={() => scene.current?.toMenu()}
              aria-label="Torna al menu"
              title="Torna al menu · termina la partita"
            >
              <svg
                aria-hidden="true"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-8h6v8" />
              </svg>
            </button>
            {audioButton}
            <button
              className="icon-button"
              onClick={() => scene.current?.pause()}
              disabled={!["playing", "paused"].includes(s.phase)}
              aria-label={s.phase === "paused" ? "Riprendi gioco" : "Pausa"}
            >
              {s.phase === "paused" ? "▷" : "Ⅱ"}
            </button>
          </div>
        </div>
      )}
      <div className="stage">
        <div
          className="canvas-mount"
          ref={mount}
          role="img"
          aria-label="Borgo isometrico nella notte di Halloween"
        />
        {s.phase === "playing" && (
          <>
            <div className="bonus-indicators" aria-live="polite">
              {s.speed > 0 && (
                <span className="speed-bonus">
                  <Pixel name="speed" size={25} />
                  <b>VELOCITÀ +30%</b> {Math.ceil(s.speed)}s
                </span>
              )}
              {s.shield && (
                <span className="shield-bonus">
                  <Pixel name="shield" size={25} />
                  <b>SCUDO</b> · {Math.ceil(s.shieldSeconds)}s
                </span>
              )}
            </div>
            <div className="notification" aria-live="polite">
              {s.notice}
            </div>
          </>
        )}
        {s.phase === "intro" && (
          <div
            className="overlay intro"
            role="dialog"
            aria-labelledby="intro-title"
          >
            <section className="menu-card">
              <Pixel name="player0" size={74} />
              <h1 id="intro-title">
                BPER <span>QUEST</span>
              </h1>
              <p className="welcome">Benvenuto nella notte di Halloween!</p>
              <p className="intro-description">
                Esplora Lucca: piazza, mura e torre. Raccogli 10 tesori e sfuggi
                ai mostriciattoli. Hai solo 3 vite: niente attacchi, conta sulla
                tua agilità.
              </p>
              <div className="instructions">
                <p>
                  <b>WASD / FRECCE</b> per muoverti.
                </p>
                <p>
                  Gli oggetti si raccolgono automaticamente.
                  <br />
                  Più tesori trovi, più mostri incontrerai.
                </p>
              </div>
              <div className="powerup-guide">
                <div>
                  <Pixel name="speed" size={30} />
                  <p>
                    <strong>Fulmine</strong> Corri il 30% più veloce per 6
                    secondi.
                  </p>
                </div>
                <div>
                  <Pixel name="shield" size={30} />
                  <p>
                    <strong>Scudo</strong> Ti protegge dall’attacco di un mostro
                    per un massimo di 10 secondi, poi scompare.
                  </p>
                </div>
              </div>
              <button
                ref={primary}
                className="button primary"
                onClick={start}
                disabled={!ready}
              >
                INIZIA L’AVVENTURA <span aria-hidden="true">→</span>
              </button>
            </section>
          </div>
        )}
        {["transition", "paused", "over", "victory"].includes(s.phase) && (
          <div
            className={`overlay ${s.phase}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-title"
          >
            <section className="menu-card result-card">
              {s.phase === "transition" && (
                <>
                  <Pixel name="object9" size={64} />
                  <h2 id="overlay-title">LIVELLO COMPLETATO!</h2>
                  <p>3 oggetti raccolti!</p>
                  <p className="next-stop">
                    PROSSIMA TAPPA:
                    <br />
                    <b>{LEVEL_NAMES[s.level + 1]}</b>
                  </p>
                  <div className="transition-line" />
                </>
              )}
              {s.phase === "paused" && (
                <>
                  <h2 id="overlay-title">IN PAUSA</h2>
                  <p>Pronto a tornare nella notte?</p>
                  <button
                    ref={primary}
                    className="button primary"
                    onClick={() => scene.current?.pause()}
                  >
                    RIPRENDI <span>▷</span>
                  </button>
                  <p className="small">P / ESC per continuare</p>
                </>
              )}
              {s.phase === "over" && (
                <>
                  <Pixel name="enemy0-0" size={72} />
                  <h2 id="overlay-title">GAME OVER!</h2>
                  <p>I mostriciattoli hanno avuto la meglio!</p>
                  <div className="result-stats">
                    <span>
                      OGGETTI RACCOLTI<b>{s.collected}/10</b>
                    </span>
                    <span>
                      TEMPO<b>{timeString(s.elapsed)}</b>
                    </span>
                  </div>
                  <button
                    ref={primary}
                    className="button primary"
                    onClick={start}
                  >
                    RIPROVA <span>→</span>
                  </button>
                </>
              )}
              {s.phase === "victory" && (
                <>
                  <div className="confetti" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          left: `${(i * 37) % 100}%`,
                          animationDelay: `${i * 0.17}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="celebration">
                    <Pixel name="player0" size={64} />
                    <Pixel name="trophy" size={76} />
                  </div>
                  <h2 id="overlay-title">MISSIONE COMPIUTA!</h2>
                  <p>Hai raccolto tutti e 10 gli oggetti!</p>
                  <div className="final-time">
                    <span>TEMPO FINALE</span>
                    <b>{timeString(s.elapsed)}</b>
                  </div>
                  <div className="submission">
                    <p>{SUBMISSION}</p>
                    <p>{DEADLINE}</p>
                  </div>
                  <button
                    ref={primary}
                    className="button primary"
                    onClick={exportPNG}
                    disabled={exporting}
                  >
                    {exporting ? "SALVATAGGIO…" : "SALVA SCREENSHOT"}{" "}
                    <span>↓</span>
                  </button>
                  <button className="button secondary" onClick={start}>
                    GIOCA ANCORA <span>→</span>
                  </button>
                  {exportError && <p role="alert">{exportError}</p>}
                </>
              )}
            </section>
          </div>
        )}
      </div>
      {s.phase === "playing" && (
        <div className="touch-controls" aria-label="Controlli direzionali">
          {(["left", "up", "down", "right"] as Direction[]).map((dir) => (
            <button
              key={dir}
              className={`direction dir-${dir}`}
              aria-label={
                {
                  up: "Nord-est",
                  left: "Nord-ovest",
                  down: "Sud-ovest",
                  right: "Sud-est",
                }[dir]
              }
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                touch(dir);
              }}
              onPointerUp={() => touch(null)}
              onPointerCancel={() => touch(null)}
              onLostPointerCapture={() => touch(null)}
            >
              {{ up: "↗", left: "↖", down: "↙", right: "↘" }[dir]}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
