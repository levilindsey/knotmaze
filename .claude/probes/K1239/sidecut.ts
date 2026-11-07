// K1239: old K846 side-cut windows vs FormB corner feet, per arm direction.
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";

const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
// FormB arm feet: corner c has arms a (dA foot) and b (dB foot), distances along each arm from root.
const feet = new Map<number, number[]>();
for (const c of fb.corners) {
  if (!c.ok) continue;
  for (const [ai, dist] of [[c.a, c.dA], [c.b, c.dB]] as const) {
    if (!feet.has(ai)) feet.set(ai, []);
    feet.get(ai)!.push(dist);
  }
}
const fMax: number[] = [], fMin: number[] = [];
fb.arms.forEach((a, i) => {
  const f = feet.get(i) ?? [];
  fMax.push(f.length ? Math.max(...f) : 0);
  fMin.push(f.length ? Math.min(...f) : 0);
});
// Old entries: per (chain, centre) win in arm direction. Renderer arc vs scene s: scale by chain totals.
const samples = d.samples as { i: number; total: number }[];
const sceneLen = new Map<number, number>();
for (const c of scene.chains) {
  let L = 0; const pts = c.pts;
  for (let i = 1; i < pts.length / 2; i++) L += Math.hypot(pts[i * 2] - pts[(i - 1) * 2], pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]);
  if (c.closed) L += Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
  sceneLen.set(c.id, L);
}
type OE = { chain: number; center: number; lo: number; hi: number; left: boolean; right: boolean };
const olds = (d.juncCuts ?? []) as OE[];
console.log(`old entries ${olds.length}; formB arms ${fb.arms.length} corners ${fb.corners.length} ok ${fb.corners.filter((c) => c.ok).length}`);
// match: for each old entry, find FormB arms on same chain whose root (scene s) is near centre*scale
let matched = 0, both = 0;
const diffs: number[] = [];
const worst: string[] = [];
for (const e of olds) {
  const scale = (sceneLen.get(e.chain) ?? 1) / (samples[e.chain]?.total ?? 1);
  const cs = e.center * scale;
  const win = Math.max(Math.abs(e.lo), Math.abs(e.hi));
  // candidate arms on this chain: root within 0.35 of cs (scene s; arm sR is poly s, poly s0 offset small)
  let bestI = -1, bestD = 1e9;
  fb.arms.forEach((a, i) => {
    if (scene.chains[a.pi]?.id !== e.chain) return;
    const dd = Math.abs(a.sR - cs);
    if (dd < bestD) { bestD = dd; bestI = i; }
  });
  if (bestI < 0 || bestD > 0.35) continue;
  matched++;
  const f = fMax[bestI];
  diffs.push(win - f);
  if (win - f > 0.3 && worst.length < 14) worst.push(`chain${e.chain} centre=${cs.toFixed(2)} oldWin=${win.toFixed(2)} formBfoot=${f.toFixed(2)} arm j${fb.arms[bestI].j} kind=${fb.arms[bestI].kind} L=${fb.arms[bestI].L.toFixed(2)}`);
}
diffs.sort((a, b) => a - b);
const q = (p: number) => diffs[Math.floor(diffs.length * p)]?.toFixed(3);
console.log(`matched ${matched}; win-foot diff: min ${q(0)} p25 ${q(0.25)} median ${q(0.5)} p75 ${q(0.75)} max ${q(0.999)}`);
console.log(`old win > foot+0.15: ${diffs.filter((x) => x > 0.15).length}; foot > win+0.15: ${diffs.filter((x) => x < -0.15).length}`);
for (const w of worst) console.log(w);
