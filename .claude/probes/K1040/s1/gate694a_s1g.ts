// K1040 S1g step 4a: which exit nulls g41_user_tw64 jj30's corner 93-91 along
// gate694's sweep, with the code's seed and with gate694r's seed retry: the V
// solve (694), the window (699) or the wedge (704); V, its dV and the arms' L.
// Run: npx vite-node .claude/probes/K1040/s1/gate694a_s1g.ts   (writes out/s1g/gate694a.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type Sol = { ok: boolean; x: number; y: number; fa: { s: number }; fb: { s: number } };
type Fx = {
  solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): Sol;
  armDist(ai: number, s: number): number;
};
const sc0 = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/g41_user_tw64.json", "utf8")) as FieldScene;
const CA = 93;
const CB = 91;
const ji = sc0.junctions.findIndex((j) => j.id === "j30");
const j = sc0.junctions[ji];
const fb0 = new FormB(sc0);
const h = fb0.h;
let bx0 = fb0.arms[CA].ux + fb0.arms[CB].ux;
let by0 = fb0.arms[CA].uy + fb0.arms[CB].uy;
const bl0 = Math.hypot(bx0, by0) || 1;
bx0 /= bl0;
by0 /= bl0;
const nx = -by0;
const ny = bx0;
const chainB = j.arms[fb0.arms[CB].ei].chain;
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function moved(t: number): FieldScene {
  const sc = structuredClone(sc0);
  const ch = sc.chains.find((c) => c.id === chainB)!;
  for (let i = 0; i < ch.pts.length; i += 2) {
    const d = Math.hypot(ch.pts[i] - j.c[0], ch.pts[i + 1] - j.c[1]);
    const w = 1 - ss(6 * h, 10 * h, d);
    ch.pts[i] += t * h * nx * w;
    ch.pts[i + 1] += t * h * ny * w;
  }
  return sc;
}
out.push("t; then per seed (code | retry): V ok, V, dVa/h dVb/h (L/h), window, wedge, corner");
for (const t of [-1, -0.75, -0.6, -0.528, -0.5, -0.474, -0.45, -0.4, -0.3, -0.25, -0.1, 0, 0.25, 0.5, 0.75, 0.85, 0.875, 0.9, 1]) {
  const fb = new FormB(moved(t));
  const fx = fb as unknown as Fx;
  const A = fb.arms[CA];
  const B = fb.arms[CB];
  let bx = A.ux + B.ux;
  let by = A.uy + B.uy;
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl;
  by /= bl;
  let th = B.ang - A.ang;
  th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sn = Math.sin(th / 2);
  const full: [number, number] = [0, Infinity];
  const s0: [number, number] = [j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn];
  const ra = pointAt(fb.polys[A.pi], A.sR);
  const rb = pointAt(fb.polys[B.pi], B.sR);
  const mx = (ra.x + rb.x) / 2;
  const my = (ra.y + rb.y) / 2;
  const parts: string[] = [];
  for (const mode of ["code", "retry"] as const) {
    let V = fx.solveEq(CA, CB, h, s0[0], s0[1], full, full);
    if (!V.ok && mode === "retry") {
      const dx = s0[0] - mx;
      const dy = s0[1] - my;
      for (const [k, phi] of [
        [0.5, 0],
        [1, 0.3],
        [1, -0.3],
      ]) {
        const W = fx.solveEq(CA, CB, h, mx + k * (Math.cos(phi) * dx - Math.sin(phi) * dy), my + k * (Math.sin(phi) * dx + Math.cos(phi) * dy), full, full);
        if (W.ok) {
          V = W;
          break;
        }
      }
    }
    const dVa = fx.armDist(CA, V.fa.s);
    const dVb = fx.armDist(CB, V.fb.s);
    const tol = 1e-9 * h;
    const win = dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol;
    const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
    const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
    const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
    const wedge = crossA * sgn > 0 && crossB * sgn < 0;
    parts.push(`${mode}: ${V.ok ? "ok" : "FAIL"} (${f(V.x)}, ${f(V.y)}) dV ${f(dVa / h, 2)}/${f(dVb / h, 2)} win ${win ? "y" : "N"} wedge ${wedge ? "y" : "N"}`);
  }
  const c = (fb.corners as unknown as { a: number; b: number; r: number; omega: number }[]).find((k) => (k.a === CA && k.b === CB) || (k.a === CB && k.b === CA));
  out.push(`  t ${f(t, 3).padStart(6)} L ${f(A.L / h, 2)}/${f(B.L / h, 2)}  ${parts.join(" | ")}  | code's corner ${c ? `r ${f(c.r / h, 4)}h ω ${f(c.omega, 3)}` : "null"}`);
}
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gate694a.txt`, out.join("\n") + "\n");
console.log(out.join("\n"));
