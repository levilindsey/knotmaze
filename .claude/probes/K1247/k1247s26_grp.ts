// K1247 s26 (K1324): which passes tie two arms of one form B junction group. Per scene: every pass of
// zChains (crossing or contact) whose own s and partner s both lie on arms (outline.ts's arms: root sR,
// direction, span L) of one junction group, and, with --at=x,y, every pass that ties a band point within
// 3h of that spot (the fade at the chain's nearest point, tieAlpha's terms).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s26_grp.ts <scene> [--at=x,y]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOutlineFull, type SceneIn } from "../../../src/render/outline/outline";
import { dSC, footNear, zAtC, zChains } from "../../../src/render/outline/draw";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = args.find((a) => !a.startsWith("--")) ?? "def";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const zz = zChains(scene); const { zc, passes } = zz;
const full = buildOutlineFull(scene);
const arms = (full.debug as { arms: { ji: number; pi: number; sR: number; dir: number; L: number }[] }).arms;
const groups = (full.debug as { groups: number[] }).groups;
const h = scene.look.halfWidth; const W = full.table.W; const zt = 0.1 * scene.look.depthAmp;
const nX = zc.map(() => 0);
for (const x of scene.crossings) { const a = zz.idx.get(x.a.chain); const b = zz.idx.get(x.b.chain); if (a !== undefined) nX[a]++; if (b !== undefined) nX[b]++; }
/** The arms (index) on chain i that cover s. */
const armsAt = (i: number, s: number): number[] => {
  const out: number[] = []; const c = zc[i];
  arms.forEach((a, ai) => {
    if (a.pi !== i) return;
    let d = (s - a.sR) * a.dir; if (c.closed && c.len > 0) d = ((d % c.len) + c.len) % c.len;
    if (d >= -1e-9 && d <= a.L + 1e-9) out.push(ai);
  });
  return out;
};
const posAt = (i: number, s: number): [number, number] => {
  const c = zc[i]; let u = s; if (c.closed && c.len > 0) u = ((u % c.len) + c.len) % c.len;
  let k = 0; while (k + 1 < c.n && c.s[k + 1] <= u) k++;
  const j = c.closed ? (k + 1) % c.n : Math.min(k + 1, c.n - 1); const l = (j > k ? c.s[j] : c.len) - c.s[k]; const t = l > 0 ? Math.min(1, (u - c.s[k]) / l) : 0;
  return [c.xs[k] + (c.xs[j] - c.xs[k]) * t, c.ys[k] + (c.ys[j] - c.ys[k]) * t];
};
const f3 = (v: number): string => v.toFixed(3);
let same = 0;
passes.forEach((P, i) => P.forEach((p, k) => {
  const ga = armsAt(i, p.s).map((a) => groups[arms[a].ji]); const gb = armsAt(p.o, p.so).map((a) => groups[arms[a].ji]);
  const g = ga.find((q) => gb.includes(q));
  if (g === undefined) return;
  same++;
  const [x, y] = posAt(i, p.s);
  if (!opt("at")) console.log(`${k < nX[i] ? "cross" : "contact"} c${i} s ${f3(p.s)} -> c${p.o} so ${f3(p.so)} lo ${f3(p.lo)} hi ${f3(p.hi)} rO ${f3(p.rO)} group ${g} at (${f3(x)}, ${f3(y)})`);
}));
console.log(`${nm}: ${same} passes with both ends on arms of one group (of ${passes.reduce((a, P) => a + P.length, 0)})`);
const at = opt("at");
if (at) {
  const [X, Y] = at.split(",").map(Number);
  zc.forEach((c, i) => {
    let best = Infinity; let bs = 0;
    for (let k = 0; k < c.n; k++) { const d = Math.hypot(c.xs[k] - X, c.ys[k] - Y); if (d < best) { best = d; bs = c.s[k]; } }
    if (best > 3 * h) return;
    console.log(`c${i} nearest ${f3(best)} at s ${f3(bs)} arms ${armsAt(i, bs).map((a) => `j${arms[a].ji}/g${groups[arms[a].ji]}`).join(" ")}`);
    passes[i].forEach((p, k) => {
      // The pass's fade at band points of c within 3h of the spot, on both sides of the chain.
      let worst = 1; let wAt = "";
      for (let q = 0; q < c.n; q++) {
        if (Math.hypot(c.xs[q] - X, c.ys[q] - Y) > 3 * h) continue;
        const ds = dSC(c, p.s, c.s[q]); if (ds < -p.lo || ds > p.hi) continue;
        const a = (c.xs[(q + 1) % c.n] - c.xs[q]); const b = (c.ys[(q + 1) % c.n] - c.ys[q]); const l = Math.hypot(a, b) || 1;
        for (const sg of [-1, 1]) for (const dC of [h * 0.6, h * 0.9]) {
          const x = c.xs[q] - (sg * dC * b) / l; const y = c.ys[q] + (sg * dC * a) / l;
          const O = zc[p.o]; const f = footNear(O, x, y, p.so, p.rO, c.s[q], p.o === i ? 3 * h : 0);
          if (!(f.d < h)) continue;
          const g = Math.min(1, Math.max(0, (h - f.d) / W)); const keyO = zAtC(O, f.s) - (f.d * zt) / h; const keyC = zAtC(c, c.s[q]) - (dC * zt) / h;
          const t = Math.min(1, Math.max(0, (keyO - keyC + zt) / (2 * zt))); const fd = 1 - g * t * t * (3 - 2 * t);
          if (fd < worst) { worst = fd; wAt = `s ${f3(c.s[q])} side ${sg} foot c${p.o}@${f3(f.s)} arms ${armsAt(p.o, f.s).map((a2) => `j${arms[a2].ji}/g${groups[arms[a2].ji]}`).join(" ")}`; }
        }
      }
      if (worst < 0.999) console.log(`  ${k < nX[i] ? "cross" : "contact"} pass ${k} -> c${p.o} s ${f3(p.s)} lo ${f3(p.lo)} hi ${f3(p.hi)} so ${f3(p.so)} rO ${f3(p.rO)}: fade ${f3(worst)} at ${wAt}`);
    });
  });
}
