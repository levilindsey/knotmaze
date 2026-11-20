// K1482 s30: every run-on (gapRunOn) the gap bake tags on link A, from s27's DUMPGW + SCENE + sites dumps (this
// worktree's src). Groups the tagged slots by (under chain, over chain, anchor, side) and prints each group's device
// position (first slot, anchor), the under chain's open/closed state, its kept count and the anchor's distance in
// kept samples from the chain's ends.
//   npx tsx runs30.ts <gw.json> <scene.json> <sites.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , gp, sp, sitesP, op] = process.argv;
const G = dec(JSON.parse(readFileSync(gp, "utf8")));
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const aa = 0.011738963274354473;
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); const fade = L.lookFade(G); ev.fadeLength = fade;
const mem = (c: number, k: number): boolean => {
  if (c < 0 || c >= T.cV0.length) return false;
  const v0 = T.cV0[c]; const pad = T.cClosed[c] !== 1 && T.vs[v0] < 0 ? 1 : 0;
  const m = ev.memberAt(c, T.vs[v0 + Math.min(T.cNV[c] - 1, k + pad)]);
  return m.g >= 0 && m.ramp > 0;
};
const fillHalf = G.style.threadWidth / 2;
const src = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf,
  margin: L.lookGap(G), fade, joints: G.junctionArcCtrls,
  jointClear: L.gfJointClear(fillHalf, G.FILLET_REACH_PER_HALF, G.cuspRadius, L.lookGap(G)), overMember: mem,
};
const V: Float32Array = new L.GfGapTable().values(src);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const A = SJ.toDevA;
const dev = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]].map((q) => +q.toFixed(1));
const groups = new Map<string, any>();
let pb = 0;
for (let U = 0; U < G.chainSamples.length; U++) {
  const sm = G.chainSamples[U];
  if (!(sm && sm.count >= 1 && G.kcv[U] && G.kcv[U].nCtrl >= 1)) continue;
  const xy = sm.positions;
  const keptK: number[] = []; let l = -1;
  for (let k = 0; k < sm.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue; keptK.push(k); l = k; }
  const closed = !!G.kcv[U].closed;
  for (let i = 0; i < keptK.length; i++) {
    const y = V[4 * (pb + i) + 1];
    if (!(y >= 0)) continue;
    const jb = Math.floor((y - Math.floor(y)) * 8 + 1e-3);
    if (jb < 4) continue;
    const code = Math.round((y - Math.floor(y) - 0.125 * (jb - 4) - 0.5) * 4096);
    const sd = code >= 64 ? -1 : 1, dl = (code % 64) - 32;
    let ka = i + dl; if (closed) ka = ((ka % keptK.length) + keptK.length) % keptK.length;
    const O = Math.floor(y);
    const key = `${U}:${O}:${ka}:${sd}`;
    let g = groups.get(key);
    if (!g) {
      const k = keptK[Math.max(0, Math.min(keptK.length - 1, ka))];
      g = { U, O, ka, sd, closed, nKept: keptK.length, fromStart: ka, fromEnd: keptK.length - 1 - ka, anchor: dev(xy[2 * k], xy[2 * k + 1]), slots: [] as number[], first: null as any };
      groups.set(key, g);
    }
    g.slots.push(i);
    if (!g.first) g.first = dev(xy[2 * keptK[i]], xy[2 * keptK[i] + 1]);
  }
  pb += sm.count + (closed ? 1 : 0);
}
const out = [...groups.values()];
for (const g of out) console.log(`U ${g.U} O ${g.O} sd ${g.sd} ${g.closed ? "closed" : "open"} kept ${g.nKept} anchor k${g.ka} (start+${g.fromStart} end-${g.fromEnd}) at ${g.anchor} slots ${g.slots[0]}..${g.slots[g.slots.length - 1]} (${g.slots.length}) first ${g.first}`);
writeFileSync(op, JSON.stringify(out));
