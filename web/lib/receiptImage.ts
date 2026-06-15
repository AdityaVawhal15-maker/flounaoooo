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
  ctx.fillText("Radiues", centerX, cardY + bandH - 38);

  // ---- Body ----
  if (data.savedPaise > 0) {
    ctx.fillStyle = MUTED;
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText("I just saved", centerX, 470);

    // Soft glow behind the big number
    ctx.save();
    ctx.shadowColor = "rgba(232, 101, 26, 0.28)";
    ctx.shadowBlur = 50;
    ctx.fillStyle = ACCENT;
    ctx.font = "800 168px Inter, system-ui, sans-serif";
    ctx.fillText(rupees(data.savedPaise), centerX, 620);
    ctx.restore();

    ctx.fillStyle = INK;
    ctx.font = "600 40px Inter, system-ui, sans-serif";
    ctx.fillText("with Radiues", centerX, 690);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText("Radiues picked", centerX, 470);

    ctx.fillStyle = ACCENT;
    ctx.font = "800 110px Inter, system-ui, sans-serif";
    ctx.fillText("the best", centerX, 580);
    ctx.fillText("option", centerX, 690);
  }

  // Hairline divider
  ctx.strokeStyle = BEIGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 140, 728);
  ctx.lineTo(centerX + 140, 728);
  ctx.stroke();

  // What was compared (one or two lines — baseline of the last line returned)
  ctx.fillStyle = INK;
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  const afterCompare = wrapText(
    ctx,
    `Compared ${data.comparedOptions} options across ${data.comparedPlatforms} platforms`,
    centerX,
    792,
    cardW - 160,
    54,
  );

  // Order title chip — below the compare text but clamped so it can never
  // collide with the pinned tagline (chip must end by `chipMaxBottom`).
  const chipH = 68;
  const chipMaxBottom = cardY + cardH - 110; // leave room for the tagline
  const chipY = Math.min(afterCompare + 30, chipMaxBottom - chipH);
  ctx.font = "600 32px Inter, system-ui, sans-serif";
  const clippedTitle =
    data.title.length > 38 ? `${data.title.slice(0, 37)}…` : data.title;
  const chipW = Math.min(cardW - 120, ctx.measureText(clippedTitle).width + 72);
  ctx.fillStyle = "#fdeee4";
  roundRect(ctx, centerX - chipW / 2, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = ACCENT_DARK;
  ctx.textBaseline = "middle";
  ctx.fillText(clippedTitle, centerX, chipY + chipH / 2);
  ctx.textBaseline = "alphabetic";

  // Tagline footer — pinned to the card bottom, always clear of the chip.
  ctx.fillStyle = COCOA;
  ctx.font = "italic 700 36px Inter, system-ui, sans-serif";
  ctx.fillText("Stop searching. Start deciding.", centerX, cardY + cardH - 46);

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
