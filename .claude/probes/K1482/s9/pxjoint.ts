// K1482 s9: per removed pixel, the cutting over chain's nearest point (d, offset from the crossing's over arc) and
// that chain's fused joints, plus the pixel's offset along its under chain vs the under chain's joints.
//   node scripts/run_node.mjs pxjoint.ts <gw_gf.json> <sites.json> <removed.json> <site:crossing,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, sp, rp, list] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8"))); const S = JSON.parse(readFileSync(sp, "utf8")); const A = S.toDevA;
const RM = JSON.parse(readFileSync(rp, "utf8")); const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4], arcPer: Gm[c.geom * 4 + 1] }; };
const det = A[0] * A[3] - A[1] * A[2];
const toW = (x: number, y: number) => { const X = x - A[4], Y = y - A[5]; return [(A[3] * X - A[2] * Y) / det, (-A[1] * X + A[0] * Y) / det]; };
const near = (ch: number, wx: number, wy: number) => {
  const sm = G.chainSamples[ch]; const g = geo(ch); let bd = Infinity, ba = 0; const P = sm.positions; const n = sm.count; const m = g.closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n; const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * j], by = P[2 * j + 1]; const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy || 1e-12; let t = ((wx - ax) * vx + (wy - ay) * vy) / L2; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + vx * t - wx, ay + vy * t - wy); if (d < bd) { bd = d; ba = (i + t) * g.arcPer; }
  }
  return [bd, ba];
};
const wrap = (ch: number, d: number) => { const g = geo(ch); if (g.closed) { d = ((d % g.total) + g.total) % g.total; if (d > g.total / 2) d -= g.total; } return d; };
const joints = (ch: number) => (G.junctionArcCtrls?.get(ch) ?? []).map((j: any) => PM.kArcOfCtrl(D, G.kcv[ch], j.ctrl));
for (const it of list.split(",")) {
  const [site, xs] = it.split(":"); const x = G.crossings[+xs];
  const uA = PM.kArcOfCtrl(D, G.kcv[x.underChain], x.underCtrl), oA = PM.kArcOfCtrl(D, G.kcv[x.overChain], x.overCtrl);
  const jo = joints(x.overChain).map((a: number) => wrap(x.overChain, a - oA)).sort((a: number, b: number) => Math.abs(a) - Math.abs(b)).slice(0, 2);
  const ju = joints(x.underChain).map((a: number) => wrap(x.underChain, a - uA)).sort((a: number, b: number) => Math.abs(a) - Math.abs(b)).slice(0, 2);
  const go = geo(x.overChain), gu = geo(x.underChain);
  console.log(`== ${site} x${xs} over ${x.overChain} @${oA.toFixed(2)}/${go.total.toFixed(2)}${go.closed ? "c" : ""} joints ${jo.map((v: number) => v.toFixed(2)).join(",")} | under ${x.underChain} @${uA.toFixed(2)}/${gu.total.toFixed(2)}${gu.closed ? "c" : ""} joints ${ju.map((v: number) => v.toFixed(2)).join(",")}`);
  const rows: string[] = [];
  for (const [X, Y] of RM[site].px) {
    const [wx, wy] = toW(X + 0.5, Y + 0.5); const [dO, aO] = near(x.overChain, wx, wy); const [dU, aU] = near(x.underChain, wx, wy);
    rows.push(`(${X},${Y}) dO ${dO.toFixed(2)} oOff ${wrap(x.overChain, aO - oA).toFixed(2)} | dU ${dU.toFixed(2)} uOff ${wrap(x.underChain, aU - uA).toFixed(2)}`);
  }
  const k = Math.min(rows.length, 5);
  console.log("  " + rows.slice(0, k).join("\n  ") + (rows.length > k ? `\n  ... ${rows.length} px` : ""));
}
