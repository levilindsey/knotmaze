// K1324 s2 (K1331): the tracked fixture of self_bury.test.ts. muse_hash (the census scene) with its numbers
// rounded to D decimals (the look kept), gzipped, then x22's band points on it: every run and ghost border
// point of the spot's chain within r of (x, y), with the burial rule off and on (what the test asserts).
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_fixture.ts <scene.json> <D> <out.json.gz> <x> <y> [r]
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";

const [src, dArg, out, xs, ys, rs] = process.argv.slice(2);
const q = 10 ** Number(dArg);
const round = (v: unknown): unknown => {
  if (typeof v === "number") return Number.isInteger(v) ? v : Math.round(v * q) / q;
  if (Array.isArray(v)) return v.map(round);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "look" ? x : round(x)]));
  return v;
};
const sc0 = round(JSON.parse(readFileSync(src, "utf8"))) as SceneIn;
writeFileSync(out, gzipSync(Buffer.from(JSON.stringify(sc0), "utf8"), { level: 9 }));
const sc = { ...sc0, look: { ...sc0.look } } as SceneIn; (sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = frame(structure(sc), sc); const zz = D.zChains(sc);
const h = table.h; const W = table.W; const zt = 0.1 * sc.look.depthAmp;
const x0 = Number(xs); const y0 = Number(ys); const r = Number(rs ?? 0.35);
D.buryOpts.on = false; const off = D.tieAlpha(zz, h, W, zt);
D.buryOpts.on = true; const on = D.tieAlpha(zz, h, W, zt);
table.pieces.forEach((p, pi) => {
  if (!(p.kind === "run" || p.kind === "ghost") || p.chain < 0) return;
  const C = zz.zc[p.chain]; const np = p.pts.length / 2;
  const cum = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
  const L = cum[np - 1] || 1;
  for (let i = 0; i < np; i++) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.hypot(x - x0, y - y0) > r) continue;
    const s = D.footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
    D.buryOpts.on = false; const a0 = off(p.chain, x, y, s, h); D.buryOpts.on = true; const a1 = on(p.chain, x, y, s, h);
    if (a0 < 0.999 || a1 < 0.999) console.log(`p${pi} ${p.kind} ch ${p.chain} i${i} (${x.toFixed(3)},${y.toFixed(3)}) s ${s.toFixed(3)}: off ${a0.toFixed(3)} on ${a1.toFixed(3)}`);
  }
});
console.log(`wrote ${out}; h ${h} W ${W} zt ${zt}`);
