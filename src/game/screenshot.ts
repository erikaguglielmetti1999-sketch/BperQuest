import { timeString } from "./model";
export const EMAIL = "digitalsharedfunction@bper.it";
export const SUBMISSION =
  "Fai uno screenshot della schermata e mandalo alla mail digitalsharedfunction@bper.it";
export const DEADLINE =
  "Verranno considerate solo le mail inviate prima del 31/10";
export async function createScreenshot(elapsed: number, trophy?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#1c142d";
  c.fillRect(0, 0, 1200, 900);
  c.strokeStyle = "#667b9d";
  c.lineWidth = 2;
  c.strokeRect(36, 36, 1128, 828);
  for (let i = 0; i < 45; i++) {
    c.fillStyle = i % 2 ? "#c9aa70" : "#659c8d";
    c.fillRect(70 + ((i * 127) % 1060), 65 + ((i * 79) % 570), 5, 5);
  }
  c.textAlign = "center";
  c.fillStyle = "#8fb6a4";
  c.font = "bold 20px monospace";
  c.fillText("UNA NOTTE DI HALLOWEEN", 600, 107);
  c.fillStyle = "#f4e8cc";
  c.font = "bold 72px Georgia";
  c.fillText("BPER QUEST", 600, 193);
  if (trophy) {
    const image = new Image();
    image.src = trophy;
    await image.decode();
    c.imageSmoothingEnabled = false;
    c.drawImage(image, 552, 226, 96, 108);
  }
  c.fillStyle = "#dfbe7c";
  c.font = "bold 42px monospace";
  c.fillText("MISSIONE COMPIUTA!", 600, 405);
  c.fillStyle = "#f4e8cc";
  c.font = "26px monospace";
  c.fillText("Hai raccolto tutti e 10 gli oggetti!", 600, 453);
  c.font = "bold 24px monospace";
  c.fillText("OGGETTI RACCOLTI: 10/10", 600, 508);
  c.fillStyle = "#8be1d5";
  c.font = "bold 55px monospace";
  c.fillText(`TEMPO FINALE: ${timeString(elapsed)}`, 600, 592);
  c.fillStyle = "#dfdccc";
  c.font = "22px sans-serif";
  c.fillText(
    "Fai uno screenshot della schermata e mandalo alla mail",
    600,
    705,
  );
  c.fillStyle = "#8be1d5";
  c.font = "bold 29px sans-serif";
  c.fillText(EMAIL, 600, 750);
  c.fillStyle = "#dfdccc";
  c.font = "22px sans-serif";
  c.fillText(DEADLINE, 600, 800);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Impossibile creare lo screenshot");
  return blob;
}
export async function saveScreenshot(elapsed: number, trophy?: string) {
  const blob = await createScreenshot(elapsed, trophy);
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `BPER-QUEST-${timeString(elapsed).replace(":", "-")}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
