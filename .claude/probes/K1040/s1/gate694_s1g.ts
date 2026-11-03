// K1040 S1g step 4a: solveCorner's 694 (no V) at rest, g41_user_tw64 jj30
// arms 93-91 (θ 0.984; S1f F6's one 694 null). The arms' L, roots and
// directions; the closest approach of the two arm spans against 2h (a true
// "no V" when the ribbons do not meet within the spans); solveEq from the
// code's seed and a fan of others; then a sweep: chain(arm 91)'s points near
// the junction translated by t along the bisector's normal with a smooth
// falloff (ss over 6h..10h from c), t in [−1h, 1h], the corner's r, ω (or
// null) and the ink at points around the corner's V region.
// Run: npx vite-node .claude/probes/K1040/s1/gate694_s1g.ts   (writes out/s1g/gate694.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
const sc0 = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/g41_user_tw64.json", "utf8")) as FieldScene;
const JID = "j30";
const CA = 93;
const CB = 91;
type Fx = {
  solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): { ok: boolean; x: number; y: number; fa: { s: number; d: number }; fb: { s: number; d: number } };
  armDist(ai: number, s: number): number;
};
const fb0 = new FormB(sc0);
const ji = sc0.junctions.findIndex((j) => j.id === JID);
const j = sc0.junctions[ji];
const h = fb0.h;
const A = fb0.arms[CA];
const B = fb0.arms[CB];
const fx = fb0 as unknown as Fx;
out.push(`P. g41_user_tw64 ${JID} (index ${ji}) c (${f(j.c[0])}, ${f(j.c[1])}), h ${f(h)}; arms ${CA} (chain ${sc0.junctions[ji].arms[A.ei].chain}, ${sc0.junctions[ji].arms[A.ei].kind}) and ${CB} (chain ${sc0.junctions[ji].arms[B.ei].chain}, ${sc0.junctions[ji].arms[B.ei].kind})`);
for (const [nm, X] of [
  ["A", A],
  ["B", B],
] as const) {
  const p = fb0.polys[X.pi];
  const r0 = pointAt(p, X.sR);
  out.push(`  arm ${nm}: L ${f(X.L / h)}h, Lcut ${f(X.Lcut / h)}h, dir ${X.dir}, root (${f(r0.x)}, ${f(r0.y)}) at ${f(Math.hypot(r0.x - j.c[0], r0.y - j.c[1]) / h)}h from c, u (${f(X.ux)}, ${f(X.uy)})`);
}
// Closest approach of the spans.
let best = Infinity;
let at = [0, 0];
const pa = fb0.polys[A.pi];
const pb = fb0.polys[B.pi];
const n = 200;
for (let i = 0; i <= n; i++) {
  const pA = pointAt(pa, A.sR + (A.dir * A.L * i) / n);
  for (let k = 0; k <= n; k++) {
    const pB = pointAt(pb, B.sR + (B.dir * B.L * k) / n);
    const d = Math.hypot(pA.x - pB.x, pA.y - pB.y);
    if (d < best) {
      best = d;
      at = [(A.L * i) / n / h, (B.L * k) / n / h];
    }
  }
}
out.push(`  closest approach of the spans: ${f(best / h)}h at dA ${f(at[0])}h, dB ${f(at[1])}h (2h = the ribbons touch)`);
let bx = A.ux + B.ux;
let by = A.uy + B.uy;
const bl = Math.hypot(bx, by) || 1;
bx /= bl;
by /= bl;
let th = B.ang - A.ang;
th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const sn = Math.sin(th / 2);
const full: [number, number] = [0, Infinity];
out.push(`  θ ${f(th)}; solveEq(h) from seeds (k · h/sin(θ/2) along the bisector, rotated by φ):`);
for (const k of [1, 0.5, 2, 3]) {
  for (const phi of [0, -0.3, 0.3]) {
    const cx = Math.cos(phi) * bx - Math.sin(phi) * by;
    const cy = Math.sin(phi) * bx + Math.cos(phi) * by;
    const V = fx.solveEq(CA, CB, h, j.c[0] + (cx * h * k) / sn, j.c[1] + (cy * h * k) / sn, full, full);
    out.push(`    k ${k} φ ${phi}: ok ${V.ok}, V (${f(V.x)}, ${f(V.y)}), dA ${f(V.fa.d / h)}h dB ${f(V.fb.d / h)}h, dV ${f(fx.armDist(CA, V.fa.s) / h)}h/${f(fx.armDist(CB, V.fb.s) / h)}h`);
  }
}
out.push(`  diagnostics: ${fb0.diagnostics.filter((s) => s.includes(`j${JID}`) || s.includes(`j${j.id}`)).join(" | ") || "(none naming it)"}`);

// Q. The sweep.
const nx = -by;
const ny = bx;
const chainB = j.arms[B.ei].chain;
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
// Probe points: along the bisector from c, 1.5-3.5 h/sin(θ/2), and beside it.
const pts: [number, number][] = [1.0, 1.3, 1.6, 2.0].flatMap((k) => [0, 0.4].map((o) => [j.c[0] + ((bx * h) / sn) * k + nx * o * h, j.c[1] + ((by * h) / sn) * k + ny * o * h] as [number, number]));
out.push(`Q. the sweep: chain ${chainB}'s points near c moved by t·h along (${f(nx)}, ${f(ny)}); corner ${CA}-${CB} (or ${CB}-${CA})`);
out.push(`        t  L(a${CA}) L(a${CB})  corner: r, ω (or null)   ink at ${pts.map((p) => `(${f(p[0], 2)}, ${f(p[1], 2)})`).join(" ")}`);
type Row = { t: number; vals: number[]; txt: string };
const rows: Row[] = [];
const ts = Array.from({ length: 81 }, (_, i) => -1 + (2 * i) / 80);
for (const t of ts) {
  const fb = new FormB(moved(t));
  const c = fb.corners.find((k) => (k.a === CA && k.b === CB) || (k.a === CB && k.b === CA));
  const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
  const txt = `  ${f(t, 3).padStart(7)}  ${f(fb.arms[CA].L / h).padStart(6)} ${f(fb.arms[CB].L / h).padStart(6)}  ${c ? `${f(c.r / h, 4)}, ${f(c.omega, 4)}` : "null".padEnd(14)}  ${ink.map((v) => f(v, 3)).join(" ")}`;
  rows.push({ t, vals: [c ? c.r : -1, c ? c.omega : -1, ...ink], txt });
  out.push(txt);
}
for (let i = 1; i < rows.length; i++) {
  if ((rows[i].vals[0] < 0) !== (rows[i - 1].vals[0] < 0)) out.push(`  switch: ${rows[i - 1].txt.trim()}  ->  ${rows[i].txt.trim()}`);
}
const steps = ["r", "ω", ...pts.map((_, k) => `ink${k}`)].map((nm, k) => {
  let mx = 0;
  let wh = 0;
  for (let i = 1; i < rows.length; i++) {
    const dv = Math.abs(Math.max(k < 2 ? 0 : -9, rows[i].vals[k]) - Math.max(k < 2 ? 0 : -9, rows[i - 1].vals[k]));
    if (dv > mx) {
      mx = dv;
      wh = rows[i].t;
    }
  }
  return `${nm} ${f(mx, 4)} (at ${f(wh, 3)})`;
});
out.push(`  largest step (t step 0.025h; r, ω with null = 0): ${steps.join("; ")}`);
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gate694.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => !/^\s+-?\d/.test(l)).slice(0, 40).join("\n"));
