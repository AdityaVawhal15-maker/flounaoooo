// Renders a branded "decision receipt" card to a PNG Blob using the canvas API.
// No external libs, no server round-trip — every share doubles as an ad.

import { rupees } from "./money";

export type ReceiptData = {
  comparedOptions: number;
  comparedPlatforms: number;
  savedPaise: number;
  domain: "food" | "ride";
  title: string;
};

// Design tokens mirrored from app/globals.css so the image matches the brand.
const CREAM = "#fff9f6";
const INK = "#3d1c00";
const ACCENT = "#e8651a";
const COCOA = "#8b5e3c";
const BEIGE = "#f0e6de";

const W = 1080;
const H = 1080;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Word-wrap helper — returns the y position after the last line.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
  return cursorY;
}

export async function renderReceiptImage(data: ReceiptData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Outer card
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 70, 70, W - 140, H - 140, 48);
  ctx.fill();

  // Accent header band
  ctx.fillStyle = ACCENT;
  roundRect(ctx, 70, 70, W - 140, 200, 48);
  ctx.fill();
  ctx.fillStyle = ACCENT;
  ctx.fillRect(70, 200, W - 140, 70); // square off the band bottom

  // Logo mark (draw the brand triangle so we never depend on an image load)
  drawLogo(ctx, W / 2, 150, 54);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "700 44px Inter, system-ui, sans-serif";
  ctx.fillText("Radiues", W / 2, 240);

  // Headline
  ctx.textAlign = "center";
  const centerX = W / 2;

  if (data.savedPaise > 0) {
    ctx.fillStyle = COCOA;
    ctx.font = "500 38px Inter, system-ui, sans-serif";
    ctx.fillText("I just saved", centerX, 430);

    ctx.fillStyle = ACCENT;
    ctx.font = "800 150px Inter, system-ui, sans-serif";
    ctx.fillText(rupees(data.savedPaise), centerX, 580);

    ctx.fillStyle = INK;
    ctx.font = "500 36px Inter, system-ui, sans-serif";
    ctx.fillText("with Radiues", centerX, 650);
  } else {
    ctx.fillStyle = ACCENT;
    ctx.font = "800 84px Inter, system-ui, sans-serif";
    ctx.fillText("Best pick,", centerX, 520);
    ctx.fillText("decided.", centerX, 620);
  }

  // What was compared
  ctx.fillStyle = INK;
  ctx.font = "600 40px Inter, system-ui, sans-serif";
  wrapText(
    ctx,
    `Radiues compared ${data.comparedOptions} options across ${data.comparedPlatforms} platforms`,
    centerX,
    760,
    W - 280,
    54,
  );

  // Order title chip
  ctx.fillStyle = BEIGE;
  const chipW = Math.min(W - 220, ctx.measureText(data.title).width + 100);
  roundRect(ctx, centerX - chipW / 2, 850, chipW, 70, 35);
  ctx.fill();
  ctx.fillStyle = COCOA;
  ctx.font = "600 32px Inter, system-ui, sans-serif";
  const clippedTitle =
    data.title.length > 38 ? `${data.title.slice(0, 37)}…` : data.title;
  ctx.fillText(clippedTitle, centerX, 895);

  // Tagline
  ctx.fillStyle = COCOA;
  ctx.font = "italic 600 36px Inter, system-ui, sans-serif";
  ctx.fillText("Stop searching. Start deciding.", centerX, 990);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95),
  );
}

// Recreates the interlocking-triangle logo so the card is self-contained.
function drawLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.16;
  ctx.lineJoin = "round";
  const h = size * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + size, cy + h * 0.7);
  ctx.lineTo(cx - size, cy + h * 0.7);
  ctx.closePath();
  ctx.stroke();
  // inner notch
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.2);
  ctx.lineTo(cx + size * 0.5, cy + h * 0.55);
  ctx.lineTo(cx - size * 0.5, cy + h * 0.55);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
