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
const ACCENT_DARK = "#d4570f";
const COCOA = "#8b5e3c";
const MUTED = "#a08a78";
const BEIGE = "#f0e6de";

const W = 1080;
const H = 1080;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; br: number; bl: number },
) {
  const rad = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rad.tl, y);
  ctx.lineTo(x + w - rad.tr, y);
  ctx.arcTo(x + w, y, x + w, y + rad.tr, rad.tr);
  ctx.lineTo(x + w, y + h - rad.br);
  ctx.arcTo(x + w, y + h, x + w - rad.br, y + h, rad.br);
  ctx.lineTo(x + rad.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad.bl, rad.bl);
  ctx.lineTo(x, y + rad.tl);
  ctx.arcTo(x, y, x + rad.tl, y, rad.tl);
  ctx.closePath();
}

// Splits text into lines that fit `maxWidth` (measure-only, no drawing).
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}


// Loads the brand logo and recolors its opaque pixels white so it reads on the
// accent band. Returns null if it can't load (we then fall back to a drawn mark).
async function loadWhiteLogo(): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = "/logo.png";
    if (!(await loaded)) return null;

    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 500;
    c.height = img.naturalHeight || 500;
    const cx = c.getContext("2d");
    if (!cx) return null;
    cx.drawImage(img, 0, 0, c.width, c.height);
    // Recolor: keep alpha, paint every visible pixel white.
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = "#ffffff";
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

export async function renderReceiptImage(data: ReceiptData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const logo = await loadWhiteLogo();

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  const M = 64; // outer margin
  const cardX = M;
  const cardY = M;
  const cardW = W - M * 2;
  const cardH = H - M * 2;
  const radius = 56;

  // Card shadow
  ctx.save();
  ctx.shadowColor = "rgba(61, 28, 0, 0.18)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  // Accent header band (gradient) with rounded top corners only
  const bandH = 230;
  const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + bandH);
  grad.addColorStop(0, "#ff8a4c");
  grad.addColorStop(1, ACCENT);
  ctx.fillStyle = grad;
  roundRect(ctx, cardX, cardY, cardW, bandH, {
    tl: radius,
    tr: radius,
    br: 0,
    bl: 0,
  });
  ctx.fill();

  // Logo + wordmark, centered in the band
  const centerX = W / 2;
  const logoSize = 96;
  if (logo) {
    ctx.drawImage(
      logo,
      centerX - logoSize / 2,
      cardY + 36,
      logoSize,
      logoSize,
    );
  } else {
    drawLogo(ctx, centerX, cardY + 84, 52);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "700 50px Inter, system-ui, sans-serif";
  ctx.fillText("Flouna", centerX, cardY + bandH - 38);

  // ---- Body ----
  // Hero block (label / figure / sublabel) sits in the upper area.
  const heroTop = cardY + bandH; // 294
  if (data.savedPaise > 0) {
    ctx.fillStyle = MUTED;
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText("I just saved", centerX, heroTop + 100);

    ctx.save();
    ctx.shadowColor = "rgba(232, 101, 26, 0.28)";
    ctx.shadowBlur = 50;
    ctx.fillStyle = ACCENT;
    ctx.font = "800 150px Inter, system-ui, sans-serif";
    ctx.fillText(rupees(data.savedPaise), centerX, heroTop + 240);
    ctx.restore();

    ctx.fillStyle = INK;
    ctx.font = "600 40px Inter, system-ui, sans-serif";
    ctx.fillText("with Flouna", centerX, heroTop + 310);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText("Flouna picked", centerX, heroTop + 100);

    ctx.fillStyle = ACCENT;
    ctx.font = "800 104px Inter, system-ui, sans-serif";
    ctx.fillText("the best", centerX, heroTop + 210);
    ctx.fillText("option", centerX, heroTop + 310);
  }

  // ---- Lower block: lay out bottom-up so nothing can collide. ----
  // Reserve fixed slots measured from the card bottom.
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  const compareLines = wrapLines(
    ctx,
    `Compared ${data.comparedOptions} options across ${data.comparedPlatforms} apps`,
    cardW - 160,
  );
  const compareLH = 52;
  const chipH = 66;
  const taglineGap = 56; // gap between chip bottom and the tagline baseline
  const lineToChipGap = 28; // gap between compare text and the chip

  // Anchor from the bottom: tagline → chip → compare block → divider.
  const taglineBaseline = cardY + cardH - 48;
  const chipTop = taglineBaseline - taglineGap - chipH;
  const compareBlockH = compareLines.length * compareLH;
  const compareTop = chipTop - lineToChipGap - compareBlockH;

  // Hairline divider sits above the compare block.
  ctx.strokeStyle = BEIGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 140, compareTop - 34);
  ctx.lineTo(centerX + 140, compareTop - 34);
  ctx.stroke();

  // Draw compare lines.
  ctx.fillStyle = INK;
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  compareLines.forEach((line, i) => {
    ctx.fillText(line, centerX, compareTop + compareLH * (i + 1) - 12);
  });

  // Order title chip.
  ctx.font = "600 32px Inter, system-ui, sans-serif";
  const clippedTitle =
    data.title.length > 38 ? `${data.title.slice(0, 37)}…` : data.title;
  const chipW = Math.min(cardW - 120, ctx.measureText(clippedTitle).width + 72);
  ctx.fillStyle = "#fdeee4";
  roundRect(ctx, centerX - chipW / 2, chipTop, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = ACCENT_DARK;
  ctx.textBaseline = "middle";
  ctx.fillText(clippedTitle, centerX, chipTop + chipH / 2);
  ctx.textBaseline = "alphabetic";

  // Tagline footer.
  ctx.fillStyle = COCOA;
  ctx.font = "italic 700 36px Inter, system-ui, sans-serif";
  ctx.fillText("Stop searching. Start deciding.", centerX, taglineBaseline);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95),
  );
}

// Fallback mark if the logo file can't be loaded (offline edge cases).
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
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.2);
  ctx.lineTo(cx + size * 0.5, cy + h * 0.55);
  ctx.lineTo(cx - size * 0.5, cy + h * 0.55);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
