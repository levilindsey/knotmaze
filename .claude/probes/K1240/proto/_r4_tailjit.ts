import { structure, frame, type SceneIn } from "./outline";
import { load } from "./k1247s5_scenes";
const still = load("def"); const S = still.camera.pxPerUnit * 2;
let seed = 12345;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * 0.01) / S / Math.SQRT2;
const F = frame(structure(still), still) as any; const J = frame(structure(sc), sc) as any;
const f = (v: number): string => (typeof v === "number" ? v.toFixed(4) : String(v));
for (const ci of [34, 35]) {
  const a = F.corners[ci]; const b = J.corners[ci];
  const diffs = Object.keys(a).filter((k) => typeof a[k] === "number" && Math.abs(a[k] - b[k]) * S > 0.25).map((k) => `${k} ${f(a[k])}->${f(b[k])}`);
  console.log(`corner ${ci} ${a.junction} aCh${a.aChain} bCh${a.bChain} moved>0.25px: ${diffs.join(" | ")}`);
}
F.pieces.forEach((pf: any, i: number) => {
  if (pf.kind !== "tail" || ![34, 35].includes(pf.corner)) return;
  const pj = J.pieces[i];
  const e = (P: number[], k: number): string => P.length ? `(${f(P[2 * k])},${f(P[2 * k + 1])})` : "-";
  console.log(`tail #${i} corner ${pf.corner} n ${pf.pts.length / 2} -> ${pj.pts.length / 2}; first ${e(pf.pts, 0)} -> ${e(pj.pts, 0)}; last ${e(pf.pts, pf.pts.length / 2 - 1)} -> ${e(pj.pts, pj.pts.length / 2 - 1)}`);
});
