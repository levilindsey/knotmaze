// K1040 S1g step 4a, continued: is 694 at g41_user_tw64 jj30 a gate reached
// with fill? gate694_s1g.ts found the code's straight-arm seed fails there
// while seeds at half the distance converge to a true V (dV 1.04h). Here:
// F. the sweep's switch, fine (t −0.56..−0.46, step 0.001h), the code as is:
//    does ink0's step coincide with the corner's switch?
// R. a seed retry, probe-side only (FormB.prototype.solveEq wrapped: when the
//    code's seed fails, retry from the roots' midpoint + k·(seed − midpoint),
//    k 0.5, then the seed rotated ±0.3 about the midpoint): jj30's corner at
//    rest, the sweep with the retry, and a census over the 12 scenes of every
//    corner the retry changes (the fill 694 suppresses at rest).
// Run: npx vite-node .claude/probes/K1040/s1/gate694r_s1g.ts   (writes out/s1g/gate694r.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const SC = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const out: string[] = [];
type Sol = { ok: boolean; x: number; y: number };
type Proto = { solveEq(this: FormB, a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): Sol };
const proto = FormB.prototype as unknown as Proto;
const orig = proto.solveEq;
let retries = 0;
let rescued = 0;
function retry(this: FormB, a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]): Sol {
  const r = orig.call(this, a, b, rho, x0, y0, wa, wb);
  if (r.ok) return r;
  retries++;
  const A = this.arms[a];
  const B = this.arms[b];
  const ra = pointAt(this.polys[A.pi], A.sR);
  const rb = pointAt(this.polys[B.pi], B.sR);
  const mx = (ra.x + rb.x) / 2;
  const my = (ra.y + rb.y) / 2;
  const dx = x0 - mx;
  const dy = y0 - my;
  for (const [k, phi] of [
    [0.5, 0],
    [1, 0.3],
    [1, -0.3],
  ]) {
    const sx = mx + k * (Math.cos(phi) * dx - Math.sin(phi) * dy);
    const sy = my + k * (Math.sin(phi) * dx + Math.cos(phi) * dy);
    const s = orig.call(this, a, b, rho, sx, sy, wa, wb);
    if (s.ok) {
      rescued++;
      return s;
    }
  }
  return r;
}
const useRetry = (on: boolean) => {
  proto.solveEq = on ? retry : orig;
};

const sc0 = JSON.parse(readFileSync(`${SC}/g41_user_tw64.json`, "utf8")) as FieldScene;
const JID = "j30";
const CA = 93;
const CB = 91;
const ji = sc0.junctions.findIndex((j) => j.id === JID);
const j = sc0.junctions[ji];
const fb0 = new FormB(sc0);
const h = fb0.h;
const A0 = fb0.arms[CA];
const B0 = fb0.arms[CB];
let bx = A0.ux + B0.ux;
let by = A0.uy + B0.uy;
const bl = Math.hypot(bx, by) || 1;
bx /= bl;
by /= bl;
const nx = -by;
const ny = bx;
const chainB = j.arms[B0.ei].chain;
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
type C = { j: number; a: number; b: number; r: number; omega: number; theta: number; dVa: number; dVb: number };
const findC = (fb: FormB) => (fb.corners as unknown as C[]).find((k) => (k.a === CA && k.b === CB) || (k.a === CB && k.b === CA));
const sn = Math.sin(1.0 / 2);
const pts: [number, number][] = [[7.22, 3.07], [7.503, 3.122], [7.45, 3.05], [7.35, 3.1]];
void sn;
function sweep(title: string, ts: number[], every: number): void {
  out.push(title);
  out.push(`        t  L(a${CA}) L(a${CB})  corner: r/h, ω, dV/h (or null)   ink at ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(" ")}`);
  const rows: { t: number; v: number[]; txt: string }[] = [];
  ts.forEach((t, i) => {
    const fb = new FormB(moved(t));
    const c = findC(fb);
    const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
    const txt = `  ${f(t, 4).padStart(8)}  ${f(fb.arms[CA].L / h).padStart(6)} ${f(fb.arms[CB].L / h).padStart(6)}  ${c ? `${f(c.r / h, 4)}, ${f(c.omega, 4)}, ${f(Math.min(c.dVa, c.dVb) / h, 3)}` : "null".padEnd(22)}  ${ink.map((v) => f(v, 4)).join(" ")}`;
    rows.push({ t, v: [c ? c.r / h : -1, ...ink], txt });
    if (i % every === 0 || i === ts.length - 1) out.push(txt);
  });
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i].v[0] < 0) !== (rows[i - 1].v[0] < 0)) out.push(`  switch: ${rows[i - 1].txt.trim()}  ->  ${rows[i].txt.trim()}`);
  }
  const steps = ["r/h", ...pts.map((_, k) => `ink${k}`)].map((nm, k) => {
    let mx = 0;
    let at = 0;
    for (let i = 1; i < rows.length; i++) {
      const a0 = k === 0 ? Math.max(0, rows[i - 1].v[0]) : rows[i - 1].v[k];
      const a1 = k === 0 ? Math.max(0, rows[i].v[0]) : rows[i].v[k];
      if (Math.abs(a1 - a0) > mx) {
        mx = Math.abs(a1 - a0);
        at = rows[i].t;
      }
    }
    return `${nm} ${f(mx, 4)} (at ${f(at, 4)})`;
  });
  out.push(`  largest step (t step ${f(ts[1] - ts[0], 4)}h): ${steps.join("; ")}`);
}
const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
useRetry(false);
sweep("F. the switch, fine, the code as is", span(-0.56, -0.46, 100), 5);
useRetry(true);
retries = 0;
rescued = 0;
const fbR = new FormB(sc0);
const cR = findC(fbR);
out.push(`R. with the seed retry, at rest: corner ${cR ? `r ${f(cR.r / h)}h, ω ${f(cR.omega)}, θ ${f(cR.theta)}, dV ${f(cR.dVa / h)}h/${f(cR.dVb / h)}h` : "null"}`);
sweep("R1. the sweep with the retry (t step 0.025h)", span(-1, 1, 80), 4);
// R2. census over the 12 scenes: corners the retry changes.
out.push("R2. census at rest: the seed retry against the code as is");
let tNew = 0;
let tFill = 0;
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`${SC}/${name}.json`, "utf8")) as FieldScene;
  useRetry(false);
  const base = new FormB(sc);
  useRetry(true);
  retries = 0;
  rescued = 0;
  const fr = new FormB(sc);
  const key = (c: C) => `${c.j}:${c.a}-${c.b}`;
  const mb = new Map((base.corners as unknown as C[]).map((c) => [key(c), c]));
  let nNew = 0;
  let nFill = 0;
  for (const c of fr.corners as unknown as C[]) {
    const o = mb.get(key(c));
    if (o && Math.abs(o.r - c.r) < 1e-9 && Math.abs(o.omega - c.omega) < 1e-9) continue;
    const jid = sc.junctions[c.j]?.id ?? "?";
    if (!o) nNew++;
    const fill = c.r > 0.01 * fr.h && c.omega > 0.01;
    if (fill) nFill++;
    out.push(`  ${name} j${c.j} (${jid}) ${c.a}-${c.b}: ${o ? `r ${f(o.r / fr.h)}h ω ${f(o.omega)}` : "null"} -> r ${f(c.r / fr.h)}h ω ${f(c.omega)}, θ ${f(c.theta)}, dV ${f(Math.min(c.dVa, c.dVb) / fr.h)}h${fill ? "  FILL" : ""}`);
  }
  tNew += nNew;
  tFill += nFill;
  out.push(`  ${name.padEnd(22)} failed V solves ${retries}, rescued ${rescued}; corners new ${nNew}, with fill ${nFill}`);
}
out.push(`  all: corners new ${tNew}, with fill ${tFill}`);
useRetry(false);
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/gate694r.txt`, out.join("\n") + "\n");
console.log(out.filter((l) => /switch|largest|^F|^R|failed V|all:|FILL/.test(l)).slice(0, 45).join("\n"));
