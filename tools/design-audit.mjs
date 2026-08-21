#!/usr/bin/env node
// Diffs the Figma file against the app's design tokens.
//
// "Does the app match the design?" is not answerable by eye across 143 frames
// and 61 routes, so this answers it mechanically: pull every colour, text size
// and corner radius the design actually uses, do the same for the code, and
// report what exists in one and not the other.
//
//   node tools/design-audit.mjs            # fetches, needs FIGMA_TOKEN in server/.env
//   node tools/design-audit.mjs cached.json
//
// The Figma file endpoint is rate limited and this pulls ~17MB, so the fetched
// copy is kept and can be replayed by passing it as an argument.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_KEY = "xXUAZv462DiWdb4VVLJQDM";
const hex = (c) =>
  "#" +
  [c.r, c.g, c.b]
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("");

async function loadFigma(arg) {
  if (arg && fs.existsSync(arg)) return JSON.parse(fs.readFileSync(arg, "utf8"));
  const env = fs.readFileSync(path.join(ROOT, "server", ".env"), "utf8");
  const token = env.split("\n").find((l) => l.startsWith("FIGMA_TOKEN="))?.split("=")[1]?.trim();
  if (!token) throw new Error("FIGMA_TOKEN missing from server/.env");
  const r = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!r.ok) throw new Error(`Figma responded ${r.status}` + (r.status === 429 ? " (rate limited — retry later, or pass a cached file)" : ""));
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(path.join(ROOT, "tools", ".figma-cache.json"), buf);
  return JSON.parse(buf.toString("utf8"));
}

function fromFigma(doc) {
  const fills = new Map(), sizes = new Map(), radii = new Map(), fonts = new Map();
  const bump = (m, k) => k != null && m.set(k, (m.get(k) ?? 0) + 1);
  for (const page of doc.document.children)
    for (const top of page.children ?? [])
      (function walk(n) {
        for (const f of n.fills ?? [])
          if (f.type === "SOLID" && f.visible !== false && f.color) bump(fills, hex(f.color));
        if (n.style?.fontSize) bump(sizes, Math.round(n.style.fontSize));
        if (n.style?.fontFamily) bump(fonts, `${n.style.fontFamily} ${n.style.fontWeight ?? ""}`.trim());
        if (typeof n.cornerRadius === "number") bump(radii, Math.round(n.cornerRadius));
        (n.children ?? []).forEach(walk);
      })(top);
  return { fills, sizes, radii, fonts };
}

function fromCode() {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx|css)$/.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, "web"));

  const fills = new Map(), sizes = new Map(), radii = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/#[0-9a-fA-F]{6}\b/g)) bump(fills, m[0].toLowerCase());
    for (const m of s.matchAll(/text-\[(\d+)px\]/g)) bump(sizes, Number(m[1]));
    for (const m of s.matchAll(/rounded-\[(\d+)px\]/g)) bump(radii, Number(m[1]));
  }
  return { fills, sizes, radii, files: files.length };
}

const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const pct = (a, b) => (b === 0 ? "0" : Math.round((a / b) * 100));

let doc;
try {
  doc = await loadFigma(process.argv[2]);
} catch (err) {
  console.error(`
  ${err.message}
`);
  process.exit(1);
}
const fig = fromFigma(doc);
const code = fromCode();

console.log(`\nDESIGN AUDIT — ${code.files} source files vs the Figma file\n${"=".repeat(60)}`);

for (const [label, key] of [["COLOURS", "fills"], ["TEXT SIZES", "sizes"], ["CORNER RADII", "radii"]]) {
  const F = fig[key], C = code[key];
  const inBoth = [...C.keys()].filter((k) => F.has(k));
  const codeOnly = [...C.keys()].filter((k) => !F.has(k));
  console.log(`\n${label}`);
  console.log(`  design uses ${F.size} distinct · code uses ${C.size} distinct`);
  console.log(`  in both: ${inBoth.length}   in code but NOT in the design: ${codeOnly.length} (${pct(codeOnly.length, C.size)}%)`);
  if (codeOnly.length) {
    const ranked = codeOnly.map((k) => [k, C.get(k)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log("  worst offenders (value × uses):");
    ranked.forEach(([k, n]) => console.log(`    ${String(k).padEnd(10)} ${n}`));
  }
}

console.log("\nDESIGN'S OWN SCALE (what the app should be using)");
console.log("  text sizes: " + top(fig.sizes, 10).map(([k, n]) => `${k}px(${n})`).join(" "));
console.log("  radii:      " + top(fig.radii, 8).map(([k, n]) => `${k}(${n})`).join(" "));
console.log("  fonts:      " + top(fig.fonts, 5).map(([k, n]) => `${k}(${n})`).join(", "));
console.log("  top colours:" + top(fig.fills, 8).map(([k, n]) => ` ${k}(${n})`).join(""));
console.log();
