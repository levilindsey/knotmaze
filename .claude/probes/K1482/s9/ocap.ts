// K1482 s9: today's over polyline range per crossing (crossing_gaps.ts oCapNeg / oCapPos: max(0.12, min(overReach 4.5,
// clr * gap to the over pass's neighbouring pass, self split, room))) next to the over chain's nearest fused joints.
//   node scripts/run_node.mjs ocap.ts <gw.json> [crossing,...]   (no list: every crossing, one line each)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, list] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8"))); const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4] }; };
const arc = (ch: number, ctrl: number) => PM.kArcOfCtrl(D, G.kcv[ch], ctrl);
const wrap = (ch: number, d: number) => { const g = geo(ch); if (g.closed) { d = ((d % g.total) + g.total) % g.total; if (d > g.total / 2) d -= g.total; } return d; };
const passes = new Map<number, { a: number; x: number; over: boolean }[]>();
G.crossings.forEach((x: any, i: number) => {
  for (const [ch, ct, ov] of [[x.overChain, x.overCtrl, true], [x.underChain, x.underCtrl, false]] as const) {
    if (!passes.has(ch)) passes.set(ch, []);
    passes.get(ch)!.push({ a: arc(ch, ct), x: i, over: ov });
  }
});
const joints = (ch: number) => (G.junctionArcCtrls?.get(ch) ?? []).map((j: any) => arc(ch, j.ctrl));
const ids = list ? list.split(",").map(Number) : G.crossings.map((_: any, i: number) => i);
for (const i of ids) {
  const x = G.crossings[i]; const oc = x.overChain; const oA = arc(oc, x.overCtrl); const g = geo(oc);
  let gP = Infinity, gN = Infinity, nP = -1, nN = -1;
  for (const p of passes.get(oc)!) {
    if (p.x === i && p.over) continue;
    const d = wrap(oc, p.a - oA);
    if (d > 1e-6 && d < gN) { gN = d; nN = p.x; }
    if (d < -1e-6 && -d < gP) { gP = -d; nP = p.x; }
  }
  let sF = Infinity, sB = Infinity;
  if (x.underChain === oc) { const uA = arc(oc, x.underCtrl); let f: number, b: number; if (g.closed) { f = (((uA - oA) % g.total) + g.total) % g.total; b = g.total - f; } else { f = uA > oA ? uA - oA : Infinity; b = oA > uA ? oA - uA : Infinity; } sF = Math.max(0.12, f / 2 - 0.08); sB = Math.max(0.12, b / 2 - 0.08); }
  const roomP = g.closed ? g.total / 4 : g.total - oA, roomN = g.closed ? g.total / 4 : oA;
  const cap = (clr: number, gap: number, split: number, room: number) => Math.max(0.12, Math.min(4.5, clr * gap, split, room));
  const jo = joints(oc).map((a: number) => wrap(oc, a - oA)).sort((a: number, b: number) => Math.abs(a) - Math.abs(b)).slice(0, 2);
  const ju = joints(x.underChain).map((a: number) => wrap(x.underChain, a - arc(x.underChain, x.underCtrl))).sort((a: number, b: number) => Math.abs(a) - Math.abs(b)).slice(0, 2);
  console.log(`x${i} over ${oc} under ${x.underChain} oCapNeg ${cap(0.8, gP, sB, roomN).toFixed(2)}/${cap(0.5, gP, sB, roomN).toFixed(2)} (gap ${gP.toFixed(2)} x${nP}) oCapPos ${cap(0.8, gN, sF, roomP).toFixed(2)}/${cap(0.5, gN, sF, roomP).toFixed(2)} (gap ${gN.toFixed(2)} x${nN}) | jo ${jo.map((v: number) => v.toFixed(2)).join(",")} ju ${ju.map((v: number) => v.toFixed(2)).join(",")}`);
}
