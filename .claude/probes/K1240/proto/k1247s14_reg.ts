// K1247 s14: which interval paints a point. Frames <scene> at rest (mult 0),
// finds the chain faces covering (x, y) (even-odd, holes and ownerless faces
// skipped), maps each to its interval (debugCache: ivRegion), and prints the
// chain's intervals within <k> of it: stations (kind, name, slotKey, sub, cS),
// len, the envelope start, discard and region. Env flags (K12_CSORDER,
// K12_NOENV, ...) apply as in outline.ts.
// Usage: node scripts/run_node.mjs <this> <scene> <x> <y> [k=3] [chain]
import { structure, frame, debugCache } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
const [nm, xS, yS, kS, chS] = process.argv.slice(2);
const x = +xS; const y = +yS; const K = Number(kS ?? 3);
const st = structure(load(nm)); const T = frame(st, sceneOf(nm, 0)) as any;
const C = debugCache(st) as any;
const nX = (st as any).crossings?.length ?? 0;
const kindName = ["xU", "xO", "jn", "cap", "seam"];
function inside(pts: number[], px: number, py: number): boolean {
  let c = false; const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const yi = pts[2 * i + 1]; const yj = pts[2 * j + 1]; if ((yi <= py) !== (yj <= py) && px < pts[2 * j] + ((py - yj) / (yi - yj)) * (pts[2 * i] - pts[2 * j])) c = !c; }
  return c;
}
const slotName = (s: number): string => {
  if (s < 0) return "-";
  const r = C.slotRank[s]; const k = C.slotKind[s];
  const who = k < 2 ? `x${r >> 2}.${r & 3}` : k === 2 ? `arm${r - nX * 4}` : `r${r}`;
  return `s${s}:${kindName[k]}:${who} key ${C.slotKey ? C.slotKey[s].toFixed(4) : "?"} sub ${C.slotSub ? C.slotSub[s] : "?"} cS ${C.stCS[s].toFixed(4)}`;
};
const ivLine = (i: number): string => `iv${i} ${slotName(C.ivA[i])} -> ${slotName(C.ivB[i])} | len ${C.ivLen[i].toFixed(4)} eA ${C.ivEA ? C.ivEA[i] : "-"} d${C.ivDiscard[i]} reg${C.ivRegion[i]}`;
const hits: number[] = [];
T.faces.forEach((f: any, i: number) => { if (!f.hole && f.ownerChain >= 0 && f.pts.length >= 6 && inside(f.pts, x, y)) hits.push(i); });
console.log(`${nm} (${x}, ${y}) ${process.env.K12_CSORDER ? "CSORDER " : ""}${process.env.K12_NOENV ? "NOENV " : ""}faces: ${hits.length ? hits.join(", ") : "none"} (regions ${T.regions.length}, faces ${T.faces.length}, intervals ${C.nIv})`);
const shown = new Set<number>();
const show = (i: number): void => {
  const pi = C.ivPi[i];
  for (let k = Math.max(0, i - K); k <= Math.min(C.nIv - 1, i + K); k++) {
    if (C.ivPi[k] !== pi || shown.has(k)) continue; shown.add(k);
    console.log(`  ${k === i ? "*" : " "} ch${pi} ${ivLine(k)}`);
  }
};
for (const h of hits) {
  // Faces are sorted by depth; a face shares its region's pts array.
  const f = T.faces[h]; const r = T.regions.findIndex((rg: any) => rg.pts === f.pts); const rg = T.regions[r];
  const ivs: number[] = []; for (let i = 0; i < C.nIv; i++) if (C.ivRegion[i] === r) ivs.push(i);
  console.log(`face ${h} region ${r} (id ${rg?.id}) owner ${f.ownerChain} group ${f.group} n ${f.pts.length / 2}: intervals ${ivs.join(", ") || "none (junction or empty)"}`);
  for (const i of ivs) show(i);
}
// The point's nearest arc s on a poly (C.polys: x, y, s, segLen, n, closed).
const project = (pi: number): string => {
  const p = C.polys[pi]; let best = Infinity; let bs = 0;
  const nseg = p.closed ? p.n : p.n - 1;
  for (let i = 0; i < nseg; i++) {
    const j = (i + 1) % p.n; const ax = p.x[i]; const ay = p.y[i]; const dx = p.x[j] - ax; const dy = p.y[j] - ay; const L = dx * dx + dy * dy;
    let t = L > 0 ? ((x - ax) * dx + (y - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy); if (d < best) { best = d; bs = p.s[i] + t * Math.sqrt(L); }
  }
  return `chain ${pi}: nearest s ${bs.toFixed(4)} at d ${best.toFixed(4)} (len ${p.len.toFixed(4)}, s0 ${p.s0})`;
};
if (chS !== undefined) {
  const ch = +chS; console.log(project(ch)); console.log(`chain ${ch} intervals:`);
  for (let i = 0; i < C.nIv; i++) if (C.ivPi[i] === ch) console.log(`    ${ivLine(i)}`);
}
