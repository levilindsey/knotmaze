// K1040 S1f step 2: the reach candidates, arm by arm, before any gate run.
// Per scene, FormB builds: c1 (reach "straight": S1e's final), c2 (S1e's
// walk everywhere, curvedFrom 0), c3 (the walk past 4h), and the quadratic
// reach (S1f): chord or tangent line, 1 to 3 fits, floor F = 4h (2h, 1h
// for qc2). Writes, per arm that any candidate moves (|ΔL| > 1e-3 against
// c1) or whose c1-binding pass lies past the floor (r0 > 4h), every
// build's L and, at that pass, r0, c2's walked e_c and each quad e* (the
// raw model reach, before min(r0, max(F, ·))), all in h. Prints per scene:
// arms moved per candidate, restored (c1 L = 0, candidate L > 0), and the
// default's agreement.
// Run: npx vite-node .claude/probes/K1040/s1/reach_cands.ts [scene...]
//   (env OUT: the listing file; default out/s1f/reach_cands.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import type { FormBParams, Pass } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const OUT = process.env.OUT ?? `${HERE}/out/s1f/reach_cands.txt`;
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const argList = process.argv.slice(2);
const names = argList.length ? argList : ALL;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));

const CANDS: [string, FormBParams][] = [
  ["c2", { reach: "walk", curvedFrom: 0 }],
  ["c3", { reach: "walk" }],
  ["qc1", { reach: "quad", reachSep: "chord", reachSteps: 1 }],
  ["qc2", { reach: "quad", reachSep: "chord", reachSteps: 2 }],
  ["qc3", { reach: "quad", reachSep: "chord", reachSteps: 3 }],
  ["ql1", { reach: "quad", reachSep: "line", reachSteps: 1 }],
  ["ql2", { reach: "quad", reachSep: "line", reachSteps: 2 }],
  ["qc2F2", { reach: "quad", reachSep: "chord", reachSteps: 2, curvedFrom: 2 }],
  ["qc2F1", { reach: "quad", reachSep: "chord", reachSteps: 2, curvedFrom: 1 }],
];
const QUADS = CANDS.filter(([, p]) => p.reach === "quad");

const lines: string[] = [];
const tot: Record<string, { moved: number; restored: number; shortened: number; cut: number }> = {};
for (const [k] of CANDS) tot[k] = { moved: 0, restored: 0, shortened: 0, cut: 0 };
// The cap ramp reads Lcut wherever it lies short of L + λ (member(): the
// ramp ss(Lcut, Lcut − λ, d) on d ≤ L, and the root's other side when
// Lcut < λ), so an arm counts as moved when L or min(Lcut, L + λ) moves.
const capOf = (b: FormB, ai: number) => Math.min(b.arms[ai].Lcut, b.arms[ai].L + b.lambda);
let totDef = 0;
// Per candidate, the arms where it differs from c3 (L or the cap ramp's Lcut).
const vsC3: Record<string, number> = {};
for (const [k] of CANDS) vsC3[k] = 0;
for (const name of names) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const b1 = new FormB(sc, { reach: "straight" });
  const bs = CANDS.map(([k, p]) => [k, new FormB(sc, p)] as const);
  const bDef = new FormB(sc);
  const hw = b1.h;
  const cnt: Record<string, { moved: number; restored: number; shortened: number; cut: number }> = {};
  for (const [k] of CANDS) cnt[k] = { moved: 0, restored: 0, shortened: 0, cut: 0 };
  let nDef = 0;
  let nFar = 0;
  const rows: string[] = [];
  for (let ai = 0; ai < b1.arms.length; ai++) {
    const a1 = b1.arms[ai];
    const l1 = a1.L;
    if (bDef.arms[ai].L !== l1) nDef++;
    const b3 = bs.find(([kk]) => kk === "c3")![1];
    for (const [k, b] of bs) if (Math.abs(b.arms[ai].L - b3.arms[ai].L) > 1e-9 || Math.abs(capOf(b, ai) - capOf(b3, ai)) > 1e-9) vsC3[k]++;
    let any = false;
    const ls: string[] = [];
    for (const [k, b] of bs) {
      const l = b.arms[ai].L;
      const cutMoved = Math.abs(capOf(b, ai) - capOf(b1, ai)) > 1e-3;
      ls.push(`${k} ${f(l)}${cutMoved ? `/${f(capOf(b, ai))}` : ""}`);
      if (Math.abs(l - l1) > 1e-3 || cutMoved) {
        any = true;
        cnt[k].moved++;
        if (Math.abs(l - l1) <= 1e-3) cnt[k].cut++;
        if (l1 === 0 && l > 0) cnt[k].restored++;
        if (l < l1 - 1e-3) cnt[k].shortened++;
      }
    }
    // c1's binding pass (the Lcut loop's min c with the straight reach).
    const pa = b1.polys[a1.pi];
    let best: { x: Pass; d: number; c: number; r0: number } | null = null;
    for (const x of b1.passes[a1.pi]) {
      let d = (x.s - a1.sR) * a1.dir;
      if (pa.closed) d = ((d % pa.len) + pa.len) % pa.len;
      if (d < -1e-12) continue;
      const tn = Math.tan(x.theta / 2);
      const r0 = tn > 1e-12 ? hw / tn : Infinity;
      const c = d - r0 - hw;
      if (!best || c < best.c) best = { x, d, c, r0 };
    }
    const far = !!best && best.r0 > 4 * hw;
    if (far) nFar++;
    if (!any && !far) continue;
    let bind = "no pass";
    if (best) {
      const { x, d, r0 } = best;
      const ec = b1.curvedReachOf(a1.pi, x, a1.dir, r0, hw);
      const qs = QUADS.map(([k, p]) => {
        const b = bs.find(([kk]) => kk === k)![1];
        const fl = Math.max(1, p.curvedFrom ?? 4) * hw;
        return `${k} ${f(b.quadReachOf(a1.pi, x, a1.dir, hw, fl) / hw, 2)}`;
      });
      bind = `d ${f(d / hw, 2)}h θ ${f(x.theta, 4)} (chain ${a1.pi}→${x.qi}) r0 ${f(r0 / hw, 2)}h e_c ${f(ec / hw, 2)}h | e* ${qs.join(" ")}`;
    }
    rows.push(`  arm ${ai} (j ${a1.j} pi ${a1.pi} dir ${a1.dir} ${a1.kind}) L c1 ${f(l1)}/${f(capOf(b1, ai))} ${ls.join(" ")}${far ? " FAR" : ""}\n    bind ${bind}`);
  }
  for (const [k] of CANDS) {
    tot[k].moved += cnt[k].moved;
    tot[k].restored += cnt[k].restored;
    tot[k].shortened += cnt[k].shortened;
    tot[k].cut += cnt[k].cut;
  }
  totDef += nDef;
  const head = `== ${name}: h ${f(hw, 4)}; arms ${b1.arms.length}, L = 0 c1 ${b1.arms.filter((a) => a.L === 0).length}; binding pass past 4h ${nFar}; default != c1 on ${nDef}`;
  const per = CANDS.map(([k]) => `${k} ${cnt[k].moved}/${cnt[k].restored}/${cnt[k].shortened}/${cnt[k].cut}`).join("  ");
  console.log(`${head}\n   moved/restored/shortened/cap only: ${per}`);
  lines.push(head, `   moved/restored/shortened/cap only: ${per}`, ...rows);
}
const sum = `ALL moved/restored/shortened/cap only: ${CANDS.map(([k]) => `${k} ${tot[k].moved}/${tot[k].restored}/${tot[k].shortened}/${tot[k].cut}`).join("  ")}; default != c1 on ${totDef}`;
console.log(sum);
lines.push(sum);
const sum3 = `ALL arms != c3 (L or min(Lcut, L + λ), 1e-9): ${CANDS.map(([k]) => `${k} ${vsC3[k]}`).join("  ")}`;
console.log(sum3);
lines.push(sum3);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`wrote ${OUT}`);
