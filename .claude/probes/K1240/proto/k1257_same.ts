// K1257: form B outside its corners is unchanged by the closed-form growth.
// Per scene, master's form B (54a6b84d; k1257_master.ts writes it to formb_master.ts
// from git)
// against today's:
//  1. arms: every field of every arm, bit for bit (Object.is);
//  2. corners: the same corners in the same order, and each one's inputs to
//     the growth (j g a b ok style theta r0 Vx Vy dVa dVb) bit for bit;
//  3. pixels: evalPoint on a device-pixel lattice (dpr 2, every --step-th
//     pixel, default 3) over the chains' bounds. A pixel no corner's grid
//     cell reaches in either build (cornersNear empty in both) must give the
//     same PixelEval, every field and the term's, bit for bit. Pixels that a
//     corner reaches are counted, with how many differ and how many of those
//     lie outside every corner's reach disk (addCorner's R about q, old and
//     new). Out there only Dexp may differ: the distance to the exposed
//     outline includes the corner's arc wherever its cells reach.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1257_same.ts [--scene=def] [--step=3]
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";
import { masterFormB } from "./k1257_master";
const FormBMaster = await masterFormB();

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const names = arg("scene") ? [arg("scene")!] : ALL;
const step = Number(arg("step") ?? 3);
const key = (v: unknown): string => JSON.stringify(v, (_k, x) => (typeof x === "number" ? (Object.is(x, -0) ? "-0" : String(x)) : x));
const IN = ["j", "g", "a", "b", "ok", "style", "theta", "r0", "Vx", "Vy", "dVa", "dVb"] as const;
interface Fb { arms: unknown[]; corners: Record<string, number | boolean>[]; W: number; aa: number; cornersNear(x: number, y: number): number[]; evalPoint(x: number, y: number): unknown }
let bad = 0;
for (const name of names) for (const mult of multsOf(name)) {
  const sc = sceneOf(name, mult); const S = sc.camera.pxPerUnit * 2;
  const A = new FormBMaster(sc as never, { dpr: 2 }) as unknown as Fb;
  const B = new FormB(sc as never, { dpr: 2 }) as unknown as Fb;
  const armsSame = A.arms.length === B.arms.length && A.arms.every((x, i) => key(x) === key(B.arms[i]));
  let cIn = A.corners.length === B.corners.length;
  if (cIn) for (let i = 0; i < A.corners.length; i++) for (const f of IN) if (!Object.is(A.corners[i][f], B.corners[i][f])) cIn = false;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  const pad = 3 * B.W; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const disks = (F: Fb): number[][] => F.corners.filter((c) => c.ok && Number.isFinite(c.qx as number)).map((c) => [c.qx as number, c.qy as number, Math.max(c.rV as number, (c.r as number) + F.W) + 2 * F.W + 4 * F.aa]);
  const D = [...disks(A), ...disks(B)];
  const fIn: Record<string, number> = {}; const fOut: Record<string, number> = {}; let inkIn = 0; let inkOut = 0; let topIn = 0; let topOut = 0;
  let free = 0; let freeDiff = 0; let near = 0; let nearDiff = 0; let outDisk = 0; let firstFree = "";
  const nx = Math.ceil((x1 - x0) * S); const ny = Math.ceil((y1 - y0) * S);
  for (let iy = 0; iy < ny; iy += step) for (let ix = 0; ix < nx; ix += step) {
    const x = x0 + (ix + 0.5) / S; const y = y0 + (iy + 0.5) / S;
    const cn = A.cornersNear(x, y).length + B.cornersNear(x, y).length;
    const same = key(A.evalPoint(x, y)) === key(B.evalPoint(x, y));
    if (cn === 0) { free++; if (!same) { freeDiff++; if (!firstFree) firstFree = `${x},${y}`; } }
    else { near++; if (!same) { nearDiff++; const out = !D.some(([qx, qy, R]) => Math.hypot(x - qx, y - qy) <= R); if (out) outDisk++; const ea = A.evalPoint(x, y) as Record<string, unknown>; const eb = B.evalPoint(x, y) as Record<string, unknown>; for (const f of Object.keys(eb)) if (key(ea[f]) !== key(eb[f])) { const t = (out ? fOut : fIn); t[f] = (t[f] ?? 0) + 1; } const di = Math.abs((ea.ink as number) - (eb.ink as number)); if (out) inkOut = Math.max(inkOut, di); else inkIn = Math.max(inkIn, di); if (ea.top !== eb.top) { if (out) topOut++; else topIn++; } } }
  }
  const ok = armsSame && cIn && freeDiff === 0 && Object.keys(fOut).every((f) => f === "Dexp");
  if (!ok) bad++;
  console.log(`${name} ${mult}: arms ${armsSame ? "same" : "DIFFER"} (${B.arms.length}); corner inputs ${cIn ? "same" : "DIFFER"} (${B.corners.length}); pixels outside corner cells ${free}, differing ${freeDiff}${firstFree ? ` (first ${firstFree})` : ""}; in corner cells ${near}, differing ${nearDiff}, of them outside every reach disk ${outDisk}`);
  if (nearDiff) console.log(`  inside disks: fields ${key(fIn)}, max |dink| ${inkIn.toExponential(2)}, top changed ${topIn}; outside: fields ${key(fOut)}, max |dink| ${inkOut.toExponential(2)}, top changed ${topOut}`);
}
console.log(bad ? `FAIL: ${bad} scenes` : "PASS: every scene");
