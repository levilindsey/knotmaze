// K1220 S6: Done 1 + Done 2 per fork and state, image-based (no geom).
//   node statemask.mjs <shotsRoot>
// For every build (base, s4, mine), fork and state (rest, pluck,
// flow_a = flow 2.5, flow_b = flow 4.1):
//   Done1: pixels in the 6 fh fork box where the build's own nofans
//     frame of that state is ink and |state - state_nofans| > 4 in a
//     channel (the fan repainting a ribbon it covers).
// For mine additionally, per fork and state:
//   bump: mine ink more than 1 px outside the closing of mine's
//     nofans ink by a disc of 1 fh.
//   tooth: baseline ink where mine is background, excluding the
//     baseline's bump pixels (its ink more than 1 px outside the
//     closing of its own nofans ink). For ai_xh2 the count is also
//     given with the west 1 fh strip of the box excluded (the
//     neighbouring a fork's fan cluster, named by S4/S5 and the
//     brief).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";

const ROOT = process.argv[2] || "out/shots";
const FORKS = [
  ["i_xh3", 0], ["i_xh2", 0], ["ai_xh3", 2], ["ai_xh2", 2],
  ["ia_xh3", 0], ["ia_xh2", 0], ["ii_xh3", 0], ["ii_xh3", 1], ["ii_xh2", 0], ["ii_xh2", 1],
];
const STATES = ["rest", "pluck", "flow_a", "flow_b"];
function load(p) { return toRGB(decodePNG(readFileSync(p))); }
function bgOf(im) {
  const px = [];
  for (const [x0, y0] of [[0, 0], [im.W - 40, 0], [0, im.H - 40], [im.W - 40, im.H - 40]])
    for (let y = y0; y < y0 + 40; y += 4) for (let x = x0; x < x0 + 40; x += 4) {
      const o = (y * im.W + x) * 3; px.push([im.data[o], im.data[o + 1], im.data[o + 2]]);
    }
  px.sort((a, b) => a[0] - b[0]);
  return px[px.length >> 1];
}
function stateFiles(label, stand, ji, state) {
  if (state === "rest") return [join(ROOT, label, stand, "rest.png"), join(ROOT, label, stand, "nofans.png")];
  if (state === "pluck") return [join(ROOT, label, `${stand}_pluck`, `pluck_ji${ji}.png`), join(ROOT, label, `${stand}_pluck`, `pluck_ji${ji}_nofans.png`)];
  return [join(ROOT, label, `${stand}_flow`, `${state}.png`), join(ROOT, label, `${stand}_flow`, `${state}_nofans.png`)];
}
function closing(ink, W, H, rpx) {
  const offs = [];
  for (let dy = -rpx; dy <= rpx; dy++) for (let dx = -rpx; dx <= rpx; dx++)
    if (dx * dx + dy * dy <= rpx * rpx) offs.push([dx, dy]);
  const dil = new Uint8Array(W * H), clo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!ink[y * W + x]) continue;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ok = 1;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; // outside the box counts as filled (ribbons run past it)
      if (!dil[yy * W + xx]) { ok = 0; break; }
    }
    clo[y * W + x] = ok;
  }
  return clo;
}
function dilate1(mask, W, H) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1;
    }
  }
  return out;
}

const frames = {}; // frames[label|stand|state] = {img, nof, meta...}
function getFrame(label, stand, ji, state) {
  const key = state === "pluck" ? `${label}|${stand}|${ji}|${state}` : `${label}|${stand}|${state}`;
  if (frames[key]) return frames[key];
  const meta = JSON.parse(readFileSync(join(ROOT, label, stand, "meta.json"), "utf8"));
  const [a, b] = stateFiles(label, stand, ji, state);
  const img = load(a), nof = load(b);
  const bg = bgOf(nof);
  const rec = meta.recs.find((r) => r.ji === ji);
  const dsf = meta.dsf, s = meta.view.s;
  const fh = meta.fh;
  const cx = rec.sx * dsf, cy = rec.sy * dsf;
  const R = 6 * fh * s * dsf;
  const box = {
    x0: Math.max(0, Math.round(cx - R)), x1: Math.min(img.W, Math.round(cx + R)),
    y0: Math.max(0, Math.round(cy - R)), y1: Math.min(img.H, Math.round(cy + R)),
  };
  const W = box.x1 - box.x0, H = box.y1 - box.y0;
  const inkOf = (im) => {
    const m = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = ((box.y0 + y) * im.W + box.x0 + x) * 3;
      m[y * W + x] = Math.hypot(im.data[o] - bg[0], im.data[o + 1] - bg[1], im.data[o + 2] - bg[2]) > 40 ? 1 : 0;
    }
    return m;
  };
  const ink = inkOf(img), inkN = inkOf(nof);
  const rpx = Math.max(1, Math.round(fh * s * dsf));
  const clo = closing(inkN, W, H, rpx);
  const cloD = dilate1(clo, W, H);
  let d1 = 0, d1max = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inkN[y * W + x]) continue;
    const o = ((box.y0 + y) * img.W + box.x0 + x) * 3;
    const d = Math.max(Math.abs(img.data[o] - nof.data[o]), Math.abs(img.data[o + 1] - nof.data[o + 1]), Math.abs(img.data[o + 2] - nof.data[o + 2]));
    if (d > 4) { d1++; if (d > d1max) d1max = d; }
  }
  let bump = 0;
  const bumpPts = [];
  for (let i = 0; i < W * H; i++) if (ink[i] && !cloD[i]) { bump++; if (bumpPts.length < 6) bumpPts.push([box.x0 + (i % W), box.y0 + Math.floor(i / W)]); }
  const fr = { img, nof, bg, box, W, H, ink, inkN, cloD, d1, d1max, bump, bumpPts, fhPx: fh * s * dsf };
  frames[key] = fr;
  return fr;
}

for (const label of ["base", "s4", "mine"]) {
  for (const state of STATES) {
    const parts = [];
    for (const [stand, ji] of FORKS) {
      try {
        const f = getFrame(label, stand, ji, state);
        parts.push(`${stand} ji${ji}: ${f.d1} (max ${f.d1max})`);
      } catch (e) { parts.push(`${stand} ji${ji}: MISSING`); }
    }
    console.log(`Done1 ${label} ${state}: ` + parts.join(" | "));
  }
}
for (const state of STATES) {
  for (const [stand, ji] of FORKS) {
    try {
      const mine = getFrame("mine", stand, ji, state);
      const base = getFrame("base", stand, ji, state);
      let tooth = 0, toothEx = 0;
      const strip = Math.round(mine.fhPx);
      for (let y = 0; y < mine.H; y++) for (let x = 0; x < mine.W; x++) {
        const i = y * mine.W + x;
        if (base.ink[i] && !mine.ink[i] && base.cloD[i]) {
          tooth++;
          if (!(stand === "ai_xh2" && x < strip)) toothEx++;
        }
      }
      console.log(`Done2 mine ${state} ${stand} ji${ji}: bump=${mine.bump} ${JSON.stringify(mine.bumpPts)} tooth=${tooth}` + (stand === "ai_xh2" ? ` toothExWestStrip=${toothEx}` : ""));
    } catch (e) { console.log(`Done2 mine ${state} ${stand} ji${ji}: MISSING (${e.message})`); }
  }
}
