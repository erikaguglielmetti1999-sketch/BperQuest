// Development-only integration harness: imported dynamically only with ?qa=1.
import Phaser from "phaser";
import { QuestScene } from "./scene";
import {
  state,
  distance,
  enemyCount,
  Point,
  vectors,
  Direction,
} from "./model";
import { PLAYER_SPEED } from "./movement";
import { pathfind } from "./levels";
import { createScreenshot } from "./screenshot";
import { textureURL } from "./art";
export function installQA(scene: QuestScene) {
  const button = document.createElement("button");
  button.textContent = "ESEGUI VERIFICA";
  button.id = "qa-run";
  Object.assign(button.style, {
    position: "fixed",
    right: "12px",
    bottom: "12px",
    zIndex: "100",
    padding: "12px",
    background: "#eee7d5",
    color: "#101f29",
  });
  document.body.append(button);
  const previews = document.createElement("div");
  Object.assign(previews.style, {
    position: "fixed",
    right: "12px",
    top: "12px",
    zIndex: "100",
    display: "flex",
    gap: "6px",
  });
  ["CITTÀ", "PARCO", "TORRE"].forEach((name, index) => {
    const choice = document.createElement("button");
    choice.textContent = `ANTEPRIMA ${name}`;
    choice.onclick = () => {
      scene.start();
      state.patch({ level: index, collected: index * 3, local: 0, notice: "" });
      scene.loadLevel();
      scene.invincible = Infinity;
      scene.audio.suspend();
      scene.scene.pause();
    };
    previews.append(choice);
  });
  const fountainPreview = document.createElement("button");
  fountainPreview.textContent = "VERIFICA FONTANA";
  fountainPreview.onclick = () => {
    scene.start();
    state.patch({ level: 1, collected: 3, local: 0, notice: "" });
    scene.loadLevel();
    scene.player.pos = { x: 7.25, y: 10 };
    scene.renderActor(scene.player);
    const positions = [
      { x: 10, y: 7.25 },
      { x: 12.75, y: 10 },
      { x: 10, y: 12.75 },
    ];
    scene.enemies.forEach((enemy, i) => {
      enemy.pos = positions[i];
      scene.renderActor(enemy);
    });
    scene.audio.suspend();
    scene.scene.pause();
  };
  previews.append(fountainPreview);
  document.body.append(previews);
  button.onclick = async () => {
    button.disabled = true;
    const out = document.createElement("pre");
    out.id = "qa-results";
    Object.assign(out.style, {
      position: "fixed",
      left: "12px",
      top: "12px",
      maxHeight: "90vh",
      overflow: "auto",
      zIndex: "100",
      background: "#071c22ee",
      color: "#cbebd6",
      padding: "15px",
      fontSize: "11px",
      maxWidth: "300px",
      pointerEvents: "none",
    });
    document.body.append(out);
    const check = (ok: boolean, msg: string) => {
      out.textContent += `${ok ? "PASS" : "FAIL"} ${msg}\n`;
      if (!ok) throw new Error(msg);
    };
    const pump = (ms: number) => {
      for (let t = 0; t < ms; t += 16.6667)
        scene.update(0, Math.min(16.6667, ms - t));
    };
    const walk = (goal: Point) => {
      const route = pathfind(scene.map, scene.player.pos, goal);
      check(
        route.length > 0 || distance(goal, scene.player.pos) < 0.6,
        "Percorso raggiungibile",
      );
      for (const point of route) {
        for (
          let tick = 0;
          tick < 300 && distance(scene.player.pos, point) > 0.01;
          tick++
        ) {
          scene.invincible = scene.simTime + 100000;
          const dx = point.x - scene.player.pos.x,
            dy = point.y - scene.player.pos.y;
          const direction: Direction =
            Math.abs(dx) > 0.01
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up";
          scene.touch = direction;
          const amount = Math.abs(vectors[direction].x ? dx : dy);
          const factor = scene.simTime < scene.speedEnd ? scene.speedFactor : 1;
          scene.update(
            0,
            Math.min(16.6667, (amount / (PLAYER_SPEED * factor)) * 1000),
          );
          if (state.value.phase !== "playing") {
            scene.touch = null;
            return;
          }
          checkSeparation();
        }
      }
      scene.touch = null;
    };
    let separation = true;
    const checkSeparation = () => {
      for (let i = 0; i < scene.enemies.length; i++)
        for (let j = i + 1; j < scene.enemies.length; j++)
          if (distance(scene.enemies[i].pos, scene.enemies[j].pos) < 0.71)
            separation = false;
    };
    try {
      check(state.value.phase === "intro", "Intro prima della partita");
      scene.start();
      state.patch({
        level: 2,
        collected: 8,
        lives: 1,
        elapsed: 45000,
        shield: true,
        speed: 3,
      });
      scene.toMenu();
      check(
        state.value.phase === "intro" &&
          state.value.level === 0 &&
          state.value.collected === 0 &&
          state.value.lives === 3 &&
          state.value.elapsed === 0 &&
          !state.value.shield &&
          state.value.speed === 0,
        "Ritorno al menu azzera la partita",
      );
      scene.start();
      scene.scene.pause();
      check(
        state.value.lives === 3 &&
          state.value.collected === 0 &&
          scene.enemies.length === 1,
        "START: tre vite, zero oggetti, un mostro",
      );
      const start = { ...scene.player.pos };
      scene.keys.set("w", true);
      scene.keys.set("d", true);
      scene.keyOrder = ["w", "d"];
      pump(200);
      check(
        scene.player.pos.x > start.x && scene.player.pos.y === start.y,
        "Due tasti: una sola direzione",
      );
      scene.clearInput();
      scene.player.pos = { ...start };
      const obstacle = scene.map.props.find((p) => p.kind === "well")!;
      scene.player.pos = { x: obstacle.x + 1, y: obstacle.y };
      scene.touch = "left";
      pump(500);
      check(
        scene.player.pos.x >= obstacle.x + 0.71,
        "Collisione contro un ostacolo",
      );
      scene.clearInput();
      scene.player.pos = { ...scene.map.start };
      const before = scene.active;
      scene.pause();
      pump(900);
      check(scene.active === before, "Timer fermo in pausa");
      scene.pause();
      scene.player.pos = {
        ...scene.bonuses.find((b) => b.kind === "speed")!.pos,
      };
      pump(30);
      check(scene.speedFactor === 1.3, "Velocità +30%");
      check(
        state.value.notice === "VELOCITÀ +30% · 6 SECONDI",
        "Feedback distinto del fulmine",
      );
      scene.player.pos = { ...scene.map.start };
      scene.invincible = 100000;
      pump(6100);
      check(
        scene.speedFactor === 1 && state.value.speed === 0,
        "Velocità scade dopo sei secondi",
      );
      scene.player.pos = {
        ...scene.bonuses.find((b) => b.kind === "shield")!.pos,
      };
      pump(30);
      check(state.value.shield, "Scudo attivato");
      check(
        state.value.notice === "SCUDO ATTIVO!",
        "Feedback distinto dello scudo",
      );
      check(
        state.value.shieldSeconds > 9 && state.value.shieldSeconds <= 10,
        "Conto alla rovescia dello scudo",
      );
      const shieldEnd = scene.power.shieldEnd;
      const shieldTime = state.value.shieldSeconds;
      scene.pause();
      pump(3000);
      check(
        scene.power.shieldEnd === shieldEnd &&
          state.value.shieldSeconds === shieldTime,
        "Scudo fermo in pausa",
      );
      scene.pause();
      scene.player.pos = { ...scene.map.start };
      pump(9000);
      check(
        state.value.shield &&
          state.value.shieldSeconds > 0 &&
          state.value.shieldSeconds <= 1.1 &&
          scene.power.shieldRemaining(scene.simTime) <= 1,
        "Scudo ancora attivo prima dei dieci secondi",
      );
      pump(1100);
      check(
        !state.value.shield &&
          state.value.shieldSeconds === 0 &&
          state.value.notice === "SCUDO TERMINATO",
        "Scudo scade a dieci secondi",
      );
      const shieldBonus = scene.bonuses.find((b) => b.kind === "shield")!;
      shieldBonus.used = false;
      scene.player.pos = { ...shieldBonus.pos };
      pump(30);
      scene.enemies[0].pos = { ...scene.player.pos };
      scene.enemies[0].path = [];
      scene.invincible = 0;
      pump(20);
      check(
        !state.value.shield &&
          state.value.shieldSeconds === 0 &&
          scene.power.shieldEnd === 0 &&
          state.value.lives === 3,
        "Scudo assorbe un colpo",
      );
      const lives = state.value.lives;
      pump(500);
      check(
        state.value.lives === lives,
        "Invulnerabilità protegge dai colpi ripetuti",
      );
      for (let i = 0; i < 3; i++) {
        scene.enemies[0].pos = { ...scene.player.pos };
        scene.enemies[0].path = [];
        scene.enemies[0].wait = 10;
        scene.invincible = 0;
        scene.update(0, 16.7);
      }
      check(
        state.value.phase === "over" && state.value.lives === 0,
        "GAME OVER a zero vite",
      );
      scene.start();
      check(
        state.value.lives === 3 &&
          state.value.elapsed === 0 &&
          state.value.collected === 0 &&
          scene.enemies.length === 1 &&
          !state.value.shield &&
          scene.speedEnd === 0,
        "RIPROVA ripristina tutto",
      );
      for (let i = 0; i < 10; i++) {
        const target = scene.objectivePos;
        check(!!target, "Un oggetto attivo");
        walk(target!);
        check(state.value.collected === i + 1, `Raccolta ${i + 1}/10`);
        if (state.value.phase === "transition") {
          check(
            state.value.collected === 3 || state.value.collected === 6,
            "Transizione a 3 e 6 oggetti",
          );
          const elapsed = scene.active,
            lives = state.value.lives,
            level = state.value.level;
          scene.update(0, 2501);
          check(
            state.value.level === level + 1 &&
              scene.active === elapsed &&
              state.value.lives === lives,
            "Nuova mappa; vite e tempo preservati",
          );
          check(
            scene.enemies.length === enemyCount(state.value.collected),
            "Numero corretto di mostri nella nuova mappa",
          );
        } else if (state.value.phase === "playing")
          check(
            scene.enemies.length === enemyCount(state.value.collected),
            "Progressione dei mostri",
          );
      }
      check(
        state.value.phase === "victory" && state.value.collected === 10,
        "Vittoria dopo il decimo oggetto",
      );
      check(separation, "Mostri separati durante il percorso completo");
      check(
        scene.cameras.main.scrollX === 0 && scene.cameras.main.scrollY === 0,
        "Camera fissa",
      );
      // Inspect the real Phaser draw order at the fountain's playable rim.
      const savedLevel = state.value.level;
      state.patch({ level: 1 });
      scene.loadLevel();
      const basin = scene.children.getByName(
        "fountain-base",
      ) as Phaser.GameObjects.Image;
      const spout = scene.children.getByName(
        "fountain-spout",
      ) as Phaser.GameObjects.Image;
      for (const pos of [
        { x: 7.25, y: 10 },
        { x: 10, y: 7.25 },
        { x: 12.75, y: 10 },
        { x: 10, y: 12.75 },
      ]) {
        scene.player.pos = pos;
        scene.renderActor(scene.player);
        check(
          basin.depth < scene.player.sprite.depth &&
            basin.depth < scene.player.shadow.depth,
          "PG visibile lungo il bordo della fontana",
        );
        for (const enemy of scene.enemies) {
          enemy.pos = { ...pos };
          scene.renderActor(enemy);
          check(
            basin.depth < enemy.sprite.depth &&
              basin.depth < enemy.shadow.depth,
            "Mostro visibile lungo il bordo della fontana",
          );
        }
      }
      check(spout.depth > basin.depth, "Getto rialzato separato dalla vasca");
      state.patch({ level: savedLevel });
      scene.loadLevel();
      const finalTime = state.value.elapsed;
      pump(1000);
      check(state.value.elapsed === finalTime, "Tempo finale fermo");
      const blob = await createScreenshot(
        finalTime,
        textureURL(scene, "trophy"),
      );
      const image = document.createElement("img");
      image.id = "qa-export";
      image.src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      image.style.display = "none";
      document.body.append(image);
      await image.decode();
      check(
        image.naturalWidth === 1200 &&
          image.naturalHeight === 900 &&
          blob.type === "image/png",
        "PNG 1200×900 valido",
      );
      out.textContent += "VERIFICA BROWSER SUPERATA\n";
      scene.scene.resume();
    } catch (error) {
      out.textContent += `ERRORE ${String(error)}\n`;
      scene.scene.resume();
    }
    if (!new URLSearchParams(location.search).has("report"))
      out.style.display = "none";
    button.style.display = "none";
  };
}
