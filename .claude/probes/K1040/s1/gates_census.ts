// K1040 S1f item 2: which gate stops each junction corner in the 12 scenes.
// Replays form_b.ts's corner loop (lines 586-612) and solveCorner's head
// (681-704) per cyclically adjacent arm pair: 597 (θ ≤ 1e-6 or ≥ π − 1e-6),
// 606 (one through pass's two arms), 681 (an arm's L ≤ 1e-9), 694 (no V),
// 699 (V's foot off an arm: dV ≤ tol or ≥ L − tol), 704 (V outside the wedge),
// else a corner (checked against fb.corners). Lists every 694/699/704 pair
// and, per scene, the passing corners nearest each gate with their r and ω.
// Run: npx vite-node .claude/probes/K1040/s1/gates_census.ts   (writes out/s1f/gates_census.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a43dac8f0673db4df/.claude/probes/K1040/s1";
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type V = { x: number; y: number; ok: boolean; fa: { s: number }; fb: { s: number } };
const tot: Record<string, number> = {};
let mismatch = 0;
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const fb = new FormB(sc);
  const fx = fb as unknown as { solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): V; armDist(ai: number, s: number): number };
  const h = fb.h;
  const cnt: Record<string, number> = {};
  // Passing corners nearest each gate: dV/h (699 low), (L − dV)/h (699 high), wedge margin/h (704), θ to π (597).
  const near: Record<string, { v: number; txt: string }> = {};
  const keep = (k: string, v: number, txt: string) => {
    if (!near[k] || v < near[k].v) near[k] = { v, txt };
  };
  sc.junctions.forEach((j, ji) => {
    const ais = fb.arms.map((_, i) => i).filter((i) => fb.arms[i].j === ji);
    const n = ais.length;
    if (n < 2) return;
    ais.sort((u, v) => fb.arms[u].ang - fb.arms[v].ang);
    for (let i = 0; i < n; i++) {
      const a = ais[i];
      const b = ais[(i + 1) % n];
      const A = fb.arms[a];
      const B = fb.arms[b];
      let th = B.ang - A.ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const xa = j.arms[A.ei];
      const xb = j.arms[B.ei];
      let gate = "corner";
      let info = "";
      if (th <= 1e-6 || th >= Math.PI - 1e-6) gate = "597";
      else if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) gate = "606";
      else if (!(A.L > 1e-9 && B.L > 1e-9)) gate = "681";
      else {
        let bx = A.ux + B.ux;
        let by = A.uy + B.uy;
        const bl = Math.hypot(bx, by) || 1;
        bx /= bl;
        by /= bl;
        const sn = Math.sin(th / 2);
        const full: [number, number] = [0, Infinity];
        const Vp = fx.solveEq(a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, full, full);
        if (!Vp.ok) gate = "694";
        else {
          const dVa = fx.armDist(a, Vp.fa.s);
          const dVb = fx.armDist(b, Vp.fb.s);
          const tol = 1e-9 * h;
          const crossA = A.ux * (Vp.y - j.c[1]) - A.uy * (Vp.x - j.c[0]);
          const crossB = B.ux * (Vp.y - j.c[1]) - B.uy * (Vp.x - j.c[0]);
          const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
          info = `θ ${f(th)} L ${f(A.L)}/${f(B.L)} dV ${f(dVa / h)}h/${f(dVb / h)}h wedge ${f((crossA * sgn) / h)}h/${f((-crossB * sgn) / h)}h`;
          if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) gate = "699";
          else if (!(crossA * sgn > 0 && crossB * sgn < 0)) gate = "704";
          else {
            const c = fb.corners.find((k) => k.a === a && k.b === b);
            if (!c) {
              mismatch++;
              out.push(`  ${name} j${j.id} arms ${a}-${b}: passes every gate here but has no corner in fb.corners (${info})`);
            } else {
              const rw = `r ${f(c.r, 4)} ω ${f(c.omega, 4)}`;
              const tag = `${name} j${j.id} ${a}-${b}: ${info}; ${rw}`;
              keep("dV low", Math.min(dVa, dVb) / h, tag);
              keep("L − dV", Math.min(A.L - dVa, B.L - dVb) / h, tag);
              keep("wedge", Math.min(crossA * sgn, -crossB * sgn) / h, tag);
              keep("π − θ", Math.PI - th, tag);
            }
          }
        }
      }
      cnt[gate] = (cnt[gate] ?? 0) + 1;
      tot[gate] = (tot[gate] ?? 0) + 1;
      if (gate === "694" || gate === "699" || gate === "704") out.push(`  ${name} j${j.id} arms ${a}-${b} (${A.kind}/${B.kind}): gate ${gate}; ${info || `θ ${f(th)} L ${f(A.L)}/${f(B.L)}`}`);
    }
  });
  out.push(`  ${name}: ${Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  for (const [k, v] of Object.entries(near)) out.push(`    nearest ${k} (${f(v.v, 4)}): ${v.txt}`);
}
out.push(`all scenes: ${Object.entries(tot).map(([k, v]) => `${k} ${v}`).join(", ")}; pairs that pass every gate but have no corner: ${mismatch}`);
mkdirSync(`${HERE}/out/s1f`, { recursive: true });
writeFileSync(`${HERE}/out/s1f/gates_census.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /gate 69|gate 70|^all|^ {2}[a-z0-9_.]+: /.test(l)).slice(0, 40).join("\n"));
