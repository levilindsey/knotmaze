// K365 pair (K156 round 2026-11-09b): the glint ripple at floor 56 (left, blue bar) and floor 68 (right, orange
// bar), cropped at the same tap site from the two runs' frozen-clock shots: pre, t 0.05, 0.15, 0.25, 0.4 s.
// Plus the K1130 noise check: the same frame across the two runs where nothing differs by design (old look, base).
// Run: node k365_pair.mjs <k365 dir> <run56> <run68>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const KIT = pathToFileURL("C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ab935dd12e804fe68/scripts/phone_pass/");
const { decodePNG, toRGB } = await import(new URL("png.mjs", KIT).href);
const { composeSheet } = await import(new URL("sheet.mjs", KIT).href);
const [, , DIR, R56 = "f56_r1", R68 = "f68_r2"] = process.argv;
const img = (run, name) => toRGB(decodePNG(readFileSync(join(DIR, run, "shots", name + ".png"))));
const res = (run) => JSON.parse(readFileSync(join(DIR, run, "results.json"), "utf8"));
const a = res(R56), b = res(R68);
const site = a.variants.glint.shotTap, siteB = b.variants.glint.shotTap;
const CSS = [230, 180];
function crop(im, cx, cy, w, h) {
  const x0 = Math.max(0, Math.min(im.W - w, Math.round(cx - w / 2))), y0 = Math.max(0, Math.min(im.H - h, Math.round(cy - h / 2)));
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) im.data.copy(data, y * w * 3, ((y0 + y) * im.W + x0) * 3, ((y0 + y) * im.W + x0 + w) * 3);
  return { W: w, H: h, data };
}
function up(im, k) {
  const W = im.W * k, H = im.H * k, data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) im.data.copy(data, (y * W + x) * 3, ((Math.floor(y / k)) * im.W + Math.floor(x / k)) * 3, ((Math.floor(y / k)) * im.W + Math.floor(x / k)) * 3 + 3);
  return { W, H, data };
}
function diff(A, B) {
  const W = Math.min(A.W, B.W), H = Math.min(A.H, B.H);
  let any = 0, gt8 = 0, max = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0;
    for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(A.data[(y * A.W + x) * 3 + c] - B.data[(y * B.W + x) * 3 + c]));
    if (m > 0) any++; if (m > 8) gt8++; if (m > max) max = m;
  }
  return { any, gt8, max, size: `${W}x${H}` };
}
const names = ["glint_base", "glint_t0.05", "glint_t0.15", "glint_t0.25", "glint_t0.4"];
const base56 = img(R56, "glint_base");
const sc = base56.W / a.viewport.innerW;
const cw = Math.round(CSS[0] * sc), ch = Math.round(CSS[1] * sc), cx = site.X * sc, cy = site.Y * sc;
const pairs = names.map((n) => ({ n, A: img(R56, n), B: img(R68, n) }));
const cells1 = pairs.map((p) => ({ a: crop(p.A, cx, cy, cw, ch), b: crop(p.B, cx, cy, cw, ch), crop: true }));
const s1 = composeSheet(cells1, join(DIR, "pair_56_vs_68.png"));
const cells2 = pairs.slice(1, 4).map((p) => ({ a: up(crop(p.A, cx, cy, Math.round(120 * sc), Math.round(100 * sc)), 3), b: up(crop(p.B, cx, cy, Math.round(120 * sc), Math.round(100 * sc)), 3), crop: true }));
const s2 = composeSheet(cells2, join(DIR, "pair_56_vs_68_zoom3x.png"));
// K1130: frames the floor cannot change, across the two runs (whole frame and the crop)
const noise = {};
for (const n of ["old_pre", "old_base", "old_t0.05", "old_t0.4", "glint_pre", "glint_base"]) {
  const A = img(R56, n), B = img(R68, n);
  noise[n] = { frame: diff(A, B), crop: diff(crop(A, cx, cy, cw, ch), crop(B, cx, cy, cw, ch)) };
}
// what the floor changes: glint at each age, 56 vs 68 (crop), and each run's glint vs its own base (the ripple's footprint)
const change = {};
for (const p of pairs.slice(1)) {
  const A = crop(p.A, cx, cy, cw, ch), B = crop(p.B, cx, cy, cw, ch);
  change[p.n] = { f56_vs_f68: diff(A, B), f56_vs_own_base: diff(crop(base56, cx, cy, cw, ch), A), f68_vs_own_base: diff(crop(img(R68, "glint_base"), cx, cy, cw, ch), B) };
}
const outp = { R56, R68, site, siteB, scaleShotPxPerCss: +sc.toFixed(3), cropPx: [cw, ch], sheet: s1, zoom: s2, noise, change };
writeFileSync(join(DIR, "pair_56_vs_68.json"), JSON.stringify(outp, null, 1));
console.log(JSON.stringify(outp, null, 1));
